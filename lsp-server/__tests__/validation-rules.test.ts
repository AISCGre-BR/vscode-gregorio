/**
 * Tests for Validation Rules
 */

import { ParsedDocument, NoteShape } from '../parser/types';
import {
  validateNameHeader,
  validateFirstSyllableLineBreak,
  validateNabcWithoutHeader,
  validateQuilismaFollowedByLowerPitch
} from '../validation/rules';

describe('Validation Rules', () => {
  describe('validateNameHeader', () => {
    it('should warn when name header is missing', () => {
      const doc: ParsedDocument = {
        headers: new Map(),
        notation: { syllables: [], range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } },
        comments: [],
        errors: []
      };

      const errors = validateNameHeader.validate(doc);
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('warning');
    });

    it('should not warn when name header is present', () => {
      const doc: ParsedDocument = {
        headers: new Map([['name', 'Test']]),
        notation: { syllables: [], range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } },
        comments: [],
        errors: []
      };

      const errors = validateNameHeader.validate(doc);
      expect(errors.length).toBe(0);
    });
  });

  describe('validateFirstSyllableLineBreak', () => {
    it('should error when first syllable has line break', () => {
      const doc: ParsedDocument = {
        headers: new Map(),
        notation: {
          syllables: [
            {
              text: 'Test',
              notes: [],
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } },
              lineBreak: { type: 'manual', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } }
            }
          ],
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
        },
        comments: [],
        errors: []
      };

      const errors = validateFirstSyllableLineBreak.validate(doc);
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('error');
    });
  });

  describe('validateNabcWithoutHeader', () => {
    it('should error when NABC content exists without header', () => {
      const doc: ParsedDocument = {
        headers: new Map(),
        notation: {
          syllables: [
            {
              text: 'Test',
              notes: [
                {
                  gabc: 'f',
                  nabc: ['vi'],
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  notes: []
                }
              ],
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
            }
          ],
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
        },
        comments: [],
        errors: []
      };

      const errors = validateNabcWithoutHeader.validate(doc);
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('error');
    });

    it('should not error when nabc-lines header is present', () => {
      const doc: ParsedDocument = {
        headers: new Map([['nabc-lines', '1']]),
        notation: {
          syllables: [
            {
              text: 'Test',
              notes: [
                {
                  gabc: 'f',
                  nabc: ['vi'],
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  notes: []
                }
              ],
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
            }
          ],
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
        },
        comments: [],
        errors: []
      };

      const errors = validateNabcWithoutHeader.validate(doc);
      expect(errors.length).toBe(0);
    });
  });

  describe('validateQuilismaFollowedByLowerPitch', () => {
    it('should warn when quilisma is followed by lower pitch', () => {
      const doc: ParsedDocument = {
        headers: new Map(),
        notation: {
          syllables: [
            {
              text: 'Test',
              notes: [
                {
                  gabc: 'gwf',
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  notes: [
                    {
                      pitch: 'g',
                      shape: NoteShape.Quilisma,
                      modifiers: [],
                      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
                    },
                    {
                      pitch: 'f',
                      shape: NoteShape.Punctum,
                      modifiers: [],
                      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
                    }
                  ]
                }
              ],
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
            }
          ],
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
        },
        comments: [],
        errors: []
      };

      const errors = validateQuilismaFollowedByLowerPitch.validate(doc);
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('warning');
    });
  });
});
