const fs = require('fs');

const csvPath = 'verified_dataset.csv';
const reportPath = 'dataset_status_report.md';

const csvContent = fs.readFileSync(csvPath, 'utf8');

// Robust CSV Parser that handles multiline quotes
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
                i++; // Skip escaped quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++; // Handle CRLF

            currentRow.push(currentCell);
            if (currentRow.some(cell => cell.trim() !== '')) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    // Add last row if exists
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows;
}

const parsedRows = parseCSV(csvContent);
const headers = parsedRows[0];
const dataRows = parsedRows.slice(1);

let mdContent = '# Banjara Dataset Status Report\n\n';
mdContent += `**Total Sentences:** ${dataRows.length}\n\n`;
mdContent += '| ID | English | Banjara | Audio |\n';
mdContent += '| :--- | :--- | :--- | :--- |\n';

dataRows.forEach(row => {
    // Expected columns: id,english,banjara,notes,audio_file,timestamp
    // Map assuming index positions
    const id = row[0] || '';
    const english = row[1] || '';
    const banjara = row[2] || '';
    const notes = row[3] || ''; // Not currently used in table but available
    const audio = row[4] || '';

    if (!id && !english) return; // Skip empty rows

    const audioLink = audio && (audio.includes('.wav') || audio.includes('.pkf'))
        ? `[Play](audio/${audio})`
        : 'Missing';

    // Format for markdown table - remove newlines in cell content to prevent table breaking
    const safeEnglish = english.replace(/\r?\n/g, ' ').replace(/\|/g, '-');
    const safeBanjara = banjara.replace(/\r?\n/g, ' ').replace(/\|/g, '-');

    // Check if banjara is empty and maybe notes contain useful info to display? 
    // The user noted missing notes. Let's append notes to Banjara column if useful
    let displayBanjara = safeBanjara;
    if (notes) {
        // clean notes
        const safeNotes = notes.replace(/\r?\n/g, ' ').replace(/\|/g, '-');
        // displayBanjara += `<br>_Notes: ${safeNotes}_`; // HTML line break might work in some markdown viewers
        // OR better just append
        displayBanjara += ` (${safeNotes})`;
    }

    mdContent += `| ${id} | ${safeEnglish} | ${displayBanjara} | ${audioLink} |\n`;
});

fs.writeFileSync(reportPath, mdContent);
console.log(`Report generated at ${reportPath} with ${dataRows.length} rows.`);
