#!/usr/bin/env node
/**
 * Ashley End Screen Generator
 * Analyzes a video with Gemini then renders a branded Remotion end card.
 *
 * Usage:
 *   node scripts/generate-end-screen.js --video=public/24682_dedluo.mp4
 *   node scripts/generate-end-screen.js --video=public/24682_dedluo.mp4 --output=out/endscreen.mp4
 */

const {execSync} = require("child_process");
const path = require("path");
const fs = require("fs");
const {analyzeVideo} = require("./analyze-end-screen");

require("dotenv").config();

async function generateEndScreen(videoPath, outputPath) {
  const timestamp = Date.now();
  const baseName = path.basename(videoPath, path.extname(videoPath));
  const output = outputPath || `out/${baseName}_endscreen_${timestamp}.mp4`;

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(path.resolve(output)), {recursive: true});

  console.log(`\nAnalyzing end screen: ${videoPath}\n`);
  const data = await analyzeVideo(videoPath);

  // Pretty-print what was found
  console.log("── Extracted ──────────────────────────────────────────");
  console.log(`  Tagline:    ${data.tagline}`);
  data.locations.forEach((loc, i) => {
    console.log(`  Location ${i + 1}: ${loc.city}  |  ${loc.address}`);
  });
  if (data.disclaimer) {
    console.log(`  Disclaimer: ${data.disclaimer.slice(0, 60)}...`);
  }
  console.log("───────────────────────────────────────────────────────\n");

  // Escape single quotes for shell safety
  // Write props to a temp JSON file to avoid Windows shell escaping issues
  const propsFile = path.resolve(__dirname, "../.tmp-props.json");
  fs.writeFileSync(propsFile, JSON.stringify(data));

  try {
    const cmd = `npx remotion render src/index.ts AshleyEndCard "${output}" --props="${propsFile.replace(/\\/g, "/")}"`;
    console.log("Rendering with Remotion...\n");
    execSync(cmd, {stdio: "inherit", cwd: path.resolve(__dirname, "..")});
    console.log(`\nDone! End screen saved to: ${output}\n`);
  } finally {
    fs.unlinkSync(propsFile);
  }

  return output;
}

// ── CLI entry point ──────────────────────────────────────────────
if (require.main === module) {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((a) => a.startsWith("--"))
      .map((a) => {
        const eq = a.indexOf("=");
        return [a.slice(2, eq), a.slice(eq + 1)];
      })
  );

  if (!args.video) {
    console.error(
      "Usage: node scripts/generate-end-screen.js --video=path/to/video.mp4 [--output=out/file.mp4]"
    );
    process.exit(1);
  }

  generateEndScreen(args.video, args.output).catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}

module.exports = {generateEndScreen};
