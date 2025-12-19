#!/usr/bin/env node

/**
 * Test if the parser includes ictus in note ranges
 */

// Simulate simple parsing to understand what the parser returns
const testCases = [
  "j'",      // pitch + ictus
  "j'_0",    // pitch + ictus + episema + digit
  "k_'",     // pitch + episema + ictus
  "g'",      // simple ictus
];

console.log('Testing note text extraction...\n');

testCases.forEach(noteText => {
  console.log(`\nNote text: "${noteText}"`);
  console.log(`Length: ${noteText.length}`);
  console.log('Characters:');
  for (let i = 0; i < noteText.length; i++) {
    console.log(`  [${i}] '${noteText[i]}' (U+${noteText.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')})`);
  }
  
  // Simulate tokenization
  console.log('\nExpected tokens:');
  let pos = 0;
  
  // Pitch
  if (pos < noteText.length && /[a-npA-NP]/.test(noteText[pos])) {
    console.log(`  Token at pos ${pos}: '${noteText[pos]}' -> pitch (class)`);
    pos++;
  }
  
  // Loop for extra symbols
  while (pos < noteText.length) {
    const char = noteText[pos];
    
    if (char === '.' || char === "'" || char === '_' || char === '`') {
      console.log(`  Token at pos ${pos}: '${char}' -> extra symbol (variable)`);
      const currentSymbol = char;
      pos++;
      
      // Check for digit
      if (currentSymbol === "'" && pos < noteText.length && /[01]/.test(noteText[pos])) {
        console.log(`  Token at pos ${pos}: '${noteText[pos]}' -> digit after ictus (number)`);
        pos++;
      }
      if (currentSymbol === '_' && pos < noteText.length && /[0-5]/.test(noteText[pos])) {
        console.log(`  Token at pos ${pos}: '${noteText[pos]}' -> digit after episema (number)`);
        pos++;
      }
    } else {
      console.log(`  Token at pos ${pos}: '${char}' -> unknown/unhandled`);
      pos++;
    }
  }
});

console.log('\n\n=== CONCLUSION ===');
console.log('If the ictus is not being highlighted, the issue might be:');
console.log('1. Parser not including apostrophe in note range');
console.log('2. Extension needs to be reloaded in VS Code');
console.log('3. TextMate grammar overriding semantic tokens');
console.log('4. semanticTokenScopes mapping issue');
