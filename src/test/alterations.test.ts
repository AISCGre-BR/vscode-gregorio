/**
 * Tests for alteration tokenization
 */

import * as assert from 'assert';

describe('Alteration Tokenization Tests', () => {
  
  /**
   * Test the alteration detection regex and length calculation logic
   */
  function testAlterationParsing(noteText: string): {char: string, length: number} | null {
    let pos = 0;
    
    // Skip pitch
    if (/[a-npA-NP]/.test(noteText[pos])) {
      pos++;
    }
    
    // Skip note shapes
    while (pos < noteText.length && /[wvosqr<>GO]/.test(noteText[pos])) {
      pos++;
    }
    
    // Check for alteration
    if (pos < noteText.length) {
      const char = noteText[pos];
      
      if (/[xyXY#]/.test(char)) {
        let alterationLength = 1;
        
        // Check for double sharp (##)
        if (char === '#' && pos + 1 < noteText.length && noteText[pos + 1] === '#') {
          alterationLength = 2;
          // Check for ##?
          if (pos + 2 < noteText.length && noteText[pos + 2] === '?') {
            alterationLength = 3;
          }
        } else {
          // Check for single character alteration with ? (x?, y?, #?, X?, Y?)
          if (pos + 1 < noteText.length && noteText[pos + 1] === '?') {
            alterationLength = 2;
          }
        }
        
        return { char, length: alterationLength };
      }
    }
    
    return null;
  }
  
  test('Flat (x) should be detected with length 1', () => {
    const result = testAlterationParsing('gx');
    assert.ok(result, 'Should detect flat alteration');
    assert.strictEqual(result!.char, 'x', 'Should be flat (x)');
    assert.strictEqual(result!.length, 1, 'Flat should have length 1');
  });
  
  test('Soft flat (X) should be detected with length 1', () => {
    const result = testAlterationParsing('gX');
    assert.ok(result, 'Should detect soft flat');
    assert.strictEqual(result!.char, 'X', 'Should be soft flat (X)');
    assert.strictEqual(result!.length, 1, 'Soft flat should have length 1');
  });
  
  test('Natural (y) should be detected with length 1', () => {
    const result = testAlterationParsing('gy');
    assert.ok(result, 'Should detect natural');
    assert.strictEqual(result!.char, 'y', 'Should be natural (y)');
    assert.strictEqual(result!.length, 1, 'Natural should have length 1');
  });
  
  test('Soft natural (Y) should be detected with length 1', () => {
    const result = testAlterationParsing('gY');
    assert.ok(result, 'Should detect soft natural');
    assert.strictEqual(result!.char, 'Y', 'Should be soft natural (Y)');
    assert.strictEqual(result!.length, 1, 'Soft natural should have length 1');
  });
  
  test('Sharp (#) should be detected with length 1', () => {
    const result = testAlterationParsing('g#');
    assert.ok(result, 'Should detect sharp');
    assert.strictEqual(result!.char, '#', 'Should be sharp (#)');
    assert.strictEqual(result!.length, 1, 'Sharp should have length 1');
  });
  
  test('Double sharp (##) should be detected with length 2', () => {
    const result = testAlterationParsing('g##');
    assert.ok(result, 'Should detect double sharp');
    assert.strictEqual(result!.char, '#', 'Should start with #');
    assert.strictEqual(result!.length, 2, 'Double sharp should have length 2');
  });
  
  test('Parenthesized flat (x?) should be detected with length 2', () => {
    const result = testAlterationParsing('gx?');
    assert.ok(result, 'Should detect parenthesized flat');
    assert.strictEqual(result!.char, 'x', 'Should be flat (x)');
    assert.strictEqual(result!.length, 2, 'Parenthesized flat should have length 2 (x?)');
  });
  
  test('Parenthesized soft flat (X?) should be detected with length 2', () => {
    const result = testAlterationParsing('gX?');
    assert.ok(result, 'Should detect parenthesized soft flat');
    assert.strictEqual(result!.char, 'X', 'Should be soft flat (X)');
    assert.strictEqual(result!.length, 2, 'Parenthesized soft flat should have length 2 (X?)');
  });
  
  test('Parenthesized natural (y?) should be detected with length 2', () => {
    const result = testAlterationParsing('gy?');
    assert.ok(result, 'Should detect parenthesized natural');
    assert.strictEqual(result!.char, 'y', 'Should be natural (y)');
    assert.strictEqual(result!.length, 2, 'Parenthesized natural should have length 2 (y?)');
  });
  
  test('Parenthesized soft natural (Y?) should be detected with length 2', () => {
    const result = testAlterationParsing('gY?');
    assert.ok(result, 'Should detect parenthesized soft natural');
    assert.strictEqual(result!.char, 'Y', 'Should be soft natural (Y)');
    assert.strictEqual(result!.length, 2, 'Parenthesized soft natural should have length 2 (Y?)');
  });
  
  test('Parenthesized sharp (#?) should be detected with length 2', () => {
    const result = testAlterationParsing('g#?');
    assert.ok(result, 'Should detect parenthesized sharp');
    assert.strictEqual(result!.char, '#', 'Should be sharp (#)');
    assert.strictEqual(result!.length, 2, 'Parenthesized sharp should have length 2 (#?)');
  });
  
  test('Parenthesized double sharp (##?) should be detected with length 3', () => {
    const result = testAlterationParsing('g##?');
    assert.ok(result, 'Should detect parenthesized double sharp');
    assert.strictEqual(result!.char, '#', 'Should start with #');
    assert.strictEqual(result!.length, 3, 'Parenthesized double sharp should have length 3 (##?)');
  });
  
  test('Note with shape before alteration should still detect alteration', () => {
    const result = testAlterationParsing('gvx');
    assert.ok(result, 'Should detect alteration after shape');
    assert.strictEqual(result!.char, 'x', 'Should be flat (x)');
    assert.strictEqual(result!.length, 1, 'Should have length 1');
  });
  
  test('Note with punctum inclinatum before alteration should detect alteration', () => {
    const result = testAlterationParsing('gGx');
    assert.ok(result, 'Should detect alteration after punctum inclinatum');
    assert.strictEqual(result!.char, 'x', 'Should be flat (x)');
    assert.strictEqual(result!.length, 1, 'Should have length 1');
  });
});
