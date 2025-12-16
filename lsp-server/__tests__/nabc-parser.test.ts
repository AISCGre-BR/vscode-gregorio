/**
 * NABC Parser Tests
 * Tests for St. Gall notation parsing
 */

import { 
  parseNABCSnippet, 
  parseNABCSnippets, 
  validateNABCDescriptor,
  isValidNABCGlyph,
  getAllNABCGlyphCodes
} from '../parser/nabc-parser';
import { NABCBasicGlyph, NABCGlyphModifier } from '../parser/types';

describe('NABC Parser', () => {
  describe('Basic Glyph Descriptors', () => {
    it('should parse virga (vi)', () => {
      const result = parseNABCSnippet('vi');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Virga);
    });

    it('should parse punctum (pu)', () => {
      const result = parseNABCSnippet('pu');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Punctum);
    });

    it('should parse tractulus (ta)', () => {
      const result = parseNABCSnippet('ta');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Tractulus);
    });

    it('should parse gravis (gr)', () => {
      const result = parseNABCSnippet('gr');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Gravis);
    });

    it('should parse clivis (cl)', () => {
      const result = parseNABCSnippet('cl');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Clivis);
    });

    it('should parse pes (pe)', () => {
      const result = parseNABCSnippet('pe');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Pes);
    });

    it('should parse porrectus (po)', () => {
      const result = parseNABCSnippet('po');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Porrectus);
    });

    it('should parse torculus (to)', () => {
      const result = parseNABCSnippet('to');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Torculus);
    });

    it('should parse climacus (ci)', () => {
      const result = parseNABCSnippet('ci');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Climacus);
    });

    it('should parse scandicus (sc)', () => {
      const result = parseNABCSnippet('sc');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Scandicus);
    });
  });

  describe('Extended Glyph Descriptors', () => {
    it('should parse porrectus flexus (pf)', () => {
      const result = parseNABCSnippet('pf');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.PorrectusFlexus);
    });

    it('should parse scandicus flexus (sf)', () => {
      const result = parseNABCSnippet('sf');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.ScandicusFlexus);
    });

    it('should parse torculus resupinus (tr)', () => {
      const result = parseNABCSnippet('tr');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.TorculusResupinus);
    });

    it('should parse stropha variants (st, ds, ts)', () => {
      expect(parseNABCSnippet('st')?.basicGlyph).toBe(NABCBasicGlyph.Stropha);
      expect(parseNABCSnippet('ds')?.basicGlyph).toBe(NABCBasicGlyph.Distropha);
      expect(parseNABCSnippet('ts')?.basicGlyph).toBe(NABCBasicGlyph.Tristropha);
    });

    it('should parse virga variants (bv, tv, vs)', () => {
      expect(parseNABCSnippet('bv')?.basicGlyph).toBe(NABCBasicGlyph.Bivirga);
      expect(parseNABCSnippet('tv')?.basicGlyph).toBe(NABCBasicGlyph.Trivirga);
      expect(parseNABCSnippet('vs')?.basicGlyph).toBe(NABCBasicGlyph.VirgaStrata);
    });

    it('should parse special neumes (or, sa, pq)', () => {
      expect(parseNABCSnippet('or')?.basicGlyph).toBe(NABCBasicGlyph.Oriscus);
      expect(parseNABCSnippet('sa')?.basicGlyph).toBe(NABCBasicGlyph.Salicus);
      expect(parseNABCSnippet('pq')?.basicGlyph).toBe(NABCBasicGlyph.PesQuassus);
    });

    it('should parse quilisma variants (ql, qi)', () => {
      expect(parseNABCSnippet('ql')?.basicGlyph).toBe(NABCBasicGlyph.Quilisma3Loops);
      expect(parseNABCSnippet('qi')?.basicGlyph).toBe(NABCBasicGlyph.Quilisma2Loops);
    });
  });

  describe('Glyph Modifiers', () => {
    it('should parse mark modification (S)', () => {
      const result = parseNABCSnippet('viS');
      expect(result?.modifiers).toBeDefined();
      expect(result?.modifiers).toContain(NABCGlyphModifier.MarkModification);
    });

    it('should parse grouping modification (G)', () => {
      const result = parseNABCSnippet('puG');
      expect(result?.modifiers).toBeDefined();
      expect(result?.modifiers).toContain(NABCGlyphModifier.GroupingModification);
    });

    it('should parse melodic modification (M)', () => {
      const result = parseNABCSnippet('taM');
      expect(result?.modifiers).toBeDefined();
      expect(result?.modifiers).toContain(NABCGlyphModifier.MelodicModification);
    });

    it('should parse episema (-)', () => {
      const result = parseNABCSnippet('cl-');
      expect(result?.modifiers).toBeDefined();
      expect(result?.modifiers).toContain(NABCGlyphModifier.Episema);
    });

    it('should parse augmentive liquescence (>)', () => {
      const result = parseNABCSnippet('pe>');
      expect(result?.modifiers).toBeDefined();
      expect(result?.modifiers).toContain(NABCGlyphModifier.AugmentiveLiquescence);
    });

    it('should parse diminutive liquescence (~)', () => {
      const result = parseNABCSnippet('to~');
      expect(result?.modifiers).toBeDefined();
      expect(result?.modifiers).toContain(NABCGlyphModifier.DiminutiveLiquescence);
    });

    it('should parse multiple modifiers', () => {
      const result = parseNABCSnippet('clSG-');
      expect(result?.modifiers).toBeDefined();
      expect(result?.modifiers?.length).toBe(3);
      expect(result?.modifiers).toContain(NABCGlyphModifier.MarkModification);
      expect(result?.modifiers).toContain(NABCGlyphModifier.GroupingModification);
      expect(result?.modifiers).toContain(NABCGlyphModifier.Episema);
    });

    it('should parse modifier with variant number', () => {
      const result = parseNABCSnippet('peM2');
      expect(result?.modifiers).toBeDefined();
      expect(result?.modifiers).toContain(NABCGlyphModifier.MelodicModification);
    });
  });

  describe('Pitch Descriptors', () => {
    it('should parse pitch descriptor ha', () => {
      const result = parseNABCSnippet('viha');
      expect(result?.pitch).toBe('a');
    });

    it('should parse pitch descriptor hf', () => {
      const result = parseNABCSnippet('puhf');
      expect(result?.pitch).toBe('f');
    });

    it('should parse pitch descriptor hn', () => {
      const result = parseNABCSnippet('tahn');
      expect(result?.pitch).toBe('n');
    });

    it('should parse pitch descriptor hg', () => {
      const result = parseNABCSnippet('grhg');
      expect(result?.pitch).toBe('g');
    });

    it('should parse all pitch letters', () => {
      const pitches = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n'];
      pitches.forEach(pitch => {
        const result = parseNABCSnippet(`vi h${pitch}`);
        expect(result?.pitch).toBe(pitch);
      });
    });
  });

  describe('Combined Features', () => {
    it('should parse glyph with modifier and pitch', () => {
      const result = parseNABCSnippet('viMhd');
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Virga);
      expect(result?.modifiers).toContain(NABCGlyphModifier.MelodicModification);
      expect(result?.pitch).toBe('d');
    });

    it('should parse glyph with multiple modifiers and pitch', () => {
      const result = parseNABCSnippet('clSG-hg');
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Clivis);
      expect(result?.modifiers?.length).toBe(3);
      expect(result?.pitch).toBe('g');
    });

    it('should parse glyph with liquescence and pitch', () => {
      const result = parseNABCSnippet('to>~hm');
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Torculus);
      expect(result?.modifiers).toContain(NABCGlyphModifier.AugmentiveLiquescence);
      expect(result?.modifiers).toContain(NABCGlyphModifier.DiminutiveLiquescence);
      expect(result?.pitch).toBe('m');
    });
  });

  describe('Subpunctis and Prepunctis', () => {
    it('should parse subpunctis with count (su1)', () => {
      const result = parseNABCSnippet('su1');
      expect(result?.subpunctis).toBeDefined();
      expect(result?.subpunctis?.count).toBe(1);
    });

    it('should parse subpunctis with count (su2)', () => {
      const result = parseNABCSnippet('su2');
      expect(result?.subpunctis).toBeDefined();
      expect(result?.subpunctis?.count).toBe(2);
    });

    it('should parse subpunctis with modifier (sut1)', () => {
      const result = parseNABCSnippet('sut1');
      expect(result?.subpunctis).toBeDefined();
      expect(result?.subpunctis?.count).toBe(1);
      expect(result?.subpunctis?.modifier).toBe('t');
    });

    it('should parse prepunctis (pp1)', () => {
      const result = parseNABCSnippet('pp1');
      expect(result?.prepunctis).toBeDefined();
      expect(result?.prepunctis?.count).toBe(1);
    });

    it('should parse prepunctis with count (pp3)', () => {
      const result = parseNABCSnippet('pp3');
      expect(result?.prepunctis).toBeDefined();
      expect(result?.prepunctis?.count).toBe(3);
    });

    it('should parse prepunctis with modifier (ppw2)', () => {
      const result = parseNABCSnippet('ppw2');
      expect(result?.prepunctis).toBeDefined();
      expect(result?.prepunctis?.count).toBe(2);
      expect(result?.prepunctis?.modifier).toBe('w');
    });

    it('should parse subpunctis with tractulus episema (suu3)', () => {
      const result = parseNABCSnippet('suu3');
      expect(result?.subpunctis).toBeDefined();
      expect(result?.subpunctis?.count).toBe(3);
      expect(result?.subpunctis?.modifier).toBe('u');
    });

    it('should parse prepunctis with tractulus (ppt2)', () => {
      const result = parseNABCSnippet('ppt2');
      expect(result?.prepunctis).toBeDefined();
      expect(result?.prepunctis?.count).toBe(2);
      expect(result?.prepunctis?.modifier).toBe('t');
    });
  });

  describe('Multiple Snippets', () => {
    it('should parse array of NABC snippets', () => {
      const snippets = ['vi', 'pu', 'ta', 'gr'];
      const results = parseNABCSnippets(snippets);
      expect(results.length).toBe(4);
      expect(results[0].basicGlyph).toBe(NABCBasicGlyph.Virga);
      expect(results[1].basicGlyph).toBe(NABCBasicGlyph.Punctum);
      expect(results[2].basicGlyph).toBe(NABCBasicGlyph.Tractulus);
      expect(results[3].basicGlyph).toBe(NABCBasicGlyph.Gravis);
    });

    it('should parse complex snippet array', () => {
      const snippets = ['viMha', 'puG', 'cl-hg'];
      const results = parseNABCSnippets(snippets);
      expect(results.length).toBe(3);
      expect(results[0].pitch).toBe('a');
      expect(results[1].modifiers).toContain(NABCGlyphModifier.GroupingModification);
      expect(results[2].pitch).toBe('g');
    });
  });

  describe('Validation', () => {
    it('should validate correct descriptor', () => {
      const descriptor = parseNABCSnippet('viMha');
      expect(descriptor).toBeDefined();
      if (descriptor) {
        const errors = validateNABCDescriptor(descriptor);
        expect(errors.length).toBe(0);
      }
    });

    it('should detect conflicting liquescence modifiers', () => {
      const descriptor = parseNABCSnippet('to>~');
      expect(descriptor).toBeDefined();
      if (descriptor) {
        const errors = validateNABCDescriptor(descriptor);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('liquescence');
      }
    });
  });

  describe('Utility Functions', () => {
    it('should get all valid NABC glyph codes', () => {
      const codes = getAllNABCGlyphCodes();
      expect(codes.length).toBeGreaterThan(30);
      expect(codes).toContain('vi');
      expect(codes).toContain('pu');
      expect(codes).toContain('cl');
    });

    it('should validate glyph codes', () => {
      expect(isValidNABCGlyph('vi')).toBe(true);
      expect(isValidNABCGlyph('pu')).toBe(true);
      expect(isValidNABCGlyph('xx')).toBe(false);
      expect(isValidNABCGlyph('abc')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = parseNABCSnippet('');
      expect(result).toBeNull();
    });

    it('should handle whitespace', () => {
      const result = parseNABCSnippet('  ');
      expect(result).toBeNull();
    });

    it('should handle invalid glyph code', () => {
      const result = parseNABCSnippet('zz');
      expect(result).toBeNull();
    });

    it('should handle partial glyph code', () => {
      const result = parseNABCSnippet('v');
      expect(result).toBeNull();
    });

    it('should trim whitespace', () => {
      const result = parseNABCSnippet('  vi  ');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Virga);
    });
  });

  describe('Significant Letters', () => {
    it('should parse significant letter lsc2 (celeriter above)', () => {
      const result = parseNABCSnippet('vilsc2');
      expect(result).toBeDefined();
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Virga);
      expect(result?.significantLetters).toBeDefined();
      expect(result?.significantLetters?.length).toBe(1);
      expect(result?.significantLetters?.[0].type).toBe('ls');
      expect(result?.significantLetters?.[0].code).toBe('c');
      expect(result?.significantLetters?.[0].position).toBe(2);
    });

    it('should parse significant letter lst4 (tenere left)', () => {
      const result = parseNABCSnippet('pulst4');
      expect(result?.significantLetters).toBeDefined();
      expect(result?.significantLetters?.[0].code).toBe('t');
      expect(result?.significantLetters?.[0].position).toBe(4);
    });

    it('should parse significant letter lsal1 (altius left upper)', () => {
      const result = parseNABCSnippet('talsal1');
      expect(result?.significantLetters).toBeDefined();
      expect(result?.significantLetters?.[0].code).toBe('al');
      expect(result?.significantLetters?.[0].position).toBe(1);
    });

    it('should parse multiple significant letters', () => {
      const result = parseNABCSnippet('vilse7lsl3');
      expect(result?.significantLetters).toBeDefined();
      expect(result?.significantLetters?.length).toBe(2);
      expect(result?.significantLetters?.[0].code).toBe('e');
      expect(result?.significantLetters?.[0].position).toBe(7);
      expect(result?.significantLetters?.[1].code).toBe('l');
      expect(result?.significantLetters?.[1].position).toBe(3);
    });

    it('should parse Tironian note lti2 (iusum)', () => {
      const result = parseNABCSnippet('nilti2');
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Nihil);
      expect(result?.significantLetters).toBeDefined();
      expect(result?.significantLetters?.[0].type).toBe('lt');
      expect(result?.significantLetters?.[0].code).toBe('i');
      expect(result?.significantLetters?.[0].position).toBe(2);
    });

    it('should parse Tironian note ltsr8 (sursum)', () => {
      const result = parseNABCSnippet('pultsr8');
      expect(result?.significantLetters).toBeDefined();
      expect(result?.significantLetters?.[0].type).toBe('lt');
      expect(result?.significantLetters?.[0].code).toBe('sr');
      expect(result?.significantLetters?.[0].position).toBe(8);
    });

    it('should parse complex example with significant letters', () => {
      const result = parseNABCSnippet('clMhalse7lsl3');
      expect(result?.basicGlyph).toBe(NABCBasicGlyph.Clivis);
      expect(result?.modifiers).toContain(NABCGlyphModifier.MelodicModification);
      expect(result?.pitch).toBe('a');
      expect(result?.significantLetters?.length).toBe(2);
    });
  });
});
