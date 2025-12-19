/**
 * Tree-sitter Integration Module
 * Integrates tree-sitter-gregorio parser with the LSP
 */
import Parser from 'tree-sitter';
import { ParseError, Position, Range } from '../parser/types';
export declare class TreeSitterParser {
    private parser;
    private isAvailable;
    constructor();
    isTreeSitterAvailable(): boolean;
    parse(text: string): Parser.Tree | null;
    extractErrors(tree: Parser.Tree): ParseError[];
    findNodeAt(tree: Parser.Tree, position: Position): Parser.SyntaxNode | null;
    getNodeText(node: Parser.SyntaxNode, text: string): string;
    nodeToRange(node: Parser.SyntaxNode): Range;
    /**
     * Extract headers from tree-sitter parse tree
     */
    extractHeaders(tree: Parser.Tree, text: string): Map<string, string>;
    /**
     * Extract notation syllables from tree-sitter parse tree
     */
    extractNotation(tree: Parser.Tree, text: string): any[];
    /**
     * Check if a node represents a NABC section
     */
    isNabcNode(node: Parser.SyntaxNode): boolean;
    /**
     * Extract NABC snippets from a notes section
     */
    extractNabcSnippets(node: Parser.SyntaxNode, text: string): string[];
}
export declare const treeSitterParser: TreeSitterParser;
//# sourceMappingURL=tree-sitter-integration.d.ts.map