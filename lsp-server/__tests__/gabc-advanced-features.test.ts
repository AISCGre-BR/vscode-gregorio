/**
 * Advanced GABC Features Tests
 * Tests for advanced features not yet fully implemented
 */

import { GabcParser } from '../parser/gabc-parser';
import { NoteShape, ModifierType } from '../parser/types';

describe('GABC Advanced Features', () => {
  describe('Neume Fusions (@)', () => {
    it('should parse simple fusion (g@h)', () => {
      const text = `name: Simple fusion;
%%
(g@h)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup).toBeDefined();
      expect(noteGroup?.notes.length).toBe(2);
      
      // Check that notes have fusion marker
      const hasAt = noteGroup?.gabc.includes('@');
      expect(hasAt).toBe(true);
    });

    it('should parse multiple fusions (g@h@i)', () => {
      const text = `name: Multiple fusion;
%%
(g@h@i)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.notes.length).toBe(3);
    });

    it('should parse fusion with virga (gv@h)', () => {
      const text = `name: Fusion with virga;
%%
(gv@h)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.notes.length).toBe(2);
      expect(noteGroup?.notes[0].shape).toBe(NoteShape.Virga);
    });

    it('should parse fusion with oriscus (go@h)', () => {
      const text = `name: Fusion with oriscus;
%%
(go@h)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.notes[0].shape).toBe(NoteShape.Oriscus);
    });
  });

  describe('Custos', () => {
    it('should parse auto custos (z0)', () => {
      const text = `name: Auto custos;
%%
(cz0d)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.custos).toBeDefined();
      expect(noteGroup?.custos?.type).toBe('auto');
    });

    it('should parse explicit custos (+d)', () => {
      const text = `name: Explicit custos;
%%
(c+de)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.custos).toBeDefined();
      expect(noteGroup?.custos?.type).toBe('explicit');
      expect(noteGroup?.custos?.pitch).toBe('d');
    });
  });

  describe('GABC Attributes', () => {
    it('should parse shape attribute [shape:stroke]', () => {
      const text = `name: Shape attribute;
%%
(gh[shape:stroke]i)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.attributes).toBeDefined();
      expect(noteGroup?.attributes?.length).toBeGreaterThan(0);
      expect(noteGroup?.attributes?.[0].name).toBe('shape');
      expect(noteGroup?.attributes?.[0].value).toBe('stroke');
    });

    it('should parse choral sign cs attribute [cs:vi]', () => {
      const text = `name: Choral sign;
%%
(d[cs:vi]e)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.attributes).toBeDefined();
      const csAttr = noteGroup?.attributes?.find(a => a.name === 'cs');
      expect(csAttr).toBeDefined();
      expect(csAttr?.value).toBe('vi');
    });

    it('should parse brace attributes [ob:0;2mm]', () => {
      const text = `name: Brace;
%%
(d[ob:0;2mm]e)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.attributes).toBeDefined();
      const obAttr = noteGroup?.attributes?.find(a => a.name === 'ob');
      expect(obAttr).toBeDefined();
    });

    it('should parse nocustos attribute [nocustos]', () => {
      const text = `name: No custos;
%%
(c[nocustos]de)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.attributes).toBeDefined();
      const nocustosAttr = noteGroup?.attributes?.find(a => a.name === 'nocustos');
      expect(nocustosAttr).toBeDefined();
    });

    it('should parse multiple attributes', () => {
      const text = `name: Multiple attributes;
%%
(d[cs:vi][cn:pu]e)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.attributes?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Rhythmic Signs (r1-r8)', () => {
    it('should parse rhythmic sign r1', () => {
      const text = `name: Rhythmic sign;
%%
(gr1h)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.gabc).toContain('r1');
    });

    it('should parse all rhythmic signs (r1-r8)', () => {
      for (let i = 1; i <= 8; i++) {
        const text = `name: Rhythmic sign ${i};
%%
(gr${i}h)`;

        const parser = new GabcParser(text);
        const result = parser.parse();

        expect(result.errors.length).toBe(0);
        const noteGroup = result.notation.syllables[0]?.notes[0];
        expect(noteGroup?.gabc).toContain(`r${i}`);
      }
    });
  });

  describe('Advanced Alterations', () => {
    it('should parse parenthesized flat (x?)', () => {
      const text = `name: Parenthesized flat;
%%
(fx?)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.gabc).toContain('x?');
    });

    it('should parse soft sharp (##)', () => {
      const text = `name: Soft sharp;
%%
(f##)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.gabc).toContain('##');
    });

    it('should parse parenthesized natural (y?)', () => {
      const text = `name: Parenthesized natural;
%%
(fy?)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.gabc).toContain('y?');
    });
  });

  describe('Advanced Episema (_0-_5)', () => {
    it('should parse episema with bridge modifiers', () => {
      for (let i = 0; i <= 5; i++) {
        const text = `name: Episema ${i};
%%
(g_${i}h)`;

        const parser = new GabcParser(text);
        const result = parser.parse();

        expect(result.errors.length).toBe(0);
        const noteGroup = result.notation.syllables[0]?.notes[0];
        expect(noteGroup?.gabc).toContain(`_${i}`);
      }
    });
  });

  describe('Cross-syllable Tags', () => {
    it('should parse cross-syllable bold tags', () => {
      const text = `name: Cross-syllable bold;
%%
<b>text1(f) text2</b>(g)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      // Parser should at least not error
      // Full implementation may require more complex state tracking
      expect(result.notation.syllables.length).toBeGreaterThan(0);
    });

    it('should parse cross-syllable nlba tags', () => {
      const text = `name: Cross-syllable nlba;
%%
<nlba>Pa(f) ter</nlba>(g)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.notation.syllables.length).toBeGreaterThan(0);
    });

    it('should parse mixed cross-syllable tags', () => {
      const text = `name: Mixed cross-syllable;
%%
<i>text1(f) text2</i><c>(g) text3</c>(h)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.notation.syllables.length).toBeGreaterThan(0);
    });
  });

  describe('NABC Fusions (!)', () => {
    it('should parse simple NABC fusion (vi!pu)', () => {
      const text = `name: NABC fusion;
nabc-lines: 1;
%%
(c|vi!pu)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.nabc).toBeDefined();
      expect(noteGroup?.nabc?.[0]).toContain('!');
    });

    it('should parse NABC fusion with three glyphs (vi!pu!ta)', () => {
      const text = `name: NABC three fusion;
nabc-lines: 1;
%%
(c|vi!pu!ta)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.nabc?.[0]).toContain('!');
    });

    it('should parse NABC fusion with pitch descriptors (viha!puhd)', () => {
      const text = `name: NABC fusion with pitch;
nabc-lines: 1;
%%
(c|viha!puhd)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.nabcParsed).toBeDefined();
      // Should parse as fusion
      expect(noteGroup?.nabc?.[0]).toContain('!');
    });

    it('should parse NABC fusion with modifiers (viM!puS)', () => {
      const text = `name: NABC fusion with modifiers;
nabc-lines: 1;
%%
(c|viM!puS)`;

      const parser = new GabcParser(text);
      const result = parser.parse();

      expect(result.errors.length).toBe(0);
      const noteGroup = result.notation.syllables[0]?.notes[0];
      expect(noteGroup?.nabcParsed).toBeDefined();
    });
  });
});
