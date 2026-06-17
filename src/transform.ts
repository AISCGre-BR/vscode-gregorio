// Pure text transformations for GABC, ported from gregorio.nvim
// (lua/gregorio/commands.lua). All functions are framework-agnostic so they can
// be unit-tested without the VS Code API.

// GABC pitch letters, in ascending order. Note that "o"/"O" is intentionally
// excluded: it is not a valid pitch letter in GABC.
const NOTES = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "p"];

const NOTE_TO_INDEX = new Map<string, number>();
NOTES.forEach((note, index) => NOTE_TO_INDEX.set(note, index));

// Characters treated as transposable pitch letters. Matches gregorio.nvim's
// `[A-Ma-mnp]` Lua pattern (uppercase A-M, lowercase a-m, plus n and p).
const PITCH_CHAR = /[A-Ma-mnp]/;

/** Transposes a single note letter by `direction` (+1 / -1), wrapping cyclically. */
export function transposeNote(letter: string, direction: number): string {
  const lower = letter.toLowerCase();
  const current = NOTE_TO_INDEX.get(lower);
  if (current === undefined) {
    return letter;
  }

  let nextIndex = current + direction;
  if (nextIndex < 0) {
    nextIndex = NOTES.length - 1;
  } else if (nextIndex >= NOTES.length) {
    nextIndex = 0;
  }

  const nextNote = NOTES[nextIndex];
  return /[A-Z]/.test(letter) ? nextNote.toUpperCase() : nextNote;
}

// Transposes note letters inside GABC note groups.
// With nabcLines > 0, only GABC segments are transposed: in a group
// (s0|s1|...|sN), segment at index i is GABC when i % (nabcLines + 1) === 0.
// Accidentals (x, y, #) and the custos (+) following a note letter pass through
// unchanged because they are not note letters.
export function transposeLine(line: string, direction: number, nabcLines = 0): string {
  const out: string[] = [];
  let inParens = false;
  let inBrackets = false;
  let segmentIndex = 0;

  for (const char of line) {
    if (char === "(") {
      inParens = true;
      inBrackets = false;
      segmentIndex = 0;
      out.push(char);
    } else if (char === ")") {
      inParens = false;
      inBrackets = false;
      out.push(char);
    } else if (inParens && !inBrackets && char === "|") {
      segmentIndex += 1;
      out.push(char);
    } else if (inParens && char === "[") {
      inBrackets = true;
      out.push(char);
    } else if (inParens && char === "]") {
      inBrackets = false;
      out.push(char);
    } else if (inParens && !inBrackets && PITCH_CHAR.test(char)) {
      const isGabc = nabcLines === 0 || segmentIndex % (nabcLines + 1) === 0;
      out.push(isGabc ? transposeNote(char, direction) : char);
    } else {
      out.push(char);
    }
  }

  return out.join("");
}

/** Applies {@link transposeLine} to every line of a multi-line block. */
export function transposeText(text: string, direction: number, nabcLines = 0): string {
  return text
    .split("\n")
    .map((line) => transposeLine(line, direction, nabcLines))
    .join("\n");
}

// Returns the last GABC note letter found in a group's content string.
// Only the GABC segment (before the first "|") is considered, and [...] blocks
// are ignored.
function lastGabcPitch(groupContent: string): string | null {
  const gabc = groupContent.split("|", 1)[0];
  let last: string | null = null;
  let inBrackets = false;
  for (const c of gabc) {
    if (c === "[") {
      inBrackets = true;
    } else if (c === "]") {
      inBrackets = false;
    } else if (!inBrackets && PITCH_CHAR.test(c)) {
      last = c;
    }
  }
  return last;
}

// Fills empty note groups with the last pitch of the preceding non-empty group.
// Example: "(fgh) () () (ij) ()" -> "(fgh) (h) (h) (ij) (j)".
// Operates on a multi-line text block, preserving cross-line state.
export function fillParensBlock(text: string): string {
  let lastPitch: string | null = null;
  const result: string[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (char === "(") {
      const close = text.indexOf(")", i);
      if (close === -1) {
        result.push(text.slice(i));
        break;
      }
      const content = text.slice(i + 1, close);
      if (/^\s*$/.test(content)) {
        result.push(lastPitch ? `(${lastPitch})` : text.slice(i, close + 1));
      } else {
        result.push(text.slice(i, close + 1));
        const pitch = lastGabcPitch(content);
        if (pitch) {
          lastPitch = pitch;
        }
      }
      i = close + 1;
    } else {
      result.push(char);
      i += 1;
    }
  }

  return result.join("");
}

/** Replaces æ/ǽ/œ ligatures with their <sp> tag equivalents. */
export function ligaturesToTags(text: string): string {
  return text
    .replace(/æ/g, "<sp>ae</sp>")
    .replace(/ǽ/g, "<sp>'ae</sp>")
    .replace(/œ/g, "<sp>oe</sp>");
}

/** Replaces <sp> ligature tags with their Unicode ligature characters. */
export function tagsToLigatures(text: string): string {
  return text
    .replace(/<sp>ae<\/sp>/g, "æ")
    .replace(/<sp>'ae<\/sp>/g, "ǽ")
    .replace(/<sp>oe<\/sp>/g, "œ");
}

// ---------------------------------------------------------------------------
// Header / body helpers
// ---------------------------------------------------------------------------

/**
 * Returns the character offset of the first body character (the start of the
 * line after the `%%` header/body separator), or 0 when no separator exists.
 */
export function bodyStartOffset(text: string): number {
  const lines = text.split("\n");
  let offset = 0;
  for (const line of lines) {
    if (/^%+\s*$/.test(line)) {
      // Position immediately after this separator line (including its newline).
      return offset + line.length + 1;
    }
    offset += line.length + 1;
  }
  return 0;
}

/** Reads the `nabc-lines` header value; returns 0 when the header is absent. */
export function getNabcLines(text: string): number {
  for (const line of text.split("\n")) {
    if (/^%+\s*$/.test(line)) {
      break;
    }
    const match = line.match(/^nabc-lines\s*:\s*(\d+)/);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }
  return 0;
}
