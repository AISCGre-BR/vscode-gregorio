/**
 * Tests for leaning indicators (0, 1, 2) in punctum inclinatum
 */

import { GabcParser } from '../parser/gabc-parser';

describe('Leaning Indicators', () => {
  
  test('should parse punctum inclinatum with left leaning (0)', () => {
    const parser = new GabcParser('name: Test;\n%%\n(G0)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    expect(noteGroup.notes.length).toBe(1);
    
    const note = noteGroup.notes[0];
    expect(note.pitch).toBe('g');
    
    // Check that the note range includes the leaning indicator (2 characters: G0)
    expect(note.range.end.character - note.range.start.character).toBe(2);
  });
  
  test('should parse punctum inclinatum with right leaning (1)', () => {
    const parser = new GabcParser('name: Test;\n%%\n(H1)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    expect(noteGroup?.notes.length).toBe(1);
    
    const note = noteGroup.notes[0];
    expect(note.pitch).toBe('h');
    
    // Check that the note range includes the leaning indicator (2 characters: H1)
    expect(note.range.end.character - note.range.start.character).toBe(2);
  });
  
  test('should parse punctum inclinatum with non-leaning (2)', () => {
    const parser = new GabcParser('name: Test;\n%%\n(I2)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    expect(noteGroup?.notes.length).toBe(1);
    
    const note = noteGroup.notes[0];
    expect(note.pitch).toBe('i');
    
    // Check that the note range includes the leaning indicator (2 characters: I2)
    expect(note.range.end.character - note.range.start.character).toBe(2);
  });
  
  test('should parse multiple punctum inclinatum with different leanings', () => {
    const parser = new GabcParser('name: Test;\n%%\n(G0H1I2)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    const notes = noteGroup.notes;
    expect(notes.length).toBe(3);
    
    // First note: G0
    expect(notes[0].pitch).toBe('g');
    expect(notes[0].range.end.character - notes[0].range.start.character).toBe(2);
    
    // Second note: H1
    expect(notes[1].pitch).toBe('h');
    expect(notes[1].range.end.character - notes[1].range.start.character).toBe(2);
    
    // Third note: I2
    expect(notes[2].pitch).toBe('i');
    expect(notes[2].range.end.character - notes[2].range.start.character).toBe(2);
  });
  
  test('should parse punctum inclinatum without leaning indicator', () => {
    const parser = new GabcParser('name: Test;\n%%\n(GHI)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    const notes = noteGroup.notes;
    expect(notes.length).toBe(3);
    
    // Each note should be only 1 character (no leaning)
    expect(notes[0].pitch).toBe('g');
    expect(notes[0].range.end.character - notes[0].range.start.character).toBe(1);
    
    expect(notes[1].pitch).toBe('h');
    expect(notes[1].range.end.character - notes[1].range.start.character).toBe(1);
    
    expect(notes[2].pitch).toBe('i');
    expect(notes[2].range.end.character - notes[2].range.start.character).toBe(1);
  });
  
  test('should parse lowercase notes without leaning indicator', () => {
    const parser = new GabcParser('name: Test;\n%%\n(ghi)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    const notes = noteGroup.notes;
    expect(notes.length).toBe(3);
    
    // Lowercase notes should not have leaning indicators
    expect(notes[0].pitch).toBe('g');
    expect(notes[0].range.end.character - notes[0].range.start.character).toBe(1);
    
    expect(notes[1].pitch).toBe('h');
    expect(notes[1].range.end.character - notes[1].range.start.character).toBe(1);
    
    expect(notes[2].pitch).toBe('i');
    expect(notes[2].range.end.character - notes[2].range.start.character).toBe(1);
  });
  
  test('should parse mixed uppercase and lowercase notes', () => {
    const parser = new GabcParser('name: Test;\n%%\n(gG0hH1iI2)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    const notes = noteGroup.notes;
    expect(notes.length).toBe(6);
    
    // Lowercase: 1 char each
    expect(notes[0].pitch).toBe('g');
    expect(notes[0].range.end.character - notes[0].range.start.character).toBe(1);
    
    // Uppercase with leaning: 2 chars each
    expect(notes[1].pitch).toBe('g');
    expect(notes[1].range.end.character - notes[1].range.start.character).toBe(2);
    
    expect(notes[2].pitch).toBe('h');
    expect(notes[2].range.end.character - notes[2].range.start.character).toBe(1);
    
    expect(notes[3].pitch).toBe('h');
    expect(notes[3].range.end.character - notes[3].range.start.character).toBe(2);
    
    expect(notes[4].pitch).toBe('i');
    expect(notes[4].range.end.character - notes[4].range.start.character).toBe(1);
    
    expect(notes[5].pitch).toBe('i');
    expect(notes[5].range.end.character - notes[5].range.start.character).toBe(2);
  });
  
  test('should parse oriscus scapus with leaning (O0, O1)', () => {
    const parser = new GabcParser('name: Test;\n%%\n(GO0H1)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    const notes = noteGroup.notes;
    
    // Should have 2 notes: GO0 and H1
    expect(notes.length).toBe(2);
    
    // First note: GO0 (uppercase G with oriscus scapus and leaning 0)
    expect(notes[0].pitch).toBe('g');
    // G + O + 0 = 3 characters
    expect(notes[0].range.end.character - notes[0].range.start.character).toBe(3);
    
    // Second note: H1 (uppercase H with leaning 1)
    expect(notes[1].pitch).toBe('h');
    // H + 1 = 2 characters
    expect(notes[1].range.end.character - notes[1].range.start.character).toBe(2);
  });
});
