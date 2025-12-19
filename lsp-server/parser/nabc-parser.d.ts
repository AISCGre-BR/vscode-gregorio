/**
 * NABC (St. Gall Notation) Parser
 * Parses NABC glyph descriptors according to the Gregorio specification
 */
import { NABCGlyphDescriptor, Position } from './types';
/**
 * Parse a single NABC snippet into an array of glyph descriptors
 * A snippet can contain a sequence of complex neume descriptors
 */
export declare function parseNABCSnippet(nabc: string, startPos?: Position): NABCGlyphDescriptor[];
/**
 * Parse all NABC snippets from an array
 * Each snippet can contain multiple complex neume descriptors
 */
export declare function parseNABCSnippets(nabcArray: string[], startPos?: Position): NABCGlyphDescriptor[];
/**
 * Validate NABC glyph descriptor
 */
export declare function validateNABCDescriptor(descriptor: NABCGlyphDescriptor): string[];
/**
 * Get all valid NABC glyph descriptor codes
 */
export declare function getAllNABCGlyphCodes(): string[];
/**
 * Check if a string is a valid NABC glyph descriptor
 */
export declare function isValidNABCGlyph(code: string): boolean;
//# sourceMappingURL=nabc-parser.d.ts.map