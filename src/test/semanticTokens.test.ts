/**
 * Semantic Tokens Tests
 * Tests for semantic highlighting based on tree-sitter-gregorio corpus
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { GabcParser } from '../../lsp-server/parser/gabc-parser';
import { GabcSemanticTokensProvider, tokenTypes, tokenModifiers, legend } from '../semanticTokensProvider';

interface ExpectedToken {
  line: number;
  char: number;
  length: number;
  type: string;
  modifiers?: string[];
}

function decodeSemanticTokens(data: Uint32Array): Array<{line: number, char: number, length: number, type: number, modifiers: number}> {
  const tokens: Array<{line: number, char: number, length: number, type: number, modifiers: number}> = [];
  let line = 0;
  let char = 0;
  
  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i];
    const deltaChar = data[i + 1];
    const length = data[i + 2];
    const type = data[i + 3];
    const modifiers = data[i + 4];
    
    line += deltaLine;
    if (deltaLine > 0) {
      char = deltaChar;
    } else {
      char += deltaChar;
    }
    
    tokens.push({ line, char, length, type, modifiers });
  }
  
  return tokens;
}

function getTokenTypeName(typeIndex: number): string {
  return tokenTypes[typeIndex] || 'unknown';
}

function printToken(token: {line: number, char: number, length: number, type: number, modifiers: number}, text: string) {
  const lines = text.split('\n');
  const content = lines[token.line]?.substring(token.char, token.char + token.length) || '';
  return `L${token.line}:C${token.char} "${content}" (${getTokenTypeName(token.type)})`;
}

suite('Semantic Tokens Test Suite', () => {
  let provider: GabcSemanticTokensProvider;
  
  setup(() => {
    provider = new GabcSemanticTokensProvider();
  });
  
  test('Should parse basic GABC notation', async () => {
    const text = `name: Test;
%%
(c4) Al(e)le(f)lú(g)ia()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      console.log('\nBasic GABC tokens:');
      decoded.forEach(token => console.log('  ' + printToken(token, text)));
      
      // Should have tokens for pitches
      const pitchTokens = decoded.filter(t => getTokenTypeName(t.type) === 'variable' || getTokenTypeName(t.type) === 'type');
      assert.ok(pitchTokens.length >= 3, `Expected at least 3 pitch tokens, got ${pitchTokens.length}`);
    }
  });
  
  test('Should handle NABC basic glyphs', async () => {
    const text = `name: Test;
nabc-lines: 1;
%%
(c4) (c|vi) (d|pu) (e|ta) (f|gr)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      console.log('\nNABC basic glyphs tokens:');
      decoded.forEach(token => console.log('  ' + printToken(token, text)));
      
      // Should have tokens for both GABC pitches and NABC glyphs
      const pitchTokens = decoded.filter(t => getTokenTypeName(t.type) === 'variable' || getTokenTypeName(t.type) === 'type');
      const nabcTokens = decoded.filter(t => getTokenTypeName(t.type) === 'class');
      
      console.log(`  Pitch tokens: ${pitchTokens.length}, NABC tokens: ${nabcTokens.length}`);
      assert.ok(pitchTokens.length >= 4, `Expected at least 4 pitch tokens, got ${pitchTokens.length}`);
      assert.ok(nabcTokens.length >= 4, `Expected at least 4 NABC tokens, got ${nabcTokens.length}`);
    }
  });
  
  test('Should handle NABC alternation (e|ta|f|vi)', async () => {
    const text = `name: Test;
nabc-lines: 1;
%%
(c4) Test(e|ta|f|vi)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      console.log('\nNABC alternation (e|ta|f|vi) tokens:');
      decoded.forEach(token => console.log('  ' + printToken(token, text)));
      
      // Find tokens on the notation line (line 3)
      const notationTokens = decoded.filter(t => t.line === 3);
      console.log(`  Notation line tokens: ${notationTokens.length}`);
      
      // Should have 2 pitch tokens (e and f) and 2 NABC tokens (ta and vi)
      const pitchTokens = notationTokens.filter(t => 
        getTokenTypeName(t.type) === 'variable' || getTokenTypeName(t.type) === 'type'
      );
      const nabcTokens = notationTokens.filter(t => getTokenTypeName(t.type) === 'class');
      
      console.log(`  Pitch tokens: ${pitchTokens.length}, NABC tokens: ${nabcTokens.length}`);
      
      // Verify we have both 'e' and 'f' pitches highlighted
      assert.strictEqual(pitchTokens.length, 2, 'Should have exactly 2 pitch tokens (e and f)');
      assert.strictEqual(nabcTokens.length, 2, 'Should have exactly 2 NABC tokens (ta and vi)');
      
      // Verify positions are correct
      const lines = text.split('\n');
      const notationLine = lines[3];
      
      pitchTokens.forEach(token => {
        const content = notationLine.substring(token.char, token.char + token.length);
        assert.ok(['e', 'f'].includes(content), `Pitch token should be 'e' or 'f', got '${content}'`);
        console.log(`  ✓ Pitch '${content}' at position ${token.char}`);
      });
      
      nabcTokens.forEach(token => {
        const content = notationLine.substring(token.char, token.char + token.length);
        assert.ok(['ta', 'vi'].includes(content), `NABC token should be 'ta' or 'vi', got '${content}'`);
        console.log(`  ✓ NABC '${content}' at position ${token.char}`);
      });
    }
  });
  
  test('Should handle complex NABC alternation (gh|pe|f|ta|e|vi)', async () => {
    const text = `name: Test;
nabc-lines: 1;
%%
(c4) Test(gh|pe|f|ta|e|vi)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      console.log('\nComplex NABC alternation (gh|pe|f|ta|e|vi) tokens:');
      decoded.forEach(token => console.log('  ' + printToken(token, text)));
      
      // Find tokens on the notation line
      const notationTokens = decoded.filter(t => t.line === 3);
      
      // Should have 4 pitch tokens (g, h, f, e) and 3 NABC tokens (pe, ta, vi)
      const pitchTokens = notationTokens.filter(t => 
        getTokenTypeName(t.type) === 'variable' || getTokenTypeName(t.type) === 'type'
      );
      const nabcTokens = notationTokens.filter(t => getTokenTypeName(t.type) === 'class');
      
      console.log(`  Pitch tokens: ${pitchTokens.length}, NABC tokens: ${nabcTokens.length}`);
      
      assert.strictEqual(pitchTokens.length, 4, 'Should have exactly 4 pitch tokens (g, h, f, e)');
      assert.strictEqual(nabcTokens.length, 3, 'Should have exactly 3 NABC tokens (pe, ta, vi)');
      
      // Verify all pitches are correctly highlighted
      const lines = text.split('\n');
      const notationLine = lines[3];
      
      const expectedPitches = ['g', 'h', 'f', 'e'];
      pitchTokens.forEach((token, index) => {
        const content = notationLine.substring(token.char, token.char + token.length);
        assert.strictEqual(content, expectedPitches[index], 
          `Pitch ${index} should be '${expectedPitches[index]}', got '${content}'`);
        console.log(`  ✓ Pitch ${index}: '${content}' at position ${token.char}`);
      });
      
      const expectedNabc = ['pe', 'ta', 'vi'];
      nabcTokens.forEach((token, index) => {
        const content = notationLine.substring(token.char, token.char + token.length);
        assert.strictEqual(content, expectedNabc[index], 
          `NABC ${index} should be '${expectedNabc[index]}', got '${content}'`);
        console.log(`  ✓ NABC ${index}: '${content}' at position ${token.char}`);
      });
    }
  });
  
  test('Should parse note modifiers', async () => {
    const text = `name: Test;
%%
(c4) Test(ev.gw~h_)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      console.log('\nNote modifiers tokens:');
      decoded.forEach(token => console.log('  ' + printToken(token, text)));
      
      // Should have tokens for notes and operators (modifiers)
      const noteTokens = decoded.filter(t => getTokenTypeName(t.type) === 'variable' || getTokenTypeName(t.type) === 'type');
      const operatorTokens = decoded.filter(t => getTokenTypeName(t.type) === 'operator');
      
      console.log(`  Note tokens: ${noteTokens.length}, Operator tokens: ${operatorTokens.length}`);
      assert.ok(noteTokens.length >= 3, `Expected at least 3 note tokens, got ${noteTokens.length}`);
      assert.ok(operatorTokens.length >= 3, `Expected at least 3 operator tokens, got ${operatorTokens.length}`);
    }
  });
  
  test('Should parse clefs', async () => {
    const text = `name: Test;
%%
(c4) (f3) (cb3)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      console.log('\nClef tokens:');
      decoded.forEach(token => console.log('  ' + printToken(token, text)));
      
      // Should have tokens for clefs
      const clefTokens = decoded.filter(t => getTokenTypeName(t.type) === 'keyword');
      assert.ok(clefTokens.length >= 3, `Expected at least 3 clef tokens, got ${clefTokens.length}`);
    }
  });
  
  test('Should parse bars', async () => {
    const text = `name: Test;
%%
(c4) Al(e)le(f::)lú(g)ia(::)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      console.log('\nBar tokens:');
      decoded.forEach(token => console.log('  ' + printToken(token, text)));
      
      // Should have tokens for bars
      const barTokens = decoded.filter(t => getTokenTypeName(t.type) === 'operator');
      assert.ok(barTokens.length >= 2, `Expected at least 2 bar tokens, got ${barTokens.length}`);
    }
  });
  
  test('Parser should correctly handle alternation structure', () => {
    const text = `name: Test;
nabc-lines: 1;
%%
(c4) Test(e|ta|f|vi)`;
    
    const parser = new GabcParser(text);
    const result = parser.parse();
    
    console.log('\nParser structure test for (e|ta|f|vi):');
    
    // Find the syllable with alternation
    const syllable = result.notation.syllables.find(s => s.text === 'Test');
    assert.ok(syllable, 'Should find Test syllable');
    
    if (syllable && syllable.notes.length > 0) {
      const noteGroup = syllable.notes[0];
      
      console.log(`  GABC content: "${noteGroup.gabc}"`);
      console.log(`  NABC snippets: [${noteGroup.nabc?.join(', ')}]`);
      console.log(`  Notes count: ${noteGroup.notes.length}`);
      
      // Verify structure
      assert.strictEqual(noteGroup.gabc, 'ef', 'GABC should be "ef"');
      assert.ok(noteGroup.nabc, 'NABC should be defined');
      assert.strictEqual(noteGroup.nabc?.length, 2, 'Should have 2 NABC snippets');
      assert.strictEqual(noteGroup.nabc?.[0], 'ta', 'First NABC should be "ta"');
      assert.strictEqual(noteGroup.nabc?.[1], 'vi', 'Second NABC should be "vi"');
      assert.strictEqual(noteGroup.notes.length, 2, 'Should have 2 notes');
      
      // Check note positions
      noteGroup.notes.forEach((note, index) => {
        console.log(`  Note ${index}: pitch="${note.pitch}", range=${note.range.start.character}-${note.range.end.character}`);
        
        // Verify the note position is in the correct location in the source text
        const lines = text.split('\n');
        const notationLine = lines[note.range.start.line];
        const noteContent = notationLine.substring(note.range.start.character, note.range.end.character);
        
        console.log(`    Content at position: "${noteContent}"`);
        assert.ok(noteContent.includes(note.pitch), 
          `Note content should include pitch "${note.pitch}", got "${noteContent}"`);
      });
    }
  });
});
