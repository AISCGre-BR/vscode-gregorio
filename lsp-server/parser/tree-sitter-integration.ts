/**
 * Tree-sitter Integration Module
 * Integrates tree-sitter-gregorio parser with the LSP
 * 
 * Can be disabled via environment variable: DISABLE_TREE_SITTER=true
 */

import { ParsedDocument, ParseError, Position, Range } from '../parser/types';

// Type declarations for tree-sitter (when not available as static import)
declare namespace Parser {
  interface SyntaxNode {
    type: string;
    text: string;
    startPosition: { row: number; column: number };
    endPosition: { row: number; column: number };
    startIndex: number;
    endIndex: number;
    children: SyntaxNode[];
    childCount: number;
    parent: SyntaxNode | null;
    hasError(): boolean;
    isMissing: boolean;
    childForFieldName(name: string): SyntaxNode | null;
    descendantForPosition(point: { row: number; column: number }): SyntaxNode | null;
  }
  
  interface Tree {
    rootNode: SyntaxNode;
    walk(): TreeCursor;
  }
  
  interface TreeCursor {
    currentNode: SyntaxNode;
    gotoFirstChild(): boolean;
    gotoNextSibling(): boolean;
    gotoParent(): boolean;
  }
}

let Parser: any;
let Gregorio: any;

// Check if tree-sitter should be disabled
const TREE_SITTER_DISABLED = process.env.DISABLE_TREE_SITTER === 'true';

if (!TREE_SITTER_DISABLED) {
  try {
    // Try to load tree-sitter dynamically
    Parser = require('tree-sitter');
    // Try to load tree-sitter-gregorio
    Gregorio = require('tree-sitter-gregorio');
  } catch (error) {
    console.warn('tree-sitter not available, will use fallback parser');
  }
}

export class TreeSitterParser {
  private parser: any = null;
  private isAvailable: boolean = false;
  private forceDisabled: boolean = false;

  constructor(options?: { disabled?: boolean }) {
    this.forceDisabled = options?.disabled || TREE_SITTER_DISABLED;
    
    if (!this.forceDisabled && Gregorio) {
      try {
        this.parser = new Parser();
        this.parser.setLanguage(Gregorio);
        this.isAvailable = true;
      } catch (error) {
        // Silently fall back to TypeScript parser
        this.isAvailable = false;
      }
    }
  }

  isTreeSitterAvailable(): boolean {
    return !this.forceDisabled && this.isAvailable;
  }

  parse(text: string): Parser.Tree | null {
    if (!this.parser || this.forceDisabled) {
      return null;
    }

    try {
      return this.parser.parse(text);
    } catch (error) {
      console.error('Tree-sitter parse error:', error);
      return null;
    }
  }

  extractErrors(tree: Parser.Tree): ParseError[] {
    const errors: ParseError[] = [];

    const visitNode = (node: Parser.SyntaxNode) => {
      if (node.hasError()) {
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

  findNodeAt(tree: Parser.Tree, position: Position): Parser.SyntaxNode | null {
    const point = { row: position.line, column: position.character };
    return tree.rootNode.descendantForPosition(point);
  }

  getNodeText(node: Parser.SyntaxNode, text: string): string {
    return text.substring(node.startIndex, node.endIndex);
  }

  nodeToRange(node: Parser.SyntaxNode): Range {
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
  extractHeaders(tree: Parser.Tree, text: string): Map<string, string> {
    const headers = new Map<string, string>();
    
    const findHeaders = (node: Parser.SyntaxNode) => {
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
  extractNotation(tree: Parser.Tree, text: string): any[] {
    const syllables: any[] = [];

    const findSyllables = (node: Parser.SyntaxNode) => {
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
  isNabcNode(node: Parser.SyntaxNode): boolean {
    return node.type === 'nabc_snippet' || node.type === 'nabc_content';
  }

  /**
   * Extract NABC snippets from a notes section
   */
  extractNabcSnippets(node: Parser.SyntaxNode, text: string): string[] {
    const snippets: string[] = [];

    const findNabc = (n: Parser.SyntaxNode) => {
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

// Export singleton instance
// Can be overridden by creating a new instance with { disabled: true }
export const treeSitterParser = new TreeSitterParser();
