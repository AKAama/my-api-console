# Flat Horse Favicon Design

Date: 2026-07-26

## Goal

Replace the legacy blue “F” favicon with a compact horse mascot that connects
to Ma Yehui's surname and the portfolio's visual system.

## Visual Design

- Deep navy rounded-square background matching the portfolio.
- A simple flat horse head facing slightly right.
- Low-saturation teal horse with a brighter teal mane.
- One warm-white circular eye.
- Two or three large, clean color shapes for the head, ear, and mane.
- No text, gradients, shadows, fine strokes, photorealism, or extra objects.
- Generous safe padding so the silhouette remains recognizable at 16×16.
- Friendly and restrained rather than childish or cartoonishly expressive.

## Source and Outputs

Create one high-resolution square master, then derive:

- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/android-chrome-192x192.png`
- `public/android-chrome-512x512.png`
- `public/apple-touch-icon.png` at 180×180

Keep the existing filenames so `config/config.ts` and the web manifest continue
to work without route changes.

## Validation

- Inspect the master at full size.
- Inspect 16×16 and 32×32 versions at native scale.
- Confirm the horse silhouette, ear, mane, and eye remain distinct.
- Confirm every PNG has the required square dimensions.
- Confirm `favicon.ico` contains usable 16×16, 32×32, and 48×48 frames.
- Run the production build after replacing the assets.

## Constraints

- Do not modify portfolio content or layout.
- Do not commit or push.
- Do not retain the legacy white “F” artwork in any published favicon asset.
