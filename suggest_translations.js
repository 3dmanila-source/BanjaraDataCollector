#!/usr/bin/env node
/**
 * Banjara Translation Suggestion Engine
 * 
 * Uses existing verified_dataset.csv word mappings to build a vocabulary
 * and generate rough translation suggestions for new sentences.
 * 
 * Usage:
 *   node suggest_translations.js --batch 16    → Generate suggestions for batch 16
 *   node suggest_translations.js --update-html  → Update HTML tool with suggestions
 */

const fs = require('fs');
const path = require('path');

const DATASET_FILE = 'verified_dataset.csv';
const HTML_FILE = 'banjara_data_collector.html';

// ===== PARSE CSV =====
function parseCSV(content) {
    const rows = [];
    let currentRow = [], currentCell = '', insideQuotes = false;
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const next = content[i + 1];
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
    return rows;
}

// ===== BUILD VOCABULARY FROM WORD MAPPINGS =====
function buildVocabulary() {
    const csvContent = fs.readFileSync(DATASET_FILE, 'utf8');
    const rows = parseCSV(csvContent);
    const headers = rows[0];
    const data = rows.slice(1);

    // English → Banjara vocabulary (lowercase)
    const vocab = {};
    // Also store full sentence pairs for pattern matching
    const sentencePairs = [];

    data.forEach(row => {
        const english = (row[1] || '').trim();
        const banjara = (row[2] || '').trim();
        const notes = (row[3] || '').trim();

        if (english && banjara) {
            sentencePairs.push({ english: english.toLowerCase(), banjara });
        }

        if (!notes) return;

        // Parse word mappings from notes
        // Formats: "word=translation", "word-translation", "word - translation"
        const parts = notes.split(/,|;/).map(p => p.trim()).filter(p => p);

        parts.forEach(part => {
            let splitChar = null;
            if (part.includes('=')) splitChar = '=';
            else if (part.includes('-')) splitChar = '-';

            if (!splitChar) return;

            // Split only on first occurrence
            const idx = part.indexOf(splitChar);
            const banjaraWord = part.substring(0, idx).trim().toLowerCase();
            const englishMeaning = part.substring(idx + 1).trim().toLowerCase();

            if (!banjaraWord || !englishMeaning) return;

            // Store both directions
            // English meanings can have multiple words like "dont have"
            const meanings = englishMeaning.split('/').map(m => m.trim()).filter(m => m);
            meanings.forEach(meaning => {
                if (!vocab[meaning]) vocab[meaning] = [];
                if (!vocab[meaning].includes(banjaraWord)) {
                    vocab[meaning].push(banjaraWord);
                }
            });
        });
    });

    return { vocab, sentencePairs };
}

// ===== SUGGEST TRANSLATION =====
function suggestTranslation(englishSentence, vocab, sentencePairs) {
    const lower = englishSentence.toLowerCase().replace(/[.,!?;:'"()]/g, '');
    const words = lower.split(/\s+/).filter(w => w);

    // First: check if we have a very similar sentence already
    for (const pair of sentencePairs) {
        const pairClean = pair.english.replace(/[.,!?;:'"()]/g, '');
        if (pairClean === lower) {
            return `✅ EXACT: ${pair.banjara}`;
        }
    }

    // Second: word-by-word lookup
    const translated = [];
    const unknown = [];
    const skipWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
        'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'and', 'or', 'but',
        'this', 'that', 'these', 'those', 'it', 'its', 'he', 'she', 'we', 'they',
        'his', 'her', 'our', 'their', 'who', 'which', 'what', 'how', 'not']);

    // Try multi-word matches first (2-3 word phrases)
    let i = 0;
    while (i < words.length) {
        let matched = false;

        // Try 3-word phrase
        if (i + 2 < words.length) {
            const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            if (vocab[phrase3]) {
                translated.push(`${vocab[phrase3][0]}(${phrase3})`);
                i += 3;
                matched = true;
                continue;
            }
        }

        // Try 2-word phrase
        if (i + 1 < words.length) {
            const phrase2 = `${words[i]} ${words[i + 1]}`;
            if (vocab[phrase2]) {
                translated.push(`${vocab[phrase2][0]}(${phrase2})`);
                i += 2;
                matched = true;
                continue;
            }
        }

        // Single word
        const word = words[i];
        if (vocab[word]) {
            translated.push(`${vocab[word][0]}(${word})`);
        } else if (!skipWords.has(word)) {
            translated.push(`❓${word}`);
            unknown.push(word);
        }
        // Skip common words silently
        i++;
    }

    const suggestion = translated.join(' ');
    const unknownCount = unknown.length;
    const totalContent = translated.length;
    const knownCount = totalContent - unknownCount;

    let confidence = totalContent > 0 ? Math.round((knownCount / totalContent) * 100) : 0;

    return `[${confidence}%] ${suggestion}`;
}

// ===== GENERATE SUGGESTIONS FOR A BATCH =====
function generateBatchSuggestions(batchNum) {
    const { vocab, sentencePairs } = buildVocabulary();

    // Read batch sentences from HTML
    const html = fs.readFileSync(HTML_FILE, 'utf8');
    const batchRegex = new RegExp(`${batchNum}:\\s*\\[([\\s\\S]*?)\\]`);
    const match = html.match(batchRegex);

    if (!match) {
        console.error(`❌ Batch ${batchNum} not found in HTML.`);
        return;
    }

    // Extract sentences
    const sentenceRegex = /english:\s*"([^"]+)"/g;
    const sentences = [];
    let m;
    while ((m = sentenceRegex.exec(match[1])) !== null) {
        sentences.push(m[1]);
    }

    console.log(`\n🔍 Suggestions for Batch ${batchNum} (${sentences.length} sentences):\n`);
    console.log(`Vocabulary size: ${Object.keys(vocab).length} English terms mapped\n`);
    console.log('─'.repeat(80));

    const suggestions = [];
    sentences.forEach((sentence, idx) => {
        const suggestion = suggestTranslation(sentence, vocab, sentencePairs);
        suggestions.push({ english: sentence, suggestion });
        console.log(`\n${idx + 1}. ${sentence}`);
        console.log(`   → ${suggestion}`);
    });

    console.log('\n' + '─'.repeat(80));
    console.log('\n Legend: ✅=exact match, ❓=unknown word, (word)=source English');

    return suggestions;
}

// ===== UPDATE HTML WITH SUGGESTIONS =====
function updateHTMLWithSuggestions(batchNum) {
    const { vocab, sentencePairs } = buildVocabulary();
    let html = fs.readFileSync(HTML_FILE, 'utf8');

    const batchRegex = new RegExp(`(${batchNum}:\\s*\\[)([\\s\\S]*?)(\\])`);
    const match = html.match(batchRegex);

    if (!match) {
        console.error(`❌ Batch ${batchNum} not found in HTML.`);
        return;
    }

    // Extract and update sentences with suggestions
    const block = match[2];
    const sentenceRegex = /\{\s*english:\s*"([^"]+)",\s*suggestion:\s*"([^"]*)"\s*\}/g;

    let updatedBlock = block;
    let sm;
    while ((sm = sentenceRegex.exec(block)) !== null) {
        const sentence = sm[1];
        const suggestion = suggestTranslation(sentence, vocab, sentencePairs);
        // Escape for JS string
        const escaped = suggestion.replace(/"/g, '\\"');
        updatedBlock = updatedBlock.replace(
            `suggestion: "${sm[2]}"`,
            `suggestion: "${escaped}"`
        );
    }

    html = html.replace(match[0], match[1] + updatedBlock + match[3]);
    fs.writeFileSync(HTML_FILE, html, 'utf8');
    console.log(`✅ Updated ${HTML_FILE} with suggestions for Batch ${batchNum}`);
}

// ===== MAIN =====
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case '--batch': {
        const batchNum = parseInt(args[1]);
        if (isNaN(batchNum)) { console.error('Usage: node suggest_translations.js --batch <N>'); break; }
        generateBatchSuggestions(batchNum);
        break;
    }
    case '--update-html': {
        const batchNum = parseInt(args[1]);
        if (isNaN(batchNum)) { console.error('Usage: node suggest_translations.js --update-html <N>'); break; }
        generateBatchSuggestions(batchNum);
        updateHTMLWithSuggestions(batchNum);
        break;
    }
    default:
        console.log(`
🔍 Banjara Translation Suggestion Engine

Usage:
  node suggest_translations.js --batch <N>        Show suggestions for batch N
  node suggest_translations.js --update-html <N>  Update HTML tool with suggestions for batch N
        `);
}
