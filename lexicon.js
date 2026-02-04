const BASE_ID = 'appFTGzhkyFj0r9r1';
const TABLE_ID = 'tblAuOlHMAQPjdhGM';
const PAT_TOKEN = 'path8VP4vIbdD1lCW.2d577815c2badbfc1e4cae7e5cd33048c90c6411fe0cf32b142835821442381c';

class Term {
    constructor(term, definition) {
        this.term = term;
        this.definition = definition;
    }
}

async function fetchRecord(searchTerm) {
    const termValue = searchTerm;
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={TERM}="${termValue.replace(/"/g, '\\"')}"`;
  
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${PAT_TOKEN}`
            }
        });
    
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
        const data = await response.json();

        if(data.records.length > 0) {
            const firstRecord = data.records[0].fields;

            console.log("AirTable returned: " + JSON.stringify(firstRecord));

            return new Term(searchTerm, firstRecord.Definition);
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Errore: ${error.message}`);
        return null;
    }
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getPopupContent(searchTerm) {
    const content = await fetchRecord(searchTerm);
    if (content) {
        return `<span><strong>${searchTerm}:</strong> ${content.definition}</span>`;
    }
    return `<span><strong>${searchTerm}</strong> (nessuna descrizione disponibile)</span>`;
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

function highlightTextNode(textNode, searchTerm) {
    const text = textNode.textContent;
    const escapedTerm = escapeRegex(searchTerm);
    const regex = new RegExp(`(?<!\\w)${escapedTerm}(?!\\w)`, 'gi');
    const html = text.replace(regex, `<span class="highlight" data-term="${searchTerm}">${searchTerm}</span>`);
    const temp = document.createElement('div');
    temp.innerHTML = html;
  
    temp.querySelectorAll('.highlight')
        .forEach(span => makeTermClickable(span));
  
    textNode.parentNode.replaceChild(temp, textNode);
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

function highlightTerms(selector, searchTerms) {
    const lexicon = document.querySelector(selector);
    searchTerms.forEach(searchTerm => {
        const textNodes = getTextNodes(lexicon);
        const escapedTerm = escapeRegex(searchTerm);
        const regex = new RegExp(`(?<!\\w)${escapedTerm}(?!\\w)`, 'gi');
    
        textNodes
            .filter(node => regex.test(node.textContent))
            .forEach(node => {
                regex.lastIndex = 0;
                highlightTextNode(node, searchTerm);
            });
    });
}
