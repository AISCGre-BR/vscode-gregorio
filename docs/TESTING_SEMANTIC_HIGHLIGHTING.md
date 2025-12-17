# Testing Semantic Highlighting

This guide helps you verify that semantic highlighting is working correctly in the vscode-gregorio extension.

## Prerequisites

1. **VS Code semantic highlighting must be enabled**
   
   Check your settings:
   ```json
   {
     "editor.semanticHighlighting.enabled": true
   }
   ```
   
   The extension will warn you if this is disabled and offer to enable it.

2. **Extension semantic highlighting enabled**
   
   ```json
   {
     "gregorio.highlighting.semantic": true
   }
   ```
   
   This is enabled by default.

## How to Test

### Method 1: Use the Example File

1. Open `examples/semantic-highlighting.gabc` in VS Code
2. Look for these visual differences from basic TextMate grammar:
   - **Headers**: Property names should be distinct from values
   - **Clefs**: `c4`, `f3` should be highlighted as keywords
   - **Note shapes**: Different colors for virga, quilisma, oriscus
   - **Bars**: Divisions (`,`, `;`, `:`, `::`) clearly marked
   - **Modifiers**: Note modifiers have distinct coloring

### Method 2: Check the Developer Console

1. Open VS Code Developer Tools:
   - **Help** → **Toggle Developer Tools**
   - Or press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)

2. Go to the **Console** tab

3. Open a `.gabc` file

4. Look for these log messages:
   ```
   [Gregorio] Extension is now active!
   [Gregorio] VS Code semantic highlighting enabled: true
   [Gregorio] Registering semantic tokens provider
   [Gregorio] Semantic tokens provider registered
   [Gregorio] Semantic tokens provider called for: file:///path/to/file.gabc
   [Gregorio] Semantic highlighting enabled: true
   [Gregorio] Parsing document, length: 1234
   [Gregorio] Parse complete. Headers: 4 Syllables: 10 Errors: 0
   [Gregorio] Built tokens, data length: 150
   ```

5. If you see these messages, semantic highlighting is working!

### Method 3: Compare Themes

Semantic highlighting works best with themes that support semantic tokens:

1. Try **Dark+ (default dark)** theme
2. Try **Light+ (default light)** theme
3. Notice how GABC elements have richer, more varied colors

### Method 4: Toggle On/Off

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run: **Gregorio: Toggle Semantic Highlighting**
3. Notice the difference when it's off (only TextMate grammar) vs on (semantic tokens)

## What to Look For

### Headers Section

```gabc
name: Kyrie XVI;
mode: 1;
%%
```

Expected highlighting:
- `name` and `mode` → **property color** (light blue in Dark+)
- `:` → **operator color** (white)
- `Kyrie XVI` and `1` → **string color** (orange)
- `;` → **operator color** (white)
- `%%` → **operator color** (white, bold)

### Clefs

```gabc
(c4) Text(f)
```

Expected:
- `c4` → **keyword color** (purple/magenta)
- Distinct from regular notes

### Note Shapes

```gabc
(f) → standard note (blue)
(fv) → virga (cyan)
(fw) → quilisma (yellow)
(fo) → oriscus (yellow)
(fs) → stropha (blue)
```

Each should have a different color!

### Bars

```gabc
(f) , (g) ` (h) ; (i) : (j) :: (k)
```

All bar symbols should be highlighted as operators.

### Accidentals

```gabc
(fxe) → flat
(f#g) → sharp
(fyf) → natural
```

`x`, `#`, `y` should be highlighted as keywords.

## Troubleshooting

### No Semantic Highlighting Visible

**Check 1: VS Code Setting**
```json
"editor.semanticHighlighting.enabled": true
```

**Check 2: Extension Setting**
```json
"gregorio.highlighting.semantic": true
```

**Check 3: Theme Support**
- Not all themes support semantic tokens
- Try Dark+ or Light+ themes first

**Check 4: File Language**
- Make sure the file is recognized as GABC
- Check the language indicator in the bottom right
- Should say "GABC" or "gabc"

### Semantic Highlighting Working but Looks Wrong

**Customize Colors:**

```json
{
  "editor.semanticTokenColorCustomizations": {
    "[Your Theme]": {
      "enabled": true,
      "rules": {
        "property:gabc": "#FF0000",  // Red for headers
        "keyword:gabc": "#00FF00",   // Green for clefs
        "class:gabc": "#0000FF"      // Blue for virgas
      }
    }
  }
}
```

### Console Shows Errors

If you see errors like:
```
[Gregorio] Semantic tokens provider error: ...
```

1. Check if the GABC file has syntax errors
2. Try with a simple, valid GABC file
3. Report the error on GitHub with the file that causes it

### Performance Issues

If semantic highlighting causes lag:

1. Check file size (should work fine up to ~1000 lines)
2. Check parse time in console logs
3. Temporarily disable: `"gregorio.highlighting.semantic": false`
4. Report performance issues with file size and timing info

## Verification Checklist

- [ ] Console shows provider registration logs
- [ ] Console shows provider being called for GABC files
- [ ] Parse completes without errors
- [ ] Token data is generated (length > 0)
- [ ] Headers have distinct colors for names and values
- [ ] Clefs are highlighted differently from notes
- [ ] Different note shapes have different colors
- [ ] Bars are clearly marked
- [ ] Accidentals are highlighted
- [ ] Toggle command works and shows visible difference

## Expected vs Actual

### Without Semantic Highlighting (TextMate Only)

All notes look similar, clefs might not be distinct, limited color variety.

### With Semantic Highlighting (Parser-Based)

- Clefs clearly marked as keywords
- Different note shapes have different colors
- Headers more structured
- Better distinction between notation elements
- Richer, more meaningful color scheme

## Performance Benchmarks

Typical performance for semantic highlighting:

- **Small files** (< 100 lines): < 10ms
- **Medium files** (100-500 lines): 10-20ms
- **Large files** (500-1000 lines): 20-50ms

Check the console for actual parse times:
```
[Gregorio] Parsing document, length: 1234
[Gregorio] Parse complete. Headers: 4 Syllables: 10 Errors: 0
```

## Reporting Issues

If semantic highlighting isn't working:

1. Check all steps in this guide
2. Check Developer Console for errors
3. Try the example file: `examples/semantic-highlighting.gabc`
4. Report on GitHub with:
   - VS Code version
   - Extension version
   - Console logs
   - Screenshots showing the issue
   - Sample GABC file that demonstrates the problem

## See Also

- [SEMANTIC_HIGHLIGHTING.md](SEMANTIC_HIGHLIGHTING.md) - Full documentation
- [LINTING.md](LINTING.md) - Diagnostic features
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
