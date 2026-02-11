
const fs = require('fs');

const inputFile = 'raw_script.txt';

try {
    const data = fs.readFileSync(inputFile, 'utf8');
    const lines = data.split('\n');
    const sentences = [];

    lines.forEach(line => {
        const trimmedLine = line.trim();
        // Match lines like "1. Sentence text"
        const match = trimmedLine.match(/^\d+\.\s+(.*)/);
        if (match) {
            sentences.push(match[1].replace(/"/g, '\\"'));
        }
    });

    let jsOutput = 'const defaultSentences = [\n';
    sentences.forEach(text => {
        jsOutput += `    { english: "${text}", suggestion: "" },\n`;
    });
    jsOutput += '];';

    console.log(jsOutput);

} catch (err) {
    console.error(err);
}
