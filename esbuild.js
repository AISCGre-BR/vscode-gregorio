// Bundles the extension with esbuild.
// `web-tree-sitter` is bundled; `vscode` and `gregorio_wasm` are provided externally.
//
// The gregorio-core WASM module (wasm/gregorio_core/) is loaded at runtime via
// require() from the extension host — it is NOT bundled, but copied to dist/wasm/.
const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

function copyWasmArtifacts() {
  const src = path.join(__dirname, "wasm", "gregorio_core");
  const dst = path.join(__dirname, "dist", "wasm", "gregorio_core");
  if (!fs.existsSync(src)) {
    console.warn(
      "[esbuild] wasm/gregorio_core/ not found — run 'npm run build:lsp-wasm' first.",
    );
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, file), path.join(dst, file));
  }
  console.log("[esbuild] Copied gregorio_core WASM artifacts to dist/wasm/gregorio_core/");
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node20",
    outfile: "dist/extension.js",
    // vscode: host API; gregorio_wasm: loaded at runtime via require() from dist/wasm/
    external: ["vscode"],
    sourcemap: !production,
    minify: production,
    logLevel: "info",
    plugins: [
      {
        name: "gregorio-wasm-external",
        setup(build) {
          // Redirect require('./wasm/gregorio_core/gregorio_wasm.js') calls so that
          // esbuild leaves them as-is and does not try to bundle the wasm glue.
          build.onResolve({ filter: /gregorio_wasm/ }, (args) => ({
            path: args.path,
            external: true,
          }));
        },
      },
    ],
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    copyWasmArtifacts();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
