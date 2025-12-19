#!/usr/bin/env node

/**
 * Debug script to test extra symbols tokenization
 */

const text1 = "(c4) Test(g'_0) (::)";
const text2 = "(c4) Test(g_0') (::)";

console.log("Testing extra symbols tokenization...\n");

// Simulate the tokenization logic
function simulateTokenization(noteText) {
  console.log(`\nInput: ${noteText}`);
  const tokens = [];
  let pos = 0;
  
  while (pos < noteText.length) {
    const char = noteText[pos];
    
    // Pitch
    if (/[a-npA-NP]/.test(char)) {
      tokens.push({ pos, char, type: 'pitch (class)', length: 1 });
      pos++;
      continue;
    }
    
    // Extra symbols: . (punctum mora), ' (ictus), _ (episema), ` (rare)
    if (char === '.' || char === "'" || char === '_' || char === '`') {
      // Check for double punctum mora (..)
      if (char === '.' && pos + 1 < noteText.length && noteText[pos + 1] === '.') {
        tokens.push({ pos, char: '..', type: 'double punctum mora (variable)', length: 2 });
        pos += 2;
      }
      // Ictus, episema, backtick - tokenize symbol separately from position digit
      else {
        // Tokenize the symbol itself
        tokens.push({ pos, char, type: 'symbol (variable)', length: 1 });
        const currentSymbol = char;
        pos++;
        
        // Check for position digit after ' (ictus: 0, 1)
        if (currentSymbol === "'" && pos < noteText.length && /[01]/.test(noteText[pos])) {
          tokens.push({ pos, char: noteText[pos], type: 'digit (number)', length: 1 });
          pos++;
        }
        // Check for position digit after _ (episema: 0-5)
        if (currentSymbol === '_' && pos < noteText.length && /[0-5]/.test(noteText[pos])) {
          tokens.push({ pos, char: noteText[pos], type: 'digit (number)', length: 1 });
          pos++;
        }
        // Check for position digit after ` (backtick: 0, 1)
        if (currentSymbol === '`' && pos < noteText.length && /[01]/.test(noteText[pos])) {
          tokens.push({ pos, char: noteText[pos], type: 'digit (number)', length: 1 });
          pos++;
        }
      }
      continue;
    }
    
    // Unknown character
    tokens.push({ pos, char, type: 'unknown', length: 1 });
    pos++;
  }
  
  // Print results
  console.log("\nTokens:");
  tokens.forEach(token => {
    console.log(`  pos=${token.pos}: "${token.char}" -> ${token.type}`);
  });
  
  return tokens;
}

// Test case 1: g'_0
console.log("\n=== Test Case 1: g'_0 ===");
const tokens1 = simulateTokenization("g'_0");

// Validate
const expected1 = [
  { char: 'g', type: 'pitch' },
  { char: "'", type: 'symbol' },
  { char: '_', type: 'symbol' },
  { char: '0', type: 'digit' }
];

console.log("\nValidation:");
const valid1 = tokens1.length === 4 &&
               tokens1[0].char === 'g' && tokens1[0].type.includes('pitch') &&
               tokens1[1].char === "'" && tokens1[1].type.includes('symbol') &&
               tokens1[2].char === '_' && tokens1[2].type.includes('symbol') &&
               tokens1[3].char === '0' && tokens1[3].type.includes('digit');
console.log(valid1 ? "✓ PASS: g'_0 tokenized correctly" : "✗ FAIL: g'_0 tokenization incorrect");

// Test case 2: g_0'
console.log("\n\n=== Test Case 2: g_0' ===");
const tokens2 = simulateTokenization("g_0'");

// Validate
console.log("\nValidation:");
const valid2 = tokens2.length === 4 &&
               tokens2[0].char === 'g' && tokens2[0].type.includes('pitch') &&
               tokens2[1].char === '_' && tokens2[1].type.includes('symbol') &&
               tokens2[2].char === '0' && tokens2[2].type.includes('digit') &&
               tokens2[3].char === "'" && tokens2[3].type.includes('symbol');
console.log(valid2 ? "✓ PASS: g_0' tokenized correctly" : "✗ FAIL: g_0' tokenization incorrect");

// Test case 3: g_'
console.log("\n\n=== Test Case 3: g_' ===");
const tokens3 = simulateTokenization("g_'");

// Validate
console.log("\nValidation:");
const valid3 = tokens3.length === 3 &&
               tokens3[0].char === 'g' && tokens3[0].type.includes('pitch') &&
               tokens3[1].char === '_' && tokens3[1].type.includes('symbol') &&
               tokens3[2].char === "'" && tokens3[2].type.includes('symbol');
console.log(valid3 ? "✓ PASS: g_' tokenized correctly" : "✗ FAIL: g_' tokenization incorrect");

console.log("\n\n=== Summary ===");
const allPass = valid1 && valid2 && valid3;
console.log(allPass ? "✓ All tests PASSED" : "✗ Some tests FAILED");
process.exit(allPass ? 0 : 1);
