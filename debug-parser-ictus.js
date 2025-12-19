#!/usr/bin/env node

const path = require('path');

// Import the parser
const parserPath = path.join(__dirname, 'lsp-server', 'parser', 'gabc-parser.js');
const { GabcParser } = require(parserPath);

// Test text with ictus
const testText = `name: Test;
%%
(c4) Test(g') word(h'_0) (::)`;

console.log('Testing parser...\n');
console.log('Input text:');
console.log(testText);
console.log('\n' + '='.repeat(50) + '\n');

// Parse
const parser = new GabcParser(testText);
const parsed = parser.parse();

console.log('Parsed result keys:', Object.keys(parsed));
console.log('Notation keys:', Object.keys(parsed.notation || {}));
console.log('\nNotation object:');
console.log(JSON.stringify(parsed.notation, (key, value) => {
  if (key === 'range' || key === 'position') return '[Range/Position]';
  if (Array.isArray(value) && value.length > 2) return `[Array length ${value.length}]`;
  return value;
}, 2));

console.log('Parsed notation syllables:', parsed.notation.syllables.length);

// Check each syllable
console.log('\nChecking syllables with ictus:');
parsed.notation.syllables.forEach((syllable, idx) => {
  if (!syllable.notes) return;
  
  syllable.notes.forEach((noteGroup) => {
    if (noteGroup.gabc && noteGroup.gabc.includes("'")) {
      console.log(`\nFound ictus in syllable ${idx}:`);
      console.log(`  gabc: "${noteGroup.gabc}"`);
      console.log(`  range:`, noteGroup.range);
      
      // Get actual text from range
      const lines = testText.split('\n');
      const rangeText = lines[noteGroup.range.start.line]
        .substring(noteGroup.range.start.character, noteGroup.range.end.character);
      console.log(`  Actual text from range: "${rangeText}"`);
      
      // Check each note in the group
      noteGroup.notes.forEach((note, nIdx) => {
        console.log(`  Note ${nIdx}:`);
        console.log(`    pitch: ${note.pitch}`);
        console.log(`    range:`, note.range);
        const noteText = lines[note.range.start.line]
          .substring(note.range.start.character, note.range.end.character);
        console.log(`    Actual text from note range: "${noteText}"`);
        console.log(`    Has ictus: ${noteText.includes("'")}`);
      });
    }
  });
});
