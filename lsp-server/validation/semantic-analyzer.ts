/**
 * Semantic Analyzer for GABC/NABC
 * Validates parsed GABC/NABC code according to Gregorio compiler rules
 */

import {
  ParsedDocument,
  ParseError,
  Syllable,
  NoteGroup,
  Note,
  NoteShape,
  ModifierType,
  NABCGlyphDescriptor,
  Position,
  Range
} from '../parser/types';

export interface SemanticError extends ParseError {
  code: string; // Error/warning code for identification
  relatedInfo?: Array<{
    message: string;
    range: Range;
  }>;
}

export class SemanticAnalyzer {
  private errors: SemanticError[] = [];
  private warnings: SemanticError[] = [];
  private info: SemanticError[] = [];

  analyze(document: ParsedDocument): SemanticError[] {
    this.errors = [];
    this.warnings = [];
    this.info = [];

    // Header validation
    this.validateHeaders(document.headers);

    // Notation validation
    if (document.notation.syllables.length > 0) {
      this.validateFirstSyllable(document.notation.syllables[0]);
      this.validateSyllables(document.notation.syllables, document.headers);
      this.validateNABCAlternation(document.notation.syllables, document.headers);
    }

    // Return all diagnostics sorted by severity
    return [...this.errors, ...this.warnings, ...this.info];
  }

  private validateHeaders(headers: Map<string, string>): void {
    // Check for required 'name' header
    if (!headers.has('name') || !headers.get('name')?.trim()) {
      this.warnings.push({
        code: 'missing-name-header',
        message: "No name specified. Put 'name:...;' at the beginning of the file. Can be dangerous with some output formats.",
        range: this.createZeroRange(),
        severity: 'warning'
      });
    }

    // Check for duplicate headers
    const headerCounts = new Map<string, number>();
    headers.forEach((_, key) => {
      headerCounts.set(key, (headerCounts.get(key) || 0) + 1);
    });

    headerCounts.forEach((count, key) => {
      if (count > 1) {
        this.warnings.push({
          code: 'duplicate-header',
          message: `Several ${key} definitions found, only the last will be taken into consideration`,
          range: this.createZeroRange(),
          severity: 'warning'
        });
      }
    });

    // Note: The current parser implementation using Map doesn't preserve duplicate headers
    // This check would need to be implemented at parse time
    // For now, we skip this check as the parser already handles it
  }

  private validateFirstSyllable(firstSyllable: Syllable): void {
    // Check for line break on first syllable
    if (firstSyllable.lineBreak) {
      this.errors.push({
        code: 'line-break-on-first-syllable',
        message: 'Line break is not supported on the first syllable',
        range: firstSyllable.range,
        severity: 'error'
      });
    }

    // Check for clef change on first syllable
    // (Note: first syllable can have initial clef, but not a clef *change*)
    // This would need tracking of whether it's an initial vs change clef
    // For now, we skip this check as it requires more context
  }

  private validateSyllables(syllables: Syllable[], headers: Map<string, string>): void {
    const hasNabcLines = headers.has('nabc-lines');

    for (let i = 0; i < syllables.length; i++) {
      const syllable = syllables[i];
      const previousSyllable = i > 0 ? syllables[i - 1] : null;

      // Validate each note group
      for (const noteGroup of syllable.notes) {
        this.validateNoteGroup(noteGroup, hasNabcLines, previousSyllable);
      }
    }
  }

  private validateNoteGroup(
    noteGroup: NoteGroup,
    hasNabcLines: boolean,
    previousSyllable: Syllable | null
  ): void {
    // Check for pipe without nabc-lines header
    if (noteGroup.nabc && noteGroup.nabc.length > 0 && !hasNabcLines) {
      this.errors.push({
        code: 'pipe-without-nabc-lines',
        message: "Pipe '|' in note group without 'nabc-lines' header. Add 'nabc-lines: 1;' (or higher) to the file header.",
        range: noteGroup.range,
        severity: 'error'
      });
    }

    // Validate musical constructions
    this.validateMusicalConstructions(noteGroup, previousSyllable);

    // Validate NABC if present
    if (noteGroup.nabcParsed && noteGroup.nabcParsed.length > 0) {
      this.validateNABC(noteGroup.nabcParsed);
    }
  }

  private validateNABCAlternation(syllables: Syllable[], headers: Map<string, string>): void {
    const nabcLinesHeader = headers.get('nabc-lines');
    if (!nabcLinesHeader) {
      return; // No nabc-lines header, skip this validation
    }

    const expectedNabcLines = parseInt(nabcLinesHeader, 10);
    if (isNaN(expectedNabcLines) || expectedNabcLines < 1) {
      return; // Invalid header value, skip validation
    }

    // Iterate through all note groups and validate alternation
    for (const syllable of syllables) {
      for (const noteGroup of syllable.notes) {
        if (!noteGroup.nabc || noteGroup.nabc.length === 0) {
          continue; // No NABC in this note group
        }

        // Count NABC segments (pipe-separated sections)
        const nabcSegments = noteGroup.nabc.length;

        // For each NABC line, we expect: GABC | NABC | GABC | NABC | ...
        // Pattern: starts with GABC, then alternates NABC/GABC
        // Total segments = 1 (initial GABC) + nabcLines * 2
        // BUT the notes array contains all notes, so we need to count pipes
        
        // Actually, the alternation is: (gabc|nabc1|nabc2|...|nabcN)
        // So for nabc-lines: 1, we expect: gabc | nabc
        // For nabc-lines: 2, we expect: gabc | nabc1 | nabc2
        
        // Count how many pipe separators exist
        const pipeCount = nabcSegments;
        
        // Expected pattern based on nabc-lines:
        // nabc-lines: 1 → expects exactly 1 NABC segment
        // nabc-lines: 2 → expects exactly 2 NABC segments
        // If there are more segments than declared, it's an error
        
        if (pipeCount !== expectedNabcLines) {
          this.errors.push({
            code: 'nabc-alternation-mismatch',
            message: `NABC alternation mismatch: found ${pipeCount} NABC segment(s) but 'nabc-lines: ${expectedNabcLines};' declares ${expectedNabcLines}. The number of pipe-separated NABC sections must match the nabc-lines header.`,
            range: noteGroup.range,
            severity: 'error'
          });
        }
      }
    }
  }

  private validateMusicalConstructions(
    noteGroup: NoteGroup,
    previousSyllable: Syllable | null
  ): void {
    const notes = noteGroup.notes;

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const nextNote = i + 1 < notes.length ? notes[i + 1] : null;
      const prevNote = i > 0 ? notes[i - 1] : null;

      // 1. Pes quadratum without subsequent note
      const hasQuadratum = note.modifiers?.some(m => m.type === ModifierType.Quadratum);
      const hasFusion = note.modifiers?.some(m => m.type === ModifierType.Fusion);
      if (hasQuadratum && !nextNote && !hasFusion) {
        this.warnings.push({
          code: 'pes-quadratum-missing-note',
          message: `Pes quadratum at '${note.pitch}' requires a subsequent note. Example: (${note.pitch}q${this.getNextPitchExample(note.pitch)})`,
          range: note.range,
          severity: 'warning'
        });
      }

      // 2. Quilisma without subsequent note
      const noteFusion = note.modifiers?.some(m => m.type === ModifierType.Fusion);
      if (note.shape === NoteShape.Quilisma && !nextNote && !noteFusion) {
        this.warnings.push({
          code: 'quilisma-missing-note',
          message: `Quilisma at '${note.pitch}' requires a subsequent note. Example: (${note.pitch}w${this.getNextPitchExample(note.pitch)})`,
          range: note.range,
          severity: 'warning'
        });
      }

      // 3. Oriscus scapus without preceding and/or subsequent note
      const hasOriscusScapus = note.modifiers?.some(m => m.type === ModifierType.OriscusScapus);
      const prevNoteFusion = prevNote?.modifiers?.some(m => m.type === ModifierType.Fusion);
      const currentNoteFusion = note.modifiers?.some(m => m.type === ModifierType.Fusion);
      
      if (hasOriscusScapus) {
        const hasValidPrev = prevNote || prevNoteFusion;
        const hasValidNext = nextNote || currentNoteFusion;
        
        if (!hasValidPrev && !hasValidNext) {
          this.warnings.push({
            code: 'oriscus-scapus-isolated',
            message: `Oriscus scapus at '${note.pitch}' requires both preceding and subsequent notes. Example: (${this.getPreviousPitchExample(note.pitch)}${note.pitch}O${this.getNextPitchExample(note.pitch)})`,
            range: note.range,
            severity: 'warning'
          });
        } else if (!hasValidPrev) {
          this.warnings.push({
            code: 'oriscus-scapus-missing-preceding',
            message: `Oriscus scapus at '${note.pitch}' requires a preceding note. Example: (${this.getPreviousPitchExample(note.pitch)}${note.pitch}O${nextNote ? nextNote.pitch : this.getNextPitchExample(note.pitch)})`,
            range: note.range,
            severity: 'warning'
          });
        } else if (!hasValidNext) {
          this.warnings.push({
            code: 'oriscus-scapus-missing-subsequent',
            message: `Oriscus scapus at '${note.pitch}' requires a subsequent note. Example: (${prevNote?.pitch || this.getPreviousPitchExample(note.pitch)}${note.pitch}O${this.getNextPitchExample(note.pitch)})`,
            range: note.range,
            severity: 'warning'
          });
        }
      }

      // 4. Quilisma followed by equal or lower pitch
      if (note.shape === NoteShape.Quilisma && nextNote) {
        if (this.comparePitch(nextNote.pitch, note.pitch) <= 0) {
          this.warnings.push({
            code: 'quilisma-equal-or-lower',
            message: `Quilisma note '${note.pitch}' followed by equal or lower pitch '${nextNote.pitch}'. This may cause rendering issues.`,
            range: note.range,
            severity: 'warning',
            relatedInfo: [{
              message: 'Following note',
              range: nextNote.range
            }]
          });
        }
      }

      // 2. Quilisma-pes preceded by equal or higher pitch
      // Check if this is a quilisma and next note is higher (pes)
      if (note.shape === NoteShape.Quilisma && nextNote) {
        if (this.comparePitch(nextNote.pitch, note.pitch) > 0) {
          // This is a quilisma-pes, check previous note
          const prevNoteFromPrevSyllable = this.getPreviousNote(previousSyllable);
          const actualPrevNote = prevNote || prevNoteFromPrevSyllable;

          if (actualPrevNote && this.comparePitch(actualPrevNote.pitch, note.pitch) >= 0) {
            this.warnings.push({
              code: 'quilisma-pes-preceded-by-higher',
              message: `Quilisma-pes at '${note.pitch}' preceded by equal or higher pitch '${actualPrevNote.pitch}'. This may cause spacing issues.`,
              range: note.range,
              severity: 'warning'
            });
          }
        }
      }

      // 3. Virga strata followed by equal or higher pitch
      // Check if note has virga shape and strata modifier
      if (note.shape === NoteShape.Virga && this.hasStrataModifier(note) && nextNote) {
        if (this.comparePitch(nextNote.pitch, note.pitch) >= 0) {
          this.warnings.push({
            code: 'virga-strata-equal-or-higher',
            message: `Virga strata at '${note.pitch}' followed by equal or higher pitch '${nextNote.pitch}'. This may cause placement issues.`,
            range: note.range,
            severity: 'warning',
            relatedInfo: [{
              message: 'Following note',
              range: nextNote.range
            }]
          });
        }
      }

      // 4. Pes stratus followed by equal or higher pitch
      if (note.shape === NoteShape.Punctum && this.hasStrataModifier(note) && nextNote) {
        // Check if this is part of a pes (current note followed by higher note forming pes)
        if (i + 1 < notes.length) {
          const pesNote = notes[i + 1];
          // If next note forms a pes and has strata, check the note after
          if (this.hasStrataModifier(pesNote) && this.comparePitch(pesNote.pitch, note.pitch) > 0) {
            // This is a pes stratus, check if followed by equal or higher
            const noteAfterPes = i + 2 < notes.length ? notes[i + 2] : null;
            if (noteAfterPes && this.comparePitch(noteAfterPes.pitch, pesNote.pitch) >= 0) {
              this.warnings.push({
                code: 'pes-stratus-equal-or-higher',
                message: `Pes stratus ending at '${pesNote.pitch}' followed by equal or higher pitch '${noteAfterPes.pitch}'. This may cause placement issues.`,
                range: pesNote.range,
                severity: 'warning',
                relatedInfo: [{
                  message: 'Following note',
                  range: noteAfterPes.range
                }]
              });
            }
          }
        }
      }
    }

    // 4. Check for missing connector in quilismatic sequences (info level)
    this.checkQuilismaticConnector(noteGroup);
  }

  private validateNABC(nabcDescriptors: NABCGlyphDescriptor[]): void {
    // Validate NABC glyph descriptors
    for (const descriptor of nabcDescriptors) {
      // Check for conflicting liquescence modifiers
      if (descriptor.modifiers && descriptor.modifiers.length > 0) {
        const hasAugmentive = descriptor.modifiers.some(m => m === '>');
        const hasDiminutive = descriptor.modifiers.some(m => m === '~');

        if (hasAugmentive && hasDiminutive) {
          if (descriptor.range) {
            this.errors.push({
              code: 'nabc-conflicting-liquescence',
              message: 'NABC descriptor cannot have both augmentive (>) and diminutive (~) liquescence',
              range: descriptor.range,
              severity: 'error'
            });
          }
        }
      }

      // Validate pitch descriptor format
      if (descriptor.pitch && !/[a-n]/.test(descriptor.pitch)) {
        if (descriptor.range) {
          this.errors.push({
            code: 'nabc-invalid-pitch',
            message: `Invalid NABC pitch descriptor: ${descriptor.pitch}. Must be a-n.`,
            range: descriptor.range,
            severity: 'error'
          });
        }
      }

      // Recursively validate fusion
      if (descriptor.fusion) {
        this.validateNABC([descriptor.fusion]);
      }
    }
  }

  private checkQuilismaticConnector(noteGroup: NoteGroup): void {
    const notes = noteGroup.notes;
    
    // Check for quilismatic sequences of 3+ notes
    if (notes.length >= 3) {
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        
        if (note.shape === NoteShape.Quilisma) {
          // Check if there's a connector before this quilisma
          // In GABC, connector is typically indicated by ! or fusion marker
          const hasFusion = note.modifiers?.some(m => m.type === 'fusion');
          
          if (!hasFusion && i > 0) {
            this.info.push({
              code: 'quilisma-missing-connector',
              message: `Consider adding connector '!' before quilisma in multi-note neume for proper fusion. Example: ${this.formatNoteSequence(notes, i)}`,
              range: note.range,
              severity: 'info'
            });
          }
        }
      }
    }
  }

  // Helper methods

  private comparePitch(pitch1: string, pitch2: string): number {
    // GABC pitch order: a < b < c < d < e < f < g < h < i < j < k < l < m < n
    const pitchOrder = 'abcdefghijklmn';
    const idx1 = pitchOrder.indexOf(pitch1.toLowerCase());
    const idx2 = pitchOrder.indexOf(pitch2.toLowerCase());
    
    if (idx1 === -1 || idx2 === -1) return 0;
    return idx1 - idx2;
  }

  private hasStrataModifier(note: Note): boolean {
    // Check if note has strata modifier
    return note.modifiers?.some(m => m.type === 'strata') || false;
  }

  private getPreviousNote(previousSyllable: Syllable | null): Note | null {
    if (!previousSyllable || previousSyllable.notes.length === 0) {
      return null;
    }

    const lastNoteGroup = previousSyllable.notes[previousSyllable.notes.length - 1];
    if (lastNoteGroup.notes.length === 0) {
      return null;
    }

    return lastNoteGroup.notes[lastNoteGroup.notes.length - 1];
  }

  private formatNoteSequence(notes: Note[], quilismaIndex: number): string {
    // Format a helpful example showing where the connector should be
    const before = quilismaIndex > 0 ? notes[quilismaIndex - 1].pitch : '';
    const quilisma = notes[quilismaIndex].pitch + 'w';
    const after = quilismaIndex + 1 < notes.length ? notes[quilismaIndex + 1].pitch : '';
    
    return `(${before}!${quilisma}${after})`;
  }

  private getNextPitchExample(pitch: string): string {
    // Return a pitch one step higher for examples
    const pitchOrder = 'abcdefghijklmn';
    const idx = pitchOrder.indexOf(pitch.toLowerCase());
    if (idx === -1 || idx >= pitchOrder.length - 1) return 'g'; // default
    return pitchOrder[idx + 1];
  }

  private getPreviousPitchExample(pitch: string): string {
    // Return a pitch one step lower for examples
    const pitchOrder = 'abcdefghijklmn';
    const idx = pitchOrder.indexOf(pitch.toLowerCase());
    if (idx === -1 || idx <= 0) return 'd'; // default
    return pitchOrder[idx - 1];
  }

  private createZeroRange(): Range {
    const zero: Position = { line: 0, character: 0 };
    return { start: zero, end: zero };
  }

  // Public getters for test purposes
  getErrors(): SemanticError[] {
    return this.errors;
  }

  getWarnings(): SemanticError[] {
    return this.warnings;
  }

  getInfo(): SemanticError[] {
    return this.info;
  }
}

/**
 * Convenience function to analyze a parsed document
 */
export function analyzeSemantics(document: ParsedDocument): SemanticError[] {
  const analyzer = new SemanticAnalyzer();
  return analyzer.analyze(document);
}
