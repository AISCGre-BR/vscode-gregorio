# Architecture Decisions

## Bundled Language Server

The vscode-gregorio extension includes a bundled version of the gregorio-lsp language server. This design decision provides several benefits:

### Benefits

1. **No External Dependencies**: Users can install and use the extension immediately without additional setup
2. **Consistent Experience**: All users get the same LSP version, reducing support issues
3. **Simplified Distribution**: Single `.vsix` file contains everything needed
4. **Better Reliability**: No dependency on external packages or network connectivity

### Implementation

The LSP server source code is copied from `gregorio-lsp` into the `lsp-server/` directory and bundled using esbuild:

- `dist/extension.js` - Main extension code
- `dist/server.js` - Bundled LSP server

Both files are bundled as CommonJS modules optimized for Node.js runtime.

## Parser Implementation: TypeScript vs Tree-sitter

The bundled LSP server uses a **TypeScript-based fallback parser** instead of tree-sitter, even though the standalone gregorio-lsp supports tree-sitter as an optional enhancement.

### Why Not Tree-sitter in the Bundle?

Tree-sitter is a **native module** (contains C/C++ code) which causes significant complications for VS Code extensions:

#### 1. Platform-Specific Compilation
- Requires separate binaries for each OS and architecture:
  - Windows (x64, ARM64)
  - macOS (x64, ARM64/M1/M2)
  - Linux (x64, ARM64, ARM)
- Users would need build tools (node-gyp, Python, C++ compiler) installed
- Installation can fail on systems without proper build environment

#### 2. Bundling Complexity
- Native modules cannot be easily bundled with esbuild/webpack
- Requires special handling and platform detection logic
- May need to ship multiple versions of binaries
- Significantly increases extension size (5-10x larger)

#### 3. Runtime Issues
- Binary compatibility problems across different Node.js versions
- Can fail to load due to missing system libraries
- Security restrictions in some environments (sandboxing, corporate networks)
- Debugging becomes much harder

#### 4. Distribution and Updates
- Must compile and test on all target platforms
- CI/CD pipeline becomes complex
- Updates require rebuilding all native binaries
- Higher chance of breaking changes

### TypeScript Parser Advantages

The fallback TypeScript parser provides:

- **Zero native dependencies**: Pure JavaScript/TypeScript implementation
- **Universal compatibility**: Works on all platforms without compilation
- **Smaller bundle size**: ~440KB vs several MB with tree-sitter
- **Easier maintenance**: Single codebase, no platform-specific code
- **Reliable loading**: No binary compatibility issues
- **Complete functionality**: Handles all GABC/NABC parsing requirements

### Performance Comparison

For typical GABC files (100-500 lines):
- Tree-sitter: ~5-10ms parse time
- TypeScript parser: ~10-20ms parse time

The performance difference is negligible in the context of an LSP where parsing happens on document changes (typically user typing). The 10ms difference is imperceptible to users.

### When Tree-sitter Makes Sense

Tree-sitter is excellent for:
- Syntax highlighting in editors (TextMate grammars)
- Standalone CLI tools where native dependencies are acceptable
- Development environments where build tools are available
- Performance-critical batch processing of many files

For a VS Code extension focused on user experience and reliability, the TypeScript parser is the right choice.

## Custom LSP Server Support

Users who want to use tree-sitter or a development version of gregorio-lsp can configure a custom server path:

```json
{
  "gregorio.lsp.serverPath": "/path/to/custom/gregorio-lsp/dist/server.js"
}
```

This allows developers to:
- Use the latest unreleased features
- Test changes to the LSP server
- Experiment with tree-sitter parsing
- Debug LSP issues

The extension will automatically use the custom server instead of the bundled version.

## Server Discovery Order

The extension searches for LSP servers in this order:

1. **Custom path** (if `gregorio.lsp.serverPath` is configured)
2. **Bundled server** (shipped with extension) - **Default**
3. **Sibling directory** (`../gregorio-lsp/dist/server.js`) - For development
4. **Workspace subdirectory** (`./gregorio-lsp/dist/server.js`)

This provides flexibility for developers while ensuring the bundled server works for end users.

## Build Process

### Extension Build

```bash
npm run compile  # Build both extension and LSP server
```

Produces:
- `dist/extension.js` - Extension entry point
- `dist/server.js` - Bundled LSP server

### Watch Mode

```bash
npm run watch  # Watch both extension and LSP server
```

Automatically rebuilds on changes to:
- `src/**/*.ts` - Extension source
- `lsp-server/**/*.ts` - LSP server source

### Production Build

```bash
npm run package  # Production build with minification
```

Creates optimized bundles for distribution.

## Future Considerations

### WASM Parser

A potential future enhancement is using WebAssembly (WASM) for parsing:

**Advantages:**
- Near-native performance
- Cross-platform without native modules
- Can reuse tree-sitter grammar through tree-sitter-wasm
- Smaller size than native binaries

**Challenges:**
- Requires compiling parser to WASM
- More complex build process
- Limited debugging capabilities
- Still larger than pure TypeScript

This could be evaluated if parsing performance becomes a bottleneck for large files (>1000 lines).

### Incremental Parsing

The current implementation reparses the entire document on changes. For very large files, implementing incremental parsing could improve performance:

- Only reparse changed sections
- Maintain parse tree across edits
- Update diagnostics incrementally

This is not currently necessary given typical GABC file sizes (50-300 lines).

## Conclusion

The bundled TypeScript parser architecture provides the best balance of:
- **Reliability**: No native module issues
- **Simplicity**: Easy to build, test, and distribute
- **Performance**: Fast enough for interactive use
- **Maintainability**: Single codebase, pure TypeScript

This design ensures the extension "just works" for all users while maintaining flexibility for developers who need advanced features.
