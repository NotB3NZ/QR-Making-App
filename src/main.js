import QRCodeStyling from 'qr-code-styling';
import { normalizeLink } from './link.js';
import './style.css';

const input = document.querySelector('#link');
const message = document.querySelector('#link-message');
const preview = document.querySelector('.qr-preview');
const emptyState = document.querySelector('.empty-state');
const image = document.querySelector('.qr-image');
const downloadButton = document.querySelector('.download-button');

let revision = 0;
let readyLink = '';
let pngUrl = '';

function showMessage(text, invalid = false) {
  message.textContent = text;
  message.hidden = !text;
  input.setAttribute('aria-invalid', String(invalid));
}

function clearPreview() {
  downloadButton.disabled = true;
  readyLink = '';
  image.hidden = true;
  image.removeAttribute('src');
  emptyState.hidden = false;
  preview.classList.remove('has-qr');
  if (pngUrl) URL.revokeObjectURL(pngUrl);
  pngUrl = '';
}

async function updatePreview() {
  const currentRevision = ++revision;
  const link = normalizeLink(input.value);
  clearPreview();
  showMessage('');
  preview.setAttribute('aria-busy', 'false');

  if (link === '') return;
  if (link === null) {
    showMessage('Enter an HTTP or HTTPS link, like example.com.', true);
    return;
  }

  preview.setAttribute('aria-busy', 'true');
  let nextUrl = '';
  try {
    // A separate instance keeps overlapping renders independent while typing.
    const qr = new QRCodeStyling({
      width: 1024,
      height: 1024,
      type: 'canvas',
      shape: 'square',
      data: link,
      // At least four modules of white space even for the smallest QR matrix.
      margin: 144,
      qrOptions: { errorCorrectionLevel: 'M' },
      dotsOptions: { type: 'square', color: '#000000' },
      cornersSquareOptions: { type: 'square', color: '#000000' },
      cornersDotOptions: { type: 'square', color: '#000000' },
      backgroundOptions: { color: '#ffffff' },
    });
    const blob = await qr.getRawData('png');
    if (currentRevision !== revision) return;
    if (!(blob instanceof Blob) || !blob.size) throw new Error('PNG generation failed');

    nextUrl = URL.createObjectURL(blob);
    // Decode offscreen so only a fully ready image replaces the empty state.
    const loadedImage = new Image();
    loadedImage.src = nextUrl;
    await loadedImage.decode();
    if (currentRevision !== revision) {
      URL.revokeObjectURL(nextUrl);
      return;
    }

    pngUrl = nextUrl;
    readyLink = link;
    image.src = pngUrl;
    image.hidden = false;
    emptyState.hidden = true;
    preview.classList.add('has-qr');
    downloadButton.disabled = false;
  } catch {
    if (nextUrl) URL.revokeObjectURL(nextUrl);
    if (currentRevision !== revision) return;
    clearPreview();
    showMessage('Could not create this QR code. Try a shorter link.');
  } finally {
    if (currentRevision === revision) preview.setAttribute('aria-busy', 'false');
  }
}

input.addEventListener('input', updatePreview);
// Also handles autofill and values restored when returning to the page.
window.addEventListener('pageshow', updatePreview);

downloadButton.addEventListener('click', () => {
  if (!pngUrl || !readyLink || normalizeLink(input.value) !== readyLink) return;
  // Download the exact PNG used by the preview, without a second render.
  const anchor = document.createElement('a');
  anchor.href = pngUrl;
  anchor.download = 'qris.png';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
});

updatePreview();
