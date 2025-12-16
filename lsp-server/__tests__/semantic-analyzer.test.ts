/**
 * Semantic Analyzer Tests
 * Tests validation of GABC/NABC code according to Gregorio compiler rules
 */

import { SemanticAnalyzer } from '../validation/semantic-analyzer';
import { GabcParser } from '../parser/gabc-parser';
import { ParsedDocument } from '../parser/types';

describe('Semantic Analyzer', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  describe('Header Validation', () => {
    it('should warn about missing name header', () => {
      const gabc = `mode: 1;
%%
(c4) Al(f)le(g)lú(h)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const nameWarning = diagnostics.find(d => d.code === 'missing-name-header');
      expect(nameWarning).toBeDefined();
      expect(nameWarning?.severity).toBe('warning');
      expect(nameWarning?.message).toContain('name');
    });

    it('should not warn when name header is present', () => {
      const gabc = `name: Alleluia;
mode: 1;
%%
(c4) Al(f)le(g)lú(h)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const nameWarning = diagnostics.find(d => d.code === 'missing-name-header');
      expect(nameWarning).toBeUndefined();
    });

    // Note: Test for too many annotations is skipped because the current parser
    // uses Map which doesn't preserve duplicate headers
  });

  describe('First Syllable Validation', () => {
    it('should error on line break on first syllable', () => {
      const gabc = `name: Test;
%%
(c4) (z) Al(f)le(g)lú(h)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      
      // Manually add line break to first syllable for testing
      if (document.notation.syllables.length > 0) {
        document.notation.syllables[0].lineBreak = {
          type: 'manual',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
        };
      }

      const diagnostics = analyzer.analyze(document);
      const lineBreakError = diagnostics.find(d => d.code === 'line-break-on-first-syllable');
      
      expect(lineBreakError).toBeDefined();
      expect(lineBreakError?.severity).toBe('error');
    });
  });

  describe('NABC Validation', () => {
    it('should error on pipe without nabc-lines header', () => {
      const gabc = `name: Test;
%%
(c4) Al(f|vi)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const pipeError = diagnostics.find(d => d.code === 'pipe-without-nabc-lines');
      expect(pipeError).toBeDefined();
      expect(pipeError?.severity).toBe('error');
      expect(pipeError?.message).toContain('nabc-lines');
    });

    it('should not error on pipe with nabc-lines header', () => {
      const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Al(f|vi)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const pipeError = diagnostics.find(d => d.code === 'pipe-without-nabc-lines');
      expect(pipeError).toBeUndefined();
    });

    it('should error on conflicting liquescence modifiers', () => {
      const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Al(f|cl>~)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const liquescenceError = diagnostics.find(d => d.code === 'nabc-conflicting-liquescence');
      expect(liquescenceError).toBeDefined();
      expect(liquescenceError?.severity).toBe('error');
    });

    it('should error on invalid NABC pitch', () => {
      // This test directly constructs an invalid NABC descriptor
      const document: ParsedDocument = {
        headers: new Map([['name', 'Test'], ['nabc-lines', '1']]),
        notation: {
          syllables: [{
            text: 'Al',
            notes: [{
              gabc: 'f',
              nabc: ['vi'],
              nabcParsed: [{
                basicGlyph: 'vi' as any,
                pitch: 'z', // Invalid pitch
                range: {
                  start: { line: 2, character: 10 },
                  end: { line: 2, character: 15 }
                }
              }],
              range: {
                start: { line: 2, character: 7 },
                end: { line: 2, character: 16 }
              },
              notes: []
            }],
            range: {
              start: { line: 2, character: 5 },
              end: { line: 2, character: 17 }
            }
          }],
          range: {
            start: { line: 2, character: 0 },
            end: { line: 2, character: 20 }
          }
        },
        comments: [],
        errors: []
      };

      const diagnostics = analyzer.analyze(document);
      const pitchError = diagnostics.find(d => d.code === 'nabc-invalid-pitch');
      
      expect(pitchError).toBeDefined();
      expect(pitchError?.severity).toBe('error');
      expect(pitchError?.message).toContain('z');
    });
  });

  describe('NABC Alternation Validation', () => {
    it('should error when NABC count does not match nabc-lines header (too many)', () => {
      const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Al(f|vi|ca)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const alternationError = diagnostics.find(d => d.code === 'nabc-alternation-mismatch');
      expect(alternationError).toBeDefined();
      expect(alternationError?.severity).toBe('error');
      expect(alternationError?.message).toContain('nabc-lines: 1');
      expect(alternationError?.message).toContain('found 2');
    });

    it('should error when NABC count does not match nabc-lines header (too few)', () => {
      const gabc = `name: Test;
nabc-lines: 2;
%%
(c4) Al(f|vi)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const alternationError = diagnostics.find(d => d.code === 'nabc-alternation-mismatch');
      expect(alternationError).toBeDefined();
      expect(alternationError?.severity).toBe('error');
      expect(alternationError?.message).toContain('nabc-lines: 2');
      expect(alternationError?.message).toContain('found 1');
    });

    it('should not error when NABC count matches nabc-lines header', () => {
      const gabc = `name: Test;
nabc-lines: 1;
%%
(c4) Al(f|vi)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const alternationError = diagnostics.find(d => d.code === 'nabc-alternation-mismatch');
      expect(alternationError).toBeUndefined();
    });

    it('should not error when NABC count matches nabc-lines: 2', () => {
      const gabc = `name: Test;
nabc-lines: 2;
%%
(c4) Al(f|vi|ca)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const alternationError = diagnostics.find(d => d.code === 'nabc-alternation-mismatch');
      expect(alternationError).toBeUndefined();
    });

    it('should not validate when no nabc-lines header is present', () => {
      const gabc = `name: Test;
%%
(c4) Al(f)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const alternationError = diagnostics.find(d => d.code === 'nabc-alternation-mismatch');
      expect(alternationError).toBeUndefined();
    });
  });

  describe('Musical Construction Validation', () => {
    it('should warn on quilisma followed by equal pitch', () => {
      const gabc = `name: Test;
%%
(c4) Al(gwg)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaWarning = diagnostics.find(d => d.code === 'quilisma-equal-or-lower');
      expect(quilismaWarning).toBeDefined();
      expect(quilismaWarning?.severity).toBe('warning');
      expect(quilismaWarning?.message).toContain('Quilisma');
    });

    it('should warn on quilisma followed by lower pitch', () => {
      const gabc = `name: Test;
%%
(c4) Al(gwf)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaWarning = diagnostics.find(d => d.code === 'quilisma-equal-or-lower');
      expect(quilismaWarning).toBeDefined();
      expect(quilismaWarning?.severity).toBe('warning');
    });

    it('should not warn on quilisma followed by higher pitch', () => {
      const gabc = `name: Test;
%%
(c4) Al(gwh)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaWarning = diagnostics.find(d => d.code === 'quilisma-equal-or-lower');
      expect(quilismaWarning).toBeUndefined();
    });

    it('should warn on quilisma-pes preceded by equal pitch', () => {
      const gabc = `name: Test;
%%
(c4) Ad(g) te(gwh)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaPesWarning = diagnostics.find(d => d.code === 'quilisma-pes-preceded-by-higher');
      expect(quilismaPesWarning).toBeDefined();
      expect(quilismaPesWarning?.severity).toBe('warning');
    });

    it('should warn on quilisma-pes preceded by higher pitch', () => {
      const gabc = `name: Test;
%%
(c4) Ad(h) te(gwh)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaPesWarning = diagnostics.find(d => d.code === 'quilisma-pes-preceded-by-higher');
      expect(quilismaPesWarning).toBeDefined();
    });

    it('should not warn on quilisma-pes preceded by lower pitch', () => {
      const gabc = `name: Test;
%%
(c4) Ad(f) te(gwh)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaPesWarning = diagnostics.find(d => d.code === 'quilisma-pes-preceded-by-higher');
      expect(quilismaPesWarning).toBeUndefined();
    });

    // Note: Virga strata tests would require proper parsing of 'o' modifier as strata
    // This is a placeholder for when that parsing is implemented
  });

  describe('Pes Quadratum Validation', () => {
    it('should warn when pes quadratum has no subsequent note', () => {
      const gabc = `name: Test;
%%
(c4) Al(eq)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const pesWarning = diagnostics.find(d => d.code === 'pes-quadratum-missing-note');
      expect(pesWarning).toBeDefined();
      expect(pesWarning?.severity).toBe('warning');
      expect(pesWarning?.message).toContain('Pes quadratum');
      expect(pesWarning?.message).toContain('subsequent note');
    });

    it('should not warn when pes quadratum has subsequent note', () => {
      const gabc = `name: Test;
%%
(c4) Al(eqg)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const pesWarning = diagnostics.find(d => d.code === 'pes-quadratum-missing-note');
      expect(pesWarning).toBeUndefined();
    });

    it('should not warn when pes quadratum has fusion connector', () => {
      const gabc = `name: Test;
%%
(c4) Al(eq@f)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const pesWarning = diagnostics.find(d => d.code === 'pes-quadratum-missing-note');
      expect(pesWarning).toBeUndefined();
    });
  });

  describe('Quilisma Missing Note Validation', () => {
    it('should warn when quilisma has no subsequent note', () => {
      const gabc = `name: Test;
%%
(c4) Al(ew)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaWarning = diagnostics.find(d => d.code === 'quilisma-missing-note');
      expect(quilismaWarning).toBeDefined();
      expect(quilismaWarning?.severity).toBe('warning');
      expect(quilismaWarning?.message).toContain('Quilisma');
      expect(quilismaWarning?.message).toContain('subsequent note');
    });

    it('should not warn when quilisma has subsequent note', () => {
      const gabc = `name: Test;
%%
(c4) Al(ewf)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaWarning = diagnostics.find(d => d.code === 'quilisma-missing-note');
      expect(quilismaWarning).toBeUndefined();
    });

    it('should not warn when quilisma has fusion connector', () => {
      const gabc = `name: Test;
%%
(c4) Al(gw@h)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaWarning = diagnostics.find(d => d.code === 'quilisma-missing-note');
      expect(quilismaWarning).toBeUndefined();
    });

    it('should not warn when quilisma has fusion connector before it', () => {
      const gabc = `name: Test;
%%
(c4) Al(f@gwh)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const quilismaWarning = diagnostics.find(d => d.code === 'quilisma-missing-note');
      expect(quilismaWarning).toBeUndefined();
    });
  });

  describe('Oriscus Scapus Validation', () => {
    it('should warn when oriscus scapus is isolated', () => {
      const gabc = `name: Test;
%%
(c4) Al(eO)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const oriscusWarning = diagnostics.find(d => d.code === 'oriscus-scapus-isolated');
      expect(oriscusWarning).toBeDefined();
      expect(oriscusWarning?.severity).toBe('warning');
      expect(oriscusWarning?.message).toContain('Oriscus scapus');
      expect(oriscusWarning?.message).toContain('preceding and subsequent');
    });

    it('should warn when oriscus scapus has no preceding note', () => {
      const gabc = `name: Test;
%%
(c4) Al(eOf)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const oriscusWarning = diagnostics.find(d => d.code === 'oriscus-scapus-missing-preceding');
      expect(oriscusWarning).toBeDefined();
      expect(oriscusWarning?.severity).toBe('warning');
      expect(oriscusWarning?.message).toContain('preceding note');
    });

    it('should warn when oriscus scapus has no subsequent note', () => {
      const gabc = `name: Test;
%%
(c4) Al(deO)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const oriscusWarning = diagnostics.find(d => d.code === 'oriscus-scapus-missing-subsequent');
      expect(oriscusWarning).toBeDefined();
      expect(oriscusWarning?.severity).toBe('warning');
      expect(oriscusWarning?.message).toContain('subsequent note');
    });

    it('should not warn when oriscus scapus has both preceding and subsequent notes', () => {
      const gabc = `name: Test;
%%
(c4) Al(deOf)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const oriscusWarning = diagnostics.find(d => 
        d.code === 'oriscus-scapus-isolated' || 
        d.code === 'oriscus-scapus-missing-preceding' ||
        d.code === 'oriscus-scapus-missing-subsequent'
      );
      expect(oriscusWarning).toBeUndefined();
    });

    it('should not warn when oriscus scapus has fusion connectors', () => {
      const gabc = `name: Test;
%%
(c4) Al(d@eO@f)le(g)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const oriscusWarning = diagnostics.find(d => 
        d.code === 'oriscus-scapus-isolated' || 
        d.code === 'oriscus-scapus-missing-preceding' ||
        d.code === 'oriscus-scapus-missing-subsequent'
      );
      expect(oriscusWarning).toBeUndefined();
    });
  });

  describe('Quilismatic Connector Info', () => {
    it('should provide info about missing connector in quilismatic sequence', () => {
      const gabc = `name: Test;
%%
(c4) Al(fgwh)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const connectorInfo = diagnostics.find(d => d.code === 'quilisma-missing-connector');
      expect(connectorInfo).toBeDefined();
      expect(connectorInfo?.severity).toBe('info');
      expect(connectorInfo?.message).toContain('!');
    });

    it('should not provide info for short sequences', () => {
      const gabc = `name: Test;
%%
(c4) Al(gw)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const connectorInfo = diagnostics.find(d => d.code === 'quilisma-missing-connector');
      expect(connectorInfo).toBeUndefined();
    });
  });

  describe('Diagnostic Severity Ordering', () => {
    it('should return diagnostics with errors first', () => {
      const gabc = `mode: 1;
%%
(c4) Al(f|vi)le(gwg)ia.(f)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      // Should have at least one error and one warning
      const errors = diagnostics.filter(d => d.severity === 'error');
      const warnings = diagnostics.filter(d => d.severity === 'warning');
      
      expect(errors.length).toBeGreaterThan(0);
      expect(warnings.length).toBeGreaterThan(0);

      // Errors should come before warnings
      const firstError = diagnostics.findIndex(d => d.severity === 'error');
      const firstWarning = diagnostics.findIndex(d => d.severity === 'warning');
      
      if (firstError !== -1 && firstWarning !== -1) {
        expect(firstError).toBeLessThan(firstWarning);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      const gabc = `%%
`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      // Should have at least the missing name warning
      expect(diagnostics.length).toBeGreaterThan(0);
      const nameWarning = diagnostics.find(d => d.code === 'missing-name-header');
      expect(nameWarning).toBeDefined();
    });

    it('should handle document with only headers', () => {
      const gabc = `name: Test;
mode: 1;
%%`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      // Should not crash, may have some diagnostics
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it('should handle complex valid document without errors', () => {
      const gabc = `name: Valid Score;
mode: 6;
%%
(c4) AL(f)le(g)lú(h!iwj)ia.(j)`;

      const parser = new GabcParser(gabc);
      const document = parser.parse();
      const diagnostics = analyzer.analyze(document);

      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors.length).toBe(0);
    });
  });
});
