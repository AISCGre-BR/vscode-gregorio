/**
 * NABC (St. Gall Notation) Parser
 * Parses NABC glyph descriptors according to the Gregorio specification
 */

import {
  NABCGlyphDescriptor,
  NABCBasicGlyph,
  NABCGlyphModifier,
  NABCSubpunctis,
  NABCPrepunctis,
  NABCSignificantLetter,
  Range,
  Position
} from './types';

/**
 * Parse a single NABC snippet into a glyph descriptor
 */
export function parseNABCSnippet(nabc: string, startPos?: Position): NABCGlyphDescriptor | null {
  if (!nabc || nabc.trim().length === 0) {
    return null;
  }

  let pos = 0;
  // Remove all whitespace from NABC snippet
  const trimmed = nabc.trim().replace(/\s+/g, '');

  // Check for fusion (!) - parse left and right sides recursively
  const fusionIndex = trimmed.indexOf('!');
  if (fusionIndex > 0) {
    const left = trimmed.substring(0, fusionIndex);
    const right = trimmed.substring(fusionIndex + 1);
    
    const leftDescriptor = parseNABCSnippet(left, startPos);
    const rightDescriptor = parseNABCSnippet(right, startPos);
    
    if (leftDescriptor && rightDescriptor) {
      leftDescriptor.fusion = rightDescriptor;
      return leftDescriptor;
    }
  }

  // Check for subpunctis/prepunctis first
  if (trimmed.startsWith('su') || trimmed.startsWith('pp')) {
    return parseSubpunctisPrepunctis(trimmed, startPos);
  }

  // Parse basic glyph descriptor (2 letters)
  const basicGlyph = parseBasicGlyph(trimmed.substring(pos, pos + 2));
  if (!basicGlyph) {
    return null;
  }
  pos += 2;

  const result: NABCGlyphDescriptor = {
    basicGlyph
  };

  // Parse modifiers (S, G, M, -, >, ~)
  const modifiers: NABCGlyphModifier[] = [];
  while (pos < trimmed.length) {
    const char = trimmed[pos];
    if (char === 'S') {
      modifiers.push(NABCGlyphModifier.MarkModification);
      pos++;
    } else if (char === 'G') {
      modifiers.push(NABCGlyphModifier.GroupingModification);
      pos++;
    } else if (char === 'M') {
      modifiers.push(NABCGlyphModifier.MelodicModification);
      pos++;
    } else if (char === '-') {
      modifiers.push(NABCGlyphModifier.Episema);
      pos++;
    } else if (char === '>') {
      modifiers.push(NABCGlyphModifier.AugmentiveLiquescence);
      pos++;
    } else if (char === '~') {
      modifiers.push(NABCGlyphModifier.DiminutiveLiquescence);
      pos++;
    } else if (/[1-9]/.test(char)) {
      // Variant number - skip for now
      pos++;
    } else {
      break;
    }
  }

  if (modifiers.length > 0) {
    result.modifiers = modifiers;
  }

  // Parse pitch descriptor (h + pitch letter)
  if (pos < trimmed.length && trimmed[pos] === 'h') {
    pos++;
    if (pos < trimmed.length && /[a-np]/.test(trimmed[pos])) {
      result.pitch = trimmed[pos];
      pos++;
    }
  }

  // Parse significant letters (ls or lt prefix)
  const significantLetters: any[] = [];
  while (pos < trimmed.length) {
    if (pos + 1 < trimmed.length && trimmed[pos] === 'l') {
      const nextChar = trimmed[pos + 1];
      if (nextChar === 's' || nextChar === 't') {
        const parsed = parseSignificantLetter(trimmed.substring(pos), startPos);
        if (parsed) {
          significantLetters.push(parsed.letter);
          // Move position forward by the total length consumed
          pos += parsed.length;
        } else {
          break;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }

  if (significantLetters.length > 0) {
    result.significantLetters = significantLetters;
  }

  if (startPos) {
    result.range = {
      start: startPos,
      end: { line: startPos.line, character: startPos.character + trimmed.length }
    };
  }

  return result;
}

/**
 * Parse basic glyph descriptor (2-letter code)
 */
function parseBasicGlyph(code: string): NABCBasicGlyph | null {
  // Map all valid NABC glyph descriptors
  const glyphMap: Record<string, NABCBasicGlyph> = {
    'vi': NABCBasicGlyph.Virga,
    'pu': NABCBasicGlyph.Punctum,
    'ta': NABCBasicGlyph.Tractulus,
    'gr': NABCBasicGlyph.Gravis,
    'cl': NABCBasicGlyph.Clivis,
    'pe': NABCBasicGlyph.Pes,
    'po': NABCBasicGlyph.Porrectus,
    'to': NABCBasicGlyph.Torculus,
    'ci': NABCBasicGlyph.Climacus,
    'sc': NABCBasicGlyph.Scandicus,
    'pf': NABCBasicGlyph.PorrectusFlexus,
    'sf': NABCBasicGlyph.ScandicusFlexus,
    'tr': NABCBasicGlyph.TorculusResupinus,
    'st': NABCBasicGlyph.Stropha,
    'ds': NABCBasicGlyph.Distropha,
    'ts': NABCBasicGlyph.Tristropha,
    'tg': NABCBasicGlyph.Trigonus,
    'bv': NABCBasicGlyph.Bivirga,
    'tv': NABCBasicGlyph.Trivirga,
    'pr': NABCBasicGlyph.PressusMainor,
    'pi': NABCBasicGlyph.PressusMinor,
    'vs': NABCBasicGlyph.VirgaStrata,
    'or': NABCBasicGlyph.Oriscus,
    'sa': NABCBasicGlyph.Salicus,
    'pq': NABCBasicGlyph.PesQuassus,
    'ql': NABCBasicGlyph.Quilisma3Loops,
    'qi': NABCBasicGlyph.Quilisma2Loops,
    'pt': NABCBasicGlyph.PesStratus,
    'ni': NABCBasicGlyph.Nihil,
    'un': NABCBasicGlyph.Uncinus,
    'oc': NABCBasicGlyph.OriscusClivis
  };

  return glyphMap[code] || null;
}

/**
 * Parse subpunctis or prepunctis descriptor
 * Format: su/pp + optional modifier (t,u,v,w,x,y) + mandatory count (1-9)
 */
function parseSubpunctisPrepunctis(nabc: string, startPos?: Position): NABCGlyphDescriptor | null {
  const type = nabc.substring(0, 2);
  let pos = 2;

  // Parse optional modifier (t, u, v, w, x, y for St. Gall)
  let modifier: 't' | 'u' | 'v' | 'w' | 'x' | 'y' | undefined;
  if (pos < nabc.length && /[tuvwxy]/.test(nabc[pos])) {
    modifier = nabc[pos] as 't' | 'u' | 'v' | 'w' | 'x' | 'y';
    pos++;
  }

  // Parse mandatory count (digit)
  let count: number | undefined;
  if (pos < nabc.length && /[1-9]/.test(nabc[pos])) {
    count = parseInt(nabc[pos]);
    pos++;
  }

  // Count is mandatory
  if (count === undefined) {
    return null;
  }

  // Create appropriate descriptor
  const descriptor: NABCGlyphDescriptor = {
    basicGlyph: NABCBasicGlyph.Punctum, // Use punctum as placeholder
  };

  if (type === 'su') {
    descriptor.subpunctis = { count, modifier };
  } else if (type === 'pp') {
    descriptor.prepunctis = { count, modifier };
  }

  if (startPos) {
    descriptor.range = {
      start: startPos,
      end: { line: startPos.line, character: startPos.character + nabc.length }
    };
  }

  return descriptor;
}

/**
 * Parse significant letter descriptor (ls or lt prefix)
 * Format: ls/lt + code + position (1-9)
 * Returns the parsed letter and the total length consumed
 */
function parseSignificantLetter(nabc: string, startPos?: Position): { letter: NABCSignificantLetter; length: number } | null {
  if (nabc.length < 4) { // Minimum: l + s/t + 1char + digit
    return null;
  }

  if (nabc[0] !== 'l') {
    return null;
  }

  const type = nabc[1];
  if (type !== 's' && type !== 't') {
    return null;
  }

  // Find the first position digit (1-9) after the prefix
  // Scan forward from position 2 to find code followed by digit
  let pos = 2;
  while (pos < nabc.length && !/[1-9]/.test(nabc[pos])) {
    pos++;
  }

  if (pos <= 2 || pos >= nabc.length || !/[1-9]/.test(nabc[pos])) {
    return null;
  }

  const position = parseInt(nabc[pos]) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  const code = nabc.substring(2, pos);

  if (code.length === 0) {
    return null;
  }

  const totalLength = pos + 1; // l + s/t + code + digit

  const result: NABCSignificantLetter = {
    type: type === 's' ? 'ls' : 'lt',
    code,
    position
  };

  if (startPos) {
    result.range = {
      start: startPos,
      end: { line: startPos.line, character: startPos.character + totalLength }
    };
  }

  return { letter: result, length: totalLength };
}

/**
 * Parse all NABC snippets from an array
 */
export function parseNABCSnippets(nabcArray: string[], startPos?: Position): NABCGlyphDescriptor[] {
  return nabcArray
    .map((nabc, index) => {
      const pos = startPos ? {
        line: startPos.line,
        character: startPos.character + index * 10 // Approximate offset
      } : undefined;
      return parseNABCSnippet(nabc, pos);
    })
    .filter((d): d is NABCGlyphDescriptor => d !== null);
}

/**
 * Validate NABC glyph descriptor
 */
export function validateNABCDescriptor(descriptor: NABCGlyphDescriptor): string[] {
  const errors: string[] = [];

  // Check for valid basic glyph
  if (!descriptor.basicGlyph && !descriptor.subpunctis && !descriptor.prepunctis) {
    errors.push('NABC descriptor must have a basic glyph, subpunctis, or prepunctis');
  }

  // Check pitch descriptor format
  if (descriptor.pitch && !/[a-np]/.test(descriptor.pitch)) {
    errors.push(`Invalid NABC pitch descriptor: ${descriptor.pitch}`);
  }

  // Check modifier combinations
  if (descriptor.modifiers && descriptor.modifiers.length > 0) {
    const hasLiquescence = descriptor.modifiers.some(
      m => m === NABCGlyphModifier.AugmentiveLiquescence || 
           m === NABCGlyphModifier.DiminutiveLiquescence
    );
    
    // Liquescence modifiers should be mutually exclusive
    if (descriptor.modifiers.includes(NABCGlyphModifier.AugmentiveLiquescence) &&
        descriptor.modifiers.includes(NABCGlyphModifier.DiminutiveLiquescence)) {
      errors.push('NABC descriptor cannot have both augmentive and diminutive liquescence');
    }
  }

  return errors;
}

/**
 * Get all valid NABC glyph descriptor codes
 */
export function getAllNABCGlyphCodes(): string[] {
  return Object.values(NABCBasicGlyph);
}

/**
 * Check if a string is a valid NABC glyph descriptor
 */
export function isValidNABCGlyph(code: string): boolean {
  return parseBasicGlyph(code) !== null;
}
