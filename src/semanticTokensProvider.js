"use strict";
/**
 * Semantic Tokens Provider for GABC
 * Provides advanced syntax highlighting using the gregorio-lsp parser
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GabcSemanticTokensProvider = exports.legend = exports.tokenModifiers = exports.tokenTypes = void 0;
const vscode = __importStar(require("vscode"));
const gabc_parser_1 = require("../lsp-server/parser/gabc-parser");
const types_1 = require("../lsp-server/parser/types");
// Define semantic token types
exports.tokenTypes = [
    'header', // 0
    'keyword', // 1
    'string', // 2
    'comment', // 3
    'number', // 4
    'operator', // 5
    'parameter', // 6
    'property', // 7
    'variable', // 8
    'function', // 9
    'class', // 10
    'namespace', // 11
    'type', // 12
    'decorator', // 13
    'macro', // 14
    'regexp', // 15
    'label', // 16
    'modifier', // 17
    'customLiteral' // 18
];
// Define semantic token modifiers
exports.tokenModifiers = [
    'declaration', // 0
    'definition', // 1
    'readonly', // 2
    'static', // 3
    'deprecated', // 4
    'abstract', // 5
    'async', // 6
    'modification', // 7
    'documentation', // 8
    'defaultLibrary' // 9
];
exports.legend = new vscode.SemanticTokensLegend(exports.tokenTypes, exports.tokenModifiers);
class GabcSemanticTokensProvider {
    parser = null;
    provideDocumentSemanticTokens(document, token) {
        console.log('[Gregorio] Semantic tokens provider called for:', document.uri.toString());
        // Check if semantic highlighting is enabled
        const config = vscode.workspace.getConfiguration('gregorio.highlighting');
        const enabled = config.get('semantic', true);
        console.log('[Gregorio] Semantic highlighting enabled:', enabled);
        if (!enabled) {
            return null;
        }
        const tokensBuilder = new vscode.SemanticTokensBuilder(exports.legend);
        try {
            // Parse the document
            const text = document.getText();
            console.log('[Gregorio] Parsing document, length:', text.length);
            this.parser = new gabc_parser_1.GabcParser(text);
            const parsed = this.parser.parse();
            console.log('[Gregorio] Parse complete. Headers:', parsed.headers.size, 'Syllables:', parsed.notation.syllables.length, 'Errors:', parsed.errors.length);
            // Tokenize headers
            this.tokenizeHeaders(parsed, tokensBuilder);
            // Tokenize comments
            this.tokenizeComments(parsed, tokensBuilder);
            // Tokenize notation
            this.tokenizeNotation(parsed, tokensBuilder);
            const tokens = tokensBuilder.build();
            console.log('[Gregorio] Built tokens, data length:', tokens.data.length);
            return tokens;
        }
        catch (error) {
            console.error('[Gregorio] Semantic tokens provider error:', error);
            return tokensBuilder.build(); // Return empty tokens instead of null
        }
    }
    tokenizeHeaders(parsed, builder) {
        const text = this.parser?.['text'] || '';
        const lines = text.split('\n');
        let inHeader = true;
        let currentHeaderName = '';
        let headerStartLine = -1;
        for (let lineIdx = 0; lineIdx < lines.length && inHeader; lineIdx++) {
            const line = lines[lineIdx];
            const trimmed = line.trim();
            // Skip empty lines and comments
            if (trimmed === '' || trimmed.startsWith('%')) {
                continue;
            }
            // Check for header separator
            if (trimmed === '%%') {
                const separatorStart = line.indexOf('%%');
                builder.push(lineIdx, separatorStart, 2, this.getTokenType('operator'), 0);
                inHeader = false;
                break;
            }
            // Check if this line starts a new header (has colon)
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1 && colonIndex < 50) { // Reasonable position for header name
                // Extract header name (everything before colon)
                const beforeColon = line.substring(0, colonIndex).trim();
                if (/^[a-zA-Z0-9-]+$/.test(beforeColon)) {
                    currentHeaderName = beforeColon;
                    headerStartLine = lineIdx;
                    // Find the actual start position of the header name
                    const nameStart = line.indexOf(currentHeaderName);
                    // Highlight header name
                    builder.push(lineIdx, nameStart, currentHeaderName.length, this.getTokenType('property'), this.getModifier('readonly'));
                    // Highlight colon
                    builder.push(lineIdx, colonIndex, 1, this.getTokenType('operator'), 0);
                    // Get the value part (after colon)
                    const afterColon = line.substring(colonIndex + 1);
                    const semicolonMatch = afterColon.match(/;{1,2}/);
                    if (semicolonMatch) {
                        // Single line header with semicolon
                        const valueText = afterColon.substring(0, semicolonMatch.index).trim();
                        if (valueText.length > 0) {
                            const valueStart = line.indexOf(valueText, colonIndex);
                            if (valueStart !== -1) {
                                builder.push(lineIdx, valueStart, valueText.length, this.getTokenType('string'), 0);
                            }
                        }
                        // Highlight semicolon
                        const semicolonStart = colonIndex + 1 + semicolonMatch.index;
                        builder.push(lineIdx, semicolonStart, semicolonMatch[0].length, this.getTokenType('operator'), 0);
                        currentHeaderName = '';
                    }
                    else {
                        // Multiline header - highlight the first line's value
                        const valueText = afterColon.trim();
                        if (valueText.length > 0) {
                            const valueStart = line.indexOf(valueText, colonIndex);
                            if (valueStart !== -1) {
                                builder.push(lineIdx, valueStart, valueText.length, this.getTokenType('string'), 0);
                            }
                        }
                    }
                }
            }
            else if (currentHeaderName !== '') {
                // Continuation of multiline header
                const semicolonMatch = line.match(/;{1,2}/);
                if (semicolonMatch) {
                    // End of multiline header
                    const valueText = line.substring(0, semicolonMatch.index).trim();
                    if (valueText.length > 0) {
                        const valueStart = line.indexOf(valueText);
                        if (valueStart !== -1) {
                            builder.push(lineIdx, valueStart, valueText.length, this.getTokenType('string'), 0);
                        }
                    }
                    // Highlight semicolon
                    const semicolonStart = line.indexOf(semicolonMatch[0]);
                    builder.push(lineIdx, semicolonStart, semicolonMatch[0].length, this.getTokenType('operator'), 0);
                    currentHeaderName = '';
                }
                else {
                    // Middle of multiline header
                    const valueText = trimmed;
                    if (valueText.length > 0) {
                        const valueStart = line.indexOf(valueText);
                        if (valueStart !== -1) {
                            builder.push(lineIdx, valueStart, valueText.length, this.getTokenType('string'), 0);
                        }
                    }
                }
            }
        }
    }
    tokenizeComments(parsed, builder) {
        for (const comment of parsed.comments) {
            const range = comment.range;
            builder.push(range.start.line, range.start.character, range.end.character - range.start.character, this.getTokenType('comment'), this.getModifier('documentation'));
        }
    }
    tokenizeNotation(parsed, builder) {
        // Use parsed structure for accurate tokenization
        for (const syllable of parsed.notation.syllables) {
            this.tokenizeSyllable(syllable, builder);
        }
    }
    tokenizeSyllable(syllable, builder) {
        // Tokenize clef if present
        if (syllable.clef) {
            this.tokenizeClef(syllable.clef, builder);
        }
        // Tokenize bar if present
        if (syllable.bar) {
            this.tokenizeBar(syllable.bar, builder);
        }
        // Tokenize note groups
        for (const noteGroup of syllable.notes) {
            this.tokenizeNoteGroup(noteGroup, builder);
        }
    }
    tokenizeClef(clef, builder) {
        const range = clef.range;
        // Highlight clef as a keyword
        builder.push(range.start.line, range.start.character, range.end.character - range.start.character, this.getTokenType('keyword'), this.getModifier('readonly'));
    }
    tokenizeBar(bar, builder) {
        const range = bar.range;
        // Highlight bar as an operator
        builder.push(range.start.line, range.start.character, range.end.character - range.start.character, this.getTokenType('operator'), 0);
    }
    tokenizeNoteGroup(noteGroup, builder) {
        // Tokenize each note in the group (GABC notes)
        for (const note of noteGroup.notes) {
            this.tokenizeNote(note, builder);
        }
        // Tokenize NABC if present
        if (noteGroup.nabcParsed && noteGroup.nabcParsed.length > 0) {
            for (const nabcGlyph of noteGroup.nabcParsed) {
                this.tokenizeNABCGlyph(nabcGlyph, builder);
            }
        }
        // Tokenize custos if present
        if (noteGroup.custos) {
            this.tokenizeCustos(noteGroup.custos, builder);
        }
        // Tokenize attributes
        if (noteGroup.attributes) {
            for (const attr of noteGroup.attributes) {
                this.tokenizeAttribute(attr, builder);
            }
        }
    }
    tokenizeNote(note, builder) {
        const range = note.range;
        // Determine token type based on note shape
        // Following tree-sitter-gregorio conventions:
        // - Basic pitches: constant.builtin
        // - Special shapes (virga, quilisma, oriscus, stropha): type
        // - Alterations (flat, sharp, natural): operator
        let tokenType = this.getTokenType('variable'); // Default for basic pitch
        let modifier = 0;
        switch (note.shape) {
            case types_1.NoteShape.Virga:
            case types_1.NoteShape.VirgaReversa:
                // Virga shapes - highlight as type (like tree-sitter @type)
                tokenType = this.getTokenType('type');
                break;
            case types_1.NoteShape.Quilisma:
            case types_1.NoteShape.Oriscus:
                // Special neume shapes - highlight as type (like tree-sitter @type)
                tokenType = this.getTokenType('type');
                break;
            case types_1.NoteShape.Stropha:
                // Stropha - highlight as type (like tree-sitter @type)
                tokenType = this.getTokenType('type');
                break;
            case types_1.NoteShape.Liquescent:
                // Liquescence - highlight as type with abstract modifier
                tokenType = this.getTokenType('type');
                modifier = this.getModifier('abstract');
                break;
            case types_1.NoteShape.Cavum:
            case types_1.NoteShape.Linea:
                // Cavum/Linea - highlight as type
                tokenType = this.getTokenType('type');
                break;
            case types_1.NoteShape.Flat:
            case types_1.NoteShape.Sharp:
            case types_1.NoteShape.Natural:
                // Alterations - highlight as operator (like tree-sitter @operator)
                tokenType = this.getTokenType('operator');
                break;
            case types_1.NoteShape.Punctum:
            case types_1.NoteShape.PunctumInclinatum:
            default:
                // Basic punctum - highlight pitch as variable
                tokenType = this.getTokenType('variable');
                break;
        }
        // Highlight the entire note (pitch + modifiers)
        const length = range.end.character - range.start.character;
        builder.push(range.start.line, range.start.character, length, tokenType, modifier);
    }
    tokenizeAttribute(attr, builder) {
        const range = attr.range;
        // Highlight attribute name
        builder.push(range.start.line, range.start.character, attr.name.length, this.getTokenType('parameter'), this.getModifier('readonly'));
        // Highlight attribute value if present
        if (attr.value) {
            // Value position would need to be calculated
            // This requires parser enhancement
        }
    }
    tokenizeCustos(custos, builder) {
        const range = custos.range;
        // Highlight custos as keyword.directive (like tree-sitter)
        builder.push(range.start.line, range.start.character, range.end.character - range.start.character, this.getTokenType('keyword'), this.getModifier('readonly'));
    }
    tokenizeNABCGlyph(glyph, builder) {
        if (!glyph.range) {
            return;
        }
        const range = glyph.range;
        const text = this.parser?.['text'] || '';
        const lines = text.split('\n');
        const glyphText = lines[range.start.line]?.substring(range.start.character, range.end.character) || '';
        // Track current position within the glyph text
        let pos = 0;
        // 1. Tokenize subpunctis/prepunctis (if present)
        if (glyph.subpunctis || glyph.prepunctis) {
            // 'pp' or 'su' prefix - highlight as class (nome de classe)
            const prefix = glyphText.substring(0, 2);
            if (prefix === 'pp' || prefix === 'su') {
                builder.push(range.start.line, range.start.character + pos, 2, this.getTokenType('class'), this.getModifier('readonly'));
                pos += 2;
                // Modifier letter (t, n, z, etc.) - highlight as string (valor de atributo)
                if (pos < glyphText.length && /[a-z]/.test(glyphText[pos])) {
                    builder.push(range.start.line, range.start.character + pos, 1, this.getTokenType('string'), 0);
                    pos++;
                }
                // Numeric value - highlight as number
                while (pos < glyphText.length && /[0-9]/.test(glyphText[pos])) {
                    const numStart = pos;
                    while (pos < glyphText.length && /[0-9]/.test(glyphText[pos])) {
                        pos++;
                    }
                    builder.push(range.start.line, range.start.character + numStart, pos - numStart, this.getTokenType('number'), 0);
                }
            }
        }
        else if (glyph.basicGlyph) {
            // 2. Tokenize basic glyph (2 letters) - highlight as keyword
            const basicGlyphText = glyphText.substring(pos, pos + 2);
            if (basicGlyphText.length === 2) {
                builder.push(range.start.line, range.start.character + pos, 2, this.getTokenType('keyword'), this.getModifier('readonly'));
                pos += 2;
            }
            // 3. Tokenize modifiers (S, G, M, -, >, ~, variant numbers)
            while (pos < glyphText.length) {
                const char = glyphText[pos];
                if (/[SGM\->~]/.test(char)) {
                    // Modifier character - highlight as operator
                    builder.push(range.start.line, range.start.character + pos, 1, this.getTokenType('operator'), 0);
                    pos++;
                }
                else if (/[1-9]/.test(char)) {
                    // Variant number - highlight as number
                    builder.push(range.start.line, range.start.character + pos, 1, this.getTokenType('number'), 0);
                    pos++;
                }
                else if (char === 'h') {
                    // 4. Pitch descriptor starts with 'h'
                    break;
                }
                else if (char === 'l') {
                    // 5. Significant letters start with 'l'
                    break;
                }
                else {
                    // Unknown character, skip
                    pos++;
                }
            }
            // 4. Tokenize pitch descriptor (h + pitch letter)
            if (pos < glyphText.length && glyphText[pos] === 'h') {
                // 'h' - highlight as function (nome de função)
                builder.push(range.start.line, range.start.character + pos, 1, this.getTokenType('function'), 0);
                pos++;
                // Pitch letter (a-n or p) - highlight as parameter (parâmetro de função)
                if (pos < glyphText.length && /[a-np]/.test(glyphText[pos])) {
                    builder.push(range.start.line, range.start.character + pos, 1, this.getTokenType('parameter'), 0);
                    pos++;
                }
            }
        }
        // 5. Highlight significant letters if present
        if (glyph.significantLetters && glyph.significantLetters.length > 0) {
            for (const letter of glyph.significantLetters) {
                if (letter.range) {
                    // Significant letters are performance indications - use decorator
                    builder.push(letter.range.start.line, letter.range.start.character, letter.range.end.character - letter.range.start.character, this.getTokenType('decorator'), this.getModifier('documentation'));
                }
            }
        }
        // Handle fusion recursively
        if (glyph.fusion) {
            this.tokenizeNABCGlyph(glyph.fusion, builder);
        }
    }
    getTokenType(type) {
        const index = exports.tokenTypes.indexOf(type);
        return index !== -1 ? index : 0;
    }
    getModifier(...modifiers) {
        let result = 0;
        for (const modifier of modifiers) {
            const index = exports.tokenModifiers.indexOf(modifier);
            if (index !== -1) {
                result |= (1 << index);
            }
        }
        return result;
    }
}
exports.GabcSemanticTokensProvider = GabcSemanticTokensProvider;
//# sourceMappingURL=semanticTokensProvider.js.map