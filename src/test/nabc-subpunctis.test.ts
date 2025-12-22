/**
 * NABC Subpunctis and Prepunctis Tests
 * Tests for subpunctis prefix (su/NABCSubpunctisPrefix) + prepunctis prefix (pp/NABCPrepunctisPrefix)
 * + modifier (t/n/NABCSubpunctisModifier) + repetition count (NABCSubpunctisRepetition) highlighting
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

suite('NABC Subpunctis and Prepunctis Test Suite', () => {
  
  test('Should highlight su prefix as NABCSubpunctisPrefix', async () => {
    const provider = new GabcSemanticTokensProvider();
    const gabcText = `name: Test;\n%%\n(c4) Test(g|visut2) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    
    // Find NABC tokens in line 2 (the music line)
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Find 'su' token
    const suToken = nabcTokens.find(t => getTokenContent(t, gabcText) === 'su');
    
    assert.ok(suToken, 'Should find su token');
    assert.strictEqual(getTokenTypeName(suToken!.type), 'NABCSubpunctisPrefix', 'su should be NABCSubpunctisPrefix token');
  });
  
  test('Should highlight pp prefix as NABCPrepunctisPrefix', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vippt2) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Find 'pp' token
    const ppToken = nabcTokens.find(t => getTokenContent(t, gabcText) === 'pp');
    
    assert.ok(ppToken, 'Should find pp token');
    assert.strictEqual(getTokenTypeName(ppToken!.type), 'NABCPrepunctisPrefix', 'pp should be NABCPrepunctisPrefix token');
  });
  
  test('Should highlight modifier t as NABCSubpunctisModifier', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|visut2) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Find 't' modifier token (after 'su')
    const tToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 't' && 
      getTokenTypeName(t.type) === 'NABCSubpunctisModifier'
    );
    
    assert.ok(tToken, 'Should find t modifier token');
    assert.strictEqual(getTokenTypeName(tToken!.type), 'NABCSubpunctisModifier', 't should be NABCSubpunctisModifier token');
  });
  
  test('Should highlight modifier n as NABCSubpunctisModifier', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vippn1) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Find 'n' modifier token (after 'pp')
    const nToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'n' && 
      getTokenTypeName(t.type) === 'NABCSubpunctisModifier'
    );
    
    assert.ok(nToken, 'Should find n modifier token');
    assert.strictEqual(getTokenTypeName(nToken!.type), 'NABCSubpunctisModifier', 'n should be NABCSubpunctisModifier token');
  });
  
  test('Should highlight repetition count as NABCSubpunctisRepetition', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|visut2) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Find '2' repetition token
    const repToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === '2' && 
      getTokenTypeName(t.type) === 'NABCSubpunctisRepetitionCount'
    );
    
    assert.ok(repToken, 'Should find repetition count token');
    assert.strictEqual(getTokenTypeName(repToken!.type), 'NABCSubpunctisRepetitionCount', '2 should be NABCSubpunctisRepetition token');
  });
  
  test('Should correctly tokenize complete subpunctis pattern (sut2)', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|visut2) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Should have su, t, 2 tokens
    const suToken = nabcTokens.find(t => getTokenContent(t, gabcText) === 'su');
    const tToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 't' && 
      getTokenTypeName(t.type) === 'NABCSubpunctisModifier'
    );
    const repToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === '2' && 
      getTokenTypeName(t.type) === 'NABCSubpunctisRepetitionCount'
    );
    
    assert.ok(suToken, 'Should find su token');
    assert.ok(tToken, 'Should find t modifier token');
    assert.ok(repToken, 'Should find repetition token');
    
    // Verify token types
    assert.strictEqual(getTokenTypeName(suToken!.type), 'NABCSubpunctisPrefix', 'su = NABCSubpunctisPrefix');
    assert.strictEqual(getTokenTypeName(tToken!.type), 'NABCSubpunctisModifier', 't = NABCSubpunctisModifier');
    assert.strictEqual(getTokenTypeName(repToken!.type), 'NABCSubpunctisRepetitionCount', '2 = NABCSubpunctisRepetition');
  });
  
  test('Should correctly tokenize complete prepunctis pattern (ppn1)', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vippn1) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Should have pp, n, 1 tokens
    const ppToken = nabcTokens.find(t => getTokenContent(t, gabcText) === 'pp');
    const nToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === 'n' && 
      getTokenTypeName(t.type) === 'NABCSubpunctisModifier'
    );
    const repToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === '1' && 
      getTokenTypeName(t.type) === 'NABCSubpunctisRepetitionCount'
    );
    
    assert.ok(ppToken, 'Should find pp token');
    assert.ok(nToken, 'Should find n modifier token');
    assert.ok(repToken, 'Should find repetition token');
    
    // Verify token types
    assert.strictEqual(getTokenTypeName(ppToken!.type), 'NABCPrepunctisPrefix', 'pp = NABCPrepunctisPrefix');
    assert.strictEqual(getTokenTypeName(nToken!.type), 'NABCSubpunctisModifier', 'n = NABCSubpunctisModifier');
    assert.strictEqual(getTokenTypeName(repToken!.type), 'NABCSubpunctisRepetitionCount', '1 = NABCSubpunctisRepetition');
  });
  
  test('Should handle subpunctis without modifier', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|visu3) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Should have su and 3, but no modifier
    const suToken = nabcTokens.find(t => getTokenContent(t, gabcText) === 'su');
    const repToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === '3' && 
      getTokenTypeName(t.type) === 'NABCSubpunctisRepetitionCount'
    );
    
    assert.ok(suToken, 'Should find su token');
    assert.ok(repToken, 'Should find repetition token');
    assert.strictEqual(getTokenTypeName(suToken!.type), 'NABCSubpunctisPrefix');
    assert.strictEqual(getTokenTypeName(repToken!.type), 'NABCSubpunctisRepetitionCount');
  });
  
  test('Should handle multi-digit repetition count', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|visut12) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Find '12' repetition token
    const repToken = nabcTokens.find(t => 
      getTokenContent(t, gabcText) === '12' && 
      getTokenTypeName(t.type) === 'NABCSubpunctisRepetitionCount'
    );
    
    assert.ok(repToken, 'Should find multi-digit repetition token');
    assert.strictEqual(getTokenTypeName(repToken!.type), 'NABCSubpunctisRepetitionCount');
    assert.strictEqual(repToken!.length, 2, 'Should have length 2');
  });
  
  test('Should handle multiple subpunctis/prepunctis in same NABC notation', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|visut2ppn1) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Should have su, t, 2, pp, n, 1
    const suToken = nabcTokens.find(t => getTokenContent(t, gabcText) === 'su');
    const ppToken = nabcTokens.find(t => getTokenContent(t, gabcText) === 'pp');
    
    assert.ok(suToken, 'Should find su token');
    assert.ok(ppToken, 'Should find pp token');
    assert.strictEqual(getTokenTypeName(suToken!.type), 'NABCSubpunctisPrefix');
    assert.strictEqual(getTokenTypeName(ppToken!.type), 'NABCPrepunctisPrefix');
  });
  
  test('Should not confuse pp with pd (pitch descriptor)', async () => {
    const gabcText = `name: Test;\n%%\n(c4) Test(g|vippt1pdl) (::)`;
    const doc = await vscode.workspace.openTextDocument({ content: gabcText, language: 'gabc' });
    const tokens = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    
    if (!tokens) {
      assert.fail('No tokens returned');
      return;
    }
    
    const allTokens = decodeSemanticTokens(tokens.data);
    const nabcTokens = allTokens.filter(t => t.line === 2);
    
    // Should have pp (NABCPrepunctisPrefix) and pd (class)
    const ppToken = nabcTokens.find(t => getTokenContent(t, gabcText) === 'pp');
    const pdToken = nabcTokens.find(t => getTokenContent(t, gabcText) === 'pd');
    
    assert.ok(ppToken, 'Should find pp token');
    assert.ok(pdToken, 'Should find pd token');
    assert.strictEqual(getTokenTypeName(ppToken!.type), 'NABCPrepunctisPrefix', 'pp should be NABCPrepunctisPrefix');
    assert.strictEqual(getTokenTypeName(pdToken!.type), 'class', 'pd should be class token');
  });
});
