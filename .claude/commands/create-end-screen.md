---
name: create-end-screen
description: Renders a finished Ashley Furniture branded end screen MP4 from a source video using Gemini AI to extract store data. Use when the user says "create end screen", "generate end card", "render end screen", "make the end screen for", or provides a video file and asks to produce an output MP4. Do NOT use for creating reusable Remotion templates — use templatize-end-screen for that.
---

# Create Ashley End Screen

Renders a finished, ready-to-deliver Ashley Furniture end screen MP4 from a source video. Gemini extracts the store locations, tagline, and disclaimer automatically.

## Steps

### Step 1: Extract store data from the video

```
node scripts/generate-end-screen.js --video=$ARGUMENTS
```

If `$ARGUMENTS` is empty, ask the user: "Which video file should I use? (e.g. `public/24682_dedluo.mp4`)"

### Step 2: Confirm extracted data with the user

Show the extracted JSON exactly as returned (tagline, locations, disclaimer). Ask:

> "Does this look correct? If anything is wrong — city names, addresses, tagline, disclaimer — tell me and I'll correct it before rendering."

Wait for explicit confirmation or corrections before proceeding.

### Step 3: Render — or re-render with corrections

**If confirmed as-is:** The script already rendered. Report the output path:
> "Done! Your end screen is at: `out/<filename>_endscreen.mp4`"

**If the user wants corrections**, re-render with the fixed props:
```
npx remotion render src/index.ts AshleyEndCard out/<name>_endscreen.mp4 --props '<corrected json>'
```

Example corrected props:
```json
{"tagline":"Shop More Deals In-Store","locations":[{"city":"Marquette","address":"2152 US Hwy 41 W"},{"city":"Escanaba","address":"2222 North Lincoln Road"}],"disclaimer":"Ashley stores are independently owned and operated."}
```

## Error Handling

**`GEMINI_API_KEY` not set:**
Tell the user: "Add `GEMINI_API_KEY=your-key-here` to your `.env` file and try again."

**Video file not found:**
Tell the user: "Make sure the file is in `public/` and the path is correct (e.g. `public/video.mp4`)."

**Remotion render fails:**
Run `npm run dev` to check if the dev server starts cleanly. If it errors, the issue is in the composition setup — check `src/Root.tsx`.

**Only 1 location extracted when 2 should exist:**
Ask the user to provide the second location manually, then re-render with corrected props.

## Notes

- Requires `GEMINI_API_KEY` in `.env`
- Output goes to `out/` folder; custom path: `--output=out/custom.mp4`
- Supports 1 or 2 store locations automatically
- This renders a *finished MP4*, not a reusable template — use `/templatize-end-screen` for templates
