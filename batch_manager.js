#!/usr/bin/env node
/**
 * Banjara Data Collector - Batch Manager
 * 
 * Automates batch preparation:
 *   node batch_manager.js --next          → Prepare next batch
 *   node batch_manager.js --batch 10      → Prepare specific batch
 *   node batch_manager.js --process       → Process latest recordings into dataset
 *   node batch_manager.js --grammar       → Regenerate grammar rules
 *   node batch_manager.js --status        → Show project status
 */

const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 10;
const SCRIPT_FILE = 'raw_script.txt';
const HTML_FILE = 'banjara_data_collector.html';
const DATASET_FILE = 'verified_dataset.csv';
const GRAMMAR_FILE = 'banjara_grammar_rules.md';
const ID_OFFSET = 80; // Sentence 1 in script maps to ID 81

// ===== PARSE RAW SCRIPT =====
function parseScript() {
    const data = fs.readFileSync(SCRIPT_FILE, 'utf8');
    const lines = data.split('\n');
    const sentences = [];
    let currentPart = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('## **PART')) {
            currentPart = trimmed.replace(/## \*\*/g, '').replace(/\*\*/g, '').trim();
            return;
        }
        const match = trimmed.match(/^\d+\.\s+(.*)/);
        if (match) {
            sentences.push({ part: currentPart, text: match[1] });
        }
    });
    return sentences;
}

// ===== GET BATCH SENTENCES =====
function getBatchSentences(batchNum) {
    const allSentences = parseScript();
    const startIdx = (batchNum - 8) * BATCH_SIZE; // Batch 8 = index 0
    const endIdx = startIdx + BATCH_SIZE;

    if (startIdx >= allSentences.length) {
        console.error(`❌ Batch ${batchNum} is beyond available sentences (${allSentences.length} total).`);
        return null;
    }

    const batch = allSentences.slice(startIdx, endIdx);
    const startId = ID_OFFSET + startIdx + 1;

    return { sentences: batch, startId, batchNum };
}

// ===== DETERMINE NEXT BATCH =====
function getNextBatchNum() {
    const files = fs.readdirSync('.').filter(f => f.match(/^review_batch_\d+\.md$/));
    if (files.length === 0) return 8;

    const nums = files.map(f => parseInt(f.match(/\d+/)[0]));
    return Math.max(...nums) + 1;
}

// ===== GENERATE REVIEW MARKDOWN =====
function generateReviewMD(batchData) {
    const { sentences, startId, batchNum } = batchData;
    const endId = startId + sentences.length - 1;

    let md = `# Review Batch ${batchNum} (Sentences ${startId}-${endId})\n\n`;
    md += `This batch contains ${sentences.length} sentences of the documentary script.\n\n`;
    md += `| ID | English Sentence | Part | My Banjara Translation (Guess) | Corrected Translation (Please Fill) | Notes |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    sentences.forEach((s, i) => {
        const text = s.text.replace(/\|/g, '\\|');
        const part = s.part.replace(/\|/g, '\\|');
        md += `| ${startId + i} | ${text} | ${part} | | | |\n`;
    });

    md += `\n**Instructions:**\n`;
    md += `1.  Fill in the "Corrected Translation" column.\n`;
    md += `2.  **Record audio** for these in the tool.\n`;

    return md;
}

// ===== UPDATE HTML TOOL =====
function updateHTML(batchData) {
    const { sentences, startId, batchNum } = batchData;

    let html = fs.readFileSync(HTML_FILE, 'utf8');

    // Build new batch entry lines
    const sentenceLines = sentences.map(s => {
        const escaped = s.text.replace(/"/g, '\\"');
        return `                { english: "${escaped}", suggestion: "" },`;
    }).join('\n');

    const newBatchBlock = `            ${batchNum}: [\n${sentenceLines}\n            ]`;

    // Check if batch already exists in the batches object
    const batchRegex = new RegExp(`(\\s*)${batchNum}:\\s*\\[[\\s\\S]*?\\]`);
    if (batchRegex.test(html)) {
        // Replace existing batch
        html = html.replace(batchRegex, `$1${batchNum}: [\n${sentenceLines}\n            ]`);
    } else {
        // Add new batch before the closing of batches object
        html = html.replace(
            /(const batches = \{[\s\S]*?)(        \};)/,
            `$1,\n${newBatchBlock}\n$2`
        );
    }

    // Update currentBatch
    html = html.replace(
        /let currentBatch = \d+;/,
        `let currentBatch = ${batchNum};`
    );

    fs.writeFileSync(HTML_FILE, html, 'utf8');
}

// ===== PROCESS RECORDINGS =====
function processRecordings(latestDir) {
    const recordingsPath = latestDir || path.join('F:', 'Banjara AI', 'Latest recordings');

    // Find CSV in recordings folder
    const files = fs.readdirSync(recordingsPath);
    const csvFile = files.find(f => f.endsWith('.csv'));

    if (!csvFile) {
        console.error('❌ No CSV file found in recordings folder.');
        return;
    }

    const csvData = fs.readFileSync(path.join(recordingsPath, csvFile), 'utf8');
    const lines = csvData.split('\n');

    // Determine start ID from dataset
    const dataset = fs.readFileSync(DATASET_FILE, 'utf8');
    const datasetLines = dataset.trim().split('\n');
    const lastLine = datasetLines[datasetLines.length - 1];
    const lastId = parseInt(lastLine.split(',')[0]) || 0;
    const startId = lastId + 1;

    const newRows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (state machine)
        const row = [];
        let field = '', inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const c = line[j];
            if (c === '"') { inQuotes = !inQuotes; }
            else if (c === ',' && !inQuotes) { row.push(field); field = ''; }
            else { field += c; }
        }
        row.push(field);

        if (row.length >= 6) {
            const currentId = parseInt(row[0].replace(/"/g, ''));
            if (!isNaN(currentId)) {
                const newId = startId + (currentId - 1);
                newRows.push(`${newId},${row[1]},${row[2]},${row[3]},${row[4]},${row[5]}`);
            }
        }
    }

    if (newRows.length > 0) {
        fs.appendFileSync(DATASET_FILE, newRows.join('\n') + '\n', 'utf8');
        console.log(`✅ Appended ${newRows.length} rows to ${DATASET_FILE} (IDs ${startId}-${startId + newRows.length - 1}).`);
    }

    // Copy audio files
    const audioFiles = files.filter(f => f.endsWith('.webm') || f.endsWith('.wav'));
    const audioDir = path.join('.', 'audio');
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);

    audioFiles.forEach(f => {
        fs.copyFileSync(path.join(recordingsPath, f), path.join(audioDir, f));
    });
    console.log(`✅ Copied ${audioFiles.length} audio files to audio/.`);
}

// ===== REGENERATE GRAMMAR =====
function regenerateGrammar() {
    const csvContent = fs.readFileSync(DATASET_FILE, 'utf8');

    // Parse CSV
    const rows = [];
    let currentRow = [], currentCell = '', insideQuotes = false;
    for (let i = 0; i < csvContent.length; i++) {
        const char = csvContent[i];
        const next = csvContent[i + 1];
        if (char === '"') {
            if (insideQuotes && next === '"') { currentCell += '"'; i++; }
            else { insideQuotes = !insideQuotes; }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell.trim()); currentCell = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && next === '\n') i++;
            if (currentCell || currentRow.length > 0) currentRow.push(currentCell.trim());
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = []; currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) { currentRow.push(currentCell.trim()); rows.push(currentRow); }

    const headers = rows[0].map(h => h.trim());
    const data = rows.slice(1).map(row => {
        const entry = {};
        headers.forEach((h, i) => { entry[h] = row[i] || ''; });
        return entry;
    });

    // Generate markdown
    let md = '# Banjara Grammar & Sentence Structure\n\n';
    md += 'This document is auto-generated from collected data to train AI on Banjara sentence formation.\n\n';
    md += '| ID | English | Banjara | Word Mapping (Grammar Breakdown) |\n';
    md += '|:---|:---|:---|:---|\n';

    data.forEach(item => {
        let notes = item.notes || '';
        let formattedNotes = notes;
        if (notes.match(/[=-]/)) {
            const parts = notes.split(/,|;/).map(p => p.trim()).filter(p => p);
            const mapping = parts.map(part => {
                let splitChar = part.includes('=') ? '=' : '-';
                if (!part.includes(splitChar)) return part;
                const [banjara, english] = part.split(splitChar).map(s => s ? s.trim() : '');
                if (banjara && english) return `**${banjara}** (${english})`;
                return part;
            });
            if (mapping.length > 0) formattedNotes = mapping.join('<br> ');
        }
        md += `| ${item.id} | ${item.english} | ${item.banjara} | ${formattedNotes} |\n`;
    });

    fs.writeFileSync(GRAMMAR_FILE, md);
    console.log(`✅ Regenerated ${GRAMMAR_FILE} with ${data.length} entries.`);
}

// ===== STATUS =====
function showStatus() {
    const allSentences = parseScript();
    const dataset = fs.readFileSync(DATASET_FILE, 'utf8');
    const datasetRows = dataset.trim().split('\n').length - 1;
    const nextBatch = getNextBatchNum();
    const nextStartId = ID_OFFSET + (nextBatch - 8) * BATCH_SIZE + 1;
    const totalBatches = Math.ceil(allSentences.length / BATCH_SIZE) + 7;
    const audioFiles = fs.readdirSync('audio').length;

    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║   📊 Banjara Data Collector Status       ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    console.log(`║  Script sentences:  ${String(allSentences.length).padStart(4)}               ║`);
    console.log(`║  Dataset entries:   ${String(datasetRows).padStart(4)}               ║`);
    console.log(`║  Audio files:       ${String(audioFiles).padStart(4)}               ║`);
    console.log(`║  Current batch:     ${String(nextBatch - 1).padStart(4)}               ║`);
    console.log(`║  Next batch:        ${String(nextBatch).padStart(4)} (ID ${nextStartId}-${nextStartId + BATCH_SIZE - 1})    ║`);
    console.log(`║  Remaining batches: ${String(totalBatches - nextBatch + 1).padStart(4)}               ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);
}

// ===== MAIN =====
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case '--next': {
        const batchNum = getNextBatchNum();
        const batchData = getBatchSentences(batchNum);
        if (!batchData) break;

        const mdFile = `review_batch_${batchNum}.md`;
        const mdContent = generateReviewMD(batchData);
        fs.writeFileSync(mdFile, mdContent, 'utf8');
        console.log(`✅ Created ${mdFile} (${batchData.sentences.length} sentences, IDs ${batchData.startId}-${batchData.startId + batchData.sentences.length - 1})`);

        updateHTML(batchData);
        console.log(`✅ Updated ${HTML_FILE} with Batch ${batchNum}`);

        regenerateGrammar();
        showStatus();
        break;
    }

    case '--batch': {
        const batchNum = parseInt(args[1]);
        if (isNaN(batchNum)) { console.error('Usage: node batch_manager.js --batch <number>'); break; }

        const batchData = getBatchSentences(batchNum);
        if (!batchData) break;

        const mdFile = `review_batch_${batchNum}.md`;
        const mdContent = generateReviewMD(batchData);
        fs.writeFileSync(mdFile, mdContent, 'utf8');
        console.log(`✅ Created ${mdFile}`);

        updateHTML(batchData);
        console.log(`✅ Updated ${HTML_FILE} with Batch ${batchNum}`);
        break;
    }

    case '--process': {
        const dir = args[1];
        processRecordings(dir);
        regenerateGrammar();
        break;
    }

    case '--grammar': {
        regenerateGrammar();
        break;
    }

    case '--status': {
        showStatus();
        break;
    }

    default:
        console.log(`
🎙️  Banjara Batch Manager

Usage:
  node batch_manager.js --next              Prepare next batch automatically
  node batch_manager.js --batch <N>         Prepare specific batch number
  node batch_manager.js --process [dir]     Process recordings from folder
  node batch_manager.js --grammar           Regenerate grammar rules
  node batch_manager.js --status            Show project status
        `);
}
