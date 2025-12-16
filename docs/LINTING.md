# GABC Linting

The vscode-gregorio extension provides optional linting support for GABC files through integration with the gregorio-lsp language server. Linting helps you identify syntax errors, warnings, and potential issues in your GABC code as you write.

## Features

- **Real-time diagnostics**: Get immediate feedback on syntax errors and warnings
- **Configurable severity levels**: Control which types of issues are reported
- **Optional on-save linting**: Choose between continuous linting or linting only when saving
- **Rule filtering**: Ignore specific linting rules that don't apply to your workflow
- **Toggle command**: Quickly enable or disable linting

## Configuration

### Enable/Disable Linting

By default, linting is enabled. You can disable it globally or per-workspace:

```json
{
  "gregorio.linting.enabled": true
}
```

### Severity Level

Control which severity levels are reported. Options: `error`, `warning`, `info`

```json
{
  "gregorio.linting.severity": "warning"
}
```

- **`error`**: Only show syntax errors
- **`warning`**: Show errors and warnings (default)
- **`info`**: Show all diagnostic messages including informational hints

### Linting Trigger

Choose when linting should run:

```json
{
  "gregorio.linting.onSave": false
}
```

- **`false`** (default): Lint as you type for immediate feedback
- **`true`**: Only lint when you save the file

### Ignore Rules

Disable specific linting rules by their code:

```json
{
  "gregorio.linting.ignoreRules": ["missing-clef", "invalid-note"]
}
```

## Commands

### Toggle Linting

Quickly enable or disable linting with the command palette:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
2. Type "Gregorio: Toggle Linting"
3. Press Enter

### Restart Language Server

If linting isn't working correctly, try restarting the language server:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
2. Type "Gregorio: Restart Gregorio Language Server"
3. Press Enter

## Common Diagnostic Messages

### Syntax Errors

- **Missing clef**: A clef declaration is required before notes
- **Invalid note**: The note syntax doesn't match GABC notation rules
- **Unclosed bracket**: A bracket or parenthesis is not properly closed
- **Invalid header**: Header format is incorrect

### Warnings

- **Deprecated syntax**: Using outdated notation that should be updated
- **Unusual spacing**: Spacing patterns that might indicate an error
- **Missing header**: Recommended headers are missing

### Informational

- **Style suggestions**: Optional improvements to notation style
- **Best practices**: Tips for better GABC formatting

## Troubleshooting

### Linting Not Working

1. Ensure the gregorio-lsp server is properly installed and built
2. Check the language server path in settings: `gregorio.lsp.serverPath`
3. Restart the language server using the command palette
4. Check the output panel (View > Output, select "Gregorio Language Server")

### Too Many Diagnostics

1. Increase the severity level to `error` to see only critical issues
2. Use `ignoreRules` to disable specific rules that aren't relevant
3. Consider using `onSave` mode to reduce visual noise while typing

### Performance Issues

If linting causes performance problems:

1. Enable `onSave` mode to reduce CPU usage
2. Disable linting temporarily with the toggle command
3. Report performance issues on the GitHub repository

## Integration with Other Tools

The linting system integrates seamlessly with:

- **VS Code Problems Panel**: View all diagnostics in one place
- **Quick Fixes**: Some diagnostics provide automatic fixes (when available)
- **Language Server Protocol**: Compatible with LSP-aware editors

## Related Settings

- `gregorio.lsp.serverPath`: Path to the language server
- `gregorio.lsp.trace.server`: Enable server communication tracing for debugging

## Feedback

If you encounter linting issues or have suggestions for new rules, please open an issue on the [GitHub repository](https://github.com/AISCGre-BR/vscode-gregorio).
