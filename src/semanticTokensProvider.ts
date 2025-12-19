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
    const text = this.parser?.['text'] || '';
    const lines = text.split('\n');
    const noteText = lines[range.start.line]?.substring(range.start.character, range.end.character) || '';
    
    let pos = 0;
    
    // 1. Tokenize pitch [a-npA-NP] as parameter (maps to variable.name via semanticTokenScopes)
    if (pos < noteText.length && /[a-npA-NP]/.test(noteText[pos])) {
      builder.push(
        range.start.line,
        range.start.character + pos,
        1,
        this.getTokenType('parameter'),
        0
      );
      pos++;
    }
    
    // 2. Tokenize note shape specifiers as class (maps to storage.type via semanticTokenScopes)
    while (pos < noteText.length) {
      const char = noteText[pos];
      
      // Note shape specifiers: w (virga), v (virga reversa), o (oriscus), 
      // q (quilisma), s (stropha), r (cavum), = (linea), ~ (liquescent), < (augmentive), > (diminutive)
      if (/[wvosqr=~<>]/.test(char)) {
        builder.push(
          range.start.line,
          range.start.character + pos,
          1,
          this.getTokenType('class'),
          0
        );
        pos++;
      }
      // Alterations: x/X (flat/soft flat), y/Y (natural/soft natural), #/## (sharp/soft sharp)
      // With optional ? for parenthesized versions: x?, y?, #?, X?, Y?, ##?
      else if (/[xyXY#]/.test(char)) {
        let alterationLength = 1;
        
        // Check for double sharp (##)
        if (char === '#' && pos + 1 < noteText.length && noteText[pos + 1] === '#') {
          alterationLength = 2;
          // Check for ##?
          if (pos + 2 < noteText.length && noteText[pos + 2] === '?') {
            alterationLength = 3;
          }
        } else {
          // Check for single character alteration with ? (x?, y?, #?, X?, Y?)
          if (pos + 1 < noteText.length && noteText[pos + 1] === '?') {
            alterationLength = 2;
          }
        }
        
        builder.push(
          range.start.line,
          range.start.character + pos,
          alterationLength,
          this.getTokenType('macro'),
          0
        );
        pos += alterationLength;
      }
      // Punctum inclinatum
      else if (char === 'G' || char === 'O') {
        builder.push(
          range.start.line,
          range.start.character + pos,
          1,
          this.getTokenType('class'),
          0
        );
        pos++;
      }
      // Other modifiers continue with default handling
      else {
        pos++;
      }
    }
  }
  
  private tokenizeAttribute(attr: GabcAttribute, builder: vscode.SemanticTokensBuilder): void {
    const range = attr.range;
    const text = this.parser?.['text'] || '';
    const lines = text.split('\n');
    const attrText = lines[range.start.line]?.substring(range.start.character, range.end.character) || '';
    
    // Parse attribute text to find positions
    // Format: [name:value] or [name]
    if (!attrText.startsWith('[')) {
      return;
    }
    
    // Skip opening bracket
    let pos = 1;
    
    // Find attribute name
    const nameStart = pos;
    while (pos < attrText.length && attrText[pos] !== ':' && attrText[pos] !== ']') {
      pos++;
    }
    const nameLength = pos - nameStart;
    
    // Highlight attribute name (entity.other.attribute-name style)
    builder.push(
      range.start.line,
      range.start.character + nameStart,
      nameLength,
      this.getTokenType('property'),
      0
    );
    
    // Highlight colon if present
    if (pos < attrText.length && attrText[pos] === ':') {
      builder.push(
        range.start.line,
        range.start.character + pos,
        1,
        this.getTokenType('operator'),
        0
      );
      pos++; // Skip colon
      
      // Find attribute value
      const valueStart = pos;
      while (pos < attrText.length && attrText[pos] !== ']') {
        pos++;
      }
      const valueLength = pos - valueStart;
      
      if (valueLength > 0) {
        // Highlight attribute value (string.quoted style)
        builder.push(
          range.start.line,
          range.start.character + valueStart,
          valueLength,
          this.getTokenType('string'),
          0
        );
      }
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
        builder.push(
          range.start.line,
          range.start.character + pos,
          2,
          this.getTokenType('class'),
          this.getModifier('readonly')
        );
        pos += 2;
        
        // Modifier letter (t, n, z, etc.) - highlight as string (valor de atributo)
        if (pos < glyphText.length && /[a-z]/.test(glyphText[pos])) {
          builder.push(
            range.start.line,
            range.start.character + pos,
            1,
            this.getTokenType('string'),
            0
          );
          pos++;
        }
        
        // Numeric value - highlight as number
        while (pos < glyphText.length && /[0-9]/.test(glyphText[pos])) {
          const numStart = pos;
          while (pos < glyphText.length && /[0-9]/.test(glyphText[pos])) {
            pos++;
          }
          builder.push(
            range.start.line,
            range.start.character + numStart,
            pos - numStart,
            this.getTokenType('number'),
            0
          );
        }
      }
    } else if (glyph.basicGlyph) {
      // 2. Tokenize basic glyph (2 letters) - highlight as keyword
      const basicGlyphText = glyphText.substring(pos, pos + 2);
      if (basicGlyphText.length === 2) {
        builder.push(
          range.start.line,
          range.start.character + pos,
          2,
          this.getTokenType('keyword'),
          this.getModifier('readonly')
        );
        pos += 2;
      }
      
      // 3. Tokenize modifiers (S, G, M, -, >, ~, variant numbers)
      while (pos < glyphText.length) {
        const char = glyphText[pos];
        
        if (/[SGM\->~]/.test(char)) {
          // Modifier character - highlight as operator
          builder.push(
            range.start.line,
            range.start.character + pos,
            1,
            this.getTokenType('operator'),
            0
          );
          pos++;
        } else if (/[1-9]/.test(char)) {
          // Variant number - highlight as number
          builder.push(
            range.start.line,
            range.start.character + pos,
            1,
            this.getTokenType('number'),
            0
          );
          pos++;
        } else if (char === 'h') {
          // 4. Pitch descriptor starts with 'h'
          break;
        } else if (char === 'l') {
          // 5. Significant letters start with 'l'
          break;
        } else {
          // Unknown character, skip
          pos++;
        }
      }
      
      // 4. Tokenize pitch descriptor (h + pitch letter)
      if (pos < glyphText.length && glyphText[pos] === 'h') {
        // 'h' - highlight as function (nome de função)
        builder.push(
          range.start.line,
          range.start.character + pos,
          1,
          this.getTokenType('function'),
          0
        );
        pos++;
        
        // Pitch letter (a-n or p) - highlight as parameter (maps to variable.name via semanticTokenScopes)
        if (pos < glyphText.length && /[a-np]/.test(glyphText[pos])) {
          builder.push(
            range.start.line,
            range.start.character + pos,
            1,
            this.getTokenType('parameter'),
            0
          );
          pos++;
        }
      }
    }
    
    // 5. Highlight significant letters if present
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
