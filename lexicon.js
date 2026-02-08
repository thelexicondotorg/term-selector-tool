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


async function fetchFromAirtable(filterFormula) {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent(filterFormula)}`;
  
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${PAT_TOKEN}`
            }
        });
    
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
        const data = await response.json();
        return data.records;
    } catch (error) {
        console.error(`Errore: ${error.message}`);
        return [];
    }
}

async function fetchRecord(channel, searchTerm) {
    console.log("Searching for: " + searchTerm);
    const formula = `{TERM}="${searchTerm.replace(/"/g, '\\"')}"`;
    const records = await fetchFromAirtable(formula);
    
    if (records.length > 0) {
        const firstRecord = records[0];
        //        console.log(JSON.stringify(records[0], null, 2));

        let term = firstRecord.fields.TERM;
        let uid = firstRecord.UID;
        let finalSvg = firstRecord.fields["Final SVG"][0].url;
        let otherChannels = firstRecord.fields.CHANNEL;
        let definition = firstRecord.fields.Definition;
        let designer = firstRecord.fields.Designer[0];
        let designerNationality = firstRecord.fields.Nationality[0];

        let o = new Term(term, uid, finalSvg, channel, otherChannels, definition, designer, designerNationality);
        console.log(JSON.stringify(o, null, 2))
        return o;
    }
    return null;
}

async function termsByChannel(channel) {
    const formula = `FIND("${channel.replace(/"/g, '\\"')}",ARRAYJOIN({CHANNEL},","))`;
    const records = await fetchFromAirtable(formula);
    
    if (records.length > 0) {
        console.log(`Found ${records.length} records for channel ${channel}`);
        return records.map(record => record.fields.TERM);
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
        const response = await fetch('popup.html');
        popupTemplate = await response.text();
    }
    return popupTemplate;
}

async function getPopupContent(channel, searchTerm) {
    const content = await fetchRecord(channel, searchTerm);

    const template = await loadPopupTemplate();

    return template
        .replace(/{{channel}}/g, content.channel)
        .replace(/{{finalSvg}}/g, content.finalSvg)
        .replace(/{{term}}/g, content.term)
        .replace(/{{definition}}/g, content.definition)
        .replace(/{{designer}}/g, content.designer)
        .replace(/{{designerNationality}}/g, content.designerNationality)
        .replace(/{{otherChannel1}}/g, content.otherChannels[0] || '')
        .replace(/{{otherChannel2}}/g, content.otherChannels[1] || '')
        .replace(/{{otherChannel3}}/g, content.otherChannels[2] || '');
}

async function showPopup(channel, searchTerm, event) {
    const existingPopup = document.querySelector('.term-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    const popup = document.createElement('div');
    popup.className = 'term-popup';
    popup.innerHTML = 'Loading...';
    popup.style.left = `${event.pageX + 10}px`;
    popup.style.top = `${event.pageY + 10}px`;
  
    document.body.appendChild(popup);
    
    popup.innerHTML = await getPopupContent(channel, searchTerm);


    initializeCardFlip();
    
    // Close popup when user clicks outside
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 0);
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
    return new RegExp(`(?<!\\w)${escapedTerm}(?!\\w)`, 'gi');
}



function highlightTextNode(textNode, searchTerm, channel) {
    const text = textNode.textContent;
    const regex = createTermRegex(searchTerm);
    const html = text.replace(regex, match => `<span class="highlight" data-term="${searchTerm}">${match}</span>`);
    
    if (html !== text) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
      
        temp.querySelectorAll('.highlight')
            .forEach(span => makeTermClickable(span, channel));
      
        textNode.parentNode.replaceChild(temp, textNode);
    }
}

async function highlightTerms(selector, channel) {
    const lexicon = document.querySelector(selector);
    let searchTerms = await termsByChannel(channel);
    
    searchTerms.forEach(searchTerm => {
        const textNodes = getTextNodes(lexicon);
        
         textNodes.forEach(node => {
             highlightTextNode(node, searchTerm, channel);
        });
    });




    // AUTO-OPEN
    const freshFoodSpan = Array.from(document.querySelectorAll('.highlight'))
        .find(span => span.dataset.term.toLowerCase() === 'fresh food farmacy');
    
    if (freshFoodSpan) {
        await showPopup(channel, freshFoodSpan.dataset.term, { pageX: 400, pageY: 300 });
    }
}
