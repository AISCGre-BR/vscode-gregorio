# Tree-sitter Configuration

This VS Code extension uses the Gregorio LSP server with tree-sitter **disabled** by default.

## Why is tree-sitter disabled?

Tree-sitter has native dependencies that are difficult to bundle and distribute in VS Code extensions. The LSP includes a robust TypeScript fallback parser that provides all functionality needed for the extension.

## How it works

The extension passes the `DISABLE_TREE_SITTER=true` environment variable to the LSP server during initialization. This is configured in [src/extension.ts](src/extension.ts):

```typescript
const serverOptions: ServerOptions = {
  run: { 
    module: serverPath, 
    transport: TransportKind.ipc,
    options: {
      env: { ...process.env, DISABLE_TREE_SITTER: 'true' }
    }
  },
  // ...
};
```

## Enabling tree-sitter (advanced)

If you want to enable tree-sitter for development or testing:

1. Install tree-sitter dependencies in your workspace
2. Remove or set `DISABLE_TREE_SITTER: 'false'` in `src/extension.ts`
3. Rebuild the extension

**Note**: This is not recommended for production builds or distribution.

## Source synchronization

The LSP server source files are copied from `../gregorio-lsp/src/` to `lsp-server/` and bundled into the extension. To update the LSP:

```bash
# Copy updated source files
cp -r ../gregorio-lsp/src/* lsp-server/

# Rebuild
npm run compile
```

The build process (esbuild) marks `tree-sitter` and `tree-sitter-gregorio` as external dependencies, preventing bundling errors while keeping the code intact for potential future use.
