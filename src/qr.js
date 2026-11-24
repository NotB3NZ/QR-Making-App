export function createQrOptions(link, { background, pattern }) {
  return {
    width: 1024,
    height: 1024,
    type: 'canvas',
    shape: 'square',
    data: link,
    // Keep at least four clear modules around even the smallest QR matrix.
    // The background color (including transparency) also covers this margin.
    margin: 144,
    qrOptions: { errorCorrectionLevel: 'M' },
    dotsOptions: { type: 'square', color: pattern },
    cornersSquareOptions: { type: 'square', color: pattern },
    cornersDotOptions: { type: 'square', color: pattern },
    backgroundOptions: { color: background },
  };
}
