#!/usr/bin/env node

/**
 * Test NABC highlighting in cn attribute values
 */

const path = require('path');

// Import parser
const parserPath = path.join(__dirname, 'lsp-server', 'parser', 'nabc-parser.js');
const { parseNABCSnippet } = require(parserPath);

const testCases = [
  {
    name: 'Basic glyph: pu',
    nabc: 'pu',
    description: 'Two-letter basic glyph'
  },
  {
    name: 'Basic glyph: vi',
    nabc: 'vi',
    description: 'Two-letter basic glyph (virga)'
  },
  {
    name: 'Modified glyph: clhg',
    nabc: 'clhg',
    description: 'Clivis with pitch descriptor'
  },
  {
    name: 'Modified glyph: viM',
    nabc: 'viM',
    description: 'Virga with modifier M (melismatic)'
  },
  {
    name: 'Modified glyph: clS',
    nabc: 'clS',
    description: 'Clivis with modifier S (semi-circled)'
  },
  {
    name: 'Pitch descriptor: tohd',
    nabc: 'tohd',
    description: 'Torculus with pitch descriptor at d'
  },
  {
    name: 'Subpunctis: su2',
    nabc: 'su2',
    description: 'Subpunctis with 2 puncta'
  },
  {
    name: 'Prepunctis: pp3',
    nabc: 'pp3',
    description: 'Prepunctis with 3 puncta'
  }
];

console.log('Testing NABC parsing for cn attribute values...\n');

let allPassed = true;

testCases.forEach((testCase, idx) => {
  console.log(`Test ${idx + 1}: ${testCase.name}`);
  console.log(`  NABC: "${testCase.nabc}"`);
  console.log(`  ${testCase.description}`);
  
  try {
    const startPos = { line: 0, character: 0 };
    const glyphs = parseNABCSnippet(testCase.nabc, startPos);
    
    if (glyphs && glyphs.length > 0) {
      console.log(`  ✓ PASS: Parsed successfully (${glyphs.length} glyph(s))`);
      glyphs.forEach((glyph, gIdx) => {
        console.log(`    Glyph ${gIdx}:`);
        if (glyph.basicGlyph) {
          console.log(`      Basic: ${glyph.basicGlyph.type}`);
        }
        if (glyph.subpunctis) {
          console.log(`      Subpunctis: ${glyph.subpunctis}`);
        }
        if (glyph.prepunctis) {
          console.log(`      Prepunctis: ${glyph.prepunctis}`);
        }
        if (glyph.modifiers && glyph.modifiers.length > 0) {
          console.log(`      Modifiers: ${glyph.modifiers.map(m => m.type).join(', ')}`);
        }
      });
    } else {
      console.log(`  ✗ FAIL: No glyphs parsed`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`  ✗ FAIL: Parse error - ${error.message}`);
    allPassed = false;
  }
  
  console.log();
});

console.log('='.repeat(60));
if (allPassed) {
  console.log('✓ All NABC snippets parsed successfully');
  console.log('\nThe cn attribute values should now be highlighted with NABC syntax:');
  console.log('  - Basic glyphs (pu, vi, cl, etc.) → keyword');
  console.log('  - Modifiers (S, M, G, etc.) → operator');
  console.log('  - Pitch descriptors (h + letter) → function + parameter');
  console.log('  - Sub/prepunctis prefixes → class');
  console.log('  - Numbers → number');
  process.exit(0);
} else {
  console.log('✗ Some tests FAILED');
  process.exit(1);
}
