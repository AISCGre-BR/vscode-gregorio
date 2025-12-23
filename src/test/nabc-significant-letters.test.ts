/**
 * NABC Significant Letters Tests
 * Tests for significant letter prefix (ls/NABCSignificantLetterType) + tironian prefix (lt/NABCTironianLetterType) 
 * + letter specifier (NABCSignificantLetterSpecifierType) + position number (NABCSignificantLetterPositionType) highlighting
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

suite('NABC Significant Letters Test Suite', () => {
  let provider: GabcSemanticTokensProvider;
  
  setup(() => {
    provider = new GabcSemanticTokensProvider();
  });
  
  test('Should highlight ls prefix as NABCSignificantLetterType', async () => {
    const text = `name: Test;
%%
(c4) Test(g|vilsfoo1)ing()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find the 'ls' token
      const lsToken = decoded.find(t => {
        const content = getTokenContent(t, text);
        return content === 'ls' && t.line === 2;
      });
      
      assert.ok(lsToken, 'Should find ls token');
      assert.strictEqual(getTokenTypeName(lsToken!.type), 'NABCSignificantLetterPrefix', 'ls should be tokenized as namespace (significant letter prefix)');
    }
  });
  
  test('Should highlight lt prefix as NABCTironianLetterType', async () => {
    const text = `name: Test;
%%
(c4) Test(g|pultbar2)ing()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find the 'lt' token
      const ltToken = decoded.find(t => {
        const content = getTokenContent(t, text);
        return content === 'lt' && t.line === 2;
      });
      
      assert.ok(ltToken, 'Should find lt token');
      assert.strictEqual(getTokenTypeName(ltToken!.type), 'NABCTironianLetterPrefix', 'lt should be tokenized as label (tironian letter prefix)');
    }
  });
  
  test('Should highlight letter sequence as letter specifier (customLiteral)', async () => {
    const text = `name: Test;
%%
(c4) Test(g|vilsfoo1)ing()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find the 'foo' token (letter sequence after 'ls')
      const fooToken = decoded.find(t => {
        const content = getTokenContent(t, text);
        return content === 'foo' && t.line === 2;
      });
      
      assert.ok(fooToken, 'Should find foo token');
      assert.strictEqual(getTokenTypeName(fooToken!.type), 'NABCSignificantLetterShorthand', 'Letter sequence should be tokenized as customLiteral (letter specifier)');
    }
  });
  
  test('Should highlight number as number', async () => {
    const text = `name: Test;
%%
(c4) Test(g|vilsfoo1)ing()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find tokens in the NABC section
      const nabcTokens = decoded.filter(t => t.line === 2 && t.char > 10);
      
      // Debug: print all NABC tokens
      console.log('\nNABC tokens for lsfoo1:');
      nabcTokens.forEach(t => {
        const content = getTokenContent(t, text);
        console.log(`  "${content}" at char ${t.char} = ${getTokenTypeName(t.type)}`);
      });
      
      // Find the '1' token (number after 'foo')
      const numberToken = nabcTokens.find(t => {
        const content = getTokenContent(t, text);
        return content === '1';
      });
      
      assert.ok(numberToken, 'Should find number token');
      assert.strictEqual(getTokenTypeName(numberToken!.type), 'NABCSignificantLetterPosition', 'Number should be tokenized as number');
    }
  });
  
  test('Should handle complete pattern: ls + letters + number', async () => {
    const text = `name: Test;
%%
(c4) Simple(g|vilsfoo1)test()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      const nabcTokens = decoded.filter(t => t.line === 2);
      
      // Should have ls (namespace), foo (customLiteral), 1 (number)
      const lsToken = nabcTokens.find(t => getTokenContent(t, text) === 'ls');
      const fooToken = nabcTokens.find(t => getTokenContent(t, text) === 'foo');
      const numToken = nabcTokens.find(t => getTokenContent(t, text) === '1');
      
      assert.ok(lsToken, 'Should have ls token');
      assert.ok(fooToken, 'Should have foo token');
      assert.ok(numToken, 'Should have number token');
      
      assert.strictEqual(getTokenTypeName(lsToken!.type), 'NABCSignificantLetterPrefix', 'ls = namespace (significant letter prefix)');
      assert.strictEqual(getTokenTypeName(fooToken!.type), 'NABCSignificantLetterShorthand', 'foo = customLiteral (letter specifier)');
      assert.strictEqual(getTokenTypeName(numToken!.type), 'NABCSignificantLetterPosition', '1 = number');
    }
  });
  
  test('Should handle lt + letters + number pattern', async () => {
    const text = `name: Test;
%%
(c4) Simple(g|pultbar2)test()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      const nabcTokens = decoded.filter(t => t.line === 2);
      
      // Should have lt (label), bar (customLiteral), 2 (number)
      const ltToken = nabcTokens.find(t => getTokenContent(t, text) === 'lt');
      const barToken = nabcTokens.find(t => getTokenContent(t, text) === 'bar');
      const numToken = nabcTokens.find(t => getTokenContent(t, text) === '2');
      
      assert.ok(ltToken, 'Should have lt token');
      assert.ok(barToken, 'Should have bar token');
      assert.ok(numToken, 'Should have number token');
      
      assert.strictEqual(getTokenTypeName(ltToken!.type), 'NABCTironianLetterPrefix', 'lt = label (tironian letter prefix)');
      assert.strictEqual(getTokenTypeName(barToken!.type), 'NABCSignificantLetterShorthand', 'bar = customLiteral (letter specifier)');
      assert.strictEqual(getTokenTypeName(numToken!.type), 'NABCSignificantLetterPosition', '2 = number');
    }
  });
  
  test('Should handle multiple significant letters in one line', async () => {
    const text = `name: Test;
%%
(c4) Multiple(g|vilsfoo1)sig(h|pultbar2)nif(i|clltbaz3)icant()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find all prefix tokens (ls/lt)
      const prefixTokens = decoded.filter(t => {
        const content = getTokenContent(t, text);
        return t.line === 2 && (content === 'ls' || content === 'lt');
      });
      
      assert.strictEqual(prefixTokens.length, 3, 'Should have 3 ls/lt prefix tokens');
      
      // Verify token types: 2 ls (namespace) + 1 lt (label)
      const lsTokens = prefixTokens.filter(t => getTokenContent(t, text) === 'ls');
      const ltTokens = prefixTokens.filter(t => getTokenContent(t, text) === 'lt');
      
      assert.strictEqual(lsTokens.length, 1, 'Should have 1 ls token');
      assert.strictEqual(ltTokens.length, 2, 'Should have 2 lt tokens');
      
      lsTokens.forEach(t => {
        assert.strictEqual(getTokenTypeName(t.type), 'NABCSignificantLetterPrefix', 'ls should be namespace');
      });
      
      ltTokens.forEach(t => {
        assert.strictEqual(getTokenTypeName(t.type), 'NABCTironianLetterPrefix', 'lt should be label');
      });
      
      // Find all letter specifier tokens
      const specifierTokens = decoded.filter(t => 
        t.line === 2 && getTokenTypeName(t.type) === 'NABCSignificantLetterShorthand' &&
        ['foo', 'bar', 'baz'].includes(getTokenContent(t, text))
      );
      
      assert.strictEqual(specifierTokens.length, 3, 'Should have 3 letter specifier tokens');
      
      // Find all number tokens
      const numberTokens = decoded.filter(t => 
        t.line === 2 && getTokenTypeName(t.type) === 'NABCSignificantLetterPosition' &&
        ['1', '2', '3'].includes(getTokenContent(t, text))
      );
      
      assert.strictEqual(numberTokens.length, 3, 'Should have 3 number tokens');
    }
  });
  
  test('Should handle complex letter sequences', async () => {
    const text = `name: Test;
%%
(c4) Complex(g|vilsabcdef1)letters()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find the 'abcdef' token (long letter sequence)
      const longToken = decoded.find(t => {
        const content = getTokenContent(t, text);
        return content === 'abcdef' && t.line === 2;
      });
      
      assert.ok(longToken, 'Should find long letter sequence token');
      assert.strictEqual(getTokenTypeName(longToken!.type), 'NABCSignificantLetterShorthand', 'Long letter sequence should be customLiteral (letter specifier)');
    }
  });
  
  test('Should handle multi-digit numbers', async () => {
    const text = `name: Test;
%%
(c4) Multi(g|vilstest123)digit()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find the '123' token (multi-digit number)
      const numToken = decoded.find(t => {
        const content = getTokenContent(t, text);
        return content === '123' && t.line === 2;
      });
      
      assert.ok(numToken, 'Should find multi-digit number token');
      assert.strictEqual(getTokenTypeName(numToken!.type), 'NABCSignificantLetterPosition', 'Multi-digit number should be number');
    }
  });
  
  test('Should validate semantic token scope mappings', () => {
    // Read package.json to verify semantic token scope mapping
    const fs = require('fs');
    const path = require('path');
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const semanticTokenScopes = packageJson.contributes.semanticTokenScopes[0].scopes;
    
    // Validate namespace (ls - significant letter prefix)
    const namespaceScopes = semanticTokenScopes.namespace;
    assert.ok(namespaceScopes, 'namespace semantic token should have scope mappings');
    assert.ok(Array.isArray(namespaceScopes), 'namespace scopes should be an array');
    assert.ok(
      namespaceScopes.some((s: string) => s.includes('significant')),
      'namespace token should map to a significant-related scope'
    );
    
    // Validate label (lt - tironian letter prefix)
    const labelScopes = semanticTokenScopes.label;
    assert.ok(labelScopes, 'label semantic token should have scope mappings');
    assert.ok(Array.isArray(labelScopes), 'label scopes should be an array');
    assert.ok(
      labelScopes.some((s: string) => s.includes('tironian')),
      'label token should map to a tironian-related scope'
    );
    
    // Validate customLiteral (letter specifier)
    const customLiteralScopes = semanticTokenScopes.customLiteral;
    assert.ok(customLiteralScopes, 'customLiteral semantic token should have scope mappings');
    assert.ok(Array.isArray(customLiteralScopes), 'customLiteral scopes should be an array');
    assert.ok(
      customLiteralScopes.some((s: string) => s.includes('specifier') || s.includes('constant')),
      'customLiteral token should map to specifier or constant scope'
    );
  });
  
  test('Should validate digits 1-9 receive number token type', async () => {
    const text = `name: Test;
%%
(c4) Digits(g|vilstest1)to(h|pulsbar2)nine(i|clltfoo9)test()`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'gabc'
    });
    
    const result = await provider.provideDocumentSemanticTokens(doc, new vscode.CancellationTokenSource().token);
    assert.ok(result, 'Tokens should be generated');
    
    if (result) {
      const decoded = decodeSemanticTokens(result.data);
      
      // Find all single digit tokens (1, 2, 9)
      const digitTokens = decoded.filter(t => {
        const content = getTokenContent(t, text);
        return t.line === 2 && /^[1-9]$/.test(content);
      });
      
      assert.strictEqual(digitTokens.length, 3, 'Should find 3 single digit tokens');
      
      // All digits should be number tokens
      digitTokens.forEach(token => {
        assert.strictEqual(
          getTokenTypeName(token.type),
          'NABCSignificantLetterPosition',
          `Digit "${getTokenContent(token, text)}" should be number token`
        );
      });
    }
  });
});
