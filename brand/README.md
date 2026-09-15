# Scribe — brand assets

Character mark from directions 1a (standing pencil) and 1b (coral app tile).

## Colours
- Coral `#F9424A` — on dark grounds use `#FF5A60`
- Graphite `#26242B`, ink `#17161A`
- Body `#EDEDF2` / side `#DCDCE6`, wood `#E7DCC8`

## Type
Wordmark: **Outfit 800**, tracking −3%. UI: **Figtree**.

## Folders
- `svg/` — vector masters, transparent unless the name says otherwise
- `png/icon-pencil/` — primary mark, transparent, 16→1024
- `png/icon-pencil-on-dark/` — dark-UI variant, 512/1024
- `png/icon-listening/` — sound-arc "recording" mark, transparent
- `png/app-icon-rounded/` — 64/180/192/256/512/1024 (iOS, web)
- `png/app-icon-square/` — 192/512 full-bleed, let the OS mask
- `png/app-icon-maskable-512.png` — Android adaptive, mark in the 66% safe zone
- `png/icon-mono-black-512.png`, `png/icon-mono-white-512.png` — single-colour silhouette, eyes and smile knocked out (transparent)
- `png/wordmark/` — text only, transparent (@2x of a 128px master)
- `png/lockup/` — horizontal (default) and stacked signatures, transparent

## Notes
- Wordmark and lockup SVGs use live `<text>` in Outfit — install the font, or use the PNGs where it isn't available. Outline the text in a vector editor before sending to print.
- Clearspace: the eraser height on all sides. Minimum icon 16px, minimum lockup width 96px.
- Don't recolour the body, rotate the standing mark, add shadows, or put the transparent pencil on coral — use the tile there.

## Web manifest
```json
{
  "name": "Scribe",
  "icons": [
    { "src": "/brand/png/app-icon-square/app-icon-square-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/brand/png/app-icon-square/app-icon-square-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/brand/png/app-icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "#F9424A"
}
```
