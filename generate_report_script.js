const fs = require('fs');

const csvPath = 'verified_dataset.csv';
const reportPath = 'dataset_status_report.md';

function generateReport() {
    try {
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const rows = parseCSV(csvContent);

        // Skip header row
        const dataRows = rows.slice(1);

        let mdContent = '# Banjara Dataset Status Report\n\n';
        mdContent += `**Total Sentences:** ${dataRows.length}\n\n`;
        mdContent += '| ID | English | Banjara | Audio |\n';
        mdContent += '| :--- | :--- | :--- | :--- |\n';

        dataRows.forEach(row => {
            // Helper to clean text for markdown table
            const clean = (text) => (text || '').replace(/\|/g, '-').replace(/\r?\n/g, ' ').trim();

            let id = '', english = '', banjara = '', audio = '';

            // Validate row length. Standard has 6 columns.
            // If > 6, likely unquoted commas in fields.
            // Strategy: Find the audio file column index (ends with .wav or .pkf)
            let audioIndex = -1;
            for (let i = row.length - 1; i >= 0; i--) {
                const cell = row[i].trim();
                if (cell.endsWith('.wav') || cell.endsWith('.pkf')) {
                    audioIndex = i;
                    break;
                }
            }

            if (audioIndex !== -1) {
                // Found audio anchor
                audio = row[audioIndex];
                id = row[0];

                // Everything between ID (0) and Audio (audioIndex) is text content.
                // We assume English is row[1].
                // Everything else (2 to audioIndex-1) is Banjara + Notes.

                english = row[1];

                // Join the rest as Banjara/Notes
                // Because commas split them, joining with comma restores the original text (mostly)
                // But we want to distinguish Banjara from Notes if possible.
                // Typically: English | Banjara | Notes
                // If we have English at 1, then Banjara starts at 2.
                // If there are extra columns, they belong to Banjara or Notes.
                // Let's just combine them all into the Banjara column for display so the user sees everything.

                const middleParts = row.slice(2, audioIndex);
                banjara = middleParts.join(', '); // Join with comma space for readability

            } else {
                // Fallback if no audio found (maybe empty row or error)
                if (row.length >= 3) {
                    id = row[0];
                    english = row[1];
                    banjara = row.slice(2).join(', ');
                }
            }

            if (!id && !english) return; // Skip empty

            const audioLink = audio ? `[Play](audio/${clean(audio)})` : 'Missing';

            mdContent += `| ${clean(id)} | ${clean(english)} | ${clean(banjara)} | ${audioLink} |\n`;
        });

        fs.writeFileSync(reportPath, mdContent);
        console.log(`Report generated at ${reportPath} with ${dataRows.length} rows.`);

    } catch (err) {
        console.error("Error generating report:", err);
    }
}

// Robust CSV Parser that handles quoted fields correctly
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
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++;

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
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }
    return rows;
}

generateReport();
