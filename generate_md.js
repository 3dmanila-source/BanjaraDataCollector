
const fs = require('fs');

const inputFile = 'raw_script.txt';
const outputFile = 'review_batch_8.md';
const startId = 81;

try {
    const data = fs.readFileSync(inputFile, 'utf8');
    const lines = data.split('\n');
    const sentences = [];
    let currentPart = "";

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Check for Part header
        if (trimmedLine.startsWith("## **PART")) {
            currentPart = trimmedLine.replace(/## \*\*/g, "").replace(/\*\*/g, "");
            return;
        }

        // Match lines like "1. Sentence text"
        const match = trimmedLine.match(/^\d+\.\s+(.*)/);
        if (match) {
            sentences.push({ part: currentPart, text: match[1] });
        }
    });

    let mdContent = `# Review Batch 8 (Documentary Script)\n\n`;
    mdContent += `Total Sentences: ${sentences.length}\n\n`;
    mdContent += `| ID | English Sentence | Part | My Banjara Translation (Guess) | Corrected Translation (Please Fill) | Notes |\n`;
    mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    let currentId = startId;
    sentences.forEach(s => {
        const text = s.text.replace(/\|/g, "\\|");
        const part = s.part.replace(/\|/g, "\\|");
        mdContent += `| ${currentId} | ${text} | ${part} | | | |\n`;
        currentId++;
    });

    mdContent += `\n**Instructions:**\n`;
    mdContent += `1.  Fill in the "Corrected Translation" column.\n`;
    mdContent += `2.  **Record audio** for these in the tool.\n`;

    fs.writeFileSync(outputFile, mdContent, 'utf8');
    console.log(`Generated ${outputFile} with ${sentences.length} sentences.`);

} catch (err) {
    console.error(err);
}
