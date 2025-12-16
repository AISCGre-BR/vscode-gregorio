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
    // Check if semantic highlighting is enabled
    const config = vscode.workspace.getConfiguration('gregorio.highlighting');
    if (!config.get<boolean>('semantic', true)) {
      return null;
    }
    
    const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
    
    try {
      // Parse the document
      const text = document.getText();
      this.parser = new GabcParser(text);
      const parsed = this.parser.parse();
      
      // Tokenize headers
      this.tokenizeHeaders(parsed, tokensBuilder);
      
      // Tokenize comments
      this.tokenizeComments(parsed, tokensBuilder);
      
      // Tokenize notation
      this.tokenizeNotation(parsed, tokensBuilder);
      
    } catch (error) {
      // Silently fail - TextMate grammar will provide fallback highlighting
      console.error('Semantic tokens provider error:', error);
    }
    
    return tokensBuilder.build();
  }
  
  private tokenizeHeaders(parsed: ParsedDocument, builder: vscode.SemanticTokensBuilder): void {
    // Note: We need to re-parse to get exact header positions
    // The current parser doesn't preserve all header ranges
    const text = this.parser?.['text'] || '';
    const lines = text.split('\n');
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      
      // Check for header separator
      if (line.trim() === '%%') {
        builder.push(lineIdx, 0, 2, this.getTokenType('operator'), 0);
        break; // No more headers after separator
      }
      
      // Match header pattern: name: value;
      const headerMatch = line.match(/^([a-zA-Z0-9-]+):\s*(.+?)(;{1,2})?$/);
      if (headerMatch) {
        const name = headerMatch[1];
        const nameStart = line.indexOf(name);
        
        // Highlight header name
        builder.push(lineIdx, nameStart, name.length, this.getTokenType('property'), this.getModifier('readonly'));
        
        // Highlight colon
        builder.push(lineIdx, nameStart + name.length, 1, this.getTokenType('operator'), 0);
        
        // Highlight value
        if (headerMatch[2]) {
          const value = headerMatch[2].trim();
          const valueStart = line.indexOf(value, nameStart + name.length);
          if (valueStart !== -1) {
            builder.push(lineIdx, valueStart, value.length, this.getTokenType('string'), 0);
          }
        }
        
        // Highlight semicolon
        if (headerMatch[3]) {
          const semicolonStart = line.indexOf(headerMatch[3], nameStart + name.length);
          if (semicolonStart !== -1) {
            builder.push(lineIdx, semicolonStart, headerMatch[3].length, this.getTokenType('operator'), 0);
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
    for (const syllable of parsed.notation.syllables) {
      this.tokenizeSyllable(syllable, builder);
    }
  }
  
  private tokenizeSyllable(syllable: Syllable, builder: vscode.SemanticTokensBuilder): void {
    // Tokenize clef if present
    if (syllable.clef) {
      this.tokenizeClef(syllable.clef, builder);
    }
    
    // Tokenize syllable text (if we have range information)
    // Note: Current parser doesn't preserve exact syllable text positions
    // This would need parser enhancement
    
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
