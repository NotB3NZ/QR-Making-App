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

Tests cover link normalization, independent colors and shapes, persistent selections, transparent render options, and preventing stale previews or downloads during overlapping renders.

## Milestone 4

Paste or type an HTTP or HTTPS link to generate a square QR code entirely in your browser with `qr-code-styling`. Bare domains receive an `https://` prefix; paths, query strings, and fragments are preserved. Blank or invalid input clears the preview and disables downloading.

Download PNG saves the exact displayed image as `qris.png` at 1024 × 1024 pixels, including a clear margin.

Below Download PNG, choose a white, black, transparent, or custom background, and an independent black, white, or custom QR pattern. Custom options reveal labeled native color pickers. Colors update immediately and stay selected when the link changes. The default is black on white.

Transparent previews show a checkerboard. The checkerboard is only part of the interface: the exported PNG has real transparency, including its margin.

The Shape picker offers Square (default) and Rounded dots. Rounded dots keeps all three corner markers square. Shape changes update the preview immediately and stay selected when links or colors change. Both styles export square PNGs with a clear margin.

The library's Circle shape was tested with short and long URLs. The long-URL export failed decoding, so Rounded dots is the shipped second style.
