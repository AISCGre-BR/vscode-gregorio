import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fillParensBlock,
  getNabcLines,
  bodyStartOffset,
  ligaturesToTags,
  tagsToLigatures,
  transposeLine,
  transposeNote,
} from "../src/transform.ts";

test("transposeNote wraps cyclically and preserves case", () => {
  assert.equal(transposeNote("a", 1), "b");
  assert.equal(transposeNote("g", -1), "f");
  assert.equal(transposeNote("p", 1), "a"); // top wraps to bottom
  assert.equal(transposeNote("a", -1), "p"); // bottom wraps to top
  assert.equal(transposeNote("G", 1), "H"); // uppercase preserved
  assert.equal(transposeNote("4", 1), "4"); // non-note unchanged
});

test("transposeLine shifts only inside parentheses", () => {
  assert.equal(transposeLine("Ky(f)ri(g)e", 1), "Ky(g)ri(h)e");
  // Text outside parens is never touched.
  assert.equal(transposeLine("abc(f)", 1), "abc(g)");
});

test("transposeLine leaves bracketed attributes untouched", () => {
  assert.equal(transposeLine("(f[shape:stroke]g)", 1), "(g[shape:stroke]h)");
});

test("transposeLine with nabc-lines transposes only GABC segments", () => {
  // nabc-lines: 1 -> segment 0 = GABC, segment 1 = NABC (left alone)
  assert.equal(transposeLine("(f|vi)", 1, 1), "(g|vi)");
  // nabc-lines: 2 -> GABC, NABC, NABC, then GABC again
  assert.equal(transposeLine("(f|pu|to|g)", 1, 2), "(g|pu|to|h)");
});

test("fillParensBlock fills empty groups with the last GABC pitch", () => {
  assert.equal(fillParensBlock("(fgh) () () (ij) ()"), "(fgh) (h) (h) (ij) (j)");
  // Leading empty groups (no prior pitch) are left untouched.
  assert.equal(fillParensBlock("() (f)"), "() (f)");
});

test("fillParensBlock reads the GABC segment of NABC groups", () => {
  assert.equal(fillParensBlock("(f|vi) ()"), "(f|vi) (f)");
});

test("ligature conversions round-trip", () => {
  const tagged = ligaturesToTags("Kýrie ǽternam œcumenica");
  assert.equal(tagged, "Kýrie <sp>'ae</sp>ternam <sp>oe</sp>cumenica");
  assert.equal(tagsToLigatures(tagged), "Kýrie ǽternam œcumenica");
});

test("getNabcLines and bodyStartOffset parse the header", () => {
  const doc = "name: Test;\nnabc-lines: 2;\n%%\n(c4) a(f)";
  assert.equal(getNabcLines(doc), 2);
  assert.equal(doc.slice(bodyStartOffset(doc)), "(c4) a(f)");
  assert.equal(getNabcLines("name: Test;\n%%\n(c4)"), 0);
});
