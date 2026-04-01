---
name: templatize-end-screen
description: Generates a reusable, fully customizable Ashley Furniture Remotion TypeScript end screen component from a screenshot or video. Use when the user says "templatize", "create a template", "make a reusable end screen", "generate a Remotion component", "turn this into a template", or provides a video/screenshot and wants editable source code rather than a rendered MP4. Do NOT use when the user just wants a rendered output video — use create-end-screen for that.
---

# Templatize Ashley End Screen

Two-step AI pipeline: Gemini analyzes the visual design, then generates a working Remotion TypeScript component. All text becomes typed props so the same template works for any store.

## Steps

### Step 1: Parse arguments and show available assets

Parse `$ARGUMENTS` to extract: input path, ComponentName, and any override flags.

Then always run the asset browser so the user can see what's available before choosing:
```
node scripts/templatize.js --list-assets
```

Show the output, then ask:
> "Here are your available files. Would you like to use a custom logo or background from the list? Or should I go ahead and analyze the video/screenshot first?"

### Step 1b: Show the extracted end card (video inputs only)

If the input includes a video file, extract and display the last frame before any Gemini analysis:

```
node scripts/templatize.js --extract-frame --video=<path>
```

The output will contain a line like `PREVIEW_FRAME:/absolute/path/to/preview-endcard.png`. Read that image file and display it inline so the user can see it, then ask:
> "Does this end card look correct? Ready to proceed with the full analysis?"

Wait for the user to confirm before continuing.

**If the frame isn't right**, offer two fixes:

1. **Grab a different timestamp** — ask the user roughly when in the video the end card appears (e.g. "around 12 seconds"), then re-run with `--frame-time=<seconds>`:
   ```
   node scripts/templatize.js --extract-frame --video=<path> --frame-time=12
   ```
   Re-display the new frame and ask again.

2. **Use a screenshot instead** — if the user has a static image of the end card, skip frame extraction entirely and use `--image=<path>` in Step 2.

Repeat the preview loop until the user confirms the frame is correct.

If the input is a screenshot only (no video), skip this step.

### Step 2: Run the analysis and generation pipeline

Once the user is ready, build the command from their inputs:

**For a screenshot (`.png`/`.jpg`/`.webp`):**
```
node scripts/templatize.js --image=<path> --name=<ComponentName> [overrides]
```

**For a video (`.mp4`/`.mov`):**
```
node scripts/templatize.js --video=<path> --name=<ComponentName> [overrides]
```

**For best results (screenshot + video together):**
```
node scripts/templatize.js --image=<screenshot> --video=<video> --name=<ComponentName> [overrides]
```

**Override flags** — append any combination:
- `--logo=public/<filename>` — replace the Ashley brand logo with a custom image
- `--bg-image=public/<filename>` — use this image as the full-screen background
- `--bg-color=#hex` — force a solid background color (e.g. `--bg-color=#1a2841`)

### Step 3: Review the extracted design spec

The script prints the spec JSON. Show it to the user and ask:
> "Does this spec look correct? Want to swap the logo or background before I generate the component?"

If the user wants changes, re-run from the saved spec with updated overrides (no re-analysis needed):
```
node scripts/templatize.js --spec=src/scenes/.spec-<ComponentName>.json --name=<ComponentName> --logo=public/<file>
```

Run `--list-assets` again if they need a reminder of what's available.

### Step 4: Report success

When the component is written, tell the user:
- Component file: `src/scenes/Generated_<ComponentName>.tsx`
- Registered as composition: `<ComponentName>` in `src/Root.tsx`
- Preview: run `npm run dev` to open Remotion Studio

## Error Handling

**Missing API key:**
Tell the user: "Add `GEMINI_API_KEY=your-key-here` to your `.env` file."

**`--name` is not PascalCase:**
The script enforces PascalCase (e.g. `SpringSaleCard`). If the user provides `spring-sale-card` or `spring sale card`, correct it automatically before running.

**Component renders but shows wrong images (missing static file error):**
The generated component referenced a file that doesn't exist in `public/`. Re-run with an explicit `--logo=` or `--bg-image=` override pointing to a real file, or re-generate from the saved spec:
```
node scripts/templatize.js --spec=src/scenes/.spec-<ComponentName>.json --name=<ComponentName>
```

**Static validation fails and loops:**
If code validation fails 3 times, the script proceeds with a warning. Tell the user: "The component was generated but has a known issue. Run `npm run dev` and check the console — it will likely point to a missing image file or a font import."

**Video upload stuck on "Processing...":**
Gemini File API can take 30–60 seconds for longer videos. Wait it out — the script will continue automatically.

## Notes

- Requires `GEMINI_API_KEY` in `.env`
- Output: `src/scenes/Generated_<ComponentName>.tsx` (auto-registered in `src/Root.tsx`)
- All text (tagline, locations, disclaimer) becomes typed props — reusable for any store
- Custom logo/background files are automatically copied to `public/`
- Dry run (see code without writing): append `--skip-write`
- This creates *editable source code*, not a rendered MP4 — use `/create-end-screen` for rendered output
