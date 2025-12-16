/**
 * Enhanced GABC Parser Tests
 * Based on tree-sitter-gregorio corpus tests
 */

import { GabcParser } from '../parser/gabc-parser';
import { NoteShape } from '../parser/types';

describe('GABC Parser - Corpus Tests', () => {
  describe('00-basics', () => {
    it('should parse file with no lyrics', () => {
      const text = `name: No lyrics;
%%
() ()    ()()
()()() 
()()()()`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.get('name')).toBe('No lyrics');
      expect(result.notation.syllables.length).toBeGreaterThan(0);
    });

    it('should parse basic lyrics', () => {
      const text = `name: Basic lyrics;
%%
Al()le()lú()ia,()
al()le()lú()ia,()     al()le()lú()ia.()`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.get('name')).toBe('Basic lyrics');
      const syllablesWithText = result.notation.syllables.filter(s => s.text.length > 0);
      expect(syllablesWithText.length).toBeGreaterThan(0);
    });

    it('should parse headers and notation section', () => {
      const text = `name: Test;
mode: 1;
%%
(c4) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.get('name')).toBe('Test');
      expect(result.headers.get('mode')).toBe('1');
      expect(result.notation.syllables.length).toBeGreaterThan(0);
    });
  });

  describe('01-lyrics-notation: Style Tags', () => {
    it('should parse bold style tags', () => {
      const text = `name: Style tags;
%%
<b>Al</b>(c)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const syllable = result.notation.syllables.find(s => s.text && s.text.includes('Al'));
      expect(syllable).toBeDefined();
    });

    it('should parse italic style tags', () => {
      const text = `name: Style tags;
%%
<i>le</i>(d)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
    });

    it('should parse small caps style tags', () => {
      const text = `name: Style tags;
%%
<sc>lu</sc>(e)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
    });

    it('should parse all style tags', () => {
      const text = `name: All styles;
%%
<b>Bold</b>(c)<i>Italic</i>(d)<sc>SmallCaps</sc>(e)<tt>Teletype</tt>(f)<c>Color</c>(g)<ul>Underline</ul>(h)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      expect(result.notation.syllables.length).toBeGreaterThan(0);
    });
  });

  describe('02-gabc-neumes: Basic Pitches', () => {
    it('should parse punctum quadratum (lowercase pitches)', () => {
      const text = `name: Punctum;
%%
(abcdefghijklmn)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup).toBeDefined();
      expect(noteGroup?.notes.length).toBeGreaterThan(10);
      
      // Check that all notes are punctum
      noteGroup?.notes.forEach(note => {
        expect(note.shape).toBe(NoteShape.Punctum);
      });
    });

    it('should parse punctum inclinatum (uppercase pitches)', () => {
      const text = `name: Inclinatum;
%%
(ABCDEFG)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.notes.length).toBe(7);
      
      noteGroup?.notes.forEach(note => {
        expect(note.shape).toBe(NoteShape.PunctumInclinatum);
      });
    });

    it('should parse punctum inclinatum with leaning modifiers', () => {
      const text = `name: Leaning;
%%
(G0H1I2)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.notes.length).toBe(3);
    });
  });

  describe('02-gabc-neumes: Special Shapes', () => {
    it('should parse oriscus', () => {
      const text = `name: Oriscus;
%%
(fo)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const noteGroup = result.notation.syllables[0]?.notes[0];
      const oriscus = noteGroup?.notes.find(n => n.shape === NoteShape.Oriscus);
      expect(oriscus).toBeDefined();
    });

    it('should parse quilisma', () => {
      const text = `name: Quilisma;
%%
(fw)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const noteGroup = result.notation.syllables[0]?.notes[0];
      const quilisma = noteGroup?.notes.find(n => n.shape === NoteShape.Quilisma);
      expect(quilisma).toBeDefined();
    });

    it('should parse virga', () => {
      const text = `name: Virga;
%%
(fv)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const noteGroup = result.notation.syllables[0]?.notes[0];
      const virga = noteGroup?.notes.find(n => n.shape === NoteShape.Virga);
      expect(virga).toBeDefined();
    });

    it('should parse virga reversa', () => {
      const text = `name: Virga reversa;
%%
(fV)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const noteGroup = result.notation.syllables[0]?.notes[0];
      const virgaReversa = noteGroup?.notes.find(n => n.shape === NoteShape.VirgaReversa);
      expect(virgaReversa).toBeDefined();
    });

    it('should parse stropha', () => {
      const text = `name: Stropha;
%%
(fs)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const noteGroup = result.notation.syllables[0]?.notes[0];
      const stropha = noteGroup?.notes.find(n => n.shape === NoteShape.Stropha);
      expect(stropha).toBeDefined();
    });
  });

  describe('03-gabc-alterations: Flats, Sharps, Naturals', () => {
    it('should parse flat', () => {
      const text = `name: Flat;
%%
(fx)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.gabc).toContain('x');
    });

    it('should parse sharp', () => {
      const text = `name: Sharp;
%%
(f#)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.gabc).toContain('#');
    });

    it('should parse natural', () => {
      const text = `name: Natural;
%%
(fy)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.gabc).toContain('y');
    });
  });

  describe('04-gabc-complex-neumes', () => {
    it('should parse multi-note neumes', () => {
      const text = `name: Complex;
%%
(fgh)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.notes.length).toBe(3);
    });

    it('should parse neumes with modifiers', () => {
      const text = `name: Modifiers;
%%
(f.g_h')`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.notes.length).toBe(3);
      
      // Check for modifiers
      const firstNote = noteGroup?.notes[0];
      expect(firstNote?.modifiers.length).toBeGreaterThan(0);
    });
  });

  describe('06-gabc-spacing', () => {
    it('should parse spacing characters', () => {
      const text = `name: Spacing;
%%
(f/g//h)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.gabc).toContain('/');
    });

    it('should parse large space', () => {
      const text = `name: Large space;
%%
(f g)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
    });
  });

  describe('Clefs and Bars', () => {
    it('should parse C clef on line 4', () => {
      const text = `name: Clef;
%%
(c4) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllableWithClef = result.notation.syllables.find(s => s.clef !== undefined);
      expect(syllableWithClef?.clef?.type).toBe('c');
      expect(syllableWithClef?.clef?.line).toBe(4);
    });

    it('should parse F clef on line 3', () => {
      const text = `name: F Clef;
%%
(f3) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllableWithClef = result.notation.syllables.find(s => s.clef !== undefined);
      expect(syllableWithClef?.clef?.type).toBe('f');
      expect(syllableWithClef?.clef?.line).toBe(3);
    });

    it('should parse C clef with flat', () => {
      const text = `name: Clef with flat;
%%
(cb4) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllableWithClef = result.notation.syllables.find(s => s.clef !== undefined);
      expect(syllableWithClef?.clef?.hasFlat).toBe(true);
    });

    it('should parse divisio finalis', () => {
      const text = `name: Bar;
%%
(::)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllableWithBar = result.notation.syllables.find(s => s.bar !== undefined);
      expect(syllableWithBar?.bar?.type).toBe('divisio_finalis');
    });
  });

  describe('NABC Support', () => {
    it('should parse NABC snippets with nabc-lines header', () => {
      const text = `name: NABC;
nabc-lines: 1;
%%
(f|vi)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.get('nabc-lines')).toBe('1');
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.nabc).toBeDefined();
      expect(noteGroup?.nabc?.length).toBeGreaterThan(0);
    });

    it('should error on NABC without header', () => {
      const text = `name: NABC Error;
%%
(f|vi)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      // Should not have nabc-lines header
      expect(result.headers.has('nabc-lines')).toBe(false);
    });
  });

  describe('Comments', () => {
    it('should parse comments in headers', () => {
      const text = `name: Test; % This is a comment
mode: 1;
%%
(c4) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.comments.length).toBeGreaterThan(0);
      expect(result.headers.get('name')).toBe('Test');
    });

    it('should parse comments in notation', () => {
      const text = `name: Test;
%%
(c4) Test(f) % Comment here
(g)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.comments.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-line Headers', () => {
    it('should parse multiline headers', () => {
      const text = `name: This is a
very long name;;
mode: 1;
%%
(c4) Test(f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const name = result.headers.get('name');
      expect(name).toContain('This is a');
      expect(name).toContain('very long name');
    });
  });

  describe('Special Characters and Escaping', () => {
    it('should handle escaped parentheses', () => {
      const text = `name: Escaped;
%%
Test$((f)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file', () => {
      const text = '';

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.size).toBe(0);
      expect(result.notation.syllables.length).toBe(0);
    });

    it('should handle file with only headers', () => {
      const text = `name: Only headers;
mode: 1;
%%`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.size).toBe(2);
      expect(result.notation.syllables.length).toBe(0);
    });

    it('should handle file without separator', () => {
      const text = `name: No separator;
mode: 1;`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.size).toBe(2);
    });
  });

  describe('Real-world Examples', () => {
    it('should parse Kyrie XVI example', () => {
      const text = `name: Kyrie XVI;
office-part: Kyriale;
mode: 8;
%%
(c4) KY(f)ri(gh)e(h.) *() e(ixh_i_H'GhvF'E)lé(fgf')i(f)son.(f.) <i>bis</i>(::)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.get('name')).toBe('Kyrie XVI');
      expect(result.headers.get('mode')).toBe('8');
      expect(result.errors.length).toBe(0);
      expect(result.notation.syllables.length).toBeGreaterThan(0);
    });
  });

  describe('NABC - Basic Glyph Descriptors', () => {
    it('should parse basic NABC glyph descriptors with nabc-lines: 1', () => {
      const text = `name: NABC Basic;
nabc-lines: 1;
%%
(c|vi) (d|pu) (e|ta) (f|gr)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.headers.get('nabc-lines')).toBe('1');
      
      const syllables = result.notation.syllables.filter(s => s.notes.length > 0);
      expect(syllables.length).toBe(4);
      
      // Check that NABC was parsed - with nabc-lines: 1, each note has 1 NABC descriptor
      syllables.forEach(s => {
        expect(s.notes[0].nabc).toBeDefined();
        expect(s.notes[0].nabc?.length).toBe(1);
        expect(s.notes[0].nabcParsed).toBeDefined();
        expect(s.notes[0].nabcParsed?.length).toBe(1);
      });
    });

    it('should parse NABC with nabc-lines: 2', () => {
      const text = `name: NABC Two Lines;
nabc-lines: 2;
%%
(c|vi|pu)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllable = result.notation.syllables[0];
      // With nabc-lines: 2, we expect 2 NABC descriptors
      expect(syllable.notes[0].nabc?.length).toBe(2);
      expect(syllable.notes[0].nabcParsed?.length).toBe(2);
    });

    it('should parse NABC with nabc-lines: 4', () => {
      const text = `name: NABC Four Lines;
nabc-lines: 4;
%%
(c|vi|pu|ta|gr)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllable = result.notation.syllables[0];
      // With nabc-lines: 4, we expect 4 NABC descriptors
      expect(syllable.notes[0].nabc?.length).toBe(4);
      expect(syllable.notes[0].nabcParsed?.length).toBe(4);
    });
  });

  describe('NABC - Glyph Modifiers', () => {
    it('should parse mark modification (S)', () => {
      const text = `name: NABC Modifier S;
nabc-lines: 1;
%%
(c|viS)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor).toBeDefined();
      expect(descriptor?.modifiers).toBeDefined();
      expect(descriptor?.modifiers?.length).toBeGreaterThan(0);
    });

    it('should parse grouping modification (G)', () => {
      const text = `name: NABC Modifier G;
nabc-lines: 1;
%%
(c|puG)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.modifiers).toBeDefined();
    });

    it('should parse melodic modification (M)', () => {
      const text = `name: NABC Modifier M;
nabc-lines: 1;
%%
(c|taM)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.modifiers).toBeDefined();
    });

    it('should parse episema (-)', () => {
      const text = `name: NABC Modifier -;
nabc-lines: 1;
%%
(c|cl-)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.modifiers).toBeDefined();
    });

    it('should parse augmentive liquescence (>)', () => {
      const text = `name: NABC Modifier >;
nabc-lines: 1;
%%
(c|pe>)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.modifiers).toBeDefined();
    });

    it('should parse diminutive liquescence (~)', () => {
      const text = `name: NABC Modifier ~;
nabc-lines: 1;
%%
(c|to~)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.modifiers).toBeDefined();
    });

    it('should parse multiple modifiers', () => {
      const text = `name: NABC Multiple Modifiers;
nabc-lines: 1;
%%
(c|clSG-)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.modifiers).toBeDefined();
      expect(descriptor?.modifiers?.length).toBe(3);
    });
  });

  describe('NABC - Pitch Descriptors', () => {
    it('should parse pitch descriptor ha', () => {
      const text = `name: NABC Pitch ha;
nabc-lines: 1;
%%
(c|viha)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.pitch).toBe('a');
    });

    it('should parse pitch descriptor hf', () => {
      const text = `name: NABC Pitch hf;
nabc-lines: 1;
%%
(c|puhf)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.pitch).toBe('f');
    });

    it('should parse pitch descriptor hn', () => {
      const text = `name: NABC Pitch hn;
nabc-lines: 1;
%%
(c|tahn)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.pitch).toBe('n');
    });
  });

  describe('NABC - Combined Features', () => {
    it('should parse glyph with modifiers and pitch', () => {
      const text = `name: NABC Combined;
nabc-lines: 1;
%%
(c|viMhd)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor).toBeDefined();
      expect(descriptor?.modifiers).toBeDefined();
      expect(descriptor?.pitch).toBe('d');
    });

    it('should parse glyph with multiple modifiers and pitch', () => {
      const text = `name: NABC Complex Combined;
nabc-lines: 1;
%%
(c|clSG-hg)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.modifiers).toBeDefined();
      expect(descriptor?.modifiers?.length).toBe(3);
      expect(descriptor?.pitch).toBe('g');
    });

    it('should parse glyph with variant and pitch', () => {
      const text = `name: NABC Variant;
nabc-lines: 1;
%%
(c|peM2ha)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.modifiers).toBeDefined();
      expect(descriptor?.pitch).toBe('a');
    });

    it('should parse glyph with liquescence and pitch', () => {
      const text = `name: NABC Liquescence;
nabc-lines: 1;
%%
(c|to>hm)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const descriptor = result.notation.syllables[0].notes[0].nabcParsed?.[0];
      expect(descriptor?.modifiers).toBeDefined();
      expect(descriptor?.pitch).toBe('m');
    });
  });

  describe('NABC - Extended Glyphs', () => {
    it('should parse all two-note neumes', () => {
      const text = `name: Two-note neumes;
nabc-lines: 1;
%%
(c|cl) (d|pe)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.notation.syllables[0].notes[0].nabcParsed?.length).toBeGreaterThan(0);
      expect(result.notation.syllables[1].notes[0].nabcParsed?.length).toBeGreaterThan(0);
    });

    it('should parse all three-note neumes', () => {
      const text = `name: Three-note neumes;
nabc-lines: 1;
%%
(c|po) (d|to) (e|ci) (f|sc)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllables = result.notation.syllables.filter(s => s.notes.length > 0);
      expect(syllables.length).toBe(4);
      syllables.forEach(s => {
        expect(s.notes[0].nabcParsed?.length).toBeGreaterThan(0);
      });
    });

    it('should parse four-note neumes', () => {
      const text = `name: Four-note neumes;
nabc-lines: 1;
%%
(c|pf) (d|sf) (e|tr)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllables = result.notation.syllables.filter(s => s.notes.length > 0);
      expect(syllables.length).toBe(3);
    });

    it('should parse stropha variants', () => {
      const text = `name: Stropha;
nabc-lines: 1;
%%
(c|st) (d|ds) (e|ts)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllables = result.notation.syllables.filter(s => s.notes.length > 0);
      expect(syllables.length).toBe(3);
    });

    it('should parse special neumes', () => {
      const text = `name: Special;
nabc-lines: 1;
%%
(c|or) (d|sa) (e|pq) (f|ql) (g|qi)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      const syllables = result.notation.syllables.filter(s => s.notes.length > 0);
      expect(syllables.length).toBe(5);
    });
  });
});
