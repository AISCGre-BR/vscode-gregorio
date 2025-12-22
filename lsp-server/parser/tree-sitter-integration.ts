/**
 * Tree-sitter Integration Module
 * Integrates tree-sitter-gregorio parser with the LSP
 * 
 * NOTE: Tree-sitter is disabled for VS Code extension - uses TypeScript fallback parser only
 */

import { ParsedDocument, ParseError, Position, Range } from '../parser/types';

export class TreeSitterParser {
  private parser: any = null;
  private isAvailable: boolean = false;

  constructor() {
    // Tree-sitter is disabled for VS Code extension
    // Always use TypeScript fallback parser
    this.isAvailable = false;
  }

  isTreeSitterAvailable(): boolean {
    return false; // Always disabled for VS Code extension
  }

  parse(text: string): any | null {
    return null; // Always disabled
  }

  findNodeAt(tree: any, position: Position): any | null {
    return null; // Disabled
  }

  getNodeText(node: any, text: string): string {
    return ''; // Disabled
  }

  nodeToRange(node: any): Range {
    return {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 }
    };
  }

  extractHeaders(tree: any, text: string): Map<string, string> {
    return new Map(); // Disabled
  }

  extractNotation(tree: any, text: string): any[] {
    return []; // Disabled
  }

  isNabcNode(node: any): boolean {
    return false; // Disabled
  }

  extractNabcSnippets(node: any, text: string): string[] {
    return []; // Disabled
  }

  extractErrors(tree: any): ParseError[] {
    return []; // Disabled
  }
}

export const treeSitterParser = new TreeSitterParser();
