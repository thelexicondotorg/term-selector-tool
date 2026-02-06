const BASE_ID = 'appFTGzhkyFj0r9r1';
const TABLE_ID = 'tblAuOlHMAQPjdhGM';
const PAT_TOKEN = 'path8VP4vIbdD1lCW.2d577815c2badbfc1e4cae7e5cd33048c90c6411fe0cf32b142835821442381c';

class Term {
    constructor(term, channel, definition) {
        this.term = term;
        this.channel = channel;
        this.definition = definition;
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

async function fetchRecord(searchTerm) {
    const formula = `{TERM}="${searchTerm.replace(/"/g, '\\"')}"`;
    const records = await fetchFromAirtable(formula);
    
    if (records.length > 0) {
        const firstRecord = records[0].fields;
        return new Term(searchTerm, firstRecord.CHANNEL, firstRecord.Definition);
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

async function getPopupContent(searchTerm) {
    const content = await fetchRecord(searchTerm);
    if (content) {
        return `<span><strong>${searchTerm}:</strong> ${content.definition}</span>`;
    }
    return `<span><strong>${searchTerm}</strong> (No description available)</span>`;
}

async function showPopup(searchTerm, event) {
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
    
    popup.innerHTML = await getPopupContent(searchTerm);
  
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

function makeTermClickable(span) {
    span.style.cursor = 'pointer';
    span.addEventListener('click', async (e) => {
        e.stopPropagation();
        await showPopup(span.dataset.term, e);
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



function highlightTextNode(textNode, searchTerm) {
    const text = textNode.textContent;
    const regex = createTermRegex(searchTerm);
    const html = text.replace(regex, match => `<span class="highlight" data-term="${searchTerm}">${match}</span>`);
    
    if (html !== text) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
      
        temp.querySelectorAll('.highlight')
            .forEach(span => makeTermClickable(span));
      
        textNode.parentNode.replaceChild(temp, textNode);
    }
}

async function highlightTerms(selector, channel) {
    const lexicon = document.querySelector(selector);
    let searchTerms = await termsByChannel(channel);
    
    searchTerms.forEach(searchTerm => {
        const textNodes = getTextNodes(lexicon);
        
         textNodes.forEach(node => {
            highlightTextNode(node, searchTerm);
        });
    });
}
