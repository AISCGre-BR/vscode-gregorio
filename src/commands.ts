import * as vscode from "vscode";
import {
  bodyStartOffset,
  fillParensBlock,
  getNabcLines,
  ligaturesToTags,
  tagsToLigatures,
  transposeText,
} from "./transform";

type TextTransform = (text: string) => string;

/**
 * Applies `transform` to the active GABC document. When the selection is empty
 * the transform runs over the whole chant body (everything after `%%`); with a
 * selection it runs over the selected range, clamped so the header is never
 * touched. Mirrors gregorio.nvim's apply_on_body / apply_on_range behaviour.
 */
async function applyTransform(transform: TextTransform): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "gabc") {
    vscode.window.showInformationMessage("Open a GABC file to use this command.");
    return;
  }

  const document = editor.document;
  const fullText = document.getText();
  const bodyStart = bodyStartOffset(fullText);

  let startOffset: number;
  let endOffset: number;

  if (editor.selection.isEmpty) {
    startOffset = bodyStart;
    endOffset = fullText.length;
  } else {
    startOffset = Math.max(document.offsetAt(editor.selection.start), bodyStart);
    endOffset = document.offsetAt(editor.selection.end);
  }

  if (startOffset >= endOffset) {
    return;
  }

  const range = new vscode.Range(
    document.positionAt(startOffset),
    document.positionAt(endOffset),
  );
  const replacement = transform(document.getText(range));
  if (replacement === document.getText(range)) {
    return;
  }

  await editor.edit((builder) => builder.replace(range, replacement));
}

export function registerCommands(context: vscode.ExtensionContext): void {
  const register = (id: string, handler: () => Thenable<void> | void) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

  register("gabc.noteShiftUp", () =>
    applyTransform((text) => {
      const nabcLines = getNabcLines(activeFullText());
      return transposeText(text, 1, nabcLines);
    }),
  );

  register("gabc.noteShiftDown", () =>
    applyTransform((text) => {
      const nabcLines = getNabcLines(activeFullText());
      return transposeText(text, -1, nabcLines);
    }),
  );

  register("gabc.fillParens", () => applyTransform(fillParensBlock));

  register("gabc.convertLigaturesToTags", () => applyTransform(ligaturesToTags));
  register("gabc.convertTagsToLigatures", () => applyTransform(tagsToLigatures));
}

/** Full text of the active editor, used to read the nabc-lines header. */
function activeFullText(): string {
  return vscode.window.activeTextEditor?.document.getText() ?? "";
}
