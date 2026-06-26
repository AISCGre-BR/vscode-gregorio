/**
 * GABC editor commands, powered by the gregorio-core WASM module.
 *
 * All text transformations (note shifting, fill empty groups, ligature conversion)
 * are now delegated to Rust via WASM — transform.ts has been removed.
 */

import * as vscode from "vscode";
import { getCore } from "./core-wasm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the UTF-8 byte offset of a VS Code character offset within `text`.
 * For ASCII-heavy GABC files this equals the character offset, but TextEncoder
 * handles multi-byte characters correctly.
 */
function toByteOffset(text: string, charOffset: number): number {
  return new TextEncoder().encode(text.slice(0, charOffset)).length;
}

/**
 * Applies a full-document transform: passes the entire document text (plus byte
 * range of the active selection) to `transform`, then replaces the whole document
 * if the result differs.  The Rust functions handle the `%%` boundary internally.
 */
async function applyFullDocTransform(
  editor: vscode.TextEditor,
  transform: (fullText: string, startByte: number, endByte: number) => string,
): Promise<void> {
  const document = editor.document;
  const fullText = document.getText();

  let startByte: number;
  let endByte: number;

  if (editor.selection.isEmpty) {
    // Sentinel: shift the whole body.
    startByte = 0;
    endByte = 0xffffffff;
  } else {
    startByte = toByteOffset(fullText, document.offsetAt(editor.selection.start));
    endByte = toByteOffset(fullText, document.offsetAt(editor.selection.end));
  }

  const newText = transform(fullText, startByte, endByte);
  if (newText === fullText) {
    return;
  }

  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    document.positionAt(fullText.length),
  );
  await editor.edit((builder) => builder.replace(fullRange, newText));
}

/**
 * Applies a transform to a text slice (selection or whole body after `%%`).
 * The transform receives and returns that slice; the slice's range in the document
 * is replaced with the result.
 *
 * `bodyStartChar` is the character offset (not byte offset) of the body start;
 * for GABC headers (always ASCII) this equals `body_start_byte`.
 */
async function applySliceTransform(
  editor: vscode.TextEditor,
  bodyStartChar: number,
  transform: (slice: string) => string,
): Promise<void> {
  const document = editor.document;
  const fullText = document.getText();

  let startOffset: number;
  let endOffset: number;

  if (editor.selection.isEmpty) {
    startOffset = bodyStartChar;
    endOffset = fullText.length;
  } else {
    startOffset = Math.max(document.offsetAt(editor.selection.start), bodyStartChar);
    endOffset = document.offsetAt(editor.selection.end);
  }

  if (startOffset >= endOffset) {
    return;
  }

  const slice = fullText.slice(startOffset, endOffset);
  const result = transform(slice);
  if (result === slice) {
    return;
  }

  const range = new vscode.Range(
    document.positionAt(startOffset),
    document.positionAt(endOffset),
  );
  await editor.edit((builder) => builder.replace(range, result));
}

function activeGabcEditor(): vscode.TextEditor | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "gabc") {
    vscode.window.showInformationMessage("Open a GABC file to use this command.");
    return undefined;
  }
  return editor;
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerCommands(context: vscode.ExtensionContext): void {
  const register = (id: string, handler: () => Thenable<void> | void) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

  register("gabc.noteShiftUp", async () => {
    const editor = activeGabcEditor();
    if (!editor) return;
    const core = await getCore();
    await applyFullDocTransform(editor, (text, s, e) => core.shift_notes_up(text, s, e));
  });

  register("gabc.noteShiftDown", async () => {
    const editor = activeGabcEditor();
    if (!editor) return;
    const core = await getCore();
    await applyFullDocTransform(editor, (text, s, e) => core.shift_notes_down(text, s, e));
  });

  register("gabc.fillParens", async () => {
    const editor = activeGabcEditor();
    if (!editor) return;
    const core = await getCore();
    await applyFullDocTransform(editor, (text, s, e) => core.fill_empty_groups_wasm(text, s, e));
  });

  register("gabc.convertLigaturesToTags", async () => {
    const editor = activeGabcEditor();
    if (!editor) return;
    const core = await getCore();
    // Ligature conversion is body-only. body_start_byte returns a UTF-8 byte offset;
    // for ASCII-only headers (guaranteed by the GABC spec) it equals the char offset.
    const bodyStart = core.body_start_byte(editor.document.getText());
    await applySliceTransform(editor, bodyStart, (slice) => core.ligatures_to_tags(slice));
  });

  register("gabc.convertTagsToLigatures", async () => {
    const editor = activeGabcEditor();
    if (!editor) return;
    const core = await getCore();
    const bodyStart = core.body_start_byte(editor.document.getText());
    await applySliceTransform(editor, bodyStart, (slice) => core.tags_to_ligatures(slice));
  });
}
