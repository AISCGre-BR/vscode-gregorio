/**
 * Tree-sitter Integration Module
 * Integrates tree-sitter-gregorio parser with the LSP
 * NOTE: Tree-sitter is disabled in bundled version to avoid native module issues
 */

// import Parser from 'tree-sitter';
import { ParsedDocument, ParseError, Position, Range } from '../parser/types';

let Gregorio: any;

// Tree-sitter disabled in bundled version
// try {
//   // Try to load tree-sitter-gregorio
//   Gregorio = require('tree-sitter-gregorio');
// } catch (error) {
//   console.warn('tree-sitter-gregorio not available, will use fallback parser');
// }

export class TreeSitterParser {
  private parser: any | null = null;
  private isAvailable: boolean = false;

  constructor() {
    // Tree-sitter disabled in bundled version
    // if (Gregorio) {
    //   try {
    //     this.parser = new Parser();
    //     this.parser.setLanguage(Gregorio);
    //     this.isAvailable = true;
    //   } catch (error) {
    //     // Silently fall back to TypeScript parser
    //     this.isAvailable = false;
    //   }
    // }
  }

  isTreeSitterAvailable(): boolean {
    return this.isAvailable;
  }

  parse(text: string): any | null {
    if (!this.parser) {
      return null;
    }

    try {
      return this.parser.parse(text);
    } catch (error) {
      console.error('Tree-sitter parse error:', error);
      return null;
    }
  }

  extractErrors(tree: any): ParseError[] {
    const errors: ParseError[] = [];

    const visitNode = (node: any) => {
      if (node.hasError) {
        if (node.type === 'ERROR' || node.isMissing) {
          errors.push({
            message: `Syntax error: unexpected ${node.type}`,
            range: this.nodeToRange(node),
            severity: 'error'
          });
        }
      }

      for (const child of node.children) {
        visitNode(child);
      }
    };

    visitNode(tree.rootNode);
    return errors;
  }

  findNodeAt(tree: any, position: Position): any | null {
    const point = { row: position.line, column: position.character };
    return tree.rootNode.descendantForPosition(point);
  }

  getNodeText(node: any, text: string): string {
    return text.slice(node.startIndex, node.endIndex);
  }

  nodeToRange(node: any): Range {
    return {
      start: {
        line: node.startPosition.row,
        character: node.startPosition.column
      },
      end: {
        line: node.endPosition.row,
        character: node.endPosition.column
      }
    };
  }

  /**
   * Extract headers from tree-sitter parse tree
   */
  extractHeaders(tree: any, text: string): Map<string, string> {
    const headers = new Map<string, string>();

    const findHeaders = (node: any) => {
      if (node.type === 'header' || node.type === 'header_line') {
        const nameNode = node.childForFieldName('name');
        const valueNode = node.childForFieldName('value');
        
        if (nameNode && valueNode) {
          const name = this.getNodeText(nameNode, text).toLowerCase();
          const value = this.getNodeText(valueNode, text).trim();
          headers.set(name, value);
        }
      }

      for (const child of node.children) {
        findHeaders(child);
      }
    };

    findHeaders(tree.rootNode);
    return headers;
  }

  /**
   * Extract notation syllables from tree-sitter parse tree
   */
  extractNotation(tree: any, text: string): any[] {
    const syllables: any[] = [];

    const findSyllables = (node: any) => {
      if (node.type === 'syllable' || node.type === 'word') {
        const textNode = node.childForFieldName('text');
        const notesNode = node.childForFieldName('notes');

        syllables.push({
          text: textNode ? this.getNodeText(textNode, text) : '',
          notes: notesNode ? this.getNodeText(notesNode, text) : '',
          range: this.nodeToRange(node)
        });
      }

      for (const child of node.children) {
        findSyllables(child);
      }
    };

    findSyllables(tree.rootNode);
    return syllables;
  }

  /**
   * Check if a node represents a NABC section
   */
  isNabcNode(node: any): boolean {
    return node.type === 'nabc_snippet' || node.type === 'nabc_content';
  }

  /**
   * Extract NABC snippets from a notes section
   */
  extractNabcSnippets(node: any, text: string): string[] {
    const nabcSnippets: string[] = [];

    const findNabc = (n: any) => {
      if (this.isNabcNode(n)) {
        nabcSnippets.push(this.getNodeText(n, text));
      }

      for (const child of n.children) {
        findNabc(child);
      }
    };

    findNabc(node);
    return nabcSnippets;
  }
}

export const treeSitterParser = new TreeSitterParser();
