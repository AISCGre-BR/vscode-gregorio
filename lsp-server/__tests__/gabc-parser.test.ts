/**
 * Tests for GABC Parser
 */

import { GabcParser } from '../parser/gabc-parser';

describe('GabcParser', () => {
  describe('Header Parsing', () => {
    it('should parse simple headers', () => {
      const text = `name: Test;
mode: 1;
%%
(c4) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.get('name')).toBe('Test');
      expect(result.headers.get('mode')).toBe('1');
    });

    it('should parse multiline headers', () => {
      const text = `name: This is a
very long name;;
%%
(c4) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.get('name')).toContain('This is a');
      expect(result.headers.get('name')).toContain('very long name');
    });

    it('should handle comments in headers', () => {
      const text = `name: Test; % This is a comment
mode: 1; % Another comment
%%
(c4) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.get('name')).toBe('Test');
      expect(result.headers.get('mode')).toBe('1');
      expect(result.comments.length).toBeGreaterThan(0);
    });
  });

  describe('Notation Parsing', () => {
    it('should parse simple notation', () => {
      const text = `name: Test;
%%
(c4) Te(f)st(g)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.notation.syllables.length).toBeGreaterThan(0);
    });

    it('should parse clefs', () => {
      const text = `name: Test;
%%
(c4) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      // Check if clef was parsed
      const hasClef = result.notation.syllables.some(s => s.clef !== undefined);
      expect(hasClef).toBe(true);
    });

    it('should parse NABC snippets', () => {
      const text = `name: Test;
nabc-lines: 1;
%%
(c4) Test(f|vi)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const hasNabc = result.notation.syllables.some(s => 
        s.notes.some(n => n.nabc && n.nabc.length > 0)
      );
      
      expect(hasNabc).toBe(true);
    });

    it('should correctly parse alternating GABC and NABC segments', () => {
      const text = `name: Test;
nabc-lines: 1;
%%
(c4) Test(e|ta|f|vi)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      // Find the syllable with the alternating pattern
      const syllable = result.notation.syllables.find(s => 
        s.text === 'Test' && s.notes.length > 0
      );
      
      expect(syllable).toBeDefined();
      
      if (syllable) {
        const noteGroup = syllable.notes[0];
        
        // GABC content should be 'ef' (e and f concatenated)
        expect(noteGroup.gabc).toBe('ef');
        
        // NABC should have 2 snippets: 'ta' and 'vi'
        expect(noteGroup.nabc).toBeDefined();
        expect(noteGroup.nabc?.length).toBe(2);
        expect(noteGroup.nabc?.[0]).toBe('ta');
        expect(noteGroup.nabc?.[1]).toBe('vi');
        
        // Should parse 2 notes from the GABC content
        expect(noteGroup.notes.length).toBe(2);
        expect(noteGroup.notes[0].pitch).toBe('e');
        expect(noteGroup.notes[1].pitch).toBe('f');
      }
    });

    it('should handle multiple alternations correctly', () => {
      const text = `name: Test;
nabc-lines: 1;
%%
(c4) Test(gh|pe|f|ta|e|vi)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllable = result.notation.syllables.find(s => 
        s.text === 'Test' && s.notes.length > 0
      );
      
      expect(syllable).toBeDefined();
      
      if (syllable) {
        const noteGroup = syllable.notes[0];
        
        // GABC content should be 'ghfe' (all GABC segments concatenated)
        expect(noteGroup.gabc).toBe('ghfe');
        
        // NABC should have 3 snippets: 'pe', 'ta', 'vi'
        expect(noteGroup.nabc).toBeDefined();
        expect(noteGroup.nabc?.length).toBe(3);
        expect(noteGroup.nabc?.[0]).toBe('pe');
        expect(noteGroup.nabc?.[1]).toBe('ta');
        expect(noteGroup.nabc?.[2]).toBe('vi');
        
        // Should parse 4 notes from the GABC content
        expect(noteGroup.notes.length).toBe(4);
        expect(noteGroup.notes[0].pitch).toBe('g');
        expect(noteGroup.notes[1].pitch).toBe('h');
        expect(noteGroup.notes[2].pitch).toBe('f');
        expect(noteGroup.notes[3].pitch).toBe('e');
      }
    });
  });

  describe('Note Parsing', () => {
    it('should parse basic notes', () => {
      const text = `name: Test;
%%
(c4) Test(fgh)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.notation.syllables.length).toBeGreaterThan(0);
      const firstSyllable = result.notation.syllables.find(s => s.notes.length > 0);
      expect(firstSyllable).toBeDefined();
    });

    it('should parse note modifiers', () => {
      const text = `name: Test;
%%
(c4) Test(f.)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      // Find syllable with actual notes (not just clefs) - clefs should have pitch matching clef pattern
      const syllable = result.notation.syllables.find(s => {
        if (s.notes.length === 0 || s.notes[0].notes.length === 0) return false;
        const firstNote = s.notes[0].notes[0];
        // Skip if it's a clef note (c4, f3, etc.)
        if (s.clef) return false;
        return true;
      });
      
      expect(syllable).toBeDefined();
      
      if (syllable && syllable.notes[0].notes.length > 0) {
        const note = syllable.notes[0].notes[0];
        expect(note.modifiers.length).toBeGreaterThan(0);
      }
    });
  });
});
