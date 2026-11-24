import QRCodeStyling from 'qr-code-styling';
import { normalizeLink } from './link.js';
import { createQrOptions } from './qr.js';
import './style.css';

const input = document.querySelector('#link');
const message = document.querySelector('#link-message');
const preview = document.querySelector('.qr-preview');
const emptyState = document.querySelector('.empty-state');
const image = document.querySelector('.qr-image');
const downloadButton = document.querySelector('.download-button');
const colorControls = document.querySelector('.color-controls');
const backgroundPicker = document.querySelector('#background-custom');
const patternPicker = document.querySelector('#pattern-custom');

let revision = 0;
let readyKey = '';
let pngUrl = '';

function readColors() {
  const background = document.querySelector('input[name="background"]:checked').value;
  const pattern = document.querySelector('input[name="pattern"]:checked').value;
  return {
    background: background === 'custom' ? backgroundPicker.value : background,
    pattern: pattern === 'custom' ? patternPicker.value : pattern,
  };
}

function renderKey(link, colors) {
  return JSON.stringify([link, colors.background, colors.pattern]);
}

function updateColorControls() {
  document.querySelector('#background-custom-field').hidden =
    !document.querySelector('input[name="background"][value="custom"]').checked;
  document.querySelector('#pattern-custom-field').hidden =
    !document.querySelector('input[name="pattern"][value="custom"]').checked;
  document.querySelector('#background-color-value').value = backgroundPicker.value;
  document.querySelector('#pattern-color-value').value = patternPicker.value;
}

function showMessage(text, invalid = false) {
  message.textContent = text;
  message.hidden = !text;
  input.setAttribute('aria-invalid', String(invalid));
}

function clearPreview() {
  downloadButton.disabled = true;
  readyKey = '';
  image.hidden = true;
  image.removeAttribute('src');
  emptyState.hidden = false;
  preview.classList.remove('has-qr', 'is-transparent');
  if (pngUrl) URL.revokeObjectURL(pngUrl);
  pngUrl = '';
}

async function updatePreview() {
  const currentRevision = ++revision;
  const link = normalizeLink(input.value);
  const colors = readColors();
  updateColorControls();
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
    // Separate instances keep overlapping link and color renders independent.
    const qr = new QRCodeStyling(createQrOptions(link, colors));
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
    readyKey = renderKey(link, colors);
    image.src = pngUrl;
    image.hidden = false;
    emptyState.hidden = true;
    preview.classList.add('has-qr');
    preview.classList.toggle('is-transparent', colors.background === 'transparent');
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
colorControls.addEventListener('input', updatePreview);
// Also handles autofill and values restored when returning to the page.
window.addEventListener('pageshow', updatePreview);

downloadButton.addEventListener('click', () => {
  if (!pngUrl || renderKey(normalizeLink(input.value), readColors()) !== readyKey) return;
  // Download the exact PNG used by the preview, without a second render.
  const anchor = document.createElement('a');
  anchor.href = pngUrl;
  anchor.download = 'qris.png';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
});

updatePreview();
