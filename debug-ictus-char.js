#!/usr/bin/env node

/**
 * Debug script to check what character is being used for ictus
 */

const fs = require('fs');
const path = require('path');

// Read showcase.gabc
const showcasePath = path.join(__dirname, 'showcase.gabc');
const content = fs.readFileSync(showcasePath, 'utf-8');

// Find the line with ictus
const lines = content.split('\n');
const ictusLine = lines.find(line => line.includes('ac') && line.includes('cen') && line.includes('tus'));

console.log('Line with ictus:', ictusLine);
console.log('\nCharacter analysis:');

if (ictusLine) {
  // Extract the note groups
  const matches = ictusLine.match(/\([^)]+\)/g);
  if (matches) {
    matches.forEach((match, idx) => {
      console.log(`\nNote group ${idx + 1}: ${match}`);
      for (let i = 0; i < match.length; i++) {
        const char = match[i];
        const code = char.charCodeAt(0);
        console.log(`  [${i}] '${char}' (U+${code.toString(16).toUpperCase().padStart(4, '0')}) - ${code}`);
      }
    });
  }
}

// Test with different apostrophe types
const apostrophes = {
  'ASCII apostrophe': "'",           // U+0027
  'Right single quote': '\u2019',    // U+2019
  'Left single quote': '\u2018',     // U+2018
  'Grave accent': '`',               // U+0060
  'Acute accent': '\u00B4',          // U+00B4
};

console.log('\n\nApostrophe character codes:');
Object.entries(apostrophes).forEach(([name, char]) => {
  console.log(`  ${name}: '${char}' (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}) - ${char.charCodeAt(0)}`);
});

// Check what the code is looking for
console.log('\n\nCode check:');
console.log(`  char === "'" : checking for ASCII apostrophe (U+0027)`);
console.log(`  This matches: ${apostrophes['ASCII apostrophe'] === "'"}`);
console.log(`  Right quote matches: ${apostrophes['Right single quote'] === "'"}`);
