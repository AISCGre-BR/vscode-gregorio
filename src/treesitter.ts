import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Maps tree-sitter-gregorio highlight capture names (see
// languages/gabc/highlights.scm) to the standard semantic token types declared
// in semanticTokens.ts. Longer (dotted) capture names are matched first.
const CAPTURE_TO_TOKEN: Array<[string, string]> = [
  ["constant.builtin", "number"], // GABC pitch letters
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
      const builder = new vscode.SemanticTokensBuilder(legend);
      const captures = this.query.captures(tree.rootNode);

      for (const { name, node } of captures) {
        const tokenType = captureToTokenType(name);
        if (tokenType === undefined) {
          continue;
        }
        const idx = typeIndex.get(tokenType);
        if (idx === undefined) {
          continue;
        }
        // Semantic tokens cannot span multiple lines.
        if (node.startPosition.row !== node.endPosition.row) {
          continue;
        }
        const length = node.endPosition.column - node.startPosition.column;
        if (length > 0) {
          builder.push(node.startPosition.row, node.startPosition.column, length, idx);
        }
      }

      tree.delete?.();
      return builder.build();
    } catch (error) {
      console.warn("[gregorio] tree-sitter tokenization failed:", error);
      return null;
    }
  }
}
