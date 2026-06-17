#!/usr/bin/env bash
# Builds the tree-sitter-gregorio WASM grammar used by the semantic-highlighting
# layer, and copies it (plus the web-tree-sitter runtime) into ./parser.
#
# Requirements:
#   - tree-sitter CLI (npm i -g tree-sitter-cli) and either Docker or Emscripten
#   - the project's npm dependencies installed (for web-tree-sitter's runtime wasm)
#
# The grammar version is pinned to match zed-gregorio / gregorio.nvim.
set -euo pipefail

GRAMMAR_REPO="https://github.com/AISCGre-BR/tree-sitter-gregorio"
GRAMMAR_REV="c9034de8f8c1c1605e9ccde29500f08e72ea51ff" # v0.5.2

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PARSER_DIR="$ROOT/parser"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$PARSER_DIR"

echo "==> Cloning tree-sitter-gregorio @ ${GRAMMAR_REV:0:8}"
git clone --quiet "$GRAMMAR_REPO" "$WORK/grammar"
git -C "$WORK/grammar" checkout --quiet "$GRAMMAR_REV"

echo "==> Generating parser"
( cd "$WORK/grammar" && tree-sitter generate )

echo "==> Building WASM grammar"
( cd "$WORK/grammar" && tree-sitter build --wasm )

cp "$WORK/grammar"/tree-sitter-gregorio.wasm "$PARSER_DIR/tree-sitter-gregorio.wasm"

echo "==> Copying web-tree-sitter runtime"
RUNTIME="$ROOT/node_modules/web-tree-sitter/tree-sitter.wasm"
if [[ -f "$RUNTIME" ]]; then
  cp "$RUNTIME" "$PARSER_DIR/tree-sitter.wasm"
else
  echo "WARNING: web-tree-sitter runtime not found at $RUNTIME (run 'npm install' first)." >&2
fi

echo "==> Done. Artifacts in $PARSER_DIR:"
ls -l "$PARSER_DIR"
