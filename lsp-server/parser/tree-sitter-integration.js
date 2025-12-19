"use strict";
/**
 * Tree-sitter Integration Module
 * Integrates tree-sitter-gregorio parser with the LSP
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.treeSitterParser = exports.TreeSitterParser = void 0;
const tree_sitter_1 = __importDefault(require("tree-sitter"));
let Gregorio;
try {
    // Try to load tree-sitter-gregorio
    Gregorio = require('tree-sitter-gregorio');
}
catch (error) {
    console.warn('tree-sitter-gregorio not available, will use fallback parser');
}
class TreeSitterParser {
    constructor() {
        this.parser = null;
        this.isAvailable = false;
        if (Gregorio) {
            try {
                this.parser = new tree_sitter_1.default();
                this.parser.setLanguage(Gregorio);
                this.isAvailable = true;
            }
            catch (error) {
                // Silently fall back to TypeScript parser
                this.isAvailable = false;
            }
        }
    }
    isTreeSitterAvailable() {
        return this.isAvailable;
    }
    parse(text) {
        if (!this.parser) {
            return null;
        }
        try {
            return this.parser.parse(text);
        }
        catch (error) {
            console.error('Tree-sitter parse error:', error);
            return null;
        }
    }
    extractErrors(tree) {
        const errors = [];
        const visitNode = (node) => {
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
    findNodeAt(tree, position) {
        const point = { row: position.line, column: position.character };
        return tree.rootNode.descendantForPosition(point);
    }
    getNodeText(node, text) {
        return text.substring(node.startIndex, node.endIndex);
    }
    nodeToRange(node) {
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
    extractHeaders(tree, text) {
        const headers = new Map();
        const findHeaders = (node) => {
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
    extractNotation(tree, text) {
        const syllables = [];
        const findSyllables = (node) => {
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
    isNabcNode(node) {
        return node.type === 'nabc_snippet' || node.type === 'nabc_content';
    }
    /**
     * Extract NABC snippets from a notes section
     */
    extractNabcSnippets(node, text) {
        const snippets = [];
        const findNabc = (n) => {
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
exports.TreeSitterParser = TreeSitterParser;
exports.treeSitterParser = new TreeSitterParser();
//# sourceMappingURL=tree-sitter-integration.js.map