#!/usr/bin/env node

const path = require('path');

// Import the parser
const parserPath = path.join(__dirname, 'lsp-server', 'parser', 'gabc-parser.js');
const { GabcParser } = require(parserPath);

// Test text with attributes
const testText = `name: Test;
%%
(c4) Test(gh[shape:stroke]i) word(d[cs:vi]e) (::)`;

console.log('Testing parser with attributes...\n');
console.log('Input text:');
console.log(testText);
console.log('\n' + '='.repeat(50) + '\n');

// Parse
const parser = new GabcParser(testText);
const parsed = parser.parse();

console.log('Parsed notation syllables:', parsed.notation.syllables.length);

// Check each syllable for attributes
parsed.notation.syllables.forEach((syllable, idx) => {
  if (!syllable.notes) return;
  
  syllable.notes.forEach((noteGroup, ngIdx) => {
    if (noteGroup.gabc && noteGroup.gabc.includes('[')) {
      console.log(`\nFound attribute in syllable ${idx}, note group ${ngIdx}:`);
      console.log(`  gabc: "${noteGroup.gabc}"`);
      console.log(`  range:`, noteGroup.range);
      
      // Check for attributes array
      if (noteGroup.attributes && noteGroup.attributes.length > 0) {
        console.log(`  attributes: ${noteGroup.attributes.length}`);
        noteGroup.attributes.forEach((attr, attrIdx) => {
          console.log(`    Attribute ${attrIdx}:`);
          console.log(`      range:`, attr.range);
          
          const lines = testText.split('\n');
          const attrText = lines[attr.range.start.line]
            .substring(attr.range.start.character, attr.range.end.character);
          console.log(`      text: "${attrText}"`);
          
          if (attr.name) console.log(`      name: "${attr.name}"`);
          if (attr.value) console.log(`      value: "${attr.value}"`);
        });
      } else {
        console.log(`  ⚠️  No attributes array found!`);
      }
    }
  });
});
