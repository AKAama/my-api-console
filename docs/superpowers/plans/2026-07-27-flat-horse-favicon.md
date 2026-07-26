# Flat Horse Favicon Implementation Plan

**Goal:** Replace the current letter favicon with the approved simple, flat horse-head mark while keeping every existing favicon filename and page reference intact.

**Approach:** Draw one deterministic vector master with a deep-navy rounded-square background, a muted-teal horse head, a brighter-teal mane, and a warm-white eye. Rasterize that master at each required native size, then package the ICO from dedicated small-size renders so the mark stays legible in browser tabs.

**Constraints:** Work directly in the current main-branch working tree. Do not commit or push.

---

### Task 1: Create the source artwork

- Add a reusable SVG master under `scripts/favicon/`.
- Keep the silhouette to a few large shapes with generous padding and no gradients, shadows, text, or fine strokes.
- Render a preview and visually inspect the horse silhouette.

### Task 2: Produce the browser assets

- Replace `public/favicon-16x16.png`.
- Replace `public/favicon-32x32.png`.
- Replace `public/favicon.ico` with 16, 32, and 48 pixel frames.
- Replace `public/apple-touch-icon.png` at 180 pixels.
- Replace `public/android-chrome-192x192.png`.
- Replace `public/android-chrome-512x512.png`.

### Task 3: Verify

- Check each PNG's native dimensions and the ICO frame sizes.
- Inspect the 16, 32, and 512 pixel outputs visually.
- Run the production build and confirm the existing favicon references still resolve.
- Leave all changes uncommitted and unpushed.
