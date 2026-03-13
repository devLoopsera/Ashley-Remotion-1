#!/usr/bin/env node
/**
 * Ashley End Screen Analyzer
 * Uploads a video to Gemini, extracts tagline / locations / disclaimer from the end screen.
 *
 * Usage:
 *   node scripts/analyze-end-screen.js --video=public/24682_dedluo.mp4
 */

const path = require("path");
const fs = require("fs");

require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY is not set. Add it to your .env file.");
  process.exit(1);
}

const PROMPT = `This is an Ashley Furniture commercial video.

Look ONLY at the END SCREEN — the last few seconds of the video.
The end screen has:
- The Ashley logo (house icon + "ASHLEY" text)
- A short promotional tagline in the centre (e.g. "SHOP MORE DEALS IN-STORE")
- One or two store locations, each with a city name and a street address below it
- Small legal disclaimer text at the very bottom

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "tagline": "the tagline text exactly as shown on screen",
  "locations": [
    {"city": "City Name As Shown", "address": "Street Address As Shown"}
  ],
  "disclaimer": "full disclaimer text, or null if not clearly visible"
}`;

async function analyzeVideo(videoPath) {
  // Lazy-load to avoid crashing if package isn't installed yet
  let GoogleGenerativeAI, GoogleAIFileManager, FileState;
  try {
    ({GoogleGenerativeAI} = require("@google/generative-ai"));
    ({GoogleAIFileManager, FileState} = require("@google/generative-ai/server"));
  } catch {
    console.error('Missing dependency. Run: npm install @google/generative-ai dotenv');
    process.exit(1);
  }

  const absPath = path.resolve(videoPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Video file not found: ${absPath}`);
  }

  console.log(`Uploading ${path.basename(absPath)} to Gemini File API...`);
  const fileManager = new GoogleAIFileManager(API_KEY);

  const uploadResult = await fileManager.uploadFile(absPath, {
    mimeType: "video/mp4",
    displayName: path.basename(absPath),
  });

  // Poll until Gemini has finished processing the video
  process.stdout.write("Processing");
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === FileState.PROCESSING) {
    await new Promise((r) => setTimeout(r, 5000));
    file = await fileManager.getFile(uploadResult.file.name);
    process.stdout.write(".");
  }
  console.log(" done.\n");

  if (file.state === FileState.FAILED) {
    throw new Error("Gemini failed to process the video.");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({model: "gemini-2.5-pro"});

  const result = await model.generateContent([
    {fileData: {mimeType: "video/mp4", fileUri: uploadResult.file.uri}},
    {text: PROMPT},
  ]);

  // Clean up the uploaded file from Gemini's storage
  await fileManager.deleteFile(uploadResult.file.name).catch(() => {});

  const raw = result.response.text().trim();
  // Strip accidental markdown fences
  const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Gemini returned invalid JSON:\n${raw}`);
  }

  // Basic validation
  if (!parsed.tagline || !Array.isArray(parsed.locations)) {
    throw new Error(`Unexpected response shape:\n${JSON.stringify(parsed, null, 2)}`);
  }

  return parsed;
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
    console.error("Usage: node scripts/analyze-end-screen.js --video=path/to/video.mp4");
    process.exit(1);
  }

  analyzeVideo(args.video)
    .then((data) => {
      console.log("Extracted end screen data:");
      console.log(JSON.stringify(data, null, 2));
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

module.exports = {analyzeVideo};
