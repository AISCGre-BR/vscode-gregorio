import * as vscode from "vscode";
import { TreeSitterHighlighter } from "./treesitter";
import { getCore } from "./core-wasm";

// Standard semantic token types. Themes that support semantic highlighting map
// these to colors automatically. GABC pitches use `number` and NABC blocks use
// `function`, which makes the GABC/NABC alternation visually distinct.
export const TOKEN_TYPES = [
  "keyword", // header names, clefs
  "string", // header values
  "number", // numeric header values (mode, staff-lines, …)
  "comment", // % comments
  "operator", // %% separator, "|" segment separator, bars, parentheses
  "function", // NABC neume segments
  "variable", // NABC significant / Tironian letters (tree-sitter path)
  "property", // misc GABC structure
  "type", // GABC pitch letters — maps to entity.name.type → teal in most themes
] as const;

export const LEGEND = new vscode.SemanticTokensLegend(TOKEN_TYPES as unknown as string[]);

const TYPE_INDEX = new Map(TOKEN_TYPES.map((t, i) => [t, i]));
function ti(type: (typeof TOKEN_TYPES)[number]): number {
  return TYPE_INDEX.get(type)!;
}

const NUMERIC_HEADERS = new Set(["mode", "staff-lines", "nabc-lines", "initial-style"]);
const PITCH = /[a-npA-NP]/;
const BAR = /[,;:`^]/;

/**
 * Document semantic tokens provider for GABC.
 *
 * Primary strategy: tree-sitter-gregorio (via {@link TreeSitterHighlighter}),
 * whose external scanner resolves the GABC/NABC alternation governed by the
 * `nabc-lines` header at parse time. When the tree-sitter grammar (WASM) is not
 * available, it falls back to a built-in tokenizer that reproduces the same
 * `nabc-lines`-aware alternation so the feature works out of the box.
 */
export class GabcSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  constructor(private readonly treeSitter: TreeSitterHighlighter) {}

  async provideDocumentSemanticTokens(
    document: vscode.TextDocument,
  ): Promise<vscode.SemanticTokens> {
    const fromTreeSitter = await this.treeSitter.tokenize(document, LEGEND, TYPE_INDEX);
    if (fromTreeSitter) {
      return fromTreeSitter;
    }
    // Fallback: use nabc_lines from WASM if available, otherwise parse locally.
    let nabcLines = 0;
    try {
      const core = await getCore();
      nabcLines = core.nabc_lines(document.getText());
    } catch {
      nabcLines = parseNabcLinesLocal(document.getText());
    }
    return this.builtinTokens(document, nabcLines);
  }

  /** nabc-lines-aware fallback tokenizer (no tree-sitter dependency). */
  private builtinTokens(document: vscode.TextDocument, nabcLines: number): vscode.SemanticTokens {
    const builder = new vscode.SemanticTokensBuilder(LEGEND);
    let inBody = false;

    for (let line = 0; line < document.lineCount; line++) {
      const text = document.lineAt(line).text;

      // Section separator (%% — only the first one, while still in the header).
      if (!inBody && /^%%\s*$/.test(text)) {
        builder.push(line, 0, text.trimEnd().length, ti("keyword"));
        inBody = true;
        continue;
      }

      // Whole-line comment.
      if (/^\s*%/.test(text)) {
        builder.push(line, 0, text.length, ti("comment"));
        continue;
      }

      if (!inBody) {
        this.tokenizeHeaderLine(builder, line, text);
      } else {
        this.tokenizeBodyLine(builder, line, text, nabcLines);
      }
    }

    return builder.build();
  }

  private tokenizeHeaderLine(
    builder: vscode.SemanticTokensBuilder,
    line: number,
    text: string,
  ): void {
    const match = text.match(/^(\s*)([^:%]+?)(\s*):/);
    if (!match) {
      return;
    }
    const name = match[2];
    const nameStart = match[1].length;
    builder.push(line, nameStart, name.length, ti("keyword"));

    const colonIndex = text.indexOf(":", nameStart + name.length);
    const valueStart = colonIndex + 1;
    const valueRaw = text.slice(valueStart).replace(/;.*$/, "");
    const trimmed = valueRaw.trimStart();
    if (trimmed.length === 0) {
      return;
    }
    const valueOffset = valueStart + (valueRaw.length - trimmed.length);
    const isNumeric = NUMERIC_HEADERS.has(name.trim()) && /^\d+\s*$/.test(trimmed);
    builder.push(
      line,
      valueOffset,
      trimmed.trimEnd().length,
      isNumeric ? ti("number") : ti("string"),
    );

    // Inline % comment after the header's closing semicolon: `key: value; % comment`
    const semiIdx = text.lastIndexOf(";");
    if (semiIdx > colonIndex) {
      const tail = text.slice(semiIdx + 1);
      const pctMatch = tail.match(/^(\s*)(%.*)/);
      if (pctMatch) {
        const commentStart = semiIdx + 1 + pctMatch[1].length;
        builder.push(line, commentStart, pctMatch[2].length, ti("comment"));
      }
    }
  }

  private tokenizeBodyLine(
    builder: vscode.SemanticTokensBuilder,
    line: number,
    text: string,
    nabcLines: number,
  ): void {
    // Inline comment.
    const commentAt = text.search(/(?<!%)%(?!%)/);
    const limit = commentAt >= 0 ? commentAt : text.length;

    const groupRe = /\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = groupRe.exec(text)) !== null) {
      if (m.index >= limit) {
        break;
      }
      const contentStart = m.index + 1;
      this.tokenizeGroup(builder, line, m[1], contentStart, nabcLines);
    }

    // Push the inline comment token AFTER all group tokens so the builder
    // receives tokens in ascending column order (required by SemanticTokensBuilder).
    if (commentAt >= 0) {
      builder.push(line, commentAt, text.length - commentAt, ti("comment"));
    }
  }

  /** Tokenizes the content of a single (...) note group. */
  private tokenizeGroup(
    builder: vscode.SemanticTokensBuilder,
    line: number,
    content: string,
    contentStart: number,
    nabcLines: number,
  ): void {
    let segmentIndex = 0;
    let cursor = 0; // offset within `content` of the current segment start

    const segments = content.split("|");
    for (const segment of segments) {
      const segStart = contentStart + cursor;
      const isGabc = nabcLines === 0 || segmentIndex % (nabcLines + 1) === 0;

      if (isGabc) {
        this.tokenizeGabcSegment(builder, line, segment, segStart);
      } else if (segment.length > 0) {
        // NABC block: color the whole segment to mark the alternation clearly.
        builder.push(line, segStart, segment.length, ti("function"));
      }

      cursor += segment.length;
      if (cursor < content.length) {
        // The "|" separator between segments.
        builder.push(line, contentStart + cursor, 1, ti("operator"));
        cursor += 1;
      }
      segmentIndex += 1;
    }
  }

  private tokenizeGabcSegment(
    builder: vscode.SemanticTokensBuilder,
    line: number,
    segment: string,
    segStart: number,
  ): void {
    let inBrackets = false;
    for (let i = 0; i < segment.length; i++) {
      const c = segment[i];
      if (c === "[") {
        inBrackets = true;
      } else if (c === "]") {
        inBrackets = false;
      } else if (inBrackets) {
        continue;
      } else if (PITCH.test(c)) {
        builder.push(line, segStart + i, 1, ti("type"));
      } else if (BAR.test(c)) {
        builder.push(line, segStart + i, 1, ti("operator"));
      }
    }
  }
}

// Pure-TS fallback for nabc-lines parsing (used when WASM is not yet available).
function parseNabcLinesLocal(text: string): number {
  for (const line of text.split("\n")) {
    if (/^%+\s*$/.test(line)) break;
    const match = line.match(/^nabc-lines\s*:\s*(\d+)/);
    if (match) return Number.parseInt(match[1], 10);
  }
  return 0;
}
