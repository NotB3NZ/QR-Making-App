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

The link normalization tests cover trimming, HTTP and HTTPS, bare domains, preserved URL components, and invalid input.

## Milestone 2

Paste or type an HTTP or HTTPS link to generate a black-on-white QR code entirely in your browser with `qr-code-styling`. Bare domains receive an `https://` prefix; paths, query strings, and fragments are preserved. Blank or invalid input clears the preview and disables downloading.

Download PNG saves the exact displayed image as `qris.png` at 1024 × 1024 pixels, including a white margin. Color, transparency, and shape controls are reserved for later milestones.
