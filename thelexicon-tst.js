const BASE_ID = 'appFTGzhkyFj0r9r1';
const TABLE_ID = 'tblAuOlHMAQPjdhGM';
const PAT_TOKEN = 'path8VP4vIbdD1lCW.2d577815c2badbfc1e4cae7e5cd33048c90c6411fe0cf32b142835821442381c';

class Term {
    constructor(term, uid, finalSvg, channel, otherChannels, definition, designer, designerNationality) {
        this.term = term;
        this.uid = uid;
        this.finalSvg = finalSvg;
        this.channel = channel;
        this.otherChannels = otherChannels;
        this.definition = definition;
        this.designer = designer;
        this.designerNationality = designerNationality;
    }
}


async function fetchFromAirtable(filterFormula, fieldsToReturn = []) {
    let allRecords = [];
    let offset = null;
    
    do {
        let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        if (fieldsToReturn.length > 0) {
            const fieldsParam = fieldsToReturn.map(f => `fields[]=${encodeURIComponent(f)}`).join('&');
            url += `&${fieldsParam}`;
        }
        
        if (offset) {
            url += `&offset=${encodeURIComponent(offset)}`;
        }
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${PAT_TOKEN}`
                }
            });
        
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
            const data = await response.json();
            console.log(`Fetched ${data.records.length} records from AirTable`);
            
            allRecords = allRecords.concat(data.records);
            offset = data.offset; // undefined if there are no further pages
            
        } catch (error) {
            console.error(`Error: ${error.message}`);
            return allRecords;
        }
        
    } while (offset);
    
    console.log(`Total records fetched: ${allRecords.length}`);
    return allRecords;
}

async function fetchRecord(channel, searchTerm) {
    console.log("Searching for: " + searchTerm);
    const formula = `{TERM}="${searchTerm.replace(/"/g, '\\"')}"`;
    const fields = ['TERM', 'Final SVG', 'CHANNEL', 'Definition', 'DesignerLookup', 'Nationality'];
    const records = await fetchFromAirtable(formula, fields);
    
    if (records.length > 0) {
        const firstRecord = records[0];

        let term = firstRecord.fields.TERM;
        let uid = firstRecord.UID;
        let finalSvg = firstRecord.fields["Final SVG"][0].url;
        let otherChannels = firstRecord.fields.CHANNEL;
        let definition = firstRecord.fields.Definition;
        let designer = firstRecord.fields.DesignerLookup;
        let designerNationality = firstRecord.fields.Nationality[0];

        let o = new Term(term, uid, finalSvg, channel, otherChannels, definition, designer, designerNationality);
        // console.log(JSON.stringify(o, null, 2))
        return o;
    }
    return null;
}

async function termsByChannel(channel) {
    const formula = `FIND("${channel.replace(/"/g, '\\"')}",ARRAYJOIN({CHANNEL},","))`;
    const records = await fetchFromAirtable(formula, ['TERM']);
    
    if (records.length > 0) {
        console.log(`Found ${records.length} records for channel ${channel}`);

        let terms = records.map(record => record.fields.TERM);

        return terms;
    }
    console.log(`No records found for channel ${channel}`);
    return [];
}



function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function initializeCardFlip() {
    const cardTransitionTime = 500;
    const cardContainer = document.querySelector('.js-popup-card');
    const flipTriggers = document.querySelectorAll('.js-flip-trigger');
    let switching = false;

    flipTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (switching) {
                return false;
            }
            switching = true;

            cardContainer.classList.toggle('is-switched');
            
            setTimeout(() => {
                const cards = cardContainer.querySelectorAll('.popup-card');
                cards.forEach(card => card.classList.toggle('is-active'));
                switching = false;
            }, cardTransitionTime / 2);
        });
    });
}

let popupTemplate = null;

async function loadPopupTemplate() {
    if (!popupTemplate) {
        const response = await fetch('https://thelexicondotorg.github.io/term-selector-tool/popup.html');
        popupTemplate = await response.text();
    }
    return popupTemplate;
}

async function getPopupContent(channel, searchTerm) {
    const content = await fetchRecord(channel, searchTerm);

    const template = await loadPopupTemplate();

    const otherChannelsHtml = content.otherChannels
        .filter(ch => ch !== content.channel) // skip the current Channel
        .map(ch => `<span class="popup-channel-tag">${ch}</span>`)
        .join('');

    
    return template
        .replace(/{{channel}}/g, content.channel)
        .replace(/{{finalSvg}}/g, content.finalSvg)
        .replace(/{{term}}/g, content.term)
        .replace(/{{definition}}/g, content.definition)
        .replace(/{{designer}}/g, content.designer)
        .replace(/{{designerNationality}}/g, content.designerNationality)
        .replace(/{{otherChannelsHtml}}/g, otherChannelsHtml);
}

async function showPopup(channel, searchTerm, event) {
    const existingPopup = document.querySelector('.thelexicon-tst-popup');
    const existingOverlay = document.querySelector('.thelexicon-tst-overlay');
    if (existingPopup) existingPopup.remove();
    if (existingOverlay) existingOverlay.remove();

    // Gray overlay
    const overlay = document.createElement('div');
    overlay.className = 'thelexicon-tst-overlay';
    document.body.appendChild(overlay);
    
    const popup = document.createElement('div');
    popup.className = 'thelexicon-tst-popup';
    popup.innerHTML = '';
  
    document.body.appendChild(popup);
    
    popup.innerHTML = await getPopupContent(channel, searchTerm);


    initializeCardFlip();
    
    overlay.addEventListener('click', () => {
        popup.remove();
        overlay.remove();
    });
    
}

function makeTermClickable(span, channel) {
    span.style.cursor = 'pointer';
    span.addEventListener('click', async (e) => {
        e.stopPropagation();
        await showPopup(channel, span.dataset.term, e);
    });    
}


function getTextNodes(root) {
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
        nodes.push(node);
    }
    return nodes;
}

function createTermRegex(searchTerm) {
    const escapedTerm = escapeRegex(searchTerm);
    return new RegExp(`(?<!\\w)${escapedTerm}(?!\\w)`, 'i');
}



function highlightTextNode(textNode, searchTerm, channel) {
    const text = textNode.textContent;
    const regex = createTermRegex(searchTerm);
    const html = text.replace(regex, match => `<span class="highlight" data-term="${searchTerm}">${match}</span>`);
    
    if (html !== text) {
        const temp = document.createElement('template');
        temp.innerHTML = html;

        temp.content.querySelectorAll('.highlight')
            .forEach(span => makeTermClickable(span, channel));

        textNode.parentNode.replaceChild(temp.content, textNode);
    }
}

function getExcludedTerms() {
    let meta = document.querySelector('meta[name="thelexicon-tst-excluded-terms"]').getAttribute('content');

    return meta
        .toLowerCase()
        .split(',')
        .map(term => term.trim())
          .filter(term => term.length > 0);
}

function getLexicon() {
    const selector = ".thelexicon-tst";
    return document.querySelectorAll(selector);
}

function getChannel() {
    return document.querySelector('meta[name="thelexicon-tst-parent-taxonomy"]').getAttribute('content');
}

async function getTermsToHighlight() {
    const channel = getChannel();
    const searchTerms = await termsByChannel(channel);
    const excludedTerms = getExcludedTerms();
    return searchTerms.filter(term => !excludedTerms.includes(term.toLowerCase()));
}

async function foundTerms() {
    const lexicons = getLexicon();
    const termsToHighlight = await getTermsToHighlight();

    let found = termsToHighlight.filter(searchTerm => {
        const regex = new RegExp(`\\b${searchTerm}\\b`, 'gi');
        return [...lexicons].some(lexicon => {
            const textNodes = getTextNodes(lexicon);
            return textNodes.some(node => regex.test(node.textContent));
        });
    });

    let unique = [...new Set(found)];
    alert(JSON.stringify(unique));
}

async function highlightTerms() {
    let isEnabled = document.querySelector('meta[name="thelexicon-tst-active"]').getAttribute('content');
    if (isEnabled == "0") return;

    const lexicons = getLexicon();
    const channel = getChannel();
    const termsToHighlight = await getTermsToHighlight();

    termsToHighlight.forEach(searchTerm => {
        const allTextNodes = [...lexicons].flatMap(element => getTextNodes(element));
        
        const firstMatch = allTextNodes.find(node => createTermRegex(searchTerm).test(node.textContent));
        
        if (firstMatch) {
            highlightTextNode(firstMatch, searchTerm, channel);
        }
    });
}
