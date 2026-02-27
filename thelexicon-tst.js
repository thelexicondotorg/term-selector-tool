const BASE_ID = 'appFTGzhkyFj0r9r1';
const TERM_TABLE_ID = 'tblAuOlHMAQPjdhGM';
const CHANNEL_TABLE_ID = 'tblXxfNlMvFAVaupt';

const PAT_TOKEN = 'path8VP4vIbdD1lCW.2d577815c2badbfc1e4cae7e5cd33048c90c6411fe0cf32b142835821442381c';

class Term {
    constructor(term, uid, finalSvg, channelInfo, otherChannels, definition, designer, designerNationality, relatedTerms) {
        this.term = term;
        this.uid = uid;
        this.finalSvg = finalSvg;
        this.channelInfo = channelInfo;
        this.otherChannels = otherChannels;
        this.definition = definition;
        this.designer = designer;
        this.designerNationality = designerNationality;
        this.relatedTerms = relatedTerms;
    }
}

class Channel {
    constructor(name, definition, color) {
        this.name = name;
        this.definition = definition;
        this.color = color;
    }
}


async function fetchFromAirtable(table, filterFormula, fieldsToReturn = []) {
    let allRecords = [];
    let offset = null;
    
    do {
        let url = `https://api.airtable.com/v0/${BASE_ID}/${table}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
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

async function fetchChannelInfo(channel) {
    const formula = `{name}="${channel}"`;
    const fields = ['Name', 'Channel Definition', 'Color (HEX value)'];
    const records = await fetchFromAirtable(CHANNEL_TABLE_ID, formula);
    
    if (records.length > 0) {
        const firstRecord = records[0];

        let name = firstRecord.fields['Name'];
        let definition = firstRecord.fields['Channel Definition'];
        let color = '#' + firstRecord.fields["Color (HEX value)"];
        
        let o = new Channel(name, definition, color);
        console.log(JSON.stringify(o, null, 2));
        return o;

    }
    return null;
}

async function fetchTerm(channelInfo, searchTerm) {
    console.log("Searching for: " + searchTerm);
    const formula = `{TERM}="${searchTerm.replace(/"/g, '\\"')}"`;
    const fields = ['UID', 'TERM', 'MASTER', 'CHANNEL', 'Definition', 'DesignerLookup', 'Nationality', 'Related terms Lookup'];
    const records = await fetchFromAirtable(TERM_TABLE_ID, formula, fields);
    
    if (records.length > 0) {
        const firstRecord = records[0];

        let term = firstRecord.fields.TERM;
        let uid = firstRecord.fields.UID;
        let finalSvg = firstRecord.fields["MASTER"][0].url;
        let otherChannels = firstRecord.fields.CHANNEL;
        let definition = firstRecord.fields.Definition;
        let designer = firstRecord.fields.DesignerLookup;
        let designerNationality = firstRecord.fields.Nationality[0];
        let relatedTerms = firstRecord.fields["Related terms Lookup"];

        let o = new Term(term, uid, finalSvg, channelInfo, otherChannels, definition, designer, designerNationality, relatedTerms);

        return o;
    }
    return null;
}

async function termsByChannel(channel) {
    const formula = `FIND("${channel.replace(/"/g, '\\"')}",ARRAYJOIN({CHANNEL},","))`;
    const records = await fetchFromAirtable(TERM_TABLE_ID, formula, ['TERM']);
    
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
    let isFlipped = false; // traccia lo stato corrente

    flipTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (switching) return false;
            switching = true;

            cardContainer.classList.remove('is-switching-to-back', 'is-switching-to-front');

            if (!isFlipped) {
                cardContainer.classList.add('is-switching-to-back');
            } else {
                cardContainer.classList.add('is-switching-to-front');
            }

            cardContainer.classList.toggle('is-switched');
            isFlipped = !isFlipped;
            
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
        const response = await fetch('popup.html');
        popupTemplate = await response.text();
    }

    return popupTemplate;
}



async function getPopupContent(channelInfo, searchTerm) {
    const term = await fetchTerm(channelInfo.name, searchTerm);

    const template = await loadPopupTemplate();



    // Other channels section

    const otherChannelNames = term.otherChannels
        .filter(ch => ch !== channelInfo.name); // skip the current channel

    // read color codes for all channels
    const otherChannelInfos = await Promise.all(
        otherChannelNames.map(ch => fetchChannelInfo(ch))
    );

    const otherChannelsHtml = otherChannelInfos
        .filter(ci => ci !== null)
        .map(ci => `<div class="popup-channel" style="color:${ci.color}; border: 1px solid ${ci.color};">${ci.name}</div>`)
        .join('');

    const otherChannelsSection = term.otherChannels.length
        ? `<div class="popup-also-appears">
          <h3 class="popup-also-title">Also used in</h3>
          <div class="popup-other-channels">
            ${otherChannelsHtml}
          </div>
        </div>`
        : '';
    
    // Build the whole Related Terms section.
    // Skip the whole section if there are no Related Terms.
    // Limit the number of Related Terms to 3.

    const relatedTermsToDisplay =
        term.otherChannels.length == 0
            ? term.relatedTerms
            : term.relatedTerms.slice(0, 3);
    
    const relatedTermsSection = term.relatedTerms?.length
        ? `<div class="popup-related-terms-container">
        <h3 class="popup-related-terms-title">Related ${channelInfo.name} terms</h3>
        <div class="popup-related-terms">
           ${relatedTermsToDisplay.map(t => `<span class="popup-term popup-term-back">${t}</span>`).join('')}
           </div>
           </div>`
        : '';

    return template
        .replace(/{{uid}}/g, String(term.uid).padStart(5, '0'))
        .replace(/{{channel}}/g, channelInfo.name)
        .replace(/{{channel.definition}}/g, channelInfo.definition)
        .replace(/{{channel.color}}/g, channelInfo.color)
        .replace(/{{finalSvg}}/g, term.finalSvg)
        .replace(/{{term}}/g, term.term)
        .replace(/{{definition}}/g, term.definition)
        .replace(/{{designer}}/g, term.designer)
        .replace(/{{designerNationality}}/g, term.designerNationality)
        .replace(/{{otherChannelsSection}}/g, otherChannelsSection)
        .replace(/{{relatedTermsSection}}/g, relatedTermsSection);
}

async function showPopup(channelInfo, searchTerm, event) {

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
    
    popup.innerHTML = await getPopupContent(channelInfo, searchTerm);


    initializeCardFlip();
    
    overlay.addEventListener('click', () => {
        popup.remove();
        overlay.remove();
    });
    
}

function makeTermClickable(span, channelInfo) {

    span.style.cursor = 'pointer';
    span.addEventListener('click', async (e) => {
        e.stopPropagation();
        await showPopup(channelInfo, span.dataset.term, e);
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



function highlightTextNode(textNode, searchTerm, channelInfo) {

    const text = textNode.textContent;
    const regex = createTermRegex(searchTerm);
    const html = text.replace(regex, match => `<span class="highlight" data-term="${searchTerm}">${match}</span>`);
    
    if (html !== text) {
        const temp = document.createElement('template');
        temp.innerHTML = html;

        temp.content.querySelectorAll('.highlight')
            .forEach(span => makeTermClickable(span, channelInfo));

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
    const channelInfo = await fetchChannelInfo(channel);

    const termsToHighlight = await getTermsToHighlight();

    termsToHighlight.forEach(searchTerm => {
        const allTextNodes = [...lexicons].flatMap(element => getTextNodes(element));
        
        const firstMatch = allTextNodes.find(node => createTermRegex(searchTerm).test(node.textContent));
        
        if (firstMatch) {
            highlightTextNode(firstMatch, searchTerm, channelInfo);
        }
    });
}
