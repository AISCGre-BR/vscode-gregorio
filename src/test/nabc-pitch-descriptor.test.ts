/**
 * NABC Pitch Descriptor Tests
 * Tests for pitch descriptor prefix (h/NABCPitchDescriptorPrefix) 
 * + pitch value (a-n, p/NABCPitchDescriptorValue) highlighting
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { GabcSemanticTokensProvider, tokenTypes, legend } from '../semanticTokensProvider';

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

describe('NABC Pitch Descriptor Test Suite', () => {
  let provider: GabcSemanticTokensProvider;
  
  beforeEach(() => {
    provider = new GabcSemanticTokensProvider();
  });
  
  test('Should highlight h prefix as NABCPitchDescriptorPrefix', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vihf) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Find 'h' token
    const hToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'h' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorPrefix'
    );
    
    assert.ok(hToken, 'Should find h token');
    assert.strictEqual(getTokenTypeName(hToken!.type), 'NABCPitchDescriptorPrefix', 'h should be NABCPitchDescriptorPrefix token');
  });
  
  test('Should highlight pitch letter f as NABCPitchDescriptorValue', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vihf) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Find 'f' pitch value token
    const fToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'f' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorValue'
    );
    
    assert.ok(fToken, 'Should find f pitch value token');
    assert.strictEqual(getTokenTypeName(fToken!.type), 'NABCPitchDescriptorValue', 'f should be NABCPitchDescriptorValue token');
  });
  
  test('Should correctly tokenize complete pitch descriptor pattern (hf)', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vihf) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Should have h and f tokens
    const hToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'h' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorPrefix'
    );
    const fToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'f' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorValue'
    );
    
    assert.ok(hToken, 'Should find h token');
    assert.ok(fToken, 'Should find f token');
    
    // Verify token types
    assert.strictEqual(getTokenTypeName(hToken!.type), 'NABCPitchDescriptorPrefix', 'h = NABCPitchDescriptorPrefix');
    assert.strictEqual(getTokenTypeName(fToken!.type), 'NABCPitchDescriptorValue', 'f = NABCPitchDescriptorValue');
  });
  
  test('Should handle different pitch values (a-n)', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|viha) pitch(h|puhj) high(i|clhn) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Should have a, j, n pitch values
    const aToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'a' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorValue'
    );
    const jToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'j' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorValue'
    );
    const nToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'n' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorValue'
    );
    
    assert.ok(aToken, 'Should find a pitch value');
    assert.ok(jToken, 'Should find j pitch value');
    assert.ok(nToken, 'Should find n pitch value');
  });
  
  test('Should handle pitch value p', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vihp) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Should have p pitch value
    const pToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'p' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorValue'
    );
    
    assert.ok(pToken, 'Should find p pitch value');
    assert.strictEqual(getTokenTypeName(pToken!.type), 'NABCPitchDescriptorValue');
  });
  
  test('Should handle multiple pitch descriptors in same NABC notation', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vihfpuhj) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Should have two h tokens
    const hTokens = nabcTokens.filter(t => 
      getTokenContent(t, gabcText) === 'h' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorPrefix'
    );
    
    assert.strictEqual(hTokens.length, 2, 'Should find 2 h prefix tokens');
  });
  
  test('Should not tokenize h without valid pitch letter', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|viho) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // 'o' is not a valid pitch letter (only a-n, p), so 'h' should not be tokenized as pitch descriptor
    const hToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'h' && 
      getTokenTypeName(t.type) === 'NABCPitchDescriptorPrefix'
    );
    
    assert.strictEqual(hToken, undefined, 'Should not find h as pitch descriptor prefix when followed by invalid letter');
  });
  
  test('Should validate scope mappings', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vihf) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    // Verify legend contains our custom token types
    const hasPrefix = legend.tokenTypes.includes('NABCPitchDescriptorPrefix');
    const hasValue = legend.tokenTypes.includes('NABCPitchDescriptorValue');
    
    assert.ok(hasPrefix, 'Legend should include NABCPitchDescriptorPrefix');
    assert.ok(hasValue, 'Legend should include NABCPitchDescriptorValue');
  });
});
