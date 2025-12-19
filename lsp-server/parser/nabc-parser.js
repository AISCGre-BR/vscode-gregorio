"use strict";
/**
 * NABC (St. Gall Notation) Parser
 * Parses NABC glyph descriptors according to the Gregorio specification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNABCSnippet = parseNABCSnippet;
exports.parseNABCSnippets = parseNABCSnippets;
exports.validateNABCDescriptor = validateNABCDescriptor;
exports.getAllNABCGlyphCodes = getAllNABCGlyphCodes;
exports.isValidNABCGlyph = isValidNABCGlyph;
const types_1 = require("./types");
/**
 * Parse a single NABC snippet into an array of glyph descriptors
 * A snippet can contain a sequence of complex neume descriptors
 */
function parseNABCSnippet(nabc, startPos) {
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
function parseComplexNeumeDescriptors(nabc, startPos) {
    const descriptors = [];
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
        }
        else {
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
function parseSingleComplexDescriptor(nabc, startPos, position) {
    let pos = startPos;
    // Check for fusion (!) in the upcoming section
    // Find the extent of this descriptor first
    const fusionIndex = nabc.indexOf('!', pos);
    if (fusionIndex > pos && fusionIndex < nabc.length - 1) {
        // Check if there's a valid basic glyph before the fusion
        const beforeFusion = nabc.substring(pos, fusionIndex);
        const left = parseComplexGlyphDescriptor(beforeFusion, 0, position);
        if (left && left.consumed === beforeFusion.length) {
            // Parse what comes after the fusion
            const afterFusionStart = fusionIndex + 1;
            const right = parseSingleComplexDescriptor(nabc, afterFusionStart, position);
            if (right) {
                left.descriptor.fusion = right.descriptor;
                return {
                    descriptor: left.descriptor,
                    consumed: right.consumed
                };
            }
        }
    }
    // Parse the complex glyph descriptor
    const result = parseComplexGlyphDescriptor(nabc, pos, position);
    if (!result) {
        return null;
    }
    return result;
}
/**
 * Parse a complex glyph descriptor starting at the given position
 * Returns the descriptor and the number of characters consumed
 */
function parseComplexGlyphDescriptor(nabc, startPos, position) {
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
    const result = {
        basicGlyph
    };
    // Parse modifiers (S, G, M, -, >, ~) and variant numbers
    const modifiers = [];
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
            modifiers.push(types_1.NABCGlyphModifier.MarkModification);
            pos++;
        }
        else if (char === 'G') {
            modifiers.push(types_1.NABCGlyphModifier.GroupingModification);
            pos++;
        }
        else if (char === 'M') {
            modifiers.push(types_1.NABCGlyphModifier.MelodicModification);
            pos++;
        }
        else if (char === '-') {
            modifiers.push(types_1.NABCGlyphModifier.Episema);
            pos++;
        }
        else if (char === '>') {
            modifiers.push(types_1.NABCGlyphModifier.AugmentiveLiquescence);
            pos++;
        }
        else if (char === '~') {
            modifiers.push(types_1.NABCGlyphModifier.DiminutiveLiquescence);
            pos++;
        }
        else if (/[1-9]/.test(char)) {
            // Variant number - skip for now
            pos++;
        }
        else {
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
    const significantLetters = [];
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
                const parsed = parseSignificantLetter(nabc.substring(pos), position);
                if (parsed) {
                    significantLetters.push(parsed.letter);
                    // Move position forward by the total length consumed
                    pos += parsed.length;
                }
                else {
                    break;
                }
            }
            else {
                break;
            }
        }
        else {
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
function parseBasicGlyph(code) {
    // Map all valid NABC glyph descriptors
    const glyphMap = {
        'vi': types_1.NABCBasicGlyph.Virga,
        'pu': types_1.NABCBasicGlyph.Punctum,
        'ta': types_1.NABCBasicGlyph.Tractulus,
        'gr': types_1.NABCBasicGlyph.Gravis,
        'cl': types_1.NABCBasicGlyph.Clivis,
        'pe': types_1.NABCBasicGlyph.Pes,
        'po': types_1.NABCBasicGlyph.Porrectus,
        'to': types_1.NABCBasicGlyph.Torculus,
        'ci': types_1.NABCBasicGlyph.Climacus,
        'sc': types_1.NABCBasicGlyph.Scandicus,
        'pf': types_1.NABCBasicGlyph.PorrectusFlexus,
        'sf': types_1.NABCBasicGlyph.ScandicusFlexus,
        'tr': types_1.NABCBasicGlyph.TorculusResupinus,
        'st': types_1.NABCBasicGlyph.Stropha,
        'ds': types_1.NABCBasicGlyph.Distropha,
        'ts': types_1.NABCBasicGlyph.Tristropha,
        'tg': types_1.NABCBasicGlyph.Trigonus,
        'bv': types_1.NABCBasicGlyph.Bivirga,
        'tv': types_1.NABCBasicGlyph.Trivirga,
        'pr': types_1.NABCBasicGlyph.PressusMainor,
        'pi': types_1.NABCBasicGlyph.PressusMinor,
        'vs': types_1.NABCBasicGlyph.VirgaStrata,
        'or': types_1.NABCBasicGlyph.Oriscus,
        'sa': types_1.NABCBasicGlyph.Salicus,
        'pq': types_1.NABCBasicGlyph.PesQuassus,
        'ql': types_1.NABCBasicGlyph.Quilisma3Loops,
        'qi': types_1.NABCBasicGlyph.Quilisma2Loops,
        'pt': types_1.NABCBasicGlyph.PesStratus,
        'ni': types_1.NABCBasicGlyph.Nihil,
        'un': types_1.NABCBasicGlyph.Uncinus,
        'oc': types_1.NABCBasicGlyph.OriscusClivis
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
function parseSubpunctisPrepunctis(nabc, startPos) {
    const type = nabc.substring(0, 2);
    let pos = 2;
    // Parse optional modifier
    // St. Gall: t (tractulus), u (tractulus + episema), v (tractulus + double episema), w (gravis), x (liquescens stropha), y (gravis + episema)
    // Laon: n (uncinus), q (quilisma), z (virga), x (cephalicus)
    let modifier;
    if (pos < nabc.length && /[tuvwxynqz]/.test(nabc[pos])) {
        modifier = nabc[pos];
        pos++;
    }
    // Parse mandatory count (digit)
    let count;
    if (pos < nabc.length && /[1-9]/.test(nabc[pos])) {
        count = parseInt(nabc[pos]);
        pos++;
    }
    // Count is mandatory
    if (count === undefined) {
        return null;
    }
    // Create appropriate descriptor
    const descriptor = {
        basicGlyph: types_1.NABCBasicGlyph.Punctum, // Use punctum as placeholder
    };
    if (type === 'su') {
        descriptor.subpunctis = { count, modifier };
    }
    else if (type === 'pp') {
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
function parseSignificantLetter(nabc, startPos) {
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
    const position = parseInt(nabc[pos]);
    const code = nabc.substring(2, pos);
    if (code.length === 0) {
        return null;
    }
    const totalLength = pos + 1; // l + s/t + code + digit
    const result = {
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
function parseNABCSnippets(nabcArray, startPos) {
    const allDescriptors = [];
    nabcArray.forEach((nabc, index) => {
        const pos = startPos ? {
            line: startPos.line,
            character: startPos.character + index * 10 // Approximate offset
        } : undefined;
        const descriptors = parseNABCSnippet(nabc, pos);
        allDescriptors.push(...descriptors);
    });
    return allDescriptors;
}
/**
 * Validate NABC glyph descriptor
 */
function validateNABCDescriptor(descriptor) {
    const errors = [];
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
        const hasLiquescence = descriptor.modifiers.some(m => m === types_1.NABCGlyphModifier.AugmentiveLiquescence ||
            m === types_1.NABCGlyphModifier.DiminutiveLiquescence);
        // Liquescence modifiers should be mutually exclusive
        if (descriptor.modifiers.includes(types_1.NABCGlyphModifier.AugmentiveLiquescence) &&
            descriptor.modifiers.includes(types_1.NABCGlyphModifier.DiminutiveLiquescence)) {
            errors.push('NABC descriptor cannot have both augmentive and diminutive liquescence');
        }
    }
    return errors;
}
/**
 * Get all valid NABC glyph descriptor codes
 */
function getAllNABCGlyphCodes() {
    return Object.values(types_1.NABCBasicGlyph);
}
/**
 * Check if a string is a valid NABC glyph descriptor
 */
function isValidNABCGlyph(code) {
    return parseBasicGlyph(code) !== null;
}
//# sourceMappingURL=nabc-parser.js.map