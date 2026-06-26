import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Maps tree-sitter-gregorio highlight capture names (see
// languages/gabc/highlights.scm) to the standard semantic token types declared
// in semanticTokens.ts. Longer (dotted) capture names are matched first.
const CAPTURE_TO_TOKEN: Array<[string, string]> = [
  ["constant.builtin", "type"], // GABC pitch letters
  ["variable.special", "variable"], // NABC significant / Tironian letters
  ["string.special", "string"],
  ["string.escape", "string"],
  ["keyword.directive", "keyword"],
  ["keyword.control", "keyword"],
  ["punctuation.special", "operator"],
  ["punctuation.delimiter", "operator"],
  ["punctuation.bracket", "operator"],
  ["attribute", "keyword"], // header names
  ["string", "string"],
  ["number", "number"],
  ["comment", "comment"],
  ["operator", "operator"],
  ["keyword", "keyword"],
  ["function", "function"], // NABC structure
  ["property", "function"], // NABC glyphs — emphasise the GABC/NABC alternation
  ["type", "property"],
];

function captureToTokenType(capture: string): string | undefined {
  for (const [prefix, token] of CAPTURE_TO_TOKEN) {
    if (capture === prefix || capture.startsWith(prefix + ".")) {
      return token;
    }
  }
  return undefined;
}

/**
 * Wraps web-tree-sitter and the tree-sitter-gregorio WASM grammar. The grammar
 * is an optional, separately built artifact (see scripts/build-wasm.sh): when it
 * is absent or web-tree-sitter cannot initialise, {@link tokenize} returns null
 * and the caller falls back to the built-in tokenizer.
 */
export class TreeSitterHighlighter {
  private enabled: boolean;
  private ready = false;
  private initFailed = false;
  // Loaded lazily and kept untyped to avoid a hard dependency at activation time.
  private parser: any;
  private query: any;

  constructor(private readonly extensionPath: string) {
    this.enabled = vscode.workspace
      .getConfiguration("gregorio")
      .get<boolean>("semanticHighlighting.enabled", true);
  }

  private grammarWasmPath(): string {
    return path.join(this.extensionPath, "parser", "tree-sitter-gregorio.wasm");
  }

  private runtimeWasmPath(): string {
    return path.join(this.extensionPath, "parser", "tree-sitter.wasm");
  }

  private highlightsQueryPath(): string {
    return path.join(this.extensionPath, "languages", "gabc", "highlights.scm");
  }

  private async ensureReady(): Promise<boolean> {
    if (this.ready) {
      return true;
    }
    if (this.initFailed || !this.enabled) {
      return false;
    }
    if (!fs.existsSync(this.grammarWasmPath())) {
      // No grammar built yet: fall back silently.
      this.initFailed = true;
      return false;
    }

    try {
      // Dynamic import so a missing/incompatible module never breaks activation.
      const TS: any = await import("web-tree-sitter");
      const Parser = TS.Parser ?? TS.default ?? TS;
      const runtime = this.runtimeWasmPath();
      await Parser.init(
        fs.existsSync(runtime) ? { locateFile: () => runtime } : undefined,
      );

      const Language = TS.Language ?? Parser.Language;
      const lang = await Language.load(this.grammarWasmPath());

      this.parser = new Parser();
      this.parser.setLanguage(lang);

      const source = fs.readFileSync(this.highlightsQueryPath(), "utf8");
      const Query = TS.Query ?? Parser.Query;
      this.query = Query ? new Query(lang, source) : lang.query(source);

      this.ready = true;
      return true;
    } catch (error) {
      this.initFailed = true;
      console.warn("[gregorio] tree-sitter highlighting unavailable:", error);
      return false;
    }
  }

  async tokenize(
    document: vscode.TextDocument,
    legend: vscode.SemanticTokensLegend,
    typeIndex: Map<string, number>,
  ): Promise<vscode.SemanticTokens | null> {
    if (!(await this.ensureReady())) {
      return null;
    }

    try {
      const tree = this.parser.parse(document.getText());
      const captures = this.query.captures(tree.rootNode);

      // Collect tokens as (row, col, length, idx) tuples so we can merge
      // the tree-sitter results with the comment fallback scan below.
      interface Tok { row: number; col: number; len: number; idx: number }
      const tokens: Tok[] = [];

      for (const { name, node } of captures) {
        const tokenType = captureToTokenType(name);
        if (tokenType === undefined) continue;
        const idx = typeIndex.get(tokenType);
        if (idx === undefined) continue;

        // Semantic tokens cannot span multiple lines.
        let endRow = node.endPosition.row;
        let endCol = node.endPosition.column;
        if (endRow !== node.startPosition.row) {
          if (endRow === node.startPosition.row + 1 && endCol === 0) {
            // Node includes trailing newline — clamp to end of start row.
            endRow = node.startPosition.row;
            endCol = document.lineAt(endRow).text.length;
          } else {
            continue; // genuinely multi-line — skip
          }
        }
        const len = endCol - node.startPosition.column;
        if (len > 0) {
          tokens.push({ row: node.startPosition.row, col: node.startPosition.column, len, idx });
        }
      }

      // Fallback: ensure whole-line % comments are always highlighted even if
      // the tree-sitter query misses them (e.g., header comments in some grammars).
      const commentIdx = typeIndex.get("comment");
      if (commentIdx !== undefined) {
        const coveredRows = new Set(tokens.filter(t => t.idx === commentIdx).map(t => t.row));
        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
          if (coveredRows.has(lineNum)) continue;
          const lineText = document.lineAt(lineNum).text;
          if (/^%%/.test(lineText)) continue; // section separator
          if (/^\s*%/.test(lineText)) {
            const trimmed = lineText.trimEnd();
            tokens.push({ row: lineNum, col: 0, len: trimmed.length || 1, idx: commentIdx });
          }
        }
      }

      // SemanticTokensBuilder requires tokens in ascending (row, col) order
      // with no overlaps (tree-sitter sometimes emits nested nodes for the
      // same text range, e.g. a %% body comment produces two @comment captures).
      tokens.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);

      const builder = new vscode.SemanticTokensBuilder(legend);
      let lastRow = -1;
      let lastColEnd = 0;
      for (const t of tokens) {
        if (t.row !== lastRow) { lastRow = t.row; lastColEnd = 0; }
        if (t.col < lastColEnd) continue; // overlapping — skip
        builder.push(t.row, t.col, t.len, t.idx);
        lastColEnd = t.col + t.len;
      }

      tree.delete?.();
      return builder.build();
    } catch (error) {
      console.warn("[gregorio] tree-sitter tokenization failed:", error);
      return null;
    }
  }
}
