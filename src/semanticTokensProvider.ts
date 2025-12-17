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
  GabcAttribute,
  NoteShape,
  ModifierType
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
    // Use parsed structure when available
    for (const syllable of parsed.notation.syllables) {
      this.tokenizeSyllable(syllable, builder);
    }
    
    // Additionally, do a regex-based pass for notation elements
    // This catches things the parser might not have precise positions for
    this.tokenizeNotationWithRegex(builder);
  }
  
  private tokenizeNotationWithRegex(builder: vscode.SemanticTokensBuilder): void {
    const text = this.parser?.['text'] || '';
    const lines = text.split('\n');
    
    let inNotation = false;
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      
      // Check if we've passed the header separator
      if (line.trim() === '%%') {
        inNotation = true;
        continue;
      }
      
      if (!inNotation) {
        continue;
      }
      
      // Skip comments
      if (line.trim().startsWith('%')) {
        continue;
      }
      
      // Find clefs: c1-c4, f1-f4, cb1-cb4, fb1-fb4
      const clefRegex = /\b([cf]b?)([1-4])\b/g;
      let match;
      while ((match = clefRegex.exec(line)) !== null) {
        const start = match.index;
        const length = match[0].length;
        builder.push(lineIdx, start, length, this.getTokenType('keyword'), this.getModifier('readonly'));
      }
      
      // Find bars and divisions
      const barRegex = /(::|:|;|,|`)/g;
      while ((match = barRegex.exec(line)) !== null) {
        const start = match.index;
        const length = match[0].length;
        builder.push(lineIdx, start, length, this.getTokenType('operator'), 0);
      }
      
      // Find note groups in parentheses
      const noteGroupRegex = /\(([^)]+)\)/g;
      while ((match = noteGroupRegex.exec(line)) !== null) {
        const content = match[1];
        const groupStart = match.index;
        
        // Highlight parentheses
        builder.push(lineIdx, groupStart, 1, this.getTokenType('operator'), 0);
        builder.push(lineIdx, groupStart + match[0].length - 1, 1, this.getTokenType('operator'), 0);
        
        // Parse the content for notes
        this.tokenizeNoteGroupContent(content, lineIdx, groupStart + 1, builder);
      }
    }
  }
  
  private tokenizeNoteGroupContent(content: string, line: number, startChar: number, builder: vscode.SemanticTokensBuilder): void {
    // Tokenize individual notes and elements within the group
    // Stop at NABC separator (|) - NABC content is handled by TextMate grammar
    const nabcSeparator = content.indexOf('|');
    const gabcContent = nabcSeparator >= 0 ? content.substring(0, nabcSeparator) : content;
    
    let pos = 0;
    
    while (pos < gabcContent.length) {
      const char = gabcContent[pos];
      
      // Note pitches (a-m)
      if (/[a-m]/.test(char)) {
        let tokenType = this.getTokenType('variable');
        
        // Check for special note shapes
        // Look ahead for modifiers
        let nextIdx = pos + 1;
        let isSpecial = false;
        
        // Virga: note followed by v
        if (nextIdx < gabcContent.length && gabcContent[nextIdx] === 'v') {
          tokenType = this.getTokenType('class');
          isSpecial = true;
        }
        // Quilisma: note followed by w
        else if (nextIdx < gabcContent.length && gabcContent[nextIdx] === 'w') {
          tokenType = this.getTokenType('decorator');
          isSpecial = true;
        }
        // Oriscus: note followed by o
        else if (nextIdx < gabcContent.length && gabcContent[nextIdx] === 'o') {
          tokenType = this.getTokenType('decorator');
          isSpecial = true;
        }
        // Stropha: note followed by s
        else if (nextIdx < gabcContent.length && gabcContent[nextIdx] === 's') {
          tokenType = this.getTokenType('macro');
          isSpecial = true;
        }
        
        // Highlight the note
        builder.push(line, startChar + pos, 1, tokenType, 0);
        
        // Highlight the shape modifier if present
        if (isSpecial) {
          builder.push(line, startChar + nextIdx, 1, this.getTokenType('modifier'), 0);
          pos = nextIdx;
        }
      }
      // Accidentals
      else if (char === 'x' || char === '#' || char === 'y') {
        builder.push(line, startChar + pos, 1, this.getTokenType('keyword'), 0);
      }
      // Liquescent modifier
      else if (char === '~') {
        builder.push(line, startChar + pos, 1, this.getTokenType('type'), 0);
      }
      // Other modifiers
      else if (/[._'`-]/.test(char)) {
        builder.push(line, startChar + pos, 1, this.getTokenType('modifier'), 0);
      }
      // Space or special chars
      else if (char === ' ' || char === '/' || char === '!') {
        builder.push(line, startChar + pos, 1, this.getTokenType('operator'), 0);
      }
      // Custos
      else if (char === 'z' || char === '+') {
        builder.push(line, startChar + pos, 1, this.getTokenType('parameter'), 0);
      }
      // Attributes in brackets
      else if (char === '[' || char === ']') {
        builder.push(line, startChar + pos, 1, this.getTokenType('parameter'), 0);
      }
      
      pos++;
    }
    
    // Highlight NABC separator if present
    // The NABC content itself is handled by TextMate grammar for better accuracy
    if (nabcSeparator >= 0) {
      builder.push(line, startChar + nabcSeparator, 1, this.getTokenType('operator'), 0);
    }
  }
  
  private tokenizeSyllable(syllable: Syllable, builder: vscode.SemanticTokensBuilder): void {
    const range = syllable.range;
    
    // Tokenize clef if present
    if (syllable.clef) {
      this.tokenizeClef(syllable.clef, builder);
    }
    
    // Tokenize syllable text if we have the text
    // The syllable text appears before the parentheses
    if (syllable.text && range) {
      // Syllable text is before the notes, so we need to find it
      // This is approximate but works for most cases
      const line = range.start.line;
      const char = range.start.character;
      
      // Tokenize as regular text (use namespace for syllable text to make it distinctive)
      if (syllable.text.length > 0) {
        builder.push(line, char, syllable.text.length, this.getTokenType('namespace'), 0);
      }
    }
    
    // Tokenize note groups
    for (const noteGroup of syllable.notes) {
      this.tokenizeNoteGroup(noteGroup, builder);
    }
    
    // Tokenize bar if present
    if (syllable.bar) {
      this.tokenizeBar(syllable.bar, builder);
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
    // Tokenize each note in the group
    for (const note of noteGroup.notes) {
      this.tokenizeNote(note, builder);
    }
    
    // Tokenize NABC if present
    if (noteGroup.nabc && noteGroup.nabc.length > 0) {
      // NABC is highlighted as a namespace/special construct
      const range = noteGroup.range;
      // This is approximate - would need better range tracking
    }
    
    // Tokenize attributes
    if (noteGroup.attributes) {
      for (const attr of noteGroup.attributes) {
        this.tokenizeAttribute(attr, builder);
      }
    }
    
    // Tokenize custos
    if (noteGroup.custos) {
      const range = noteGroup.custos.range;
      builder.push(
        range.start.line,
        range.start.character,
        range.end.character - range.start.character,
        this.getTokenType('parameter'),
        0
      );
    }
  }
  
  private tokenizeNote(note: Note, builder: vscode.SemanticTokensBuilder): void {
    const range = note.range;
    
    // Determine token type based on note shape
    let tokenType = this.getTokenType('variable');
    let modifier = 0;
    
    switch (note.shape) {
      case NoteShape.Virga:
      case NoteShape.VirgaReversa:
        tokenType = this.getTokenType('class');
        break;
      case NoteShape.Quilisma:
      case NoteShape.Oriscus:
        tokenType = this.getTokenType('decorator');
        break;
      case NoteShape.Stropha:
        tokenType = this.getTokenType('macro');
        break;
      case NoteShape.Liquescent:
        tokenType = this.getTokenType('type');
        modifier = this.getModifier('abstract');
        break;
      case NoteShape.Cavum:
        tokenType = this.getTokenType('customLiteral');
        break;
      case NoteShape.Flat:
      case NoteShape.Sharp:
      case NoteShape.Natural:
        tokenType = this.getTokenType('keyword');
        modifier = this.getModifier('readonly');
        break;
    }
    
    // Highlight the note pitch
    builder.push(
      range.start.line,
      range.start.character,
      1, // Single character for pitch
      tokenType,
      modifier
    );
    
    // Tokenize modifiers
    for (const mod of note.modifiers) {
      // Modifiers are typically single characters following the pitch
      // We'd need better position tracking for accurate highlighting
      const modTokenType = this.getTokenType('modifier');
      // This is approximate
    }
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
