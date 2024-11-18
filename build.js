import { build as esbuild } from "esbuild";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import fs from "fs/promises";
import path from "path";

// Helper function to process CSS with PostCSS
async function processCSS(inputFile, outputFile) {
  const css = await fs.readFile(inputFile, "utf8");
  const result = await postcss([autoprefixer]).process(css, {
    from: inputFile,
    to: outputFile,
  });
  await fs.writeFile(outputFile, result.css);
  console.log(`Processed CSS: ${outputFile}`);
}

// Copy HTML file
async function copyHTML(inputFile, outputFile) {
  await fs.copyFile(inputFile, outputFile);
  console.log(`Copied HTML: ${outputFile}`);
}

// Main build function
async function build() {
  const srcDir = path.resolve("src");
  const outDir = path.resolve("build");

  // Ensure output directory exists
  await fs.mkdir(outDir, { recursive: true });

  // Process CSS
  await processCSS(
    path.join(srcDir, "styles.css"),
    path.join(outDir, "styles.css"),
  );

  // Copy HTML
  await copyHTML(
    path.join(srcDir, "index.html"),
    path.join(outDir, "index.html"),
  );

  // Bundle JavaScript
  await esbuild({
    entryPoints: [path.join(srcDir, "main.js")],
    outfile: path.join(outDir, "main.js"),
    bundle: true,
    minify: true,
    sourcemap: true, // Optional: generates source map for debugging
  });

  console.log("Build completed!");
}

// Run the build process
build().catch((err) => {
  console.error(err);
  process.exit(1);
});
