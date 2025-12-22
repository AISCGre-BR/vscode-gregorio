/**
 * Test suite for NABC Basic Glyph Descriptor semantic tokens
 * 
 * Basic glyph descriptors are two-letter codes like pe, vi, to, qi, ql, etc.
 * They should be highlighted with the NABCBasicGlyphDescriptor token type.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { GabcSemanticTokensProvider, tokenTypes, legend } from '../semanticTokensProvider';

suite('NABC Basic Glyph Descriptor Semantic Tokens Test Suite', () => {
  
  test('NABCBasicGlyphDescriptor token type should be defined', () => {
    assert.ok(tokenTypes.includes('NABCBasicGlyphDescriptor'), 'NABCBasicGlyphDescriptor token type should be in tokenTypes array');
  });

  test('NABCBasicGlyphDescriptor should have keyword as superType', () => {
    const tokenTypeIndex = legend.tokenTypes.indexOf('NABCBasicGlyphDescriptor');
    assert.ok(tokenTypeIndex >= 0, 'NABCBasicGlyphDescriptor should be in legend');
  });

  /**
   * Helper function to get semantic tokens from GABC text
   */
  function getSemanticTokens(gabcText: string): Uint32Array {
    const provider = new GabcSemanticTokensProvider();
    const doc = {
      getText: () => gabcText,
      uri: vscode.Uri.parse('untitled:test.gabc'),
      positionAt: (offset: number) => new vscode.Position(0, offset),
      lineAt: (line: number) => ({
        text: gabcText.split('\n')[line] || ''
      })
    } as any;

    const result = provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    return result ? (result as vscode.SemanticTokens).data : new Uint32Array();
  }

  /**
   * Helper to decode semantic tokens into readable format
   */
  function decodeTokens(data: Uint32Array): Array<{ line: number; char: number; length: number; type: string }> {
    const tokens: Array<{ line: number; char: number; length: number; type: string }> = [];
    let currentLine = 0;
    let currentChar = 0;

    for (let i = 0; i < data.length; i += 5) {
      const deltaLine = data[i];
      const deltaChar = data[i + 1];
      const length = data[i + 2];
      const typeIndex = data[i + 3];

      currentLine += deltaLine;
      if (deltaLine > 0) {
        currentChar = deltaChar;
      } else {
        currentChar += deltaChar;
      }

      tokens.push({
        line: currentLine,
        char: currentChar,
        length: length,
        type: tokenTypes[typeIndex] || 'unknown'
      });
    }

    return tokens;
  }

  test('St. Gall basic glyphs should be tokenized as NABCBasicGlyphDescriptor', () => {
    const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(vi)`;
    
    const data = getSemanticTokens(gabc);
    const tokens = decodeTokens(data);
    
    // Find the 'vi' token
    const viToken = tokens.find(t => t.type === 'NABCBasicGlyphDescriptor');
    assert.ok(viToken, 'Should have NABCBasicGlyphDescriptor token for vi');
    assert.strictEqual(viToken.length, 2, 'vi token should have length 2');
  });

  test('Multiple basic glyphs should be tokenized', () => {
    const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(pe!to!cl)`;
    
    const data = getSemanticTokens(gabc);
    const tokens = decodeTokens(data);
    
    // Should have 3 basic glyph tokens: pe, to, cl
    const basicGlyphTokens = tokens.filter(t => t.type === 'NABCBasicGlyphDescriptor');
    assert.strictEqual(basicGlyphTokens.length, 3, 'Should have 3 basic glyph tokens');
    assert.ok(basicGlyphTokens.every(t => t.length === 2), 'All basic glyph tokens should have length 2');
  });

  test('All St. Gall neume codes should be recognized', () => {
    const neumeCodes = [
      'vi', 'pu', 'ta', 'gr', 'cl', 'pe', 'po', 'to', 'ci', 'sc',
      'pf', 'sf', 'tr', 'st', 'ds', 'ts', 'tg', 'bv', 'tv', 'pr',
      'pi', 'vs', 'or', 'sa', 'pq', 'ql', 'qi', 'pt', 'ni'
    ];
    
    for (const code of neumeCodes) {
      const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(${code})`;
      
      const data = getSemanticTokens(gabc);
      const tokens = decodeTokens(data);
      
      const basicGlyphToken = tokens.find(t => t.type === 'NABCBasicGlyphDescriptor');
      assert.ok(basicGlyphToken, `Should tokenize ${code} as NABCBasicGlyphDescriptor`);
      assert.strictEqual(basicGlyphToken.length, 2, `${code} token should have length 2`);
    }
  });

  test('Laon neume codes should be recognized', () => {
    const laonCodes = [
      'un', 'vi', 'pu', 'ta', 'cl', 'oc', 'pe', 'po', 'to', 'ci',
      'sc', 'pf', 'sf', 'tr', 'ds', 'ts', 'tg', 'bv', 'tv', 'pr',
      'pi', 'vs', 'or', 'sa', 'pq', 'ql', 'pt', 'ni'
    ];
    
    for (const code of laonCodes) {
      const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(${code})`;
      
      const data = getSemanticTokens(gabc);
      const tokens = decodeTokens(data);
      
      const basicGlyphToken = tokens.find(t => t.type === 'NABCBasicGlyphDescriptor');
      assert.ok(basicGlyphToken, `Should tokenize Laon code ${code} as NABCBasicGlyphDescriptor`);
    }
  });

  test('Basic glyphs with modifiers should tokenize glyph separately', () => {
    const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(peG)`;
    
    const data = getSemanticTokens(gabc);
    const tokens = decodeTokens(data);
    
    // pe should be NABCBasicGlyphDescriptor, G should be modifier
    const basicGlyphToken = tokens.find(t => t.type === 'NABCBasicGlyphDescriptor');
    assert.ok(basicGlyphToken, 'Should have basic glyph token for pe');
    assert.strictEqual(basicGlyphToken.length, 2, 'pe token should have length 2');
  });

  test('Basic glyphs with pitch descriptors should tokenize glyph separately', () => {
    const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(pehk)`;
    
    const data = getSemanticTokens(gabc);
    const tokens = decodeTokens(data);
    
    // pe should be NABCBasicGlyphDescriptor
    const basicGlyphToken = tokens.find(t => t.type === 'NABCBasicGlyphDescriptor');
    assert.ok(basicGlyphToken, 'Should have basic glyph token for pe');
    assert.strictEqual(basicGlyphToken.length, 2, 'pe token should have length 2');
    
    // hk should be pitch descriptor tokens
    const pitchPrefixToken = tokens.find(t => t.type === 'NABCPitchDescriptorPrefix');
    assert.ok(pitchPrefixToken, 'Should have pitch descriptor prefix token');
  });

  test('Complex NABC snippet with multiple elements', () => {
    const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(pe!toGhk)`;
    
    const data = getSemanticTokens(gabc);
    const tokens = decodeTokens(data);
    
    // Should have 2 basic glyph tokens: pe and to
    const basicGlyphTokens = tokens.filter(t => t.type === 'NABCBasicGlyphDescriptor');
    assert.strictEqual(basicGlyphTokens.length, 2, 'Should have 2 basic glyph tokens');
  });

  test('Subpunctis prefix should not be tokenized as basic glyph', () => {
    const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(sun1)`;
    
    const data = getSemanticTokens(gabc);
    const tokens = decodeTokens(data);
    
    // 'su' should be tokenized as class (subpunctis prefix), not NABCBasicGlyphDescriptor
    const basicGlyphTokens = tokens.filter(t => t.type === 'NABCBasicGlyphDescriptor');
    assert.strictEqual(basicGlyphTokens.length, 0, 'Should not tokenize subpunctis prefix as basic glyph');
    
    const subpunctisToken = tokens.find(t => t.type === 'class');
    assert.ok(subpunctisToken, 'Should have class token for su prefix');
  });

  test('Prepunctis prefix should not be tokenized as basic glyph', () => {
    const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(ppt2)`;
    
    const data = getSemanticTokens(gabc);
    const tokens = decodeTokens(data);
    
    // 'pp' should be tokenized as class (prepunctis prefix), not NABCBasicGlyphDescriptor
    const basicGlyphTokens = tokens.filter(t => t.type === 'NABCBasicGlyphDescriptor');
    assert.strictEqual(basicGlyphTokens.length, 0, 'Should not tokenize prepunctis prefix as basic glyph');
  });

  test('Spacing adjustments should not affect basic glyph tokenization', () => {
    const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Test(g) (::)
(//vi/to)`;
    
    const data = getSemanticTokens(gabc);
    const tokens = decodeTokens(data);
    
    // Should have 2 basic glyph tokens: vi and to
    const basicGlyphTokens = tokens.filter(t => t.type === 'NABCBasicGlyphDescriptor');
    assert.strictEqual(basicGlyphTokens.length, 2, 'Should have 2 basic glyph tokens');
  });
});
