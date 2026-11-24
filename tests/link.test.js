import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLink } from '../src/link.js';

test('blank input returns the empty state', () => {
  for (const input of ['', '   ', '\t\n']) {
    assert.equal(normalizeLink(input), '');
  }
});

test('bare domains get HTTPS and retain the complete destination', () => {
  for (const link of [
    'example.com',
    'www.example.com/path/to/page?search=a%20b&x=1#section',
    'example.com:8080/path?x=1#fragment',
    '127.0.0.1:8080/path',
    '例え.テスト/path',
  ]) {
    assert.equal(normalizeLink(`  ${link}  `), `https://${link}`);
  }
});

test('HTTP and HTTPS URLs retain paths, query strings, and fragments', () => {
  for (const link of [
    'https://example.com/path?first=one&second=two#details',
    'http://example.com:8080/a%2Fb?redirect=https%3A%2F%2Fexample.org#part',
    'HTTPS://EXAMPLE.COM/Path?Key=Value#Fragment',
    'http://localhost:5173/',
    'https://[::1]:8080/path',
  ]) {
    assert.equal(normalizeLink(`\n ${link} \t`), link);
  }
});

test('invalid input and unsupported protocols never produce a QR destination', () => {
  for (const link of [
    'not-a-link', 'some words', 'example..com', '-example.com', 'example-.com',
    'https://', 'https:///example.com', 'http:example.com', 'https:/example.com',
    'ftp://example.com', 'javascript:alert(1)', 'mailto:user@example.com',
    'data:text/plain,hello', 'user@example.com', '//example.com',
    '/example.com', 'https://example.com:99999', 'https://example.com/a b',
    'https://exam\nple.com', 'https://example.com\\evil',
  ]) {
    assert.equal(normalizeLink(link), null, link);
  }
});
