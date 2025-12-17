/**
 * Semantic Tokens Provider for GABC
 * Provides advanced syntax highlighting using the gregorio-lsp parser
 */

import * as vscode from 'vscode';
import { GabcParser } from '../lsp-server/parser/gabc-parser';
import {
  ParsedDocument,
  Syllable,
  NoteGroup,
  Note,
  Bar,
  Clef,
  Custos,
  GabcAttribute,
  NoteShape,
  ModifierType,
  NABCGlyphDescriptor,
  NABCBasicGlyph,
  NABCGlyphModifier
} from '../lsp-server/parser/types';

// Define semantic token types
export const tokenTypes = [
  'header',        // 0
  'keyword',       // 1
  'string',        // 2
  'comment',       // 3
  'number',        // 4
  'operator',      // 5
  'parameter',     // 6
  'property',      // 7
  'variable',      // 8
  'function',      // 9
  'class',         // 10
  'namespace',     // 11
  'type',          // 12
  'decorator',     // 13
  'macro',         // 14
  'regexp',        // 15
  'label',         // 16
  'modifier',      // 17
  'customLiteral'  // 18
];

// Define semantic token modifiers
export const tokenModifiers = [
  'declaration',    // 0
  'definition',     // 1
  'readonly',       // 2
  'static',         // 3
  'deprecated',     // 4
  'abstract',       // 5
  'async',          // 6
  'modification',   // 7
  'documentation',  // 8
  'defaultLibrary'  // 9
];

export const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

export class GabcSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  private parser: GabcParser | null = null;
  
  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    console.log('[Gregorio] Semantic tokens provider called for:', document.uri.toString());
    
    // Check if semantic highlighting is enabled
    const config = vscode.workspace.getConfiguration('gregorio.highlighting');
    const enabled = config.get<boolean>('semantic', true);
    console.log('[Gregorio] Semantic highlighting enabled:', enabled);
    
    if (!enabled) {
      return null;
    }
    
    const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
    
    try {
      // Parse the document
      const text = document.getText();
      console.log('[Gregorio] Parsing document, length:', text.length);
      
      this.parser = new GabcParser(text);
      const parsed = this.parser.parse();
      
      console.log('[Gregorio] Parse complete. Headers:', parsed.headers.size, 
                  'Syllables:', parsed.notation.syllables.length,
                  'Errors:', parsed.errors.length);
      
      // Tokenize headers
      this.tokenizeHeaders(parsed, tokensBuilder);
      
      // Tokenize comments
      this.tokenizeComments(parsed, tokensBuilder);
      
      // Tokenize notation
      this.tokenizeNotation(parsed, tokensBuilder);
      
      const tokens = tokensBuilder.build();
      console.log('[Gregorio] Built tokens, data length:', tokens.data.length);
      
      return tokens;
      
    } catch (error) {
      console.error('[Gregorio] Semantic tokens provider error:', error);
      return tokensBuilder.build(); // Return empty tokens instead of null
    }
  }
  
  private tokenizeHeaders(parsed: ParsedDocument, builder: vscode.SemanticTokensBuilder): void {
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
          builder.push(lineIdx, nameStart, currentHeaderName.length, 
                      this.getTokenType('property'), this.getModifier('readonly'));
          
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
            const semicolonStart = colonIndex + 1 + semicolonMatch.index!;
            builder.push(lineIdx, semicolonStart, semicolonMatch[0].length, this.getTokenType('operator'), 0);
            
            currentHeaderName = '';
          } else {
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
      } else if (currentHeaderName !== '') {
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
        } else {
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
  
  private tokenizeComments(parsed: ParsedDocument, builder: vscode.SemanticTokensBuilder): void {
    for (const comment of parsed.comments) {
      const range = comment.range;
      builder.push(
        range.start.line,
        range.start.character,
        range.end.character - range.start.character,
        this.getTokenType('comment'),
        this.getModifier('documentation')
      );
    }
  }
  
  private tokenizeNotation(parsed: ParsedDocument, builder: vscode.SemanticTokensBuilder): void {
    // Use parsed structure for accurate tokenization
    for (const syllable of parsed.notation.syllables) {
      this.tokenizeSyllable(syllable, builder);
    }
  }
  
  private tokenizeSyllable(syllable: Syllable, builder: vscode.SemanticTokensBuilder): void {
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
  
  private tokenizeClef(clef: Clef, builder: vscode.SemanticTokensBuilder): void {
    const range = clef.range;
    // Highlight clef as a keyword
    builder.push(
      range.start.line,
      range.start.character,
      range.end.character - range.start.character,
      this.getTokenType('keyword'),
      this.getModifier('readonly')
    );
  }
  
  private tokenizeBar(bar: Bar, builder: vscode.SemanticTokensBuilder): void {
    const range = bar.range;
    // Highlight bar as an operator
    builder.push(
      range.start.line,
      range.start.character,
      range.end.character - range.start.character,
      this.getTokenType('operator'),
      0
    );
  }
  
  private tokenizeNoteGroup(noteGroup: NoteGroup, builder: vscode.SemanticTokensBuilder): void {
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
  
  private tokenizeNote(note: Note, builder: vscode.SemanticTokensBuilder): void {
    const range = note.range;
    
    // Determine token type based on note shape
    // Following tree-sitter-gregorio conventions:
    // - Basic pitches: constant.builtin
    // - Special shapes (virga, quilisma, oriscus, stropha): type
    // - Alterations (flat, sharp, natural): operator
    let tokenType = this.getTokenType('variable'); // Default for basic pitch
    let modifier = 0;
    
    switch (note.shape) {
      case NoteShape.Virga:
      case NoteShape.VirgaReversa:
        // Virga shapes - highlight as type (like tree-sitter @type)
        tokenType = this.getTokenType('type');
        break;
      case NoteShape.Quilisma:
      case NoteShape.Oriscus:
        // Special neume shapes - highlight as type (like tree-sitter @type)
        tokenType = this.getTokenType('type');
        break;
      case NoteShape.Stropha:
        // Stropha - highlight as type (like tree-sitter @type)
        tokenType = this.getTokenType('type');
        break;
      case NoteShape.Liquescent:
        // Liquescence - highlight as type with abstract modifier
        tokenType = this.getTokenType('type');
        modifier = this.getModifier('abstract');
        break;
      case NoteShape.Cavum:
      case NoteShape.Linea:
        // Cavum/Linea - highlight as type
        tokenType = this.getTokenType('type');
        break;
      case NoteShape.Flat:
      case NoteShape.Sharp:
      case NoteShape.Natural:
        // Alterations - highlight as operator (like tree-sitter @operator)
        tokenType = this.getTokenType('operator');
        break;
      case NoteShape.Punctum:
      case NoteShape.PunctumInclinatum:
      default:
        // Basic punctum - highlight pitch as variable
        tokenType = this.getTokenType('variable');
        break;
    }
    
    // Highlight the entire note (pitch + modifiers)
    const length = range.end.character - range.start.character;
    builder.push(
      range.start.line,
      range.start.character,
      length,
      tokenType,
      modifier
    );
  }
  
  private tokenizeAttribute(attr: GabcAttribute, builder: vscode.SemanticTokensBuilder): void {
    const range = attr.range;
    
    // Highlight attribute name
    builder.push(
      range.start.line,
      range.start.character,
      attr.name.length,
      this.getTokenType('parameter'),
      this.getModifier('readonly')
    );
    
    // Highlight attribute value if present
    if (attr.value) {
      // Value position would need to be calculated
      // This requires parser enhancement
    }
  }
  
  private tokenizeCustos(custos: Custos, builder: vscode.SemanticTokensBuilder): void {
    const range = custos.range;
    
    // Highlight custos as keyword.directive (like tree-sitter)
    builder.push(
      range.start.line,
      range.start.character,
      range.end.character - range.start.character,
      this.getTokenType('keyword'),
      this.getModifier('readonly')
    );
  }
  
  private tokenizeNABCGlyph(glyph: NABCGlyphDescriptor, builder: vscode.SemanticTokensBuilder): void {
    if (!glyph.range) {
      return;
    }
    
    const range = glyph.range;
    
    // Determine token type based on glyph type
    let tokenType = this.getTokenType('class');
    
    // Basic glyphs are highlighted as constants (like tree-sitter)
    if (glyph.basicGlyph) {
      tokenType = this.getTokenType('class');
    }
    
    // Subpunctis/Prepunctis are highlighted as keywords
    if (glyph.subpunctis || glyph.prepunctis) {
      tokenType = this.getTokenType('keyword');
    }
    
    // Highlight the entire glyph descriptor
    builder.push(
      range.start.line,
      range.start.character,
      range.end.character - range.start.character,
      tokenType,
      this.getModifier('readonly')
    );
    
    // Highlight modifiers if we have their positions
    // This would require more detailed position tracking in the parser
    
    // Highlight significant letters if present
    if (glyph.significantLetters && glyph.significantLetters.length > 0) {
      for (const letter of glyph.significantLetters) {
        if (letter.range) {
          // Significant letters are performance indications - use decorator
          builder.push(
            letter.range.start.line,
            letter.range.start.character,
            letter.range.end.character - letter.range.start.character,
            this.getTokenType('decorator'),
            this.getModifier('documentation')
          );
        }
      }
    }
    
    // Handle fusion recursively
    if (glyph.fusion) {
      this.tokenizeNABCGlyph(glyph.fusion, builder);
    }
  }
  
  private getTokenType(type: string): number {
    const index = tokenTypes.indexOf(type);
    return index !== -1 ? index : 0;
  }
  
  private getModifier(...modifiers: string[]): number {
    let result = 0;
    for (const modifier of modifiers) {
      const index = tokenModifiers.indexOf(modifier);
      if (index !== -1) {
        result |= (1 << index);
      }
    }
    return result;
  }
}
