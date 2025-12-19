#!/usr/bin/env node

/**
 * Exact simulation of semanticTokensProvider tokenization logic
 */

const tokenTypes = [
  'header',        // 0
  'keyword',       // 1
  'string',        // 2
  'comment',       // 3
  'number',        // 4
  'operator',      // 5
  'parameter',     // 6
  'property',      // 7
  'variable',      // 8
  'function',      // 9
  'class',         // 10
  'namespace',     // 11
  'type',          // 12
  'decorator',     // 13
  'macro',         // 14
  'regexp',        // 15
  'label',         // 16
  'modifier',      // 17
  'customLiteral'  // 18
];

function getTokenType(type) {
  const index = tokenTypes.indexOf(type);
  return index !== -1 ? index : 0;
}

function getTokenTypeName(index) {
  return tokenTypes[index] || 'unknown';
}

// Simulate the exact tokenization logic from semanticTokensProvider.ts
function tokenizeNote(noteText) {
  const tokens = [];
  let pos = 0;
  
  console.log(`\nTokenizing: "${noteText}"`);
  console.log(`${'='.repeat(40)}`);
  
  // 0. Check for initio debilis prefix (-)
  if (pos < noteText.length && noteText[pos] === '-') {
    tokens.push({
      pos,
      char: noteText[pos],
      type: getTokenType('parameter'),
      typeName: 'parameter',
      length: 1
    });
    pos++;
  }
  
  // 1. Tokenize pitch [a-npA-NP] as class
  if (pos < noteText.length && /[a-npA-NP]/.test(noteText[pos])) {
    const pitchChar = noteText[pos];
    const isUpper = /[A-NP]/.test(pitchChar);
    
    tokens.push({
      pos,
      char: pitchChar,
      type: getTokenType('class'),
      typeName: 'class',
      length: 1
    });
    pos++;
    
    // Check for leaning indicator for uppercase pitch (0, 1, 2)
    if (isUpper && pos < noteText.length && /[012]/.test(noteText[pos])) {
      tokens.push({
        pos,
        char: noteText[pos],
        type: getTokenType('number'),
        typeName: 'number',
        length: 1
      });
      pos++;
    }
  }
  
  // 2. Check for rhythmic signs r1-r8 BEFORE note shapes
  const char = noteText[pos];
  if (char === 'r' && pos + 1 < noteText.length && /[1-8]/.test(noteText[pos + 1])) {
    tokens.push({
      pos,
      char: noteText[pos] + noteText[pos + 1],
      type: getTokenType('variable'),
      typeName: 'variable',
      length: 2
    });
    pos += 2;
  }
  
  // 3. Tokenize note shapes [wvosqr=~<>O] as parameter
  else if (pos < noteText.length && /[wvosqr=~<>O]/.test(noteText[pos])) {
    const isCavum = noteText[pos] === 'r';
    const isOriscus = noteText[pos] === 'o' || noteText[pos] === 'O';
    
    // Special handling: r0 is 2-character note shape (cavum with bars)
    let shapeLength = 1;
    if (isCavum && pos + 1 < noteText.length && noteText[pos + 1] === '0') {
      shapeLength = 2;
    }
    
    tokens.push({
      pos,
      char: noteText.substring(pos, pos + shapeLength),
      type: getTokenType('parameter'),
      typeName: 'parameter',
      length: shapeLength
    });
    pos += shapeLength;
    
    // Check for oriscus orientation digit (o0, o1, O0, O1)
    if (isOriscus && shapeLength === 1 && pos < noteText.length && /[01]/.test(noteText[pos])) {
      tokens.push({
        pos,
        char: noteText[pos],
        type: getTokenType('number'),
        typeName: 'number',
        length: 1
      });
      pos++;
    }
  }
  
  // 4. Tokenize alterations
  if (pos < noteText.length) {
    const char = noteText[pos];
    let alterationLength = 0;
    
    if (char === '#' && pos + 1 < noteText.length && noteText[pos + 1] === '#') {
      alterationLength = 2;
    } else if (/[xyXY#]/.test(char)) {
      alterationLength = 1;
    }
    
    if (alterationLength > 0) {
      tokens.push({
        pos,
        char: noteText.substring(pos, pos + alterationLength),
        type: getTokenType('macro'),
        typeName: 'macro',
        length: alterationLength
      });
      pos += alterationLength;
      
      // Check for ? after alteration
      if (pos < noteText.length && noteText[pos] === '?') {
        tokens.push({
          pos,
          char: '?',
          type: getTokenType('macro'),
          typeName: 'macro',
          length: 1
        });
        pos++;
      }
    }
  }
  
  // 5. Extra symbols: . (punctum mora), ' (ictus), _ (episema), ` (rare)
  while (pos < noteText.length) {
    const char = noteText[pos];
    
    if (char === '.' || char === "'" || char === '_' || char === '`') {
      // Check for double punctum mora (..)
      if (char === '.' && pos + 1 < noteText.length && noteText[pos + 1] === '.') {
        tokens.push({
          pos,
          char: '..',
          type: getTokenType('variable'),
          typeName: 'variable',
          length: 2
        });
        pos += 2;
      }
      // Ictus, episema, backtick - tokenize symbol separately from position digit
      else {
        // Tokenize the symbol itself
        tokens.push({
          pos,
          char: char,
          type: getTokenType('variable'),
          typeName: 'variable',
          length: 1
        });
        const currentSymbol = char;
        pos++;
        
        console.log(`  -> Tokenized symbol '${currentSymbol}' at pos ${pos - 1}`);
        console.log(`  -> Now at pos ${pos}, next char: '${noteText[pos] || 'END'}'`);
        
        // Check for position digit after ' (ictus: 0, 1)
        if (currentSymbol === "'" && pos < noteText.length && /[01]/.test(noteText[pos])) {
          console.log(`  -> Found ictus digit '${noteText[pos]}'`);
          tokens.push({
            pos,
            char: noteText[pos],
            type: getTokenType('number'),
            typeName: 'number',
            length: 1
          });
          pos++;
        }
        // Check for position digit after _ (episema: 0-5)
        if (currentSymbol === '_' && pos < noteText.length && /[0-5]/.test(noteText[pos])) {
          console.log(`  -> Found episema digit '${noteText[pos]}'`);
          tokens.push({
            pos,
            char: noteText[pos],
            type: getTokenType('number'),
            typeName: 'number',
            length: 1
          });
          pos++;
        }
        // Check for position digit after ` (backtick: 0, 1)
        if (currentSymbol === '`' && pos < noteText.length && /[01]/.test(noteText[pos])) {
          console.log(`  -> Found backtick digit '${noteText[pos]}'`);
          tokens.push({
            pos,
            char: noteText[pos],
            type: getTokenType('number'),
            typeName: 'number',
            length: 1
          });
          pos++;
        }
      }
    } else {
      // Unknown character
      tokens.push({
        pos,
        char: char,
        type: -1,
        typeName: 'unknown',
        length: 1
      });
      pos++;
    }
  }
  
  // Print results
  console.log('\nTokens generated:');
  tokens.forEach((token, index) => {
    console.log(`  ${index}: pos=${token.pos}, char="${token.char}", type=${token.typeName} (${token.type}), length=${token.length}`);
  });
  
  return tokens;
}

// Test cases
console.log('Testing Extra Symbols Tokenization');
console.log('===================================\n');

// Test 1: g'_0
console.log('\n>>> Test 1: g\'_0');
const tokens1 = tokenizeNote("g'_0");
const valid1 = tokens1.length === 4 &&
               tokens1[0].char === 'g' && tokens1[0].typeName === 'class' &&
               tokens1[1].char === "'" && tokens1[1].typeName === 'variable' &&
               tokens1[2].char === '_' && tokens1[2].typeName === 'variable' &&
               tokens1[3].char === '0' && tokens1[3].typeName === 'number';
console.log(`\nResult: ${valid1 ? '✓ PASS' : '✗ FAIL'}`);

// Test 2: g_0'
console.log('\n\n>>> Test 2: g_0\'');
const tokens2 = tokenizeNote("g_0'");
const valid2 = tokens2.length === 4 &&
               tokens2[0].char === 'g' && tokens2[0].typeName === 'class' &&
               tokens2[1].char === '_' && tokens2[1].typeName === 'variable' &&
               tokens2[2].char === '0' && tokens2[2].typeName === 'number' &&
               tokens2[3].char === "'" && tokens2[3].typeName === 'variable';
console.log(`\nResult: ${valid2 ? '✓ PASS' : '✗ FAIL'}`);

// Test 3: g_'
console.log('\n\n>>> Test 3: g_\'');
const tokens3 = tokenizeNote("g_'");
const valid3 = tokens3.length === 3 &&
               tokens3[0].char === 'g' && tokens3[0].typeName === 'class' &&
               tokens3[1].char === '_' && tokens3[1].typeName === 'variable' &&
               tokens3[2].char === "'" && tokens3[2].typeName === 'variable';
console.log(`\nResult: ${valid3 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n\n===================================');
console.log('SUMMARY');
console.log('===================================');
const allPass = valid1 && valid2 && valid3;
console.log(allPass ? '✓ All tests PASSED' : '✗ Some tests FAILED');

if (!allPass) {
  console.log('\nFailed tests:');
  if (!valid1) console.log('  - g\'_0');
  if (!valid2) console.log('  - g_0\'');
  if (!valid3) console.log('  - g_\'');
}

process.exit(allPass ? 0 : 1);
