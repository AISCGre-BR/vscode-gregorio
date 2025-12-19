import * as assert from 'assert';
import * as vscode from 'vscode';
import { GabcSemanticTokensProvider } from '../semanticTokensProvider';

suite('Extra Symbols Mixed Test Suite', () => {
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

  test('Ictus followed by episema with digit: g\'_0', async () => {
    const text = '(c4) Test(g\'_0) (::)';
    const document = await vscode.workspace.openTextDocument({ content: text, language: 'gabc' });
    const tokensResult = provider.provideDocumentSemanticTokens(document, new vscode.CancellationTokenSource().token);
    
    assert.ok(tokensResult, 'Tokens should be provided');
    const tokens = tokensResult as vscode.SemanticTokens;
    
    const decoded = decodeSemanticTokens(tokens.data);
    console.log('\n=== g\'_0 tokens ===');
    decoded.forEach(token => {
      const content = getTokenContent(token, text);
      console.log(`Token: char=${token.char}, len=${token.length}, type=${getTokenTypeName(token.type)}, content="${content}"`);
    });
    
    // Expected tokenization for (g'_0):
    // g - pitch (class = 3)
    // ' - ictus (variable = 5)
    // _ - episema (variable = 5)
    // 0 - digit (number = 18)
    
    const noteGroupTokens = decoded.filter(t => t.char >= 10 && t.char <= 14);
    
    const pitchToken = noteGroupTokens.find(t => t.char === 10);
    assert.ok(pitchToken, 'Should have pitch token at position 10');
    assert.strictEqual(pitchToken.type, 3, 'Pitch should be type class (3)');
    
    const apostropheToken = noteGroupTokens.find(t => t.char === 11);
    assert.ok(apostropheToken, 'Should have apostrophe token at position 11');
    assert.strictEqual(apostropheToken.type, 5, 'Apostrophe should be type variable (5)');
    
    const underscoreToken = noteGroupTokens.find(t => t.char === 12);
    assert.ok(underscoreToken, 'Should have underscore token at position 12');
    assert.strictEqual(underscoreToken.type, 5, 'Underscore should be type variable (5)');
    
    const digitToken = noteGroupTokens.find(t => t.char === 13);
    assert.ok(digitToken, 'Should have digit token at position 13');
    assert.strictEqual(digitToken.type, 18, 'Digit should be type number (18)');
  });

  test('Episema with digit followed by ictus: g_0\'', async () => {
    const text = '(c4) Test(g_0\') (::)';
    const document = await vscode.workspace.openTextDocument({ content: text, language: 'gabc' });
    const tokensResult = provider.provideDocumentSemanticTokens(document, new vscode.CancellationTokenSource().token);
    
    assert.ok(tokensResult, 'Tokens should be provided');
    const tokens = tokensResult as vscode.SemanticTokens;
    
    const decoded = decodeSemanticTokens(tokens.data);
    console.log('\n=== g_0\' tokens ===');
    decoded.forEach(token => {
      const content = getTokenContent(token, text);
      console.log(`Token: char=${token.char}, len=${token.length}, type=${getTokenTypeName(token.type)}, content="${content}"`);
    });
    
    // Expected tokenization for (g_0'):
    // g - pitch (class = 3)
    // _ - episema (variable = 5)
    // 0 - digit (number = 18)
    // ' - ictus (variable = 5)
    
    const noteGroupTokens = decoded.filter(t => t.char >= 10 && t.char <= 14);
    
    const pitchToken = noteGroupTokens.find(t => t.char === 10);
    assert.ok(pitchToken, 'Should have pitch token at position 10');
    assert.strictEqual(pitchToken.type, 3, 'Pitch should be type class (3)');
    
    const underscoreToken = noteGroupTokens.find(t => t.char === 11);
    assert.ok(underscoreToken, 'Should have underscore token at position 11');
    assert.strictEqual(underscoreToken.type, 5, 'Underscore should be type variable (5)');
    
    const digitToken = noteGroupTokens.find(t => t.char === 12);
    assert.ok(digitToken, 'Should have digit token at position 12');
    assert.strictEqual(digitToken.type, 18, 'Digit should be type number (18)');
    
    const apostropheToken = noteGroupTokens.find(t => t.char === 13);
    assert.ok(apostropheToken, 'Should have apostrophe token at position 13');
    assert.strictEqual(apostropheToken.type, 5, 'Apostrophe should be type variable (5)');
  });

  test('Episema followed by ictus: g_\'', async () => {
    const text = '(c4) Test(g_\') (::)';
    const document = await vscode.workspace.openTextDocument({ content: text, language: 'gabc' });
    const tokensResult = provider.provideDocumentSemanticTokens(document, new vscode.CancellationTokenSource().token);
    
    assert.ok(tokensResult, 'Tokens should be provided');
    const tokens = tokensResult as vscode.SemanticTokens;
    
    const decoded = decodeSemanticTokens(tokens.data);
    console.log('\n=== g_\' tokens ===');
    decoded.forEach(token => {
      const content = getTokenContent(token, text);
      console.log(`Token: char=${token.char}, len=${token.length}, type=${getTokenTypeName(token.type)}, content="${content}"`);
    });
    
    // Expected tokenization for (g_'):
    // g - pitch (class = 3)
    // _ - episema (variable = 5)
    // ' - ictus (variable = 5)
    
    const noteGroupTokens = decoded.filter(t => t.char >= 10 && t.char <= 13);
    
    const pitchToken = noteGroupTokens.find(t => t.char === 10);
    assert.ok(pitchToken, 'Should have pitch token at position 10');
    assert.strictEqual(pitchToken.type, 3, 'Pitch should be type class (3)');
    
    const underscoreToken = noteGroupTokens.find(t => t.char === 11);
    assert.ok(underscoreToken, 'Should have underscore token at position 11');
    assert.strictEqual(underscoreToken.type, 5, 'Underscore should be type variable (5)');
    
    const apostropheToken = noteGroupTokens.find(t => t.char === 12);
    assert.ok(apostropheToken, 'Should have apostrophe token at position 12');
    assert.strictEqual(apostropheToken.type, 5, 'Apostrophe should be type variable (5)');
  });

  test('All combinations of ictus and episema', async () => {
    const text = '(c4) A(j\'_0)B(k_\')C(l_0\')D(m\'_) (::)';
    const document = await vscode.workspace.openTextDocument({ content: text, language: 'gabc' });
    const tokensResult = provider.provideDocumentSemanticTokens(document, new vscode.CancellationTokenSource().token);
    
    assert.ok(tokensResult, 'Tokens should be provided');
    const tokens = tokensResult as vscode.SemanticTokens;
    
    const decoded = decodeSemanticTokens(tokens.data);
    console.log('\n=== All combinations tokens ===');
    decoded.forEach(token => {
      const content = getTokenContent(token, text);
      console.log(`Token at ${token.char}: "${content}" (len=${token.length}, type=${getTokenTypeName(token.type)})`);
    });
    
    // Validate that all symbols and digits are tokenized
    const variableTokens = decoded.filter(t => t.type === 5); // variable
    const numberTokens = decoded.filter(t => t.type === 18); // number
    
    // Should have at least: ', _, ', _ (4 variable tokens for symbols)
    assert.ok(variableTokens.length >= 4, `Should have at least 4 variable tokens, got ${variableTokens.length}`);
    
    // Should have at least: 0, 0 (2 number tokens)
    assert.ok(numberTokens.length >= 2, `Should have at least 2 number tokens, got ${numberTokens.length}`);
  });
});

