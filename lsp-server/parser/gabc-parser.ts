/**
 * GABC Parser - Fallback TypeScript Implementation
 * Parses .gabc files according to the GABC specification
 */

import {
  ParsedDocument,
  ParseError,
  NotationSection,
  Syllable,
  NoteGroup,
  Note,
  NoteShape,
  ModifierType,
  Clef,
  Bar,
  Position,
  Range,
  Comment
} from './types';
import { parseNABCSnippets } from './nabc-parser';

export class GabcParser {
  private text: string;
  private pos: number;
  private line: number;
  private character: number;
  private errors: ParseError[];
  private comments: Comment[];

  constructor(text: string) {
    this.text = text;
    this.pos = 0;
    this.line = 0;
    this.character = 0;
    this.errors = [];
    this.comments = [];
  }

  parse(): ParsedDocument {
    const headers = this.parseHeaders();
    this.skipWhitespaceAndComments(); // Skip whitespace after header separator
    const notation = this.parseNotation();

    return {
      headers,
      notation,
      comments: this.comments,
      errors: this.errors
    };
  }

  private parseHeaders(): Map<string, string> {
    const headers = new Map<string, string>();
    let inHeader = true;

    while (inHeader && this.pos < this.text.length) {
      this.skipWhitespaceAndComments();

      // Check for header separator
      if (this.peek(2) === '%%') {
        this.advance(2);
        inHeader = false;
        break;
      }

      // Parse header line
      const headerStart = this.getCurrentPosition();
      const nameMatch = this.matchRegex(/^([a-zA-Z0-9-]+):/);
      
      if (nameMatch) {
        const name = nameMatch[1];
        this.advance(nameMatch[0].length);
        
        // Parse header value
        let value = '';
        let multiline = false;

        while (this.pos < this.text.length) {
          const char = this.peek();
          
          if (char === '%') {
            this.parseComment();
            continue;
          }

          if (char === ';') {
            this.advance(1);
            if (this.peek() === ';') {
              this.advance(1);
              multiline = false;
              break;
            }
            break;
          }

          if (char === '\n') {
            if (!multiline && value.trim().length > 0) {
              multiline = false;
            }
            this.advance(1);
            continue;
          }

          value += char;
          this.advance(1);
        }

        headers.set(name.toLowerCase(), value.trim());
      } else {
        this.advance(1);
      }
    }

    return headers;
  }

  private parseNotation(): NotationSection {
    const start = this.getCurrentPosition();
    const syllables: Syllable[] = [];

    while (this.pos < this.text.length) {
      this.skipWhitespaceAndComments();

      if (this.pos >= this.text.length) {
        break;
      }

      // Parse syllable (text + optional notation)
      const syllable = this.parseSyllable();
      
      if (syllable) {
        syllables.push(syllable);
      } else {
        // If parseSyllable returns null, we need to advance to avoid infinite loop
        this.advance(1);
      }
    }

    const end = this.getCurrentPosition();

    return {
      syllables,
      range: { start, end }
    };
  }

  private parseSyllable(): Syllable | null {
    const start = this.getCurrentPosition();
    const textStart = this.getCurrentPosition();
    const notes: NoteGroup[] = [];
    let clef: Clef | undefined;
    let bar: Bar | undefined;
    let textWithStyles = '';
    let text = '';

    // Parse text before parentheses (may contain style tags)
    while (this.pos < this.text.length && this.peek() !== '(' && this.peek() !== '%') {
      if (this.peek() === '\\' && this.pos + 1 < this.text.length && this.text[this.pos + 1] === '\n') {
        this.advance(2); // Skip line continuation
        continue;
      }
      textWithStyles += this.peek();
      this.advance(1);
    }

    // Remove style tags for plain text
    text = this.removeStyleTags(textWithStyles.trim());
    const textEnd = this.getCurrentPosition();

    if (this.peek() !== '(') {
      if (text.length > 0 || textWithStyles.trim().length > 0) {
        return {
          text: text || textWithStyles.trim(),
          textWithStyles: textWithStyles.trim() !== text ? textWithStyles.trim() : undefined,
          notes: [],
          range: { start: textStart, end: textEnd }
        };
      }
      return null;
    }

    const parenStart = this.getCurrentPosition();
    this.advance(1); // Skip '('

    const noteStart = this.getCurrentPosition();
    
    // Parse alternating GABC and NABC segments
    // Pattern: (gabc|nabc|gabc|nabc|...)
    // We concatenate all GABC content but track original positions for each character
    
    const segments: Array<{type: 'gabc' | 'nabc', content: string, start: Position}> = [];
    let isNabc = false; // Start with GABC
    
    while (this.pos < this.text.length && this.peek() !== ')') {
      if (this.peek() === '|') {
        this.advance(1); // Skip '|'
        isNabc = !isNabc; // Toggle between GABC and NABC
        continue;
      }
      
      const segmentStart = this.getCurrentPosition();
      let content = '';
      
      while (this.pos < this.text.length && this.peek() !== ')' && this.peek() !== '|') {
        content += this.peek();
        this.advance(1);
      }
      
      if (content.length > 0) {
        segments.push({
          type: isNabc ? 'nabc' : 'gabc',
          content,
          start: segmentStart
        });
      }
    }

    if (this.peek() === ')') {
      this.advance(1);
    }

    const parenEnd = this.getCurrentPosition();

    // Collect GABC and NABC segments separately
    const gabcSegments = segments.filter(s => s.type === 'gabc');
    const nabcSegments = segments.filter(s => s.type === 'nabc');
    
    // Concatenate GABC content
    const gabcContent = gabcSegments.map(s => s.content).join('');
    const nabcSnippets = nabcSegments.map(s => s.content);
    
    // Build position map: for each character in concatenated GABC, track its original position
    const positionMap: Position[] = [];
    for (const segment of gabcSegments) {
      for (let i = 0; i < segment.content.length; i++) {
        positionMap.push({
          line: segment.start.line,
          character: segment.start.character + i
        });
      }
    }

    // Parse clef if present (with precise position)
    clef = this.parseClefWithPosition(gabcContent, noteStart);
    
    // Parse bar if present (with precise position)
    bar = this.parseBarWithPosition(gabcContent, noteStart);

    // Parse note group with position map
    if (gabcContent.trim().length > 0) {
      const noteGroup = this.parseNoteGroupWithPositionMap(gabcContent, nabcSnippets, noteStart, positionMap);
      if (noteGroup) {
        notes.push(noteGroup);
      }
    }

    const end = this.getCurrentPosition();

    // Create full range from text start to end
    const syllableRange = { start: textStart, end };

    return {
      text: text || textWithStyles.trim(),
      textWithStyles: textWithStyles.trim() !== text && textWithStyles.trim().length > 0 ? textWithStyles.trim() : undefined,
      notes,
      range: syllableRange,
      clef,
      bar
    };
  }

  private removeStyleTags(text: string): string {
    // Remove all GABC style tags
    let result = text;
    const styleTags = [
      /<b>/g, /<\/b>/g,           // Bold
      /<i>/g, /<\/i>/g,           // Italic
      /<sc>/g, /<\/sc>/g,         // Small caps
      /<ul>/g, /<\/ul>/g,         // Underline
      /<tt>/g, /<\/tt>/g,         // Typewriter
      /<c>/g, /<\/c>/g,           // Colored
      /<v>.*?<\/v>/g,             // Color with value
      /<alt>.*?<\/alt>/g,         // Alternative text
      /<\/alt>/g                  // Alternative text end
    ];
    
    for (const tag of styleTags) {
      result = result.replace(tag, '');
    }
    
    return result;
  }

  private parseNoteGroup(gabc: string, nabc: string[], start: Position): NoteGroup | null {
    const notes: Note[] = [];
    const end = this.getCurrentPosition();
    let custos: any = undefined;
    const attributes: any[] = [];

    // Parse individual notes from GABC string
    let i = 0;
    while (i < gabc.length) {
      const char = gabc[i];

      // Skip whitespace and separators
      if (/[\s\/`!]/.test(char)) {
        i++;
        continue;
      }

      // Parse custos (z0 or +pitch)
      if (char === 'z' && i + 1 < gabc.length && gabc[i + 1] === '0') {
        const custosStart: Position = {
          line: start.line,
          character: start.character + i
        };
        const custosEnd: Position = {
          line: start.line,
          character: start.character + i + 2
        };
        custos = {
          type: 'auto',
          range: { start: custosStart, end: custosEnd }
        };
        i += 2;
        continue;
      }

      // Parse explicit custos (+pitch)
      if (char === '+' && i + 1 < gabc.length && /[a-n]/.test(gabc[i + 1])) {
        const custosStart: Position = {
          line: start.line,
          character: start.character + i
        };
        const custosEnd: Position = {
          line: start.line,
          character: start.character + i + 2
        };
        custos = {
          type: 'explicit',
          pitch: gabc[i + 1],
          range: { start: custosStart, end: custosEnd }
        };
        i += 2;
        continue;
      }

      // Parse attributes [name:value] or [name]
      if (char === '[') {
        const attrPos: Position = {
          line: start.line,
          character: start.character + i
        };
        const attrResult = this.parseAttribute(gabc.substring(i), attrPos);
        if (attrResult) {
          attributes.push(attrResult.attribute);
          i += attrResult.length;
          continue;
        }
      }

      // Check for pitch letters (lowercase or uppercase)
      if (/[a-np]/i.test(char)) {
        const noteStart: Position = {
          line: start.line,
          character: start.character + i
        };
        const isUpperCase = /[A-NP]/.test(char);
        const pitch = char.toLowerCase();
        let shape = isUpperCase ? NoteShape.PunctumInclinatum : NoteShape.Punctum;
        const modifiers: any[] = [];
        let noteLength = 1;

        i++;

        // Parse shape modifiers and note modifiers
        while (i < gabc.length) {
          const mod = gabc[i];

          // Leaning modifiers for punctum inclinatum
          if (isUpperCase && /[012]/.test(mod)) {
            noteLength++;
            i++;
            continue;
          }

          // Shape modifiers
          if (mod === 'o') {
            shape = NoteShape.Oriscus;
            noteLength++;
            i++;
            // Check for oriscus orientation
            if (i < gabc.length && /[01]/.test(gabc[i])) {
              noteLength++;
              i++;
            }
          } else if (mod === 'O') {
            // Oriscus scapus
            shape = NoteShape.Oriscus;
            modifiers.push({ type: ModifierType.OriscusScapus });
            noteLength++;
            i++;
            // Check for orientation (0=downwards, 1=upwards)
            if (i < gabc.length && /[01]/.test(gabc[i])) {
              noteLength++;
              i++;
            }
          } else if (mod === 'w') {
            shape = NoteShape.Quilisma;
            noteLength++;
            i++;
          } else if (mod === 'W') {
            // Quilisma quadratum
            shape = NoteShape.Quilisma;
            noteLength++;
            i++;
          } else if (mod === 'v') {
            if (i + 1 < gabc.length && gabc[i + 1] === 'v') {
              // bivirga (vv) or trivirga (vvv)
              noteLength++;
              i++;
              if (i + 1 < gabc.length && gabc[i + 1] === 'v') {
                noteLength++;
                i++;
              }
            } else {
              shape = NoteShape.Virga;
              noteLength++;
              i++;
            }
          } else if (mod === 'V') {
            shape = NoteShape.VirgaReversa;
            noteLength++;
            i++;
          } else if (mod === 's') {
            if (i + 1 < gabc.length && gabc[i + 1] === 's') {
              // distropha (ss) or tristropha (sss)
              noteLength++;
              i++;
              if (i + 1 < gabc.length && gabc[i + 1] === 's') {
                noteLength++;
                i++;
              }
            } else {
              shape = NoteShape.Stropha;
              noteLength++;
              i++;
            }
          } else if (mod === 'r') {
            shape = NoteShape.Cavum;
            noteLength++;
            i++;
            // Check for additional cavum modifiers
            if (i < gabc.length && /[0-9]/.test(gabc[i])) {
              noteLength++;
              i++;
            }
          } else if (mod === 'R') {
            // Punctum quadratum surrounded by lines
            shape = NoteShape.Cavum;
            noteLength++;
            i++;
          } else if (mod === '=') {
            shape = NoteShape.Linea;
            noteLength++;
            i++;
          } else if (mod === 'q') {
            // Quadratum modifier
            modifiers.push({ type: ModifierType.Quadratum });
            noteLength++;
            i++;
          }
          
          // Alteration modifiers
          else if (mod === 'x') {
            shape = NoteShape.Flat;
            noteLength++;
            i++;
            if (i < gabc.length && gabc[i] === '?') {
              // Parenthesized flat
              noteLength++;
              i++;
            }
          } else if (mod === 'X') {
            // Soft flat
            shape = NoteShape.Flat;
            noteLength++;
            i++;
          } else if (mod === '#') {
            shape = NoteShape.Sharp;
            noteLength++;
            i++;
            if (i < gabc.length && gabc[i] === '#') {
              // Soft sharp (##)
              noteLength++;
              i++;
            } else if (i < gabc.length && gabc[i] === '?') {
              // Parenthesized sharp
              noteLength++;
              i++;
            }
          } else if (mod === 'y') {
            shape = NoteShape.Natural;
            noteLength++;
            i++;
            if (i < gabc.length && gabc[i] === '?') {
              // Parenthesized natural
              noteLength++;
              i++;
            }
          } else if (mod === 'Y') {
            // Soft natural
            shape = NoteShape.Natural;
            noteLength++;
            i++;
          }
          
          // Rhythmic and expression modifiers
          else if (mod === '.') {
            modifiers.push({ type: ModifierType.PunctumMora });
            noteLength++;
            i++;
            // Support for double punctum mora
            if (i < gabc.length && gabc[i] === '.') {
              noteLength++;
              i++;
            }
          } else if (mod === '_') {
            modifiers.push({ type: ModifierType.HorizontalEpisema });
            noteLength++;
            i++;
            // Parse episema position/bridge modifiers
            while (i < gabc.length && /[0-5]/.test(gabc[i])) {
              noteLength++;
              i++;
            }
          } else if (mod === "'") {
            modifiers.push({ type: ModifierType.VerticalEpisema });
            noteLength++;
            i++;
            // Parse ictus position
            if (i < gabc.length && /[01]/.test(gabc[i])) {
              noteLength++;
              i++;
            }
          } else if (mod === '-') {
            // Initio debilis (must be before the note, but we handle it here)
            modifiers.push({ type: ModifierType.InitioDebilis });
            noteLength++;
            i++;
          }
          
          // Liquescence modifiers
          else if (mod === '~') {
            shape = NoteShape.Liquescent;
            modifiers.push({ type: ModifierType.Liquescent });
            noteLength++;
            i++;
          } else if (mod === '<') {
            // Augmentive liquescence
            shape = NoteShape.Liquescent;
            modifiers.push({ type: ModifierType.Liquescent });
            noteLength++;
            i++;
          } else if (mod === '>') {
            // Diminutive liquescence
            shape = NoteShape.Liquescent;
            modifiers.push({ type: ModifierType.Liquescent });
            noteLength++;
            i++;
          }
          
          // Rhythmic signs above/below staff
          else if (mod === 'r' && i + 1 < gabc.length && /[1-8]/.test(gabc[i + 1])) {
            // Rhythmic signs (r1-r8)
            noteLength += 2;
            i += 2;
          }
          
          // Other special characters
          else if (mod === '@') {
            // Fusion indicator
            modifiers.push({ type: ModifierType.Fusion });
            noteLength++;
            i++;
          }
          
          else {
            // Unknown modifier or next note
            break;
          }
        }

        const noteEnd: Position = {
          line: start.line,
          character: start.character + i
        };

        notes.push({
          pitch,
          shape,
          modifiers,
          range: { start: noteStart, end: noteEnd }
        });
      } else {
        // Skip unknown characters
        i++;
      }
    }

    return {
      gabc,
      nabc: nabc.length > 0 ? nabc : undefined,
      nabcParsed: nabc.length > 0 ? parseNABCSnippets(nabc, start) : undefined,
      range: { start, end },
      notes,
      custos: custos || undefined,
      attributes: attributes.length > 0 ? attributes : undefined
    };
  }

  /**
   * Parse note group with position map for alternating GABC/NABC segments
   * This method uses a position map to correctly track character positions when
   * GABC content is concatenated from multiple segments separated by NABC
   */
  private parseNoteGroupWithPositionMap(
    gabc: string,
    nabc: string[],
    start: Position,
    positionMap: Position[]
  ): NoteGroup | null {
    const notes: Note[] = [];
    const end = this.getCurrentPosition();
    let custos: any = undefined;
    const attributes: any[] = [];

    // Parse individual notes from GABC string
    let i = 0;
    while (i < gabc.length) {
      const char = gabc[i];
      
      // Get actual position from map, fallback to calculated position if not available
      const getPosition = (index: number): Position => {
        if (index < positionMap.length) {
          return positionMap[index];
        }
        // Fallback (shouldn't happen if map is correct)
        return { line: start.line, character: start.character + index };
      };

      // Skip whitespace and separators
      if (/[\s\/`!]/.test(char)) {
        i++;
        continue;
      }

      // Parse custos (z0 or +pitch)
      if (char === 'z' && i + 1 < gabc.length && gabc[i + 1] === '0') {
        custos = {
          type: 'auto',
          range: { start: getPosition(i), end: getPosition(i + 2) }
        };
        i += 2;
        continue;
      }

      // Parse explicit custos (+pitch)
      if (char === '+' && i + 1 < gabc.length && /[a-n]/.test(gabc[i + 1])) {
        custos = {
          type: 'explicit',
          pitch: gabc[i + 1],
          range: { start: getPosition(i), end: getPosition(i + 2) }
        };
        i += 2;
        continue;
      }

      // Parse attributes [name:value] or [name]
      if (char === '[') {
        const attrResult = this.parseAttribute(gabc.substring(i), getPosition(i));
        if (attrResult) {
          attributes.push(attrResult.attribute);
          i += attrResult.length;
          continue;
        }
      }

      // Check for pitch letters (lowercase or uppercase)
      if (/[a-np]/i.test(char)) {
        const noteStartIndex = i;
        const noteStart = getPosition(i);
        const isUpperCase = /[A-NP]/.test(char);
        const pitch = char.toLowerCase();
        let shape = isUpperCase ? NoteShape.PunctumInclinatum : NoteShape.Punctum;
        const modifiers: any[] = [];
        let noteLength = 1;

        i++;

        // Parse shape modifiers and note modifiers
        while (i < gabc.length) {
          const mod = gabc[i];

          // Leaning modifiers for punctum inclinatum
          if (isUpperCase && /[012]/.test(mod)) {
            noteLength++;
            i++;
            continue;
          }

          // Shape modifiers
          if (mod === 'o') {
            shape = NoteShape.Oriscus;
            noteLength++;
            i++;
            if (i < gabc.length && /[01]/.test(gabc[i])) {
              noteLength++;
              i++;
            }
          } else if (mod === 'O') {
            shape = NoteShape.Oriscus;
            noteLength++;
            i++;
            // Check for orientation (0=downwards, 1=upwards)
            if (i < gabc.length && /[01]/.test(gabc[i])) {
              noteLength++;
              i++;
            }
          } else if (mod === 'w') {
            shape = NoteShape.Quilisma;
            noteLength++;
            i++;
          } else if (mod === 'W') {
            shape = NoteShape.Quilisma;
            noteLength++;
            i++;
          } else if (mod === 'v') {
            if (i + 1 < gabc.length && gabc[i + 1] === 'v') {
              noteLength++;
              i++;
              if (i + 1 < gabc.length && gabc[i + 1] === 'v') {
                noteLength++;
                i++;
              }
            } else {
              shape = NoteShape.Virga;
              noteLength++;
              i++;
            }
          } else if (mod === 'V') {
            shape = NoteShape.VirgaReversa;
            noteLength++;
            i++;
          } else if (mod === 's') {
            if (i + 1 < gabc.length && gabc[i + 1] === 's') {
              noteLength++;
              i++;
              if (i + 1 < gabc.length && gabc[i + 1] === 's') {
                noteLength++;
                i++;
              }
            } else {
              shape = NoteShape.Stropha;
              noteLength++;
              i++;
            }
          } else if (mod === 'r') {
            shape = NoteShape.Cavum;
            noteLength++;
            i++;
            if (i < gabc.length && /[0-9]/.test(gabc[i])) {
              noteLength++;
              i++;
            }
          } else if (mod === 'R') {
            shape = NoteShape.Cavum;
            noteLength++;
            i++;
          } else if (mod === '=') {
            shape = NoteShape.Linea;
            noteLength++;
            i++;
          } else if (mod === 'q') {
            modifiers.push({ type: ModifierType.Quadratum });
            noteLength++;
            i++;
          } else if (mod === '.') {
            modifiers.push({ type: ModifierType.PunctumMora });
            noteLength++;
            i++;
            if (i < gabc.length && gabc[i] === '.') {
              noteLength++;
              i++;
            }
          } else if (mod === '_') {
            modifiers.push({ type: ModifierType.HorizontalEpisema });
            noteLength++;
            i++;
            while (i < gabc.length && /[0-5]/.test(gabc[i])) {
              noteLength++;
              i++;
            }
          } else if (mod === '~') {
            shape = NoteShape.Liquescent;
            modifiers.push({ type: ModifierType.Liquescent });
            noteLength++;
            i++;
          } else if (mod === '<') {
            shape = NoteShape.Liquescent;
            modifiers.push({ type: ModifierType.Liquescent });
            noteLength++;
            i++;
          } else if (mod === '>') {
            shape = NoteShape.Liquescent;
            modifiers.push({ type: ModifierType.Liquescent });
            noteLength++;
            i++;
          } else if (mod === 'r' && i + 1 < gabc.length && /[1-8]/.test(gabc[i + 1])) {
            noteLength += 2;
            i += 2;
          } else if (mod === '@') {
            modifiers.push({ type: ModifierType.Fusion });
            noteLength++;
            i++;
          } else {
            // Unknown modifier or next note
            break;
          }
        }

        // Calculate end position based on start position + length in actual document
        const noteEnd: Position = {
          line: noteStart.line,
          character: noteStart.character + (i - noteStartIndex)
        };

        notes.push({
          pitch,
          shape,
          modifiers,
          range: { start: noteStart, end: noteEnd }
        });
      } else {
        // Skip unknown characters
        i++;
      }
    }

    return {
      gabc,
      nabc: nabc.length > 0 ? nabc : undefined,
      nabcParsed: nabc.length > 0 ? parseNABCSnippets(nabc, start) : undefined,
      range: { start, end },
      notes,
      custos: custos || undefined,
      attributes: attributes.length > 0 ? attributes : undefined
    };
  }

  /**
   * Parse GABC attribute [name:value] or [name]
   * Returns the attribute and the length of characters consumed
   */
  private parseAttribute(text: string, start: Position): { attribute: any; length: number } | null {
    if (!text.startsWith('[')) {
      return null;
    }

    const closingBracket = text.indexOf(']');
    if (closingBracket === -1) {
      return null;
    }

    const content = text.substring(1, closingBracket);
    const colonIndex = content.indexOf(':');

    let name: string;
    let value: string | undefined;

    if (colonIndex === -1) {
      // Attribute without value, e.g., [nocustos]
      name = content.trim();
      value = undefined;
    } else {
      // Attribute with value, e.g., [shape:stroke]
      name = content.substring(0, colonIndex).trim();
      value = content.substring(colonIndex + 1).trim();
    }

    // Calculate end position: start + full attribute length (including brackets)
    const attributeLength = closingBracket + 1; // +1 for the closing bracket
    const end: Position = {
      line: start.line,
      character: start.character + attributeLength
    };

    const attribute = {
      name,
      value,
      range: { start, end }
    };

    return {
      attribute,
      length: attributeLength
    };
  }

  private parseClef(content: string): Clef | undefined {
    const clefMatch = content.match(/^(c|f)(b)?([1-4])/);
    if (clefMatch) {
      return {
        type: clefMatch[1] as 'c' | 'f',
        line: parseInt(clefMatch[3]),
        hasFlat: !!clefMatch[2],
        range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() }
      };
    }
    return undefined;
  }

  private parseClefWithPosition(content: string, basePos: Position): Clef | undefined {
    const clefMatch = content.match(/^(c|f)(b)?([1-4])/);
    if (clefMatch) {
      const clefLength = clefMatch[0].length;
      return {
        type: clefMatch[1] as 'c' | 'f',
        line: parseInt(clefMatch[3]),
        hasFlat: !!clefMatch[2],
        range: {
          start: basePos,
          end: { line: basePos.line, character: basePos.character + clefLength }
        }
      };
    }
    return undefined;
  }

  private parseBar(content: string): Bar | undefined {
    const trimmed = content.trim();
    
    if (trimmed === '`' || trimmed === '`0') {
      return { type: 'virgula', range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } };
    }
    if (trimmed === ',' || trimmed === ',0') {
      return { type: 'divisio_minima', range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } };
    }
    if (trimmed === ';') {
      return { type: 'divisio_minor', range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } };
    }
    if (trimmed === ':') {
      return { type: 'divisio_maior', range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } };
    }
    if (trimmed === '::') {
      return { type: 'divisio_finalis', range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } };
    }

    return undefined;
  }

  private parseBarWithPosition(content: string, basePos: Position): Bar | undefined {
    const trimmed = content.trim();
    
    // Find the actual position of the bar in content
    const barIndex = content.indexOf(trimmed);
    const barPos: Position = {
      line: basePos.line,
      character: basePos.character + barIndex
    };
    const barEnd: Position = {
      line: basePos.line,
      character: basePos.character + barIndex + trimmed.length
    };
    
    if (trimmed === '`' || trimmed === '`0') {
      return { type: 'virgula', range: { start: barPos, end: barEnd } };
    }
    if (trimmed === ',' || trimmed === ',0') {
      return { type: 'divisio_minima', range: { start: barPos, end: barEnd } };
    }
    if (trimmed === ';') {
      return { type: 'divisio_minor', range: { start: barPos, end: barEnd } };
    }
    if (trimmed === ':') {
      return { type: 'divisio_maior', range: { start: barPos, end: barEnd } };
    }
    if (trimmed === '::') {
      return { type: 'divisio_finalis', range: { start: barPos, end: barEnd } };
    }

    return undefined;
  }

  private parseComment(): void {
    if (this.peek() !== '%') {
      return;
    }

    const start = this.getCurrentPosition();
    this.advance(1); // Skip '%'

    let text = '';
    while (this.pos < this.text.length && this.peek() !== '\n') {
      text += this.peek();
      this.advance(1);
    }

    const end = this.getCurrentPosition();
    this.comments.push({
      text,
      range: { start, end }
    });
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.text.length) {
      const char = this.peek();

      // Don't skip %% (header separator)
      if (char === '%' && this.peek(2) === '%%') {
        break;
      }

      // Skip comments
      if (char === '%') {
        this.parseComment();
        continue;
      }

      // Skip whitespace
      if (/\s/.test(char)) {
        this.advance(1);
        continue;
      }

      break;
    }
  }

  private peek(length: number = 1): string {
    return this.text.substring(this.pos, this.pos + length);
  }

  private advance(count: number): void {
    for (let i = 0; i < count && this.pos < this.text.length; i++) {
      if (this.text[this.pos] === '\n') {
        this.line++;
        this.character = 0;
      } else {
        this.character++;
      }
      this.pos++;
    }
  }

  private getCurrentPosition(): Position {
    return { line: this.line, character: this.character };
  }

  private matchRegex(regex: RegExp): RegExpMatchArray | null {
    const remaining = this.text.substring(this.pos);
    return remaining.match(regex);
  }

  addError(message: string, range: Range, severity: 'error' | 'warning' | 'info' = 'error'): void {
    this.errors.push({ message, range, severity });
  }
}
