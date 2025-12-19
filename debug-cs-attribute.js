#!/usr/bin/env node

// Debug script to test NABC parsing for cs (choral signs) attribute values
// The cs attribute contains NABC code just like cn

const { parseNABCSnippet } = require('./lsp-server/parser/nabc-parser.js');

// Test NABC snippets that might appear in cs attribute values
const testCases = [
  'pu',     // Basic glyph: punctum
  'vi',     // Basic glyph: virga
  'clhg',   // Clivis with pitch descriptor
  'viM',    // Virga melismatic (modified)
  'clS',    // Clivis semi-circled (modified)
  'tohd',   // Torculus with pitch descriptor
  'su2',    // Subpunctis with count
  'pp3',    // Prepunctis with count
];

console.log('Testing NABC parsing for cs (choral signs) attribute values:\n');

let allPassed = true;

testCases.forEach((snippet, index) => {
  console.log(`Test ${index + 1}: NABC snippet: ${snippet}`);
  
  try {
    const result = parseNABCSnippet(snippet, { line: 0, character: 0 });
    
    if (result && result.length > 0) {
      console.log(`  ✓ PASS: Parsed successfully (${result.length} glyph(s))`);
      
      // Show first glyph details
      const glyph = result[0];
      if (glyph.basic) console.log(`    Basic: ${glyph.basic}`);
      if (glyph.modifiers && glyph.modifiers.length > 0) {
        console.log(`    Modifiers: ${glyph.modifiers.join(', ')}`);
      }
      if (glyph.pitchPrefix) console.log(`    Pitch prefix: ${glyph.pitchPrefix}`);
      if (glyph.pitchLetter) console.log(`    Pitch letter: ${glyph.pitchLetter}`);
      if (glyph.subpunctis) console.log(`    Subpunctis: ${JSON.stringify(glyph.subpunctis)}`);
      if (glyph.prepunctis) console.log(`    Prepunctis: ${JSON.stringify(glyph.prepunctis)}`);
    } else {
      console.log(`  ✗ FAIL: No glyphs returned`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}`);
    allPassed = false;
  }
  
  console.log();
});

console.log('============================================================');
if (allPassed) {
  console.log('✓ All NABC snippets parsed successfully');
  process.exit(0);
} else {
  console.log('✗ Some NABC snippets failed to parse');
  process.exit(1);
}
