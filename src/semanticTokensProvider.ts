/**
 * Semantic Tokens Provider for GABC
 * Provides advanced syntax highlighting using the gregorio-lsp parser
 */

import * as vscode from 'vscode';
import { GabcParser } from '../lsp-server/parser/gabc-parser';
import { parseNABCSnippet } from '../lsp-server/parser/nabc-parser';
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
      this.tokenizeNotation(parsed, tokensBuilder, document);
      
      const tokens = tokensBuilder.build();
      console.log('[Gregorio] Built tokens, data length:', tokens.data.length);
      
      return tokens;
      
    } catch (error) {
      console.error('[Gregorio] Semantic tokens provider error:', error);
      return tokensBuilder.build(); // Return empty tokens instead of null
    }
  }
  
  /**
   * Determine the token type for a header value based on the header name
   */
  private getHeaderValueTokenType(headerName: string): string {
    // Numeric headers
    if (headerName === 'mode' || headerName === 'staff-lines' || headerName === 'nabc-lines') {
      return 'number';
    }
    
    // Headers that don't use special highlighting (plain string)
    return 'string';
  }
  
  /**
   * Check if a header accepts LaTeX/TeX code
   */
  private isTexHeader(headerName: string): boolean {
    return headerName === 'annotation' || 
           headerName === 'mode-modifier' || 
           headerName === 'mode-differentia' ||
           /^def-m[0-9]$/.test(headerName);
  }
  
  /**
   * Tokenize LaTeX content within a header value
   */
  private tokenizeHeaderLatex(valueText: string, lineIdx: number, startOffset: number, builder: vscode.SemanticTokensBuilder): void {
    let pos = 0;
    while (pos < valueText.length) {
      const char = valueText[pos];
      
      // LaTeX command (e.g., \textbf, \textit, etc.)
      if (char === '\\') {
        const commandMatch = valueText.substring(pos).match(/^\\[a-zA-Z]+/);
        if (commandMatch) {
          const commandLength = commandMatch[0].length;
          builder.push(lineIdx, startOffset + pos, commandLength, this.getTokenType('function'), 0);
          pos += commandLength;
          continue;
        }
      }
      
      // LaTeX braces
      if (char === '{' || char === '}') {
        builder.push(lineIdx, startOffset + pos, 1, this.getTokenType('operator'), 0);
        pos++;
        continue;
      }
      
      pos++;
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
                // Apply appropriate token type based on header name
                if (this.isTexHeader(currentHeaderName)) {
                  // For TeX headers, tokenize LaTeX content
                  this.tokenizeHeaderLatex(valueText, lineIdx, valueStart, builder);
                } else {
                  // For numeric or generic headers, use appropriate type
                  const tokenType = this.getHeaderValueTokenType(currentHeaderName);
                  builder.push(lineIdx, valueStart, valueText.length, this.getTokenType(tokenType), 0);
                }
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
                // Apply appropriate token type
                if (this.isTexHeader(currentHeaderName)) {
                  this.tokenizeHeaderLatex(valueText, lineIdx, valueStart, builder);
                } else {
                  const tokenType = this.getHeaderValueTokenType(currentHeaderName);
                  builder.push(lineIdx, valueStart, valueText.length, this.getTokenType(tokenType), 0);
                }
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
              // Apply appropriate token type
              if (this.isTexHeader(currentHeaderName)) {
                this.tokenizeHeaderLatex(valueText, lineIdx, valueStart, builder);
              } else {
                const tokenType = this.getHeaderValueTokenType(currentHeaderName);
                builder.push(lineIdx, valueStart, valueText.length, this.getTokenType(tokenType), 0);
              }
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
              // Apply appropriate token type
              if (this.isTexHeader(currentHeaderName)) {
                this.tokenizeHeaderLatex(valueText, lineIdx, valueStart, builder);
              } else {
                const tokenType = this.getHeaderValueTokenType(currentHeaderName);
                builder.push(lineIdx, valueStart, valueText.length, this.getTokenType(tokenType), 0);
              }
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
  
  private tokenizeNotation(parsed: ParsedDocument, builder: vscode.SemanticTokensBuilder, document: vscode.TextDocument): void {
    // Use parsed structure for accurate tokenization
    for (const syllable of parsed.notation.syllables) {
      this.tokenizeSyllable(syllable, builder, document);
    }
  }
  
  private tokenizeSyllable(syllable: Syllable, builder: vscode.SemanticTokensBuilder, document: vscode.TextDocument): void {
    // Tokenize clef if present
    if (syllable.clef) {
      this.tokenizeClef(syllable.clef, builder, document);
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
  
  private tokenizeClef(clef: Clef, builder: vscode.SemanticTokensBuilder, document: vscode.TextDocument): void {
    // Note: Clef linking is now handled in tokenizeGabcString
    // This method handles simple clefs parsed by the parser
    const range = clef.range;
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
    // Highlight bar as a keyword (separation bars are structural elements)
    builder.push(
      range.start.line,
      range.start.character,
      range.end.character - range.start.character,
      this.getTokenType('keyword'),
      0
    );
  }
  
  private tokenizeNoteGroup(noteGroup: NoteGroup, builder: vscode.SemanticTokensBuilder): void {
    // Tokenize the entire note group (gabc) which includes all notes and extra symbols
    const range = noteGroup.range;
    const text = this.parser?.['text'] || '';
    const lines = text.split('\n');
    const gabcText = lines[range.start.line]?.substring(range.start.character, range.end.character) || '';
    
    // Tokenize the gabc string character by character
    this.tokenizeGabcString(gabcText, range, builder);
    
    // Tokenize NABC if present (detect pipe character)
    const pipeIndex = gabcText.indexOf('|');
    if (pipeIndex !== -1) {
      // NABC content starts after the pipe
      const nabcText = gabcText.substring(pipeIndex + 1);
      const nabcStartChar = range.start.character + pipeIndex + 1;
      this.tokenizeNABCContent(nabcText, range.start.line, nabcStartChar, builder);
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
  
  private tokenizeGabcString(gabcText: string, range: any, builder: vscode.SemanticTokensBuilder): void {
    let pos = 0;
    
    // Main tokenization loop
    while (pos < gabcText.length) {
      const char = gabcText[pos];
      const tokenStart = pos;
      
      // Skip NABC content (after pipe)
      if (char === '|') {
        pos = gabcText.length;
        continue;
      }
      
      // Check for clef at beginning or after whitespace (but not in middle of notes)
      // Pattern: (c|f)(b)?[1-4](@(c|f)(b)?[1-4])?
      // This detects both simple clef (c4) and clef linking (c2@c4)
      const clefPattern = /^([cf])(b)?([1-4])(@([cf])(b)?([1-4]))?/;
      const remaining = gabcText.substring(pos);
      const clefMatch = remaining.match(clefPattern);
      
      if (clefMatch && (pos === 0 || /[\s(]/.test(gabcText[pos - 1] || ''))) {
        // Found a clef (with or without linking)
        if (clefMatch[4]) {
          // Clef linking detected (e.g., c2@c4)
          const firstClefLength = clefMatch[1].length + (clefMatch[2]?.length || 0) + clefMatch[3].length;
          const atPos = pos + firstClefLength;
          const secondClefLength = clefMatch[5].length + (clefMatch[6]?.length || 0) + clefMatch[7].length;
          
          // Tokenize first clef
          builder.push(
            range.start.line,
            range.start.character + pos,
            firstClefLength,
            this.getTokenType('keyword'),
            this.getModifier('readonly')
          );
          
          // Tokenize @ as operator
          builder.push(
            range.start.line,
            range.start.character + atPos,
            1,
            this.getTokenType('operator'),
            0
          );
          
          // Tokenize second clef
          builder.push(
            range.start.line,
            range.start.character + atPos + 1,
            secondClefLength,
            this.getTokenType('keyword'),
            this.getModifier('readonly')
          );
          
          pos += clefMatch[0].length;
        } else {
          // Simple clef (e.g., c4)
          builder.push(
            range.start.line,
            range.start.character + pos,
            clefMatch[0].length,
            this.getTokenType('keyword'),
            this.getModifier('readonly')
          );
          
          pos += clefMatch[0].length;
        }
        continue;
      }
      
      // Check for @[...] fusion before checking for attributes
      // This needs to be before the attribute check to prevent skipping the content
      if (char === '@' && pos + 1 < gabcText.length && gabcText[pos + 1] === '[') {
        // Tokenize only the @ as function
        builder.push(
          range.start.line,
          range.start.character + pos,
          1,
          this.getTokenType('function'),
          0
        );
        pos++; // Move past @, now at [
        
        // Find closing bracket
        const closingBracket = gabcText.indexOf(']', pos);
        if (closingBracket !== -1) {
          pos++; // Move past [
          
          // Tokenize pitches inside [...] normally
          while (pos < closingBracket) {
            const innerChar = gabcText[pos];
            
            // Skip whitespace
            if (/\s/.test(innerChar)) {
              pos++;
              continue;
            }
            
            // Process pitch with alterations and shapes
            if (/[a-npA-NP]/.test(innerChar)) {
              const isUpperCase = /[A-NP]/.test(innerChar);
              let tokenLength = 1;
              let hasAlteration = false;
              let hasShape = false;
              const pitchStart = pos;
              pos++;
              
              // Include leaning indicator after uppercase pitch
              if (isUpperCase && pos < closingBracket && /[012]/.test(gabcText[pos])) {
                tokenLength++;
                pos++;
              }
              
              // Include alterations
              const alterationStart = pos;
              while (pos < closingBracket && /[xyXY#?]/.test(gabcText[pos])) {
                tokenLength++;
                pos++;
              }
              if (pos > alterationStart) {
                hasAlteration = true;
              }
              
              // Include note shapes
              const shapeStart = pos;
              while (pos < closingBracket && /[wvosqr=~<>O]/.test(gabcText[pos])) {
                tokenLength++;
                pos++;
                
                // Include oriscus orientation or r0
                if (pos < closingBracket && /[01]/.test(gabcText[pos])) {
                  const prevChar = gabcText[pos - 1];
                  if (prevChar === 'o' || prevChar === 'O' || prevChar === 'r') {
                    tokenLength++;
                    pos++;
                  }
                }
              }
              if (pos > shapeStart) {
                hasShape = true;
              }
              
              // Determine token type based on content
              let tokenType: string;
              if (hasAlteration) {
                tokenType = 'macro';
              } else if (hasShape) {
                tokenType = 'parameter';
              } else {
                tokenType = 'class';
              }
              
              builder.push(
                range.start.line,
                range.start.character + pitchStart,
                tokenLength,
                this.getTokenType(tokenType),
                0
              );
            } else {
              // Skip any other character
              pos++;
            }
          }
          
          // Move past ]
          pos = closingBracket + 1;
        } else {
          // No closing bracket found, just move past @
          pos++;
        }
        continue;
      }
      
      // Skip attributes
      if (char === '[') {
        const closingBracket = gabcText.indexOf(']', pos);
        if (closingBracket !== -1) {
          pos = closingBracket + 1;
          continue;
        }
      }
      
      // Initio debilis with pitch: -[pitch][alterations][shapes]
      if (char === '-' && pos + 1 < gabcText.length && /[a-npA-NP]/.test(gabcText[pos + 1])) {
        let tokenLength = 1; // Start with the '-'
        pos++; // Move past '-'
        
        // Include pitch
        const isUpperCase = /[A-NP]/.test(gabcText[pos]);
        tokenLength++;
        pos++;
        
        // Include leaning indicator after uppercase pitch
        if (isUpperCase && pos < gabcText.length && /[012]/.test(gabcText[pos])) {
          tokenLength++;
          pos++;
        }
        
        // Include alterations (x, X, y, Y, #, ##, with optional ?)
        while (pos < gabcText.length && /[xyXY#?]/.test(gabcText[pos])) {
          tokenLength++;
          pos++;
        }
        
        // Include note shapes (v, w, s, q, r, =, ~, <, >, O)
        while (pos < gabcText.length && /[wvosqr=~<>O]/.test(gabcText[pos])) {
          tokenLength++;
          pos++;
          
          // Include oriscus orientation or r0
          if (pos < gabcText.length && /[01]/.test(gabcText[pos])) {
            const prevChar = gabcText[pos - 1];
            if (prevChar === 'o' || prevChar === 'O' || prevChar === 'r') {
              tokenLength++;
              pos++;
            }
          }
        }
        
        // Tokenize entire initio debilis construct as parameter
        builder.push(
          range.start.line,
          range.start.character + tokenStart,
          tokenLength,
          this.getTokenType('parameter'),
          0
        );
        continue;
      }
      
      // Pitch with optional alterations and shapes: [pitch][alterations][shapes]
      if (/[a-npA-NP]/.test(char)) {
        const isUpperCase = /[A-NP]/.test(char);
        let tokenLength = 1;
        let hasAlteration = false;
        let hasShape = false;
        pos++;
        
        // Include leaning indicator after uppercase pitch
        if (isUpperCase && pos < gabcText.length && /[012]/.test(gabcText[pos])) {
          tokenLength++;
          pos++;
        }
        
        // Include alterations (x, X, y, Y, #, ##, with optional ?)
        const alterationStart = pos;
        while (pos < gabcText.length && /[xyXY#?]/.test(gabcText[pos])) {
          tokenLength++;
          pos++;
        }
        if (pos > alterationStart) {
          hasAlteration = true;
        }
        
        // Include note shapes (v, w, s, q, r, =, ~, <, >, O)
        const shapeStart = pos;
        while (pos < gabcText.length && /[wvosqr=~<>O]/.test(gabcText[pos])) {
          tokenLength++;
          pos++;
          
          // Include oriscus orientation or r0
          if (pos < gabcText.length && /[01]/.test(gabcText[pos])) {
            const prevChar = gabcText[pos - 1];
            if (prevChar === 'o' || prevChar === 'O' || prevChar === 'r') {
              tokenLength++;
              pos++;
            }
          }
        }
        if (pos > shapeStart) {
          hasShape = true;
        }
        
        // Determine token type based on what's present
        let tokenType: string;
        if (hasAlteration) {
          // Use 'macro' token for alterations (string.regexp.gabc)
          tokenType = 'macro';
        } else if (hasShape) {
          // Use 'parameter' token for shapes (variable.other.constant.gabc)
          tokenType = 'parameter';
        } else {
          // Use 'class' token for plain pitch (variable.language.gabc)
          tokenType = 'class';
        }
        
        // Check for custos forçado (pitch followed by +)
        // This must be checked before tokenizing the pitch
        if (pos < gabcText.length && gabcText[pos] === '+') {
          // Tokenize pitch+ as custos (variable token - nome de variável)
          builder.push(
            range.start.line,
            range.start.character + tokenStart,
            tokenLength + 1, // Include the +
            this.getTokenType('variable'),
            0
          );
          pos++; // Skip the +
        } else {
          // Normal pitch tokenization
          builder.push(
            range.start.line,
            range.start.character + tokenStart,
            tokenLength,
            this.getTokenType(tokenType),
            0
          );
          
          // Check for @ fusion operator after pitch (f@h@i)
          if (pos < gabcText.length && gabcText[pos] === '@') {
            builder.push(
              range.start.line,
              range.start.character + pos,
              1,
              this.getTokenType('operator'),
              0
            );
            pos++;
          }
        }
        
        continue;
      }
      
      // Separation bars (virgula, divisio minimus/minima/minor/maior/finalis)
      // Detect: `, ^, ,, ;, :, :: and their variants with ledger lines or numbers
      if (char === '`' || char === '^' || char === ',' || char === ';' || char === ':') {
        let barLength = 1;
        let nextPos = pos + 1;
        
        // Check for double colon (::)
        if (char === ':' && nextPos < gabcText.length && gabcText[nextPos] === ':') {
          barLength = 2;
          nextPos++;
        }
        
        // Check for ledger line indicator (0) immediately after `, ^, or ,
        // These should be treated as a single token: `0, ^0, ,0
        if ((char === '`' || char === '^' || char === ',') && nextPos < gabcText.length && gabcText[nextPos] === '0') {
          barLength++;
          nextPos++;
        }
        
        // Tokenize the bar symbol(s) including ledger line if present
        builder.push(
          range.start.line,
          range.start.character + pos,
          barLength,
          this.getTokenType('keyword'),
          0
        );
        pos = nextPos;
        
        // Check for additional modifiers only for ; and : (not for `, ^, , which already consumed 0)
        if (char === ';' || char === ':') {
          // Check for ledger line indicator (0) or number (1-8) after bar
          if (pos < gabcText.length && /[0-8]/.test(gabcText[pos])) {
            builder.push(
              range.start.line,
              range.start.character + pos,
              1,
              this.getTokenType('number'),
              0
            );
            pos++;
          }
        }
        
        // Check for question mark (?) after colon
        if (char === ':' && pos < gabcText.length && gabcText[pos] === '?') {
          builder.push(
            range.start.line,
            range.start.character + pos,
            1,
            this.getTokenType('keyword'),
            0
          );
          pos++;
        }
        
        continue;
      }
      
      // Spacing codes: !, !!, @, /, //, /0, /!, /[number]
      // Note: @[...] is handled earlier in the loop
      if (char === '!' || char === '@' || char === '/') {
        // Check for !! (centered text)
        if (char === '!' && pos + 1 < gabcText.length && gabcText[pos + 1] === '!') {
          builder.push(
            range.start.line,
            range.start.character + pos,
            2,
            this.getTokenType('type'),
            0
          );
          pos += 2;
          continue;
        }
        
        // Check for // (large space)
        if (char === '/' && pos + 1 < gabcText.length && gabcText[pos + 1] === '/') {
          builder.push(
            range.start.line,
            range.start.character + pos,
            2,
            this.getTokenType('type'),
            0
          );
          pos += 2;
          continue;
        }
        
        // Check for /0 (zero-width space)
        if (char === '/' && pos + 1 < gabcText.length && gabcText[pos + 1] === '0') {
          builder.push(
            range.start.line,
            range.start.character + pos,
            2,
            this.getTokenType('type'),
            0
          );
          pos += 2;
          continue;
        }
        
        // Check for /! (custom space)
        if (char === '/' && pos + 1 < gabcText.length && gabcText[pos + 1] === '!') {
          builder.push(
            range.start.line,
            range.start.character + pos,
            2,
            this.getTokenType('type'),
            0
          );
          pos += 2;
          continue;
        }
        
        // Check for /[number] (custom spacing with bracket)
        if (char === '/' && pos + 1 < gabcText.length && gabcText[pos + 1] === '[') {
          const closingBracket = gabcText.indexOf(']', pos + 2);
          if (closingBracket !== -1) {
            const spacingLength = closingBracket - pos + 1;
            builder.push(
              range.start.line,
              range.start.character + pos,
              spacingLength,
              this.getTokenType('type'),
              0
            );
            pos = closingBracket + 1;
            continue;
          }
        }
        
        // Single !, @, or / (small space, no space, or neumatic cut)
        // Note: standalone @ is spacing code, not fusion operator
        builder.push(
          range.start.line,
          range.start.character + pos,
          1,
          this.getTokenType('type'),
          0
        );
        pos++;
        continue;
      }
      
      // Rhythmic signs: r followed by digit 1-8
      // Note: r0, rv, rw, etc. are handled as pitch+shape above
      if (char === 'r' && pos + 1 < gabcText.length && /[1-8]/.test(gabcText[pos + 1])) {
        builder.push(
          range.start.line,
          range.start.character + pos,
          2,
          this.getTokenType('variable'),
          0
        );
        pos += 2;
        continue;
      }
      
      // Line break codes and custos: z, Z, z0
      // z (no line break), Z (forced line break)
      // z0 (custos), z+ (line break with modifier), z- (line break with modifier)
      if (char === 'z' || char === 'Z') {
        // Check if followed by 0 (custos)
        if (pos + 1 < gabcText.length && gabcText[pos + 1] === '0') {
          // z0 or Z0 is custos (variable token - nome de variável)
          builder.push(
            range.start.line,
            range.start.character + pos,
            2, // z0 as single token
            this.getTokenType('variable'),
            0
          );
          pos += 2;
        } else {
          // z or Z as line break escape character
          builder.push(
            range.start.line,
            range.start.character + pos,
            1,
            this.getTokenType('regexp'),
            0
          );
          pos++;
          
          // Check for + or - after z/Z (line break modifiers)
          if (pos < gabcText.length && (gabcText[pos] === '+' || gabcText[pos] === '-')) {
            builder.push(
              range.start.line,
              range.start.character + pos,
              1,
              this.getTokenType('operator'),
              0
            );
            pos++;
          }
        }
        continue;
      }
      
      // Note: Standalone shapes and alterations without pitch are no longer tokenized separately
      // They should always come after a pitch and are included in the pitch token
      
      // Extra symbols: . (punctum mora), ' (ictus), _ (episema)
      // Note: ` is a separation bar (virgula) in GABC, handled earlier
      if (char === '.' || char === "'" || char === '_') {
        // Check for double punctum mora (..)
        if (char === '.' && pos + 1 < gabcText.length && gabcText[pos + 1] === '.') {
          builder.push(
            range.start.line,
            range.start.character + pos,
            2,
            this.getTokenType('variable'),
            0
          );
          pos += 2;
        }
        // Ictus, episema, backtick - tokenize symbol separately from position digit
        else {
          // Tokenize the symbol itself
          builder.push(
            range.start.line,
            range.start.character + pos,
            1,
            this.getTokenType('variable'),
            0
          );
          const currentSymbol = char;
          pos++;
          
          // Check for position digit after ' (ictus: 0, 1)
          if (currentSymbol === "'" && pos < gabcText.length && /[01]/.test(gabcText[pos])) {
            builder.push(
              range.start.line,
              range.start.character + pos,
              1,
              this.getTokenType('number'),
              0
            );
            pos++;
          }
          // Check for position digit after _ (episema: 0-5)
          if (currentSymbol === '_' && pos < gabcText.length && /[0-5]/.test(gabcText[pos])) {
            builder.push(
              range.start.line,
              range.start.character + pos,
              1,
              this.getTokenType('number'),
              0
            );
            pos++;
          }
        }
        continue;
      }
      
      // Other characters - skip
      pos++;
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
    const attributeName = attrText.substring(nameStart, nameStart + nameLength);
    
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
        const attributeValue = attrText.substring(valueStart, valueStart + valueLength);
        
        // Special case: 'cn' attribute contains NABC code - tokenize as NABC
        if (attributeName === 'cn') {
          // Parse the NABC value
          const nabcStartPos = {
            line: range.start.line,
            character: range.start.character + valueStart
          };
          const nabcGlyphs = parseNABCSnippet(attributeValue, nabcStartPos);
          
          // Tokenize each NABC glyph
          for (const glyph of nabcGlyphs) {
            this.tokenizeNABCGlyph(glyph, builder);
          }
        } else if (['nv', 'gv', 'ev', 'alt'].includes(attributeName)) {
          // Attributes that accept LaTeX/TeX code
          // Do NOT add semantic tokens here - let TextMate grammar handle LaTeX injection
          // Semantic tokens have higher precedence and would override the LaTeX syntax
        } else {
          // Tokenize attribute value with number detection
          this.tokenizeAttributeValue(attributeValue, range.start.line, range.start.character + valueStart, builder);
        }
      }
    }
  }

  private tokenizeAttributeValue(value: string, line: number, startChar: number, builder: vscode.SemanticTokensBuilder): void {
    // Regex patterns
    const numberWithUnitRegex = /(\d+(?:\.\d+)?)(mm|cm|ex|em|pt)/g;
    const numberOnlyRegex = /\d+(?:\.\d+)?/g;
    const delimiterRegex = /[;,]/g;
    
    let position = 0;
    const tokens: Array<{start: number, length: number, type: string}> = [];

    // First pass: identify all tokens (numbers with units, standalone numbers, delimiters)
    let match: RegExpExecArray | null;
    
    // Find numbers with units
    numberWithUnitRegex.lastIndex = 0;
    while ((match = numberWithUnitRegex.exec(value)) !== null) {
      tokens.push({
        start: match.index,
        length: match[1].length,
        type: 'number'
      });
      tokens.push({
        start: match.index + match[1].length,
        length: match[2].length,
        type: 'type'  // unit of measure
      });
    }

    // Find standalone numbers (not followed by units)
    numberOnlyRegex.lastIndex = 0;
    while ((match = numberOnlyRegex.exec(value)) !== null) {
      // Check if this position is already covered by a number-with-unit
      const alreadyCovered = tokens.some(t => 
        match!.index >= t.start && match!.index < t.start + t.length
      );
      if (!alreadyCovered) {
        tokens.push({
          start: match.index,
          length: match[0].length,
          type: 'number'
        });
      }
    }

    // Find delimiters (semicolons and commas)
    delimiterRegex.lastIndex = 0;
    while ((match = delimiterRegex.exec(value)) !== null) {
      tokens.push({
        start: match.index,
        length: 1,
        type: 'operator'  // delimiter
      });
    }

    // Sort tokens by position
    tokens.sort((a, b) => a.start - b.start);

    // Second pass: emit tokens with string tokens for gaps
    for (const token of tokens) {
      // Add string token for gap before this token (if any)
      if (token.start > position) {
        builder.push(
          line,
          startChar + position,
          token.start - position,
          this.getTokenType('string'),
          0
        );
      }

      // Add the identified token
      builder.push(
        line,
        startChar + token.start,
        token.length,
        this.getTokenType(token.type),
        0
      );

      position = token.start + token.length;
    }

    // Add string token for remaining text after last token (if any)
    if (position < value.length) {
      builder.push(
        line,
        startChar + position,
        value.length - position,
        this.getTokenType('string'),
        0
      );
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
  
  private tokenizeNABCContent(nabcText: string, line: number, startChar: number, builder: vscode.SemanticTokensBuilder): void {
    // Tokenize NABC content character by character
    // This includes: basic glyphs (2 letters), modifiers (S, G, M, -, >, ~), 
    // spacing codes (/, //, `, ``), and other elements
    
    let pos = 0;
    while (pos < nabcText.length) {
      const char = nabcText[pos];
      
      // Spacing codes: /, //, `, ``
      if (char === '/' || char === '`') {
        // Check for double characters (//, ``)
        if (pos + 1 < nabcText.length && nabcText[pos + 1] === char) {
          builder.push(
            line,
            startChar + pos,
            2,
            this.getTokenType('type'),
            0
          );
          pos += 2;
          continue;
        }
        
        // Single character (/, `)
        builder.push(
          line,
          startChar + pos,
          1,
          this.getTokenType('type'),
          0
        );
        pos++;
        continue;
      }
      
      // Check for 2-letter basic glyph
      if (pos + 1 < nabcText.length) {
        const twoLetters = nabcText.substring(pos, pos + 2);
        const basicGlyphs = ['vi', 'pu', 'ta', 'gr', 'cl', 'pe', 'to', 'pr', 'sc', 'cm', 'un', 'sa', 'ob', 'tr', 'qu', 'vr'];
        if (basicGlyphs.includes(twoLetters)) {
          builder.push(
            line,
            startChar + pos,
            2,
            this.getTokenType('keyword'),
            this.getModifier('readonly')
          );
          pos += 2;
          
          // Check for ! fusion operator after glyph (to!vi)
          if (pos < nabcText.length && nabcText[pos] === '!') {
            builder.push(
              line,
              startChar + pos,
              1,
              this.getTokenType('operator'),
              0
            );
            pos++;
          }
          
          continue;
        }
        
        // Check for pp (prepunctis) or su (subpunctis)
        if (twoLetters === 'pp' || twoLetters === 'su') {
          builder.push(
            line,
            startChar + pos,
            2,
            this.getTokenType('class'),
            this.getModifier('readonly')
          );
          pos += 2;
          
          // After pp/su, skip the number
          if (pos < nabcText.length && /[0-9]/.test(nabcText[pos])) {
            const numStart = pos;
            while (pos < nabcText.length && /[0-9]/.test(nabcText[pos])) {
              pos++;
            }
            builder.push(
              line,
              startChar + numStart,
              pos - numStart,
              this.getTokenType('number'),
              0
            );
          }
          continue;
        }
      }
      
      // Modifiers: S, G, M, -, >, ~
      if (/[SGM\->~]/.test(char)) {
        builder.push(
          line,
          startChar + pos,
          1,
          this.getTokenType('variable'),
          0
        );
        pos++;
        
        // Check for variant number after modifier
        if (pos < nabcText.length && /[0-9]/.test(nabcText[pos])) {
          const numStart = pos;
          while (pos < nabcText.length && /[0-9]/.test(nabcText[pos])) {
            pos++;
          }
          builder.push(
            line,
            startChar + numStart,
            pos - numStart,
            this.getTokenType('number'),
            0
          );
        }
        continue;
      }
      
      // Significant letters (St. Gall: a,c,e,i,l,m,s,t,v / Laon: a,b,e,i,m,o,p,q,s,t,v)
      if (/[ls]/.test(char)) {
        builder.push(
          line,
          startChar + pos,
          1,
          this.getTokenType('variable'),
          0
        );
        pos++;
        
        // Check for second letter
        if (pos < nabcText.length && /[aceimstv]/.test(nabcText[pos])) {
          builder.push(
            line,
            startChar + pos,
            1,
            this.getTokenType('variable'),
            0
          );
          pos++;
        }
        
        // Check for number
        if (pos < nabcText.length && /[0-9]/.test(nabcText[pos])) {
          const numStart = pos;
          while (pos < nabcText.length && /[0-9]/.test(nabcText[pos])) {
            pos++;
          }
          builder.push(
            line,
            startChar + numStart,
            pos - numStart,
            this.getTokenType('number'),
            0
          );
        }
        continue;
      }
      
      // Pitch descriptor (pd + letter)
      if (char === 'p' && pos + 1 < nabcText.length && nabcText[pos + 1] === 'd') {
        builder.push(
          line,
          startChar + pos,
          2,
          this.getTokenType('class'),
          0
        );
        pos += 2;
        
        // Check for letter after pd
        if (pos < nabcText.length && /[adlhs123]/.test(nabcText[pos])) {
          builder.push(
            line,
            startChar + pos,
            1,
            this.getTokenType('class'),
            0
          );
          pos++;
        }
        continue;
      }
      
      // Fusion (+) and connection (-)
      if (char === '+' || char === '-') {
        builder.push(
          line,
          startChar + pos,
          1,
          this.getTokenType('operator'),
          0
        );
        pos++;
        continue;
      }
      
      // Skip other characters (spaces, etc.)
      pos++;
    }
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
      
      // 3. Tokenize modifiers (S, G, M, -, >, ~, variant numbers) and spacing
      while (pos < glyphText.length) {
        const char = glyphText[pos];
        
        // Spacing codes: /, //, `, ``
        if (char === '/' || char === '`') {
          // Check for double characters (//, ``)
          if (pos + 1 < glyphText.length && glyphText[pos + 1] === char) {
            builder.push(
              range.start.line,
              range.start.character + pos,
              2,
              this.getTokenType('type'),
              0
            );
            pos += 2;
            continue;
          }
          
          // Single character (/, `)
          builder.push(
            range.start.line,
            range.start.character + pos,
            1,
            this.getTokenType('type'),
            0
          );
          pos++;
          continue;
        }
        
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
