/**
 * Loader for the gregorio-core WASM module (gregorio-wasm crate, --target nodejs).
 *
 * Call {@link initCore} once during extension activation (passing context.extensionPath),
 * then use {@link getCore} anywhere else to obtain the synchronous API.
 *
 * The module is loaded lazily and cached; concurrent callers share the same promise.
 */

import * as path from "path";

/** Synchronous API surface exposed by the WASM module. */
export interface GabcCore {
  /** Returns a JSON string: `WasmDiagnostic[]`. */
  diagnostics(text: string, optionsJson: string): string;
  /** Returns the formatted text. */
  format(text: string, optionsJson: string): string;
  /** Returns a JSON string: `{ name: string }[]`. */
  document_symbols(text: string): string;
  /**
   * Shifts notes up. Pass `start=0, end=0xFFFFFFFF` to shift the whole body.
   * Byte offsets are UTF-8 byte positions in the document string.
   */
  shift_notes_up(text: string, startByte: number, endByte: number): string;
  /** Shifts notes down. Same range convention as {@link shift_notes_up}. */
  shift_notes_down(text: string, startByte: number, endByte: number): string;
  /** Fills empty `()` groups with the last known pitch. */
  fill_empty_groups_wasm(text: string, startByte: number, endByte: number): string;
  /** Replaces æ/ǽ/œ ligatures with `<sp>` tags. */
  ligatures_to_tags(text: string): string;
  /** Replaces `<sp>` ligature tags with Unicode characters. */
  tags_to_ligatures(text: string): string;
  /** Returns the `nabc-lines` header value, or 0. */
  nabc_lines(text: string): number;
  /** Returns the UTF-8 byte offset of the first character after `%%`. */
  body_start_byte(text: string): number;
}

let _extensionPath: string | undefined;
let _corePromise: Promise<GabcCore> | undefined;

/** Called once during {@link activate}. */
export function initCore(extensionPath: string): void {
  _extensionPath = extensionPath;
}

/** Returns the loaded WASM module (loads on first call). */
export function getCore(): Promise<GabcCore> {
  if (!_corePromise) {
    _corePromise = loadCore();
  }
  return _corePromise;
}

async function loadCore(): Promise<GabcCore> {
  if (!_extensionPath) {
    throw new Error("gregorio: initCore() was not called before getCore()");
  }
  const wasmDir = path.join(_extensionPath, "wasm", "gregorio_core");
  try {
    // wasm-pack --target nodejs generates a CJS module that loads the .wasm
    // synchronously via fs.readFileSync relative to its own __dirname.
    // We require() it at runtime so esbuild leaves it as an external.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: GabcCore = require(path.join(wasmDir, "gregorio_wasm.js"));
    return mod;
  } catch (err) {
    throw new Error(
      `gregorio: failed to load WASM core from ${wasmDir}. ` +
        `Run 'npm run build:lsp-wasm' to build it. Original error: ${String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Typed helpers over raw JSON output
// ---------------------------------------------------------------------------

export interface WasmDiagnostic {
  message: string;
  severity: "error" | "warning" | "info";
  code: string | null;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  fix: {
    start_line: number;
    start_character: number;
    end_line: number;
    end_character: number;
    new_text: string;
  } | null;
}

export function parseDiagnostics(json: string): WasmDiagnostic[] {
  try {
    return JSON.parse(json) as WasmDiagnostic[];
  } catch {
    return [];
  }
}
