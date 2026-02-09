const fs = require('fs');
const path = require('path');

const csvPath = 'verified_dataset.csv';
const outputPath = 'banjara_grammar_rules.md';

function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            if (currentCell || currentRow.length > 0) currentRow.push(currentCell.trim());
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(row => {
        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = row[index] || '';
        });
        return entry;
    });
}

function generateMarkdown(data) {
    let md = '# Banjara Grammar & Sentence Structure\n\n';
    md += 'This document is auto-generated from collected data to train AI on Banjara sentence formation.\n\n';

    md += '| ID | English | Banjara | Word Mapping (Grammar Breakdown) |\n';
    md += '|:---|:---|:---|:---|\n';

    data.forEach(item => {
        // Clean up notes to make them readable
        let notes = item.notes || '';
        // If notes look like "Key=Value", format them nicely
        // Example: "Tu=you, kai=what" -> "**Tu** (you), **kai** (what)"

        let formattedNotes = notes;

        // Try to parse basic mappings if they exist
        if (notes.match(/[=-]/)) {
            // Split by comma or semicolon to get pairs
            const parts = notes.split(/,|;/).map(p => p.trim()).filter(p => p);

            const mapping = parts.map(part => {
                // Split by = or - to get key/value
                // Regex splits by = or - but keeps the structure
                let splitChar = part.includes('=') ? '=' : '-';
                if (!part.includes(splitChar)) return part;

                const [banjara, english] = part.split(splitChar).map(s => s ? s.trim() : '');
                if (banjara && english) {
                    return `**${banjara}** (${english})`;
                }
                return part;
            });
            if (mapping.length > 0) {
                formattedNotes = mapping.join('<br> ');
            }
        }

        md += `| ${item.id} | ${item.english} | ${item.banjara} | ${formattedNotes} |\n`;
    });

    return md;
}

try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const data = parseCSV(csvContent);
    const markdown = generateMarkdown(data);

    fs.writeFileSync(outputPath, markdown);
    console.log(`Successfully generated ${outputPath} with ${data.length} entries.`);
} catch (error) {
    console.error('Error:', error.message);
}
