/**
 * GABC Parser - Fallback TypeScript Implementation
 * Parses .gabc files according to the GABC specification
 */
import { ParsedDocument, Range } from './types';
export declare class GabcParser {
    private text;
    private pos;
    private line;
    private character;
    private errors;
    private comments;
    constructor(text: string);
    parse(): ParsedDocument;
    private parseHeaders;
    private parseNotation;
    private parseSyllable;
    private removeStyleTags;
    private parseNoteGroup;
    /**
     * Parse note group with position map for alternating GABC/NABC segments
     * This method uses a position map to correctly track character positions when
     * GABC content is concatenated from multiple segments separated by NABC
     */
    private parseNoteGroupWithPositionMap;
    /**
     * Parse GABC attribute [name:value] or [name]
     * Returns the attribute and the length of characters consumed
     */
    private parseAttribute;
    private parseClef;
    private parseClefWithPosition;
    private parseBar;
    private parseBarWithPosition;
    private parseComment;
    private skipWhitespaceAndComments;
    private peek;
    private advance;
    private getCurrentPosition;
    private matchRegex;
    addError(message: string, range: Range, severity?: 'error' | 'warning' | 'info'): void;
}
//# sourceMappingURL=gabc-parser.d.ts.map