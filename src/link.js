// Return the trimmed link, adding HTTPS only for a bare domain.
// URL parsing validates structure without making a network request.
export function normalizeLink(input) {
  const value = input.trim();
  if (!value) return '';
  if (/[\s\\]/u.test(value)) return null;

  const hasHttpScheme = /^https?:\/\//i.test(value);
  if (hasHttpScheme && !/^https?:\/\/[^/?#]/i.test(value)) return null;
  const isHostWithPort = /^[^/?#:]+:\d+(?:[/?#]|$)/.test(value);
  if (!hasHttpScheme && (/^[a-z][a-z\d+.-]*:/i.test(value) && !isHostWithPort)) {
    return null;
  }
  if (/^[/?#]/.test(value)) return null;

  const link = hasHttpScheme ? value : `https://${value}`;
  try {
    const url = new URL(link);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;

    const hostname = url.hostname.replace(/\.$/, '');
    if (!hostname.startsWith('[') && !hostname.split('.').every((label) =>
      /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))) {
      return null;
    }
    // A bare value must look like a domain, not arbitrary text or an email.
    if (!hasHttpScheme && (!hostname.includes('.') || url.username || url.password)) {
      return null;
    }
    return link;
  } catch {
    return null;
  }
}
