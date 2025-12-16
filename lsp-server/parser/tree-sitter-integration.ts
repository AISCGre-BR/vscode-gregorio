/**
 * Tree-sitter Integration Module
 * Integrates tree-sitter-gregorio parser with the LSP
 */

import { ParsedDocument, ParseError, Position, Range } from '../parser/types';

// Define Parser type locally to avoid import errors when tree-sitter is not installed
type Parser = any;
type Tree = any;
type SyntaxNode = any;

// Tree-sitter is disabled in the bundled LSP server due to native module complications
// Native modules (like tree-sitter) are difficult to bundle and distribute in VS Code extensions:
// - Require platform-specific compilation (Windows, macOS, Linux, ARM, x64)
// - Cause bundling issues with esbuild/webpack
// - Increase extension size significantly
// - May fail to load due to missing dependencies or incorrect binaries
//
// The fallback TypeScript parser is robust and provides all necessary functionality
// for GABC/NABC validation and parsing without these complications.

let ParserClass: any;
let Gregorio: any;

// Explicitly disable tree-sitter loading in bundled version
const ENABLE_TREE_SITTER = false;

if (ENABLE_TREE_SITTER) {
  try {
    // Try to load tree-sitter and tree-sitter-gregorio
    ParserClass = require('tree-sitter');
    Gregorio = require('tree-sitter-gregorio');
  } catch (error) {
    // Both tree-sitter and tree-sitter-gregorio are optional
    // The LSP will use the fallback parser instead
  }
}

export class TreeSitterParser {
  private parser: any = null;
  private isAvailable: boolean = false;

  constructor() {
    // Tree-sitter is disabled in bundled version
    if (ENABLE_TREE_SITTER && ParserClass && Gregorio) {
      try {
        this.parser = new ParserClass();
        this.parser.setLanguage(Gregorio);
        this.isAvailable = true;
      } catch (error) {
        // Silently fall back to TypeScript parser
        this.isAvailable = false;
      }
    }
  }

  isTreeSitterAvailable(): boolean {
    return this.isAvailable;
  }

  parse(text: string): Tree | null {
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

  extractErrors(tree: Tree): ParseError[] {
    const errors: ParseError[] = [];

    const visitNode = (node: SyntaxNode) => {
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

  findNodeAt(tree: Tree, position: Position): SyntaxNode | null {
    const point = { row: position.line, column: position.character };
    return tree.rootNode.descendantForPosition(point);
  }

  getNodeText(node: SyntaxNode, text: string): string {
    return text.substring(node.startIndex, node.endIndex);
  }

  nodeToRange(node: SyntaxNode): Range {
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
  extractHeaders(tree: Tree, text: string): Map<string, string> {
    const headers = new Map<string, string>();
    
    const findHeaders = (node: SyntaxNode) => {
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
  extractNotation(tree: Tree, text: string): any[] {
    const syllables: any[] = [];

    const findSyllables = (node: SyntaxNode) => {
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
  isNabcNode(node: SyntaxNode): boolean {
    return node.type === 'nabc_snippet' || node.type === 'nabc_content';
  }

  /**
   * Extract NABC snippets from a notes section
   */
  extractNabcSnippets(node: SyntaxNode, text: string): string[] {
    const snippets: string[] = [];

    const findNabc = (n: SyntaxNode) => {
      if (this.isNabcNode(n)) {
        snippets.push(this.getNodeText(n, text));
      }

      for (const child of n.children) {
        findNabc(child);
      }
    };

    findNabc(node);
    return snippets;
  }
}

export const treeSitterParser = new TreeSitterParser();
