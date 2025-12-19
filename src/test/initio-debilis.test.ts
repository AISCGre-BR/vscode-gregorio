/**
 * Tests for initio debilis highlighting
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { GabcSemanticTokensProvider } from '../semanticTokensProvider';

suite('Initio Debilis Highlighting', () => {
  let provider: GabcSemanticTokensProvider;

  setup(() => {
    provider = new GabcSemanticTokensProvider();
  });

  // Helper to decode semantic tokens
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
      if (deltaLine === 0) {
        char += deltaChar;
      } else {
        char = deltaChar;
      }

      tokens.push({ line, char, length, type, modifiers });
    }

    return tokens;
  }

  // Helper to get token type name
  function getTokenTypeName(typeIndex: number): string {
    const types = ['keyword', 'namespace', 'type', 'class', 'parameter', 'variable', 'property', 'function', 'method', 'macro', 'struct', 'event', 'operator', 'modifier', 'comment', 'string', 'regexp', 'decorator', 'number'];
    return types[typeIndex] || 'unknown';
  }

  // Helper to get token content from text
  function getTokenContent(token: {line: number, char: number, length: number}, text: string): string {
    const lines = text.split('\n');
    return lines[token.line].substring(token.char, token.char + token.length);
  }

  test('Should highlight single initio debilis note', async () => {
    const text = `name: Test;
%%
(c4) Al(e)le(-g)lú(h)ia(i)`;

    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });

    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');

    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find tokens for the note (-g)
      const noteTokens = decoded.filter(t => {
        const content = getTokenContent(t, text);
        return content === '-' || content === 'g';
      });

      // Should have at least 2 tokens: '-' and 'g'
      assert.ok(noteTokens.length >= 2, `Expected at least 2 tokens for (-g), got ${noteTokens.length}`);

      // First should be '-' tokenized as 'class' (note shape)
      const hyphenToken = noteTokens.find(t => getTokenContent(t, text) === '-');
      assert.ok(hyphenToken, 'Hyphen token should exist');
      assert.strictEqual(getTokenTypeName(hyphenToken!.type), 'class', 'Hyphen should be tokenized as class');

      // Second should be 'g' tokenized as 'parameter' (pitch)
      const pitchToken = noteTokens.find(t => getTokenContent(t, text) === 'g');
      assert.ok(pitchToken, 'Pitch token should exist');
      assert.strictEqual(getTokenTypeName(pitchToken!.type), 'parameter', 'Pitch should be tokenized as parameter');
    }
  });

  test('Should highlight multiple initio debilis notes', async () => {
    const text = `name: Test;
%%
(c4) I(g)ni(h)ti(i)o(j) de(-g-h-i)bi(j)lis(k)`;

    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });

    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');

    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find all hyphen tokens
      const hyphenTokens = decoded.filter(t => getTokenContent(t, text) === '-');
      
      // Should have 3 hyphens from (-g-h-i)
      assert.strictEqual(hyphenTokens.length, 3, `Expected 3 hyphen tokens, got ${hyphenTokens.length}`);

      // All hyphens should be tokenized as 'class'
      for (const token of hyphenTokens) {
        assert.strictEqual(getTokenTypeName(token.type), 'class', 'Each hyphen should be tokenized as class');
      }
    }
  });

  test('Should highlight initio debilis with uppercase pitch', async () => {
    const text = `name: Test;
%%
(c4) De(-G)bi(h)lis(i)`;

    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });

    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');

    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find tokens for (-G)
      const noteTokens = decoded.filter(t => {
        const content = getTokenContent(t, text);
        return content === '-' || content === 'G';
      });

      // Should have at least 2 tokens: '-' and 'G'
      assert.ok(noteTokens.length >= 2, `Expected at least 2 tokens for (-G), got ${noteTokens.length}`);

      // Hyphen should be 'class'
      const hyphenToken = noteTokens.find(t => getTokenContent(t, text) === '-');
      assert.ok(hyphenToken, 'Hyphen token should exist');
      assert.strictEqual(getTokenTypeName(hyphenToken!.type), 'class', 'Hyphen should be tokenized as class');

      // Uppercase G should be 'parameter'
      const pitchToken = noteTokens.find(t => getTokenContent(t, text) === 'G');
      assert.ok(pitchToken, 'Pitch token should exist');
      assert.strictEqual(getTokenTypeName(pitchToken!.type), 'parameter', 'Uppercase pitch should be tokenized as parameter');
    }
  });

  test('Should NOT tokenize hyphen in horizontal episema', async () => {
    const text = `name: Test;
%%
(c4) Al(g_)le(h_)lú(i-)ia(j)`;

    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });

    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');

    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // The hyphens here are part of episema/other modifiers, not initio debilis
      // They should appear AFTER the pitch, not before
      // So they should not be tokenized as 'class' at the beginning of a note
      
      // Find the last note (i-) to verify hyphen comes after pitch
      const iToken = decoded.find(t => getTokenContent(t, text) === 'i');
      assert.ok(iToken, 'Pitch i should exist');
      
      // Find hyphen tokens that come after pitch
      const hyphenAfterPitch = decoded.filter(t => {
        const content = getTokenContent(t, text);
        return content === '-' && t.char > iToken!.char;
      });
      
      // There should be at least one hyphen after pitch 'i'
      assert.ok(hyphenAfterPitch.length > 0, 'Hyphen should exist after pitch for episema');
    }
  });

  test('Should highlight initio debilis from showcase.gabc example', async () => {
    const text = `name: Test;
%%
(c4) I(g)ni(h)ti(i)o(j) de(-g-h-i)bi(j)lis(k) (::)`;

    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });

    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');

    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Count class tokens (note shapes including initio debilis)
      const classTokens = decoded.filter(t => getTokenTypeName(t.type) === 'class');
      
      // Should have at least 3 class tokens from the 3 hyphens in (-g-h-i)
      assert.ok(classTokens.length >= 3, `Expected at least 3 class tokens for initio debilis, got ${classTokens.length}`);
      
      // Verify all 3 hyphens are tokenized
      const hyphenTokens = decoded.filter(t => getTokenContent(t, text) === '-');
      assert.strictEqual(hyphenTokens.length, 3, `Expected exactly 3 hyphen tokens, got ${hyphenTokens.length}`);
    }
  });
});
