# QRis

A simple app for turning links into downloadable QR codes, built with Vite and plain HTML, CSS, and JavaScript.

## Development

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

Vite writes the production files to `dist/`.

## Tests

```sh
npm test
```

Tests cover link normalization, independent colors, color persistence, transparent render options, and preventing stale previews or downloads during overlapping renders.

## Milestone 3

Paste or type an HTTP or HTTPS link to generate a square QR code entirely in your browser with `qr-code-styling`. Bare domains receive an `https://` prefix; paths, query strings, and fragments are preserved. Blank or invalid input clears the preview and disables downloading.

Download PNG saves the exact displayed image as `qris.png` at 1024 × 1024 pixels, including a clear margin.

Below Download PNG, choose a white, black, transparent, or custom background, and an independent black, white, or custom QR pattern. Custom options reveal labeled native color pickers. Colors update immediately and stay selected when the link changes. The default is black on white.

Transparent previews show a checkerboard. The checkerboard is only part of the interface: the exported PNG has real transparency, including its margin. Shape controls are reserved for a later milestone.
