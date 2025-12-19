/**
 * Tests for oriscus and oriscus scapus orientation indicators
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { GabcParser } from '../../lsp-server/parser/gabc-parser';
import { GabcSemanticTokensProvider, tokenTypes } from '../semanticTokensProvider';

interface DecodedToken {
  line: number;
  char: number;
  length: number;
  type: number;
  modifiers: number;
}

function decodeSemanticTokens(data: Uint32Array): DecodedToken[] {
  const tokens: DecodedToken[] = [];
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

function getTokenContent(token: DecodedToken, text: string): string {
  const lines = text.split('\n');
  return lines[token.line]?.substring(token.char, token.char + token.length) || '';
}

suite('Oriscus Orientation Tests', () => {
  let provider: GabcSemanticTokensProvider;
  
  setup(() => {
    provider = new GabcSemanticTokensProvider();
  });
  
  test('Should highlight oriscus with left orientation (o0)', async () => {
    const text = `name: Test;
%%
(go0)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      const notationLine = 2; // Line with (go0)
      
      // Find tokens in notation line
      const lineTokens = decoded.filter(t => t.line === notationLine);
      
      // Find the 'o' token (class/shape)
      const oToken = lineTokens.find(t => {
        const content = getTokenContent(t, text);
        return content === 'o' && getTokenTypeName(t.type) === 'class';
      });
      assert.ok(oToken, 'Should have token for oriscus "o"');
      
      // Find the '0' token (number)
      const zeroToken = lineTokens.find(t => {
        const content = getTokenContent(t, text);
        return content === '0' && getTokenTypeName(t.type) === 'number';
      });
      assert.ok(zeroToken, 'Should have number token for orientation "0"');
    }
  });
  
  test('Should highlight oriscus with right orientation (o1)', async () => {
    const text = `name: Test;
%%
(ho1)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      const notationLine = 2;
      const lineTokens = decoded.filter(t => t.line === notationLine);
      
      // Find the '1' token (number)
      const oneToken = lineTokens.find(t => {
        const content = getTokenContent(t, text);
        return content === '1' && getTokenTypeName(t.type) === 'number';
      });
      assert.ok(oneToken, 'Should have number token for orientation "1"');
    }
  });
  
  test('Should highlight oriscus scapus with downwards orientation (O0)', async () => {
    const text = `name: Test;
%%
(gO0)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      const notationLine = 2;
      const lineTokens = decoded.filter(t => t.line === notationLine);
      
      // Find the 'O' token (class/shape)
      const OToken = lineTokens.find(t => {
        const content = getTokenContent(t, text);
        return content === 'O' && getTokenTypeName(t.type) === 'class';
      });
      assert.ok(OToken, 'Should have token for oriscus scapus "O"');
      
      // Find the '0' token (number)
      const zeroToken = lineTokens.find(t => {
        const content = getTokenContent(t, text);
        return content === '0' && getTokenTypeName(t.type) === 'number';
      });
      assert.ok(zeroToken, 'Should have number token for orientation "0"');
    }
  });
  
  test('Should highlight oriscus scapus with upwards orientation (O1)', async () => {
    const text = `name: Test;
%%
(hO1)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      const notationLine = 2;
      const lineTokens = decoded.filter(t => t.line === notationLine);
      
      // Find the '1' token (number)
      const oneToken = lineTokens.find(t => {
        const content = getTokenContent(t, text);
        return content === '1' && getTokenTypeName(t.type) === 'number';
      });
      assert.ok(oneToken, 'Should have number token for orientation "1"');
    }
  });
  
  test('Should NOT highlight digit 2 after oriscus (only 0 and 1)', async () => {
    const text = `name: Test;
%%
(go2)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      const notationLine = 2;
      const lineTokens = decoded.filter(t => t.line === notationLine);
      
      // The '2' should NOT be tokenized as number
      const twoToken = lineTokens.find(t => {
        const content = getTokenContent(t, text);
        return content === '2' && getTokenTypeName(t.type) === 'number';
      });
      assert.ok(!twoToken, 'Should NOT have number token for "2" after oriscus');
    }
  });
  
  test('Should highlight multiple oriscus with different orientations', async () => {
    const text = `name: Test;
%%
(go0ho1iO0jO1)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      const notationLine = 2;
      const lineTokens = decoded.filter(t => t.line === notationLine);
      
      // Should have 4 number tokens (0, 1, 0, 1)
      const numberTokens = lineTokens.filter(t => getTokenTypeName(t.type) === 'number');
      assert.strictEqual(numberTokens.length, 4, 'Should have 4 number tokens for orientations');
      
      // Verify the sequence: 0, 1, 0, 1
      const orientations = numberTokens.map(t => getTokenContent(t, text));
      assert.deepStrictEqual(orientations, ['0', '1', '0', '1'], 'Should have orientations in order: 0, 1, 0, 1');
    }
  });
  
  test('Should highlight oriscus without orientation', async () => {
    const text = `name: Test;
%%
(goho)`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      const notationLine = 2;
      const lineTokens = decoded.filter(t => t.line === notationLine);
      
      // Should have 'o' tokens but no number tokens
      const oTokens = lineTokens.filter(t => {
        const content = getTokenContent(t, text);
        return content === 'o' && getTokenTypeName(t.type) === 'class';
      });
      assert.strictEqual(oTokens.length, 2, 'Should have 2 oriscus tokens');
      
      const numberTokens = lineTokens.filter(t => getTokenTypeName(t.type) === 'number');
      assert.strictEqual(numberTokens.length, 0, 'Should have no number tokens');
    }
  });
});
