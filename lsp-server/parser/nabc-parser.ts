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
 * Parse a single NABC snippet and return the first glyph descriptor
 * Use parseNABCDescriptors when you need all descriptors in the snippet
 */
export function parseNABCSnippet(nabc: string, startPos?: Position): NABCGlyphDescriptor | null {
  const all = parseNABCDescriptors(nabc, startPos);
  return all.length > 0 ? all[0] : null;
}

/**
 * Parse a single NABC snippet into an array of glyph descriptors
 * A snippet can contain a sequence of complex neume descriptors
 */
export function parseNABCDescriptors(nabc: string, startPos?: Position): NABCGlyphDescriptor[] {
  if (!nabc || nabc.trim().length === 0) {
    return [];
  }

  // Remove all whitespace from NABC snippet
  const trimmed = nabc.trim().replace(/\s+/g, '');
  
  return parseComplexNeumeDescriptors(trimmed, startPos);
}

/**
 * Parse a sequence of complex neume descriptors from a NABC snippet
 * Returns an array of glyph descriptors
 */
function parseComplexNeumeDescriptors(nabc: string, startPos?: Position): NABCGlyphDescriptor[] {
  const descriptors: NABCGlyphDescriptor[] = [];
  let pos = 0;

  while (pos < nabc.length) {
    // Skip horizontal spacing adjustments (/, //, `, ``)
    while (pos < nabc.length && (nabc[pos] === '/' || nabc[pos] === '`')) {
      pos++;
    }

    if (pos >= nabc.length) {
      break;
    }

    const currentPos = startPos ? {
      line: startPos.line,
      character: startPos.character + pos
    } : undefined;

    const result = parseSingleComplexDescriptor(nabc, pos, currentPos);
    if (result) {
      descriptors.push(result.descriptor);
      pos = result.consumed;
    } else {
      // Unable to parse, skip one character and try again
      pos++;
    }
  }

  return descriptors;
}

/**
 * Parse a single complex neume descriptor starting at the given position
 * Returns the descriptor and the number of characters consumed
 */
function parseSingleComplexDescriptor(
  nabc: string,
  startPos: number,
  position?: Position
): { descriptor: NABCGlyphDescriptor; consumed: number } | null {
  let pos = startPos;

  // Parse the first glyph descriptor (which may be a basic glyph OR subpunctis/prepunctis)
  const first = parseComplexGlyphDescriptor(nabc, pos, position);
  if (!first) {
    return null;
  }

  let currentDescriptor = first.descriptor;
  pos = first.consumed;

  // Check for fusion chain: keep parsing while we find '!' followed by a valid glyph
  // But stop if we encounter 'su' or 'pp' (subpunctis/prepunctis) which mark the end of the complex glyph descriptor
  while (pos < nabc.length && nabc[pos] === '!') {
    const fusionPos = pos + 1; // Skip the '!'
    
    if (fusionPos >= nabc.length) {
      break; // Nothing after '!'
    }

    // Check if what follows the '!' is 'su' or 'pp' (subpunctis/prepunctis)
    // These mark the end of the complex glyph descriptor, so '!' is not a fusion marker here
    const remaining = nabc.substring(fusionPos);
    if (remaining.startsWith('su') || remaining.startsWith('pp')) {
      break; // Not a fusion, stop here
    }

    // Try to parse the next glyph descriptor
    const nextPos = position
      ? { line: position.line, character: position.character + fusionPos }
      : undefined;
    
    const next = parseComplexGlyphDescriptor(nabc, fusionPos, nextPos);
    if (!next) {
      break; // Not a valid glyph descriptor, stop fusion chain
    }

    // Add to fusion chain
    currentDescriptor.fusion = next.descriptor;
    currentDescriptor = next.descriptor;
    pos = next.consumed;
  }

  // After fusion chain, check for prepunctis/subpunctis (can be multiple)
  // These are part of the complex glyph descriptor
  const subpunctisList: NABCSubpunctis[] = [];
  const prepunctisList: NABCPrepunctis[] = [];
  
  while (pos < nabc.length) {
    const remaining = nabc.substring(pos);
    if (!remaining.startsWith('su') && !remaining.startsWith('pp')) {
      break; // No more su/pp
    }
    
    const ppPos = position
      ? { line: position.line, character: position.character + pos }
      : undefined;
    const ppResult = parseSubpunctisPrepunctis(remaining, ppPos);
    
    if (!ppResult) {
      break; // Failed to parse
    }
    
    // Collect su/pp
    if (ppResult.descriptor.subpunctis) {
      subpunctisList.push(ppResult.descriptor.subpunctis);
    }
    if (ppResult.descriptor.prepunctis) {
      prepunctisList.push(ppResult.descriptor.prepunctis);
    }
    
    pos += ppResult.consumed;
  }
  
  // Attach all collected su/pp to the FIRST descriptor in the chain
  if (subpunctisList.length > 0) {
    // If multiple subpunctis, use the last one (or merge them - depends on spec)
    first.descriptor.subpunctis = subpunctisList[subpunctisList.length - 1];
  }
  if (prepunctisList.length > 0) {
    // If multiple prepunctis, use the last one (or merge them - depends on spec)
    first.descriptor.prepunctis = prepunctisList[prepunctisList.length - 1];
  }

  // Extend the range of the first descriptor to cover the entire complex glyph,
  // including any fused glyphs and trailing su/pp sequences.
  if (first.descriptor.range) {
    first.descriptor.range = {
      start: first.descriptor.range.start,
      end: {
        line: first.descriptor.range.start.line,
        character: first.descriptor.range.start.character + (pos - startPos)
      }
    };
  }

  return {
    descriptor: first.descriptor,
    consumed: pos
  };
}

/**
 * Parse a complex glyph descriptor starting at the given position
 * Returns the descriptor and the number of characters consumed
 */
function parseComplexGlyphDescriptor(
  nabc: string,
  startPos: number,
  position?: Position
): { descriptor: NABCGlyphDescriptor; consumed: number } | null {
  let pos = startPos;

  // Check for subpunctis/prepunctis first
  if (nabc.substring(pos).startsWith('su') || nabc.substring(pos).startsWith('pp')) {
    const result = parseSubpunctisPrepunctis(nabc.substring(pos), position);
    if (result) {
      return {
        descriptor: result.descriptor,
        consumed: pos + result.consumed
      };
    }
  }

  // Parse basic glyph descriptor (2 letters)
  if (pos + 1 >= nabc.length) {
    return null;
  }

  const basicGlyph = parseBasicGlyph(nabc.substring(pos, pos + 2));
  if (!basicGlyph) {
    return null;
  }
  pos += 2;

  const result: NABCGlyphDescriptor = {
    basicGlyph
  };

  // Parse modifiers (S, G, M, -, >, ~) and variant numbers
  const modifiers: NABCGlyphModifier[] = [];
  while (pos < nabc.length) {
    const char = nabc[pos];
    
    // Check if this might be the start of a new descriptor
    // (a valid 2-letter basic glyph code)
    if (pos + 1 < nabc.length) {
      const potentialGlyph = nabc.substring(pos, pos + 2);
      if (parseBasicGlyph(potentialGlyph)) {
        // This looks like the start of a new descriptor, stop here
        break;
      }
    }
    
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
  if (pos < nabc.length && nabc[pos] === 'h') {
    pos++;
    if (pos < nabc.length && /[a-np]/.test(nabc[pos])) {
      result.pitch = nabc[pos];
      pos++;
    }
  }

  // Parse significant letters (ls or lt prefix)
  const significantLetters: any[] = [];
  while (pos < nabc.length) {
    // Check if this might be the start of a new descriptor
    if (pos + 1 < nabc.length) {
      const potentialGlyph = nabc.substring(pos, pos + 2);
      if (parseBasicGlyph(potentialGlyph)) {
        // This looks like the start of a new descriptor, stop here
        break;
      }
    }
    
    if (pos + 1 < nabc.length && nabc[pos] === 'l') {
      const nextChar = nabc[pos + 1];
      if (nextChar === 's' || nextChar === 't') {
        // Calculate the correct position for the significant letter
        const letterPos = position ? {
          line: position.line,
          character: position.character + pos
        } : undefined;
        const parsed = parseSignificantLetter(nabc.substring(pos), letterPos);
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

  if (position) {
    result.range = {
      start: position,
      end: { line: position.line, character: position.character + (pos - startPos) }
    };
  }

  return {
    descriptor: result,
    consumed: pos
  };
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
 * Format: su/pp + optional modifier + mandatory count (1-9)
 * St. Gall modifiers: t, u, v, w, x, y
 * Laon modifiers: n, q, z, x
 * Returns the descriptor and the number of characters consumed
 */
function parseSubpunctisPrepunctis(
  nabc: string,
  startPos?: Position
): { descriptor: NABCGlyphDescriptor; consumed: number } | null {
  const type = nabc.substring(0, 2);
  let pos = 2;

  // Parse optional modifier
  // St. Gall: t (tractulus), u (tractulus + episema), v (tractulus + double episema), w (gravis), x (liquescens stropha), y (gravis + episema)
  // Laon: n (uncinus), q (quilisma), z (virga), x (cephalicus)
  let modifier: 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'n' | 'q' | 'z' | undefined;
  if (pos < nabc.length && /[tuvwxynqz]/.test(nabc[pos])) {
    modifier = nabc[pos] as 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'n' | 'q' | 'z';
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
      end: { line: startPos.line, character: startPos.character + pos }
    };
  }

  return {
    descriptor,
    consumed: pos
  };
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
 * Each snippet can contain multiple complex neume descriptors
 */
export function parseNABCSnippets(nabcArray: string[], startPos?: Position): NABCGlyphDescriptor[] {
  const allDescriptors: NABCGlyphDescriptor[] = [];
  
  nabcArray.forEach((nabc, index) => {
    const pos = startPos ? {
      line: startPos.line,
      character: startPos.character + index * 10 // Approximate offset
    } : undefined;
    const descriptors = parseNABCDescriptors(nabc, pos);
    allDescriptors.push(...descriptors);
  });
  
  return allDescriptors;
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
