import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { normalizeLink } from '../src/link.js';
import { createQrOptions } from '../src/qr.js';

// Exercise the browser entry through DOM events with a controlled async renderer.
// Keeping renders pending lets us reproduce changes made during PNG generation.
function setup() {
  const elements = new Map();
  function element(value = '') {
    const classes = new Set();
    return {
      value, hidden: false, disabled: true, attrs: {}, events: {},
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
        contains: (name) => classes.has(name),
      },
      setAttribute(name, value) { this.attrs[name] = value; },
      removeAttribute(name) { delete this[name]; },
      addEventListener(name, handler) { this.events[name] = handler; },
      append() {}, remove() {},
    };
  }
  for (const selector of [
    '#link', '#link-message', '.qr-preview', '.empty-state', '.qr-image',
    '.download-button', '.copy-button', '.copy-label',
    '.customization-controls', '#background-custom', '#pattern-custom',
    '#background-custom-field', '#pattern-custom-field',
    '#background-color-value', '#pattern-color-value',
  ]) elements.set(selector, element());
  elements.get('#background-custom').value = '#ffffff';
  elements.get('#pattern-custom').value = '#000000';
  const selected = { background: '#ffffff', pattern: '#000000', shape: 'square' };
  const renders = [], downloads = [], liveUrls = new Set();
  let nextUrl = 0;
  const document = {
    querySelector(selector) {
      const radio = selector.match(/^input\[name="(background|pattern|shape)"\]/);
      if (radio) return selector.endsWith(':checked')
        ? { value: selected[radio[1]] }
        : { checked: selected[radio[1]] === 'custom' };
      return elements.get(selector);
    },
    body: element(),
    createElement: () => ({
      click() { downloads.push({ href: this.href, download: this.download }); },
      remove() {},
    }),
  };
  class QRCodeStyling {
    constructor(options) { this.options = options; }
    getRawData() {
      return new Promise((resolve, reject) => renders.push({ options: this.options, resolve, reject }));
    }
  }
  const context = {
    document, window: { addEventListener() {} }, QRCodeStyling, normalizeLink,
    createQrOptions, Blob, Image: class { async decode() {} },
    URL: {
      createObjectURL() { const url = `blob:${++nextUrl}`; liveUrls.add(url); return url; },
      revokeObjectURL(url) { liveUrls.delete(url); },
    },
    fetch: async (url) => ({ blob: async () => new Blob([url], { type: 'image/png' }) }),
    navigator: { clipboard: { write: async () => {} } },
    ClipboardItem: class { constructor(items) { this.items = items; } },
    setTimeout: globalThis.setTimeout,
  };
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  runInNewContext(source.replace(/^import .*;\n/gm, ''), context);
  return {
    elements, renders, downloads, liveUrls,
    type(value) {
      elements.get('#link').value = value;
      return elements.get('#link').events.input();
    },
    choose(group, value) {
      selected[group] = value;
      return elements.get('.customization-controls').events.input();
    },
    pick(group, value) {
      elements.get(`#${group}-custom`).value = value;
      return elements.get('.customization-controls').events.input();
    },
    async finish(index) {
      renders[index].resolve(new Blob([`PNG ${index}`], { type: 'image/png' }));
      for (let i = 0; i < 6; i++) await Promise.resolve();
    },
  };
}

test('default QR stays square, black on white, with a clear export margin', async () => {
  const app = setup();
  app.type('example.com');
  const options = app.renders[0].options;
  assert.equal(options.data, 'https://example.com');
  assert.equal(options.shape, 'square');
  assert.equal(options.width, options.height);
  assert.ok(options.margin >= 144);
  assert.equal(options.backgroundOptions.color, '#ffffff');
  for (const key of ['dotsOptions', 'cornersSquareOptions', 'cornersDotOptions']) {
    assert.deepEqual(options[key], { type: 'square', color: '#000000' });
  }
  await app.finish(0);
  assert.equal(app.elements.get('.download-button').disabled, false);
});

test('custom colors are independent and persist across links and preset changes', async () => {
  const app = setup();
  app.choose('background', 'custom');
  app.pick('background', '#f4d35e');
  app.choose('pattern', 'custom');
  app.pick('pattern', '#193b70');
  assert.equal(app.renders.length, 0, 'blank input must not render');
  assert.equal(app.elements.get('#background-custom-field').hidden, false);
  assert.equal(app.elements.get('#pattern-custom-field').hidden, false);
  app.type('example.com');
  assert.equal(app.renders[0].options.backgroundOptions.color, '#f4d35e');
  assert.equal(app.renders[0].options.dotsOptions.color, '#193b70');
  await app.finish(0);
  app.type('https://example.org/path?q=yes#details');
  assert.equal(app.elements.get('.download-button').disabled, true);
  assert.equal(app.renders[1].options.backgroundOptions.color, '#f4d35e');
  assert.equal(app.renders[1].options.dotsOptions.color, '#193b70');
  app.choose('background', '#000000');
  assert.equal(app.renders[2].options.dotsOptions.color, '#193b70');
  assert.equal(app.elements.get('#background-custom-field').hidden, true);
  app.choose('background', 'custom');
  assert.equal(app.renders[3].options.backgroundOptions.color, '#f4d35e');
  await app.finish(3);
});

test('transparent background uses the same ready PNG for preview and download', async () => {
  const app = setup();
  app.type('example.com');
  await app.finish(0);
  const oldUrl = app.elements.get('.qr-image').src;
  app.choose('background', 'transparent');
  assert.equal(app.elements.get('.download-button').disabled, true);
  assert.equal(app.liveUrls.has(oldUrl), false);
  assert.equal(app.renders[1].options.backgroundOptions.color, 'transparent');
  await app.finish(1);
  assert.equal(app.elements.get('.qr-preview').classList.contains('is-transparent'), true);
  app.elements.get('.download-button').events.click();
  assert.deepEqual(app.downloads, [{ href: app.elements.get('.qr-image').src, download: 'qris.png' }]);
  app.choose('background', '#ffffff');
  await app.finish(2);
  assert.equal(app.elements.get('.qr-preview').classList.contains('is-transparent'), false);
});

test('late link or color renders cannot restore stale previews or downloads', async () => {
  const app = setup();
  app.type('example.com');
  app.choose('pattern', '#ffffff');
  await app.finish(1);
  const latestUrl = app.elements.get('.qr-image').src;
  await app.finish(0);
  assert.equal(app.elements.get('.qr-image').src, latestUrl);
  app.choose('background', '#000000');
  app.type('invalid link');
  await app.finish(2);
  assert.equal(app.elements.get('.qr-image').hidden, true);
  assert.equal(app.elements.get('.download-button').disabled, true);
  assert.equal(app.elements.get('#link-message').hidden, false);
  app.elements.get('.download-button').events.click();
  assert.equal(app.downloads.length, 0);
  app.type('example.org');
  app.type('');
  app.choose('background', 'transparent');
  await app.finish(3);
  assert.equal(app.elements.get('.qr-image').hidden, true);
  assert.equal(app.elements.get('.empty-state').hidden, false);
  assert.equal(app.elements.get('#link-message').hidden, true);
  assert.equal(app.elements.get('.download-button').disabled, true);
  assert.equal(app.liveUrls.size, 0);
  app.elements.get('.download-button').events.click();
  assert.equal(app.downloads.length, 0);
});

test('Rounded dots keeps square corners, export dimensions, and margins across link and color changes', async () => {
  const app = setup();
  app.choose('shape', 'rounded');
  assert.equal(app.renders.length, 0);
  app.type('example.com');
  await app.finish(0);
  app.choose('background', 'transparent');
  app.choose('pattern', 'custom');
  app.pick('pattern', '#193b70');
  app.type('https://example.org/longer/path?campaign=test&source=qris#download');
  const options = app.renders[4].options;
  assert.equal(options.shape, 'square');
  assert.equal(options.width, 1024);
  assert.equal(options.height, 1024);
  assert.equal(options.margin, 144);
  assert.equal(options.backgroundOptions.color, 'transparent');
  assert.deepEqual(options.dotsOptions, { type: 'rounded', color: '#193b70' });
  assert.deepEqual(options.cornersSquareOptions, { type: 'square', color: '#193b70' });
  assert.deepEqual(options.cornersDotOptions, { type: 'square', color: '#193b70' });
  await app.finish(4);
  app.elements.get('.download-button').events.click();
  assert.deepEqual(app.downloads, [{ href: app.elements.get('.qr-image').src, download: 'qris.png' }]);
});

test('shape changes invalidate old downloads and late renders cannot replace the current shape', async () => {
  const app = setup();
  app.type('example.com');
  await app.finish(0);
  const oldUrl = app.elements.get('.qr-image').src;
  app.choose('shape', 'rounded');
  assert.equal(app.elements.get('.download-button').disabled, true);
  assert.equal(app.liveUrls.has(oldUrl), false);
  app.elements.get('.download-button').events.click();
  assert.equal(app.downloads.length, 0);
  app.choose('shape', 'square');
  await app.finish(2);
  const currentUrl = app.elements.get('.qr-image').src;
  await app.finish(1);
  assert.equal(app.elements.get('.qr-image').src, currentUrl);
  app.elements.get('.download-button').events.click();
  assert.deepEqual(app.downloads, [{ href: currentUrl, download: 'qris.png' }]);
  app.choose('shape', 'rounded');
  app.type('');
  await app.finish(3);
  assert.equal(app.elements.get('.download-button').disabled, true);
  assert.equal(app.elements.get('.qr-image').hidden, true);
  assert.equal(app.liveUrls.size, 0);
});
