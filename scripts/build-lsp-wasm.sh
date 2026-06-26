#!/usr/bin/env bash
# Builds gregorio-core as a Node.js WASM module and copies the artifacts into
# ./wasm/gregorio_core/ for bundling with the VS Code extension.
#
# Requirements:
#   - Rust toolchain (rustup, cargo) with wasm32-unknown-unknown target
#   - wasm-pack (cargo install wasm-pack)
#
# Run from the vscode-gregorio/ root directory, or from the repo root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$EXT_DIR/.." && pwd)"
WASM_CRATE="$REPO_ROOT/gregorio-lsp/crates/gregorio-wasm"
OUT_DIR="$EXT_DIR/wasm/gregorio_core"

if ! command -v wasm-pack &>/dev/null; then
  echo "Error: wasm-pack not found. Install with: cargo install wasm-pack" >&2
  exit 1
fi

echo "==> Building gregorio-wasm (--target nodejs)"
wasm-pack build "$WASM_CRATE" \
  --target nodejs \
  --out-dir "$OUT_DIR" \
  --release

echo "==> Removing wasm-pack metadata files"
rm -f "$OUT_DIR/.gitignore" "$OUT_DIR/package.json" "$OUT_DIR/README.md"

echo "==> Done. Artifacts in $OUT_DIR:"
ls -lh "$OUT_DIR"
