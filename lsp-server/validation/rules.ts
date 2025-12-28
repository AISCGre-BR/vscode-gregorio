/**
 * Validation Rules for GABC Files
 * Implements error and warning detection based on Gregorio compiler documentation
 */

import { ParsedDocument, ParseError, NoteShape } from '../parser/types';

export interface ValidationRule {
  name: string;
  severity: 'error' | 'warning' | 'info';
  validate: (doc: ParsedDocument) => ParseError[];
}

/**
 * Check if the name header is present
 */
export const validateNameHeader: ValidationRule = {
  name: 'name-header',
  severity: 'warning',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];
    
    if (!doc.headers.has('name') || doc.headers.get('name')?.trim() === '') {
      errors.push({
        message: "no name specified, put 'name:...;' at the beginning of the file, can be dangerous with some output formats",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        severity: 'warning'
      });
    }

    return errors;
  }
};

/**
 * Check for duplicate header definitions
 */
export const validateDuplicateHeaders: ValidationRule = {
  name: 'duplicate-headers',
  severity: 'warning',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];
    const headerCounts = new Map<string, number>();

    // Count would need to be done during parsing
    // This is a placeholder for the concept
    
    return errors;
  }
};

/**
 * Check for line breaks on first syllable
 */
export const validateFirstSyllableLineBreak: ValidationRule = {
  name: 'first-syllable-line-break',
  severity: 'error',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];
    
    if (doc.notation.syllables.length > 0) {
      const firstSyllable = doc.notation.syllables[0];
      
      if (firstSyllable.lineBreak) {
        errors.push({
          message: 'line break is not supported on the first syllable',
          range: firstSyllable.range,
          severity: 'error'
        });
      }
    }

    return errors;
  }
};

/**
 * Check for clef changes on first syllable
 */
export const validateFirstSyllableClefChange: ValidationRule = {
  name: 'first-syllable-clef-change',
  severity: 'error',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];
    
    if (doc.notation.syllables.length > 1) {
      const firstSyllable = doc.notation.syllables[0];
      const secondSyllable = doc.notation.syllables[1];
      
      // Check if first syllable has a clef change (not initial clef)
      if (secondSyllable.clef && !firstSyllable.clef) {
        errors.push({
          message: 'clef change is not supported on the first syllable',
          range: secondSyllable.range,
          severity: 'error'
        });
      }
    }

    return errors;
  }
};

/**
 * Check for NABC pipes without nabc-lines header
 */
export const validateNabcWithoutHeader: ValidationRule = {
  name: 'nabc-without-header',
  severity: 'error',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];
    
    const hasNabcLines = doc.headers.has('nabc-lines');
    const hasNabcContent = doc.notation.syllables.some(s => 
      s.notes.some(n => n.nabc && n.nabc.length > 0)
    );

    if (hasNabcContent && !hasNabcLines) {
      errors.push({
        message: "pipe '|' in note group without `nabc-lines` header",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        severity: 'error'
      });
    }

    return errors;
  }
};

/**
 * Check for quilisma followed by equal or lower pitch
 */
export const validateQuilismaFollowedByLowerPitch: ValidationRule = {
  name: 'quilisma-lower-pitch',
  severity: 'warning',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];

    for (const syllable of doc.notation.syllables) {
      for (const noteGroup of syllable.notes) {
        for (let i = 0; i < noteGroup.notes.length - 1; i++) {
          const currentNote = noteGroup.notes[i];
          const nextNote = noteGroup.notes[i + 1];

          if (currentNote.shape === NoteShape.Quilisma) {
            const currentPitch = getPitchValue(currentNote.pitch);
            const nextPitch = getPitchValue(nextNote.pitch);

            if (nextPitch <= currentPitch) {
              errors.push({
                message: 'Quilisma followed by equal or lower pitch note may cause rendering issues',
                range: currentNote.range,
                severity: 'warning'
              });
            }
          }
        }
      }
    }

    return errors;
  }
};

/**
 * Check for quilisma-pes preceded by equal or higher pitch
 */
export const validateQuilismaPesPrecededByHigherPitch: ValidationRule = {
  name: 'quilisma-pes-higher-pitch',
  severity: 'warning',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];

    for (let sIdx = 0; sIdx < doc.notation.syllables.length - 1; sIdx++) {
      const syllable = doc.notation.syllables[sIdx];
      const nextSyllable = doc.notation.syllables[sIdx + 1];

      if (syllable.notes.length > 0 && nextSyllable.notes.length > 0) {
        const lastNoteGroup = syllable.notes[syllable.notes.length - 1];
        const nextNoteGroup = nextSyllable.notes[0];

        if (lastNoteGroup.notes.length > 0 && nextNoteGroup.notes.length >= 2) {
          const lastNote = lastNoteGroup.notes[lastNoteGroup.notes.length - 1];
          const firstNextNote = nextNoteGroup.notes[0];
          const secondNextNote = nextNoteGroup.notes[1];

          // Check for quilisma-pes pattern
          if (firstNextNote.shape === NoteShape.Quilisma) {
            const lastPitch = getPitchValue(lastNote.pitch);
            const quilismaPitch = getPitchValue(firstNextNote.pitch);

            if (lastPitch >= quilismaPitch) {
              errors.push({
                message: 'Quilisma-pes preceded by equal or higher pitch note may cause rendering issues',
                range: firstNextNote.range,
                severity: 'warning'
              });
            }
          }
        }
      }
    }

    return errors;
  }
};

/**
 * Check for virga strata followed by equal or higher pitch
 */
export const validateVirgaStrataFollowedByHigherPitch: ValidationRule = {
  name: 'virga-strata-higher-pitch',
  severity: 'warning',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];

    for (const syllable of doc.notation.syllables) {
      for (const noteGroup of syllable.notes) {
        for (let i = 0; i < noteGroup.notes.length - 1; i++) {
          const currentNote = noteGroup.notes[i];
          const nextNote = noteGroup.notes[i + 1];

          // Check for virga with strata modifier
          const hasStrata = currentNote.modifiers.some(m => m.type === 'strata');
          
          if (currentNote.shape === NoteShape.Virga && hasStrata) {
            const currentPitch = getPitchValue(currentNote.pitch);
            const nextPitch = getPitchValue(nextNote.pitch);

            if (nextPitch >= currentPitch) {
              errors.push({
                message: 'Virga strata followed by equal or higher pitch note may cause rendering issues',
                range: currentNote.range,
                severity: 'warning'
              });
            }
          }
        }
      }
    }

    return errors;
  }
};

/**
 * Check for invalid staff lines
 */
export const validateStaffLines: ValidationRule = {
  name: 'staff-lines',
  severity: 'error',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];
    
    if (doc.headers.has('staff-lines')) {
      const staffLines = parseInt(doc.headers.get('staff-lines') || '4');
      
      if (staffLines < 2 || staffLines > 5) {
        errors.push({
          message: 'invalid number of staff lines (must be between 2 and 5)',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          severity: 'error'
        });
      }
    }

    return errors;
  }
};

/**
 * Helper function to convert pitch letter to numeric value
 */
function getPitchValue(pitch: string): number {
  const pitchMap: { [key: string]: number } = {
    'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6,
    'g': 7, 'h': 8, 'i': 9, 'j': 10, 'k': 11, 'l': 12,
    'm': 13, 'n': 14, 'p': 15
  };
  
  return pitchMap[pitch.toLowerCase()] || 0;
}

/**
 * Check for unbalanced pitch descriptors in fused NABC glyphs
 * Fused glyphs (connected with !) must have pitch descriptors on both sides or neither
 * This is not supported in Gregorio 6.1.0
 */
export const validateBalancedPitchDescriptorsInFusedGlyphs: ValidationRule = {
  name: 'balanced-pitch-descriptors-fused-glyphs',
  severity: 'warning',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];

    // Iterate through all syllables
    for (const syllable of doc.notation.syllables) {
      // Check each note for NABC content
      for (const note of syllable.notes) {
        if (!note.nabc || note.nabc.length === 0) continue;

        // Parse NABC notation to find fused glyphs (containing !)
        for (const nabcLine of note.nabc) {
          if (!nabcLine.includes('!')) continue;

          // Split by ! to get individual glyph descriptors
          const parts = nabcLine.split('!');
          
          for (let i = 0; i < parts.length - 1; i++) {
            const leftPart = parts[i];
            const rightPart = parts[i + 1];

            // Check if parts have pitch descriptors (h followed by pitch letter a-n, p)
            const leftHasPitch = /h[a-np]/.test(leftPart);
            const rightHasPitch = /h[a-np]/.test(rightPart);

            // If only one side has a pitch descriptor, emit warning
            if (leftHasPitch !== rightHasPitch) {
              errors.push({
                message: `Unbalanced pitch descriptors in fused glyphs are not supported in Gregorio 6.1.0. Both glyphs must have pitch descriptors (e.g., 'vihk!tahk') or neither should have them.`,
                range: note.range || { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                severity: 'warning'
              });
              break; // Only report once per NABC line
            }
          }
        }
      }
    }

    return errors;
  }
};

/**
 * Validate that modifiers in fused NABC glyphs only appear on the last glyph
 * In Gregorio 6.1.0, only the last glyph descriptor in a fusion can have modifiers
 */
export const validateModifiersInFusedGlyphs: ValidationRule = {
  name: 'modifiers-in-fused-glyphs',
  severity: 'warning',
  validate: (doc: ParsedDocument): ParseError[] => {
    const errors: ParseError[] = [];

    // NABC glyph modifiers: S, G, M, -, >, ~
    const modifierPattern = /[SGM\->~]/;

    for (const syllable of doc.notation.syllables) {
      for (const note of syllable.notes) {
        if (!note.nabc || note.nabc.length === 0) continue;

        for (const nabcLine of note.nabc) {
          if (!nabcLine.includes('!')) continue;

          // Split by ! to get individual glyph descriptors
          const parts = nabcLine.split('!');
          
          // Check all parts except the last one for modifiers
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            
            // Check if this part has any modifiers
            if (modifierPattern.test(part)) {
              errors.push({
                message: `Modifiers in fused glyphs are only allowed on the last glyph descriptor (Gregorio 6.1.0). Found modifier in '${part}' but only '${parts[parts.length - 1]}' (the last glyph) can have modifiers.`,
                range: note.range || { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                severity: 'warning'
              });
              break; // Only report once per NABC line
            }
          }
        }
      }
    }

    return errors;
  }
};

/**
 * All validation rules
 */
export const allValidationRules: ValidationRule[] = [
  validateNameHeader,
  validateFirstSyllableLineBreak,
  validateFirstSyllableClefChange,
  validateNabcWithoutHeader,
  validateQuilismaFollowedByLowerPitch,
  validateQuilismaPesPrecededByHigherPitch,
  validateVirgaStrataFollowedByHigherPitch,
  validateStaffLines,
  validateBalancedPitchDescriptorsInFusedGlyphs,
  validateModifiersInFusedGlyphs
];
