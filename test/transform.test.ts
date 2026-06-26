/**
 * Smoke tests for GABC text transformation helpers.
 *
 * The core transformation logic (note shifting, fill empty groups, ligature
 * conversion) was moved to the gregorio-core Rust crate and is tested
 * exhaustively by `cargo test` in `gregorio-lsp/crates/gregorio-core/`.
 *
 * These tests cover only the thin TS helpers that remain in the extension:
 * the parseNabcLinesLocal fallback used by semanticTokens.ts, and the
 * byte-offset helper used by commands.ts.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// parseNabcLinesLocal (inlined copy of the fallback in semanticTokens.ts)
// ---------------------------------------------------------------------------

function parseNabcLinesLocal(text: string): number {
  for (const line of text.split("\n")) {
    if (/^%+\s*$/.test(line)) break;
    const match = line.match(/^nabc-lines\s*:\s*(\d+)/);
    if (match) return Number.parseInt(match[1], 10);
  }
  return 0;
}

test("parseNabcLinesLocal returns 0 when header is absent", () => {
  assert.equal(parseNabcLinesLocal("name: Test;\n%%\n(c4) a(f)"), 0);
});

test("parseNabcLinesLocal returns the nabc-lines value", () => {
  const doc = "name: Test;\nnabc-lines: 2;\n%%\n(c4) a(f)";
  assert.equal(parseNabcLinesLocal(doc), 2);
});

test("parseNabcLinesLocal stops at the %% separator", () => {
  const doc = "name: Test;\n%%\nnabc-lines: 3;\n(c4)";
  assert.equal(parseNabcLinesLocal(doc), 0);
});

// ---------------------------------------------------------------------------
// toByteOffset (inlined copy of the helper in commands.ts)
// ---------------------------------------------------------------------------

function toByteOffset(text: string, charOffset: number): number {
  return new TextEncoder().encode(text.slice(0, charOffset)).length;
}

test("toByteOffset equals charOffset for ASCII text", () => {
  const text = "Kyrie(f)";
  assert.equal(toByteOffset(text, 5), 5);
});

test("toByteOffset accounts for multi-byte characters", () => {
  // 'æ' is U+00E6, encoded as 2 bytes in UTF-8.
  const text = "aeæ";
  assert.equal(toByteOffset(text, 2), 2); // "ae" → 2 bytes
  assert.equal(toByteOffset(text, 3), 4); // "aeæ" → 4 bytes
});
