"use strict";
/**
 * Validation Rules for GABC Files
 * Implements error and warning detection based on Gregorio compiler documentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.allValidationRules = exports.validateStaffLines = exports.validateQuilismaticConnector = exports.validateVirgaStrataFollowedByHigherPitch = exports.validateQuilismaPesPrecededByHigherPitch = exports.validateQuilismaFollowedByLowerPitch = exports.validateNabcWithoutHeader = exports.validateFirstSyllableClefChange = exports.validateFirstSyllableLineBreak = exports.validateDuplicateHeaders = exports.validateNameHeader = void 0;
const types_1 = require("../parser/types");
/**
 * Check if the name header is present
 */
exports.validateNameHeader = {
    name: 'name-header',
    severity: 'warning',
    validate: (doc) => {
        const errors = [];
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
exports.validateDuplicateHeaders = {
    name: 'duplicate-headers',
    severity: 'warning',
    validate: (doc) => {
        const errors = [];
        const headerCounts = new Map();
        // Count would need to be done during parsing
        // This is a placeholder for the concept
        return errors;
    }
};
/**
 * Check for line breaks on first syllable
 */
exports.validateFirstSyllableLineBreak = {
    name: 'first-syllable-line-break',
    severity: 'error',
    validate: (doc) => {
        const errors = [];
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
exports.validateFirstSyllableClefChange = {
    name: 'first-syllable-clef-change',
    severity: 'error',
    validate: (doc) => {
        const errors = [];
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
exports.validateNabcWithoutHeader = {
    name: 'nabc-without-header',
    severity: 'error',
    validate: (doc) => {
        const errors = [];
        const hasNabcLines = doc.headers.has('nabc-lines');
        const hasNabcContent = doc.notation.syllables.some(s => s.notes.some(n => n.nabc && n.nabc.length > 0));
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
exports.validateQuilismaFollowedByLowerPitch = {
    name: 'quilisma-lower-pitch',
    severity: 'warning',
    validate: (doc) => {
        const errors = [];
        for (const syllable of doc.notation.syllables) {
            for (const noteGroup of syllable.notes) {
                for (let i = 0; i < noteGroup.notes.length - 1; i++) {
                    const currentNote = noteGroup.notes[i];
                    const nextNote = noteGroup.notes[i + 1];
                    if (currentNote.shape === types_1.NoteShape.Quilisma) {
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
exports.validateQuilismaPesPrecededByHigherPitch = {
    name: 'quilisma-pes-higher-pitch',
    severity: 'warning',
    validate: (doc) => {
        const errors = [];
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
                    if (firstNextNote.shape === types_1.NoteShape.Quilisma) {
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
exports.validateVirgaStrataFollowedByHigherPitch = {
    name: 'virga-strata-higher-pitch',
    severity: 'warning',
    validate: (doc) => {
        const errors = [];
        for (const syllable of doc.notation.syllables) {
            for (const noteGroup of syllable.notes) {
                for (let i = 0; i < noteGroup.notes.length - 1; i++) {
                    const currentNote = noteGroup.notes[i];
                    const nextNote = noteGroup.notes[i + 1];
                    // Check for virga with strata modifier
                    const hasStrata = currentNote.modifiers.some(m => m.type === 'strata');
                    if (currentNote.shape === types_1.NoteShape.Virga && hasStrata) {
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
 * Check for missing connector in quilismatic sequences
 */
exports.validateQuilismaticConnector = {
    name: 'quilismatic-connector',
    severity: 'info',
    validate: (doc) => {
        const errors = [];
        for (const syllable of doc.notation.syllables) {
            for (const noteGroup of syllable.notes) {
                if (noteGroup.notes.length >= 3) {
                    // Check for quilisma in the sequence
                    const hasQuilisma = noteGroup.notes.some(n => n.shape === types_1.NoteShape.Quilisma);
                    if (hasQuilisma) {
                        // Check if connector '!' is present in the GABC string
                        const hasFusion = noteGroup.gabc.includes('!');
                        if (!hasFusion) {
                            errors.push({
                                message: 'Consider adding connector "!" in quilismatic sequences of 3+ notes',
                                range: noteGroup.range,
                                severity: 'info'
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
exports.validateStaffLines = {
    name: 'staff-lines',
    severity: 'error',
    validate: (doc) => {
        const errors = [];
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
function getPitchValue(pitch) {
    const pitchMap = {
        'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6,
        'g': 7, 'h': 8, 'i': 9, 'j': 10, 'k': 11, 'l': 12,
        'm': 13, 'n': 14, 'p': 15
    };
    return pitchMap[pitch.toLowerCase()] || 0;
}
/**
 * All validation rules
 */
exports.allValidationRules = [
    exports.validateNameHeader,
    exports.validateFirstSyllableLineBreak,
    exports.validateFirstSyllableClefChange,
    exports.validateNabcWithoutHeader,
    exports.validateQuilismaFollowedByLowerPitch,
    exports.validateQuilismaPesPrecededByHigherPitch,
    exports.validateVirgaStrataFollowedByHigherPitch,
    exports.validateQuilismaticConnector,
    exports.validateStaffLines
];
//# sourceMappingURL=rules.js.map