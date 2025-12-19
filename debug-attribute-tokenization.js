#!/usr/bin/env node

/**
 * Test that attributes don't interfere with note tokenization
 */

const testCases = [
  {
    name: 'Shape attribute with s in name',
    gabc: 'gh[shape:stroke]i',
    description: 'Should not tokenize "s" from "shape" as stropha note shape'
  },
  {
    name: 'Choral sign with c in name',
    gabc: 'd[cs:vi]e',
    description: 'Should not tokenize "c" from "cs" as pitch'
  },
  {
    name: 'Multiple notes with attributes',
    gabc: 'd[ob:0;2mm]e[ub:1{]f[ub:1}]',
    description: 'Should skip all attribute brackets correctly'
  },
  {
    name: 'Attribute with note-like characters',
    gabc: 'g[alt:abcdefg]h',
    description: 'Should not tokenize pitches inside attribute value'
  }
];

console.log('Testing attribute skipping in tokenization...\n');

// Simulate the tokenization logic with attribute skipping
function simulateTokenization(gabcText) {
  const tokens = [];
  let pos = 0;
  
  while (pos < gabcText.length) {
    const char = gabcText[pos];
    
    // Skip attributes
    if (char === '[') {
      const closingBracket = gabcText.indexOf(']', pos);
      if (closingBracket !== -1) {
        tokens.push({
          pos,
          text: gabcText.substring(pos, closingBracket + 1),
          type: 'SKIPPED_ATTRIBUTE',
          length: closingBracket + 1 - pos
        });
        pos = closingBracket + 1;
        continue;
      }
    }
    
    // Pitch
    if (/[a-npA-NP]/.test(char)) {
      tokens.push({ pos, text: char, type: 'PITCH', length: 1 });
      pos++;
      continue;
    }
    
    // Note shape
    if (/[wvosqr=~<>O]/.test(char)) {
      tokens.push({ pos, text: char, type: 'NOTE_SHAPE', length: 1 });
      pos++;
      continue;
    }
    
    // Extra symbols
    if (/['._`]/.test(char)) {
      tokens.push({ pos, text: char, type: 'EXTRA_SYMBOL', length: 1 });
      pos++;
      continue;
    }
    
    // Other
    tokens.push({ pos, text: char, type: 'OTHER', length: 1 });
    pos++;
  }
  
  return tokens;
}

let allPassed = true;

testCases.forEach((testCase, idx) => {
  console.log(`Test ${idx + 1}: ${testCase.name}`);
  console.log(`  GABC: "${testCase.gabc}"`);
  console.log(`  ${testCase.description}`);
  
  const tokens = simulateTokenization(testCase.gabc);
  
  console.log('  Tokens:');
  tokens.forEach(token => {
    console.log(`    [${token.pos}] "${token.text}" → ${token.type}`);
  });
  
  // Check if any characters from inside attributes were tokenized as notes
  const attributeContents = [];
  let inAttribute = false;
  let attrStart = -1;
  
  for (let i = 0; i < testCase.gabc.length; i++) {
    if (testCase.gabc[i] === '[') {
      inAttribute = true;
      attrStart = i;
    } else if (testCase.gabc[i] === ']') {
      attributeContents.push({
        start: attrStart,
        end: i,
        text: testCase.gabc.substring(attrStart + 1, i)
      });
      inAttribute = false;
    }
  }
  
  let hasError = false;
  tokens.forEach(token => {
    if (token.type !== 'SKIPPED_ATTRIBUTE') {
      // Check if this token position is inside an attribute
      attributeContents.forEach(attr => {
        if (token.pos > attr.start && token.pos < attr.end) {
          console.log(`  ✗ ERROR: Character at pos ${token.pos} ("${token.text}") inside attribute was tokenized as ${token.type}`);
          hasError = true;
          allPassed = false;
        }
      });
    }
  });
  
  if (!hasError) {
    console.log(`  ✓ PASS: Attributes correctly skipped\n`);
  } else {
    console.log();
  }
});

console.log('='.repeat(60));
if (allPassed) {
  console.log('✓ All tests PASSED');
  process.exit(0);
} else {
  console.log('✗ Some tests FAILED');
  process.exit(1);
}
