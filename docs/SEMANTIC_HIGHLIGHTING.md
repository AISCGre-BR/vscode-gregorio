# Semantic Syntax Highlighting

The vscode-gregorio extension provides advanced semantic syntax highlighting for GABC files using the bundled parser. This offers more accurate and context-aware highlighting compared to traditional TextMate grammars.

## What is Semantic Highlighting?

Semantic highlighting uses the parser to understand the **structure and meaning** of your code, not just pattern matching. This provides:

- **Context-aware colors**: Elements are colored based on their role in the document
- **Accurate highlighting**: No false positives from regex patterns
- **Structural understanding**: Highlights based on parse tree, not just syntax

## Features

### Header Highlighting

- **Property names**: Header field names (e.g., `name:`, `mode:`)
- **Values**: Header values highlighted as strings
- **Operators**: Colons and semicolons
- **Comments**: Inline comments within headers

### Notation Highlighting

- **Clefs**: `c1`, `c2`, `c3`, `c4`, `f1`, `f2`, `f3`, `f4`
- **Notes**: Different colors based on note type
  - **Standard notes**: Regular pitches (a-m)
  - **Virgas**: Special highlighting for virga shapes
  - **Quilismas**: Distinct color for quilisma notes
  - **Oriscus**: Unique highlighting
  - **Liquescent**: Styled differently
  - **Accidentals**: Flats (x), sharps (#), naturals (y)

- **Bars**: Division markers (`,`, `;`, `:`, `::`, etc.)
- **Modifiers**: Note modifiers and attributes
- **Custos**: Guide notes at line endings
- **Attributes**: GABC attributes in angle brackets

### NABC Highlighting

- NABC snippets (St. Gall notation) receive special highlighting
- Pipe separators clearly marked

## Configuration

### Enable/Disable Semantic Highlighting

```json
{
  "gregorio.highlighting.semantic": true
}
```

Set to `false` to use only TextMate grammar highlighting.

### Toggle Command

Use the command palette:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
2. Type "Gregorio: Toggle Semantic Highlighting"
3. Press Enter

This immediately enables or disables semantic highlighting.

## Color Customization

### Using Built-in Themes

The extension provides default colors for both light and dark themes. The semantic tokens integrate seamlessly with VS Code's built-in themes.

### Custom Colors

You can customize semantic token colors in your settings:

```json
{
  "editor.semanticTokenColorCustomizations": {
    "[Your Theme Name]": {
      "enabled": true,
      "rules": {
        "property:gabc": "#9CDCFE",
        "keyword:gabc": "#C586C0",
        "class:gabc": "#4EC9B0",
        "decorator:gabc": "#DCDCAA",
        "macro:gabc": "#569CD6",
        "parameter:gabc": "#9CDCFE",
        "variable:gabc": "#4FC1FF",
        "customLiteral:gabc": "#CE9178"
      }
    }
  }
}
```

### Token Types

Available semantic token types for GABC:

| Token Type | Used For | Default Color (Dark) |
|------------|----------|---------------------|
| `property` | Header names | Light blue |
| `keyword` | Clefs, accidentals | Purple |
| `string` | Header values | Orange |
| `comment` | Comments | Green |
| `operator` | Bars, separators | White |
| `parameter` | Custos, attributes | Light blue |
| `variable` | Standard notes | Blue |
| `class` | Virgas | Cyan |
| `decorator` | Quilismas, oriscus | Yellow |
| `macro` | Strophas | Blue |
| `type` | Liquescent notes | Cyan |
| `modifier` | Note modifiers | White |
| `customLiteral` | Cavum notes | Orange |

## Semantic vs TextMate Grammar

### When Semantic Highlighting Excels

- **Complex structures**: Better at understanding nested constructs
- **Context sensitivity**: Colors change based on document structure
- **Accuracy**: No false positives from pattern matching
- **Performance**: Efficient for large documents

### When TextMate Grammar is Used

- **Fallback**: If semantic highlighting is disabled
- **Initial load**: TextMate provides immediate highlighting before parsing
- **Errors**: If parser encounters issues, TextMate provides baseline highlighting
- **Compatibility**: Works in environments without semantic token support

The extension uses **both** simultaneously:
1. TextMate grammar provides immediate, fast highlighting
2. Semantic tokens overlay more accurate, context-aware colors

## Performance

Semantic highlighting is designed to be fast:

- **Incremental**: Only reparses on document changes
- **Async**: Doesn't block the editor
- **Cached**: Parse results reused when possible
- **Optimized**: Uses the efficient TypeScript parser

For typical GABC files (100-500 lines), parsing takes 10-20ms, imperceptible to users.

## Troubleshooting

### Semantic Highlighting Not Working

1. Check that it's enabled:
   ```json
   "gregorio.highlighting.semantic": true
   ```

2. Verify your theme supports semantic tokens:
   - Most modern themes do
   - Try switching to "Dark+" or "Light+" themes

3. Check the Output panel:
   - View > Output
   - Select "Gregorio Language Support"
   - Look for parser errors

### Colors Look Wrong

1. Try a built-in theme first (Dark+, Light+)
2. Check if your theme overrides semantic tokens
3. Customize colors using `editor.semanticTokenColorCustomizations`

### Performance Issues

If semantic highlighting causes slowdown:

1. Disable it temporarily:
   ```json
   "gregorio.highlighting.semantic": false
   ```

2. Report the issue with:
   - File size
   - Document complexity
   - Performance measurements

## Technical Details

### Architecture

```
GABC Document
     ↓
GabcParser (TypeScript)
     ↓
Parse Tree (AST)
     ↓
SemanticTokensProvider
     ↓
Semantic Tokens (positions + types)
     ↓
VS Code Renderer
     ↓
Highlighted Document
```

### Token Legend

The extension defines a legend mapping token types to semantic meanings:

```typescript
const tokenTypes = [
  'header', 'keyword', 'string', 'comment', 'number',
  'operator', 'parameter', 'property', 'variable',
  'function', 'class', 'namespace', 'type', 'decorator',
  'macro', 'regexp', 'label', 'modifier', 'customLiteral'
];

const tokenModifiers = [
  'declaration', 'definition', 'readonly', 'static',
  'deprecated', 'abstract', 'async', 'modification',
  'documentation', 'defaultLibrary'
];
```

### Position Tracking

The parser tracks precise positions for all elements:

```typescript
interface Range {
  start: { line: number; character: number };
  end: { line: number; character: number };
}
```

This enables accurate token placement without regex heuristics.

## Future Enhancements

Planned improvements:

1. **Syllable text highlighting**: Style tags within syllables
2. **NABC detail**: Individual NABC glyphs
3. **Semantic tooltips**: Hover information using parse tree
4. **Error highlighting**: Visual distinction for parse errors
5. **Folding ranges**: Code folding based on structure
6. **Document outline**: Hierarchical view of document

## Comparison with Tree-sitter

The extension uses a TypeScript parser instead of tree-sitter for semantic highlighting:

**Advantages:**
- No native dependencies
- Works everywhere (cross-platform)
- Easy to maintain and debug
- Fast enough for interactive use (~10-20ms)

**Tree-sitter** would be faster (~5-10ms) but requires native compilation, complicating distribution.

For GABC files, the performance difference is negligible, and the TypeScript parser provides all necessary functionality.

## Related Settings

- `gregorio.highlighting.semantic` - Enable/disable semantic highlighting
- `editor.semanticHighlighting.enabled` - VS Code global setting (must be enabled)
- `editor.semanticTokenColorCustomizations` - Customize token colors

## See Also

- [LINTING.md](LINTING.md) - Diagnostic features
- [ARCHITECTURE.md](ARCHITECTURE.md) - Parser and bundling details
- [VS Code Semantic Highlighting Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide)
