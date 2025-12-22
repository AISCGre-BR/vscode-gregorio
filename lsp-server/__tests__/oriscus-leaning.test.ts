/**
 * Tests for oriscus leaning indicators (0, 1)
 */

import { GabcParser } from '../parser/gabc-parser';

describe('Oriscus Leaning Indicators', () => {
  
  test('should parse oriscus with left leaning (o0)', () => {
    const parser = new GabcParser('name: Test;\n%%\n(go0)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    expect(noteGroup.notes.length).toBe(1);
    
    const note = noteGroup.notes[0];
    expect(note.pitch).toBe('g');
    
    // Check that the note range includes the oriscus modifier and leaning (3 characters: go0)
    expect(note.range.end.character - note.range.start.character).toBe(3);
  });
  
  test('should parse oriscus with right leaning (o1)', () => {
    const parser = new GabcParser('name: Test;\n%%\n(ho1)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    expect(noteGroup.notes.length).toBe(1);
    
    const note = noteGroup.notes[0];
    expect(note.pitch).toBe('h');
    
    // Check that the note range includes the oriscus modifier and leaning (3 characters: ho1)
    expect(note.range.end.character - note.range.start.character).toBe(3);
  });
  
  test('should parse oriscus scapus with left leaning (O0)', () => {
    const parser = new GabcParser('name: Test;\n%%\n(gO0)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    expect(noteGroup.notes.length).toBe(1);
    
    const note = noteGroup.notes[0];
    expect(note.pitch).toBe('g');
    
    // Check that the note range includes the oriscus scapus modifier and leaning (3 characters: gO0)
    expect(note.range.end.character - note.range.start.character).toBe(3);
  });
  
  test('should parse oriscus scapus with right leaning (O1)', () => {
    const parser = new GabcParser('name: Test;\n%%\n(hO1)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    expect(noteGroup.notes.length).toBe(1);
    
    const note = noteGroup.notes[0];
    expect(note.pitch).toBe('h');
    
    // Check that the note range includes the oriscus scapus modifier and leaning (3 characters: hO1)
    expect(note.range.end.character - note.range.start.character).toBe(3);
  });
  
  test('should parse oriscus without leaning indicator', () => {
    const parser = new GabcParser('name: Test;\n%%\n(goho)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    const notes = noteGroup.notes;
    expect(notes.length).toBe(2);
    
    // Each note should be 2 characters (pitch + o)
    expect(notes[0].pitch).toBe('g');
    expect(notes[0].range.end.character - notes[0].range.start.character).toBe(2);
    
    expect(notes[1].pitch).toBe('h');
    expect(notes[1].range.end.character - notes[1].range.start.character).toBe(2);
  });
  
  test('should parse multiple oriscus with different leanings', () => {
    const parser = new GabcParser('name: Test;\n%%\n(go0ho1io)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    const notes = noteGroup.notes;
    expect(notes.length).toBe(3);
    
    // First note: go0 (3 characters)
    expect(notes[0].pitch).toBe('g');
    expect(notes[0].range.end.character - notes[0].range.start.character).toBe(3);
    
    // Second note: ho1 (3 characters)
    expect(notes[1].pitch).toBe('h');
    expect(notes[1].range.end.character - notes[1].range.start.character).toBe(3);
    
    // Third note: io (2 characters, no leaning)
    expect(notes[2].pitch).toBe('i');
    expect(notes[2].range.end.character - notes[2].range.start.character).toBe(2);
  });
  
  test('should parse mixed oriscus and oriscus scapus with leanings', () => {
    const parser = new GabcParser('name: Test;\n%%\n(go0gO1hO0iO1)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    const notes = noteGroup.notes;
    expect(notes.length).toBe(4);
    
    // go0: lowercase with oriscus and left leaning
    expect(notes[0].pitch).toBe('g');
    expect(notes[0].range.end.character - notes[0].range.start.character).toBe(3);
    
    // gO1: lowercase with oriscus scapus and right leaning
    expect(notes[1].pitch).toBe('g');
    expect(notes[1].range.end.character - notes[1].range.start.character).toBe(3);
    
    // hO0: lowercase with oriscus scapus and left leaning
    expect(notes[2].pitch).toBe('h');
    expect(notes[2].range.end.character - notes[2].range.start.character).toBe(3);
    
    // iO1: lowercase with oriscus scapus and right leaning
    expect(notes[3].pitch).toBe('i');
    expect(notes[3].range.end.character - notes[3].range.start.character).toBe(3);
  });
  
  test('should not tokenize digit 2 after oriscus (only 0 and 1)', () => {
    const parser = new GabcParser('name: Test;\n%%\n(go2)');
    const result = parser.parse();
    
    const syllables = result.notation.syllables;
    expect(syllables.length).toBeGreaterThan(0);
    
    const noteGroup = syllables[0].notes[0];
    expect(noteGroup).toBeDefined();
    const notes = noteGroup.notes;
    
    // Should parse as 2 separate notes: 'go' and '2' (or error)
    // The parser might not create a note for '2', so we just check the first note
    expect(notes[0].pitch).toBe('g');
    expect(notes[0].range.end.character - notes[0].range.start.character).toBe(2);
  });
});
