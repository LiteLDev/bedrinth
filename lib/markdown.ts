/** `https:`, `mailto:`, or a protocol-relative `//host`. */
const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Points a URL from a README at the repository it was written in.
 *
 * READMEs are written to be read on their host — `assets/icon.png`, `LICENSE`,
 * `docs/getting-started.md` — so a browser would otherwise resolve them against
 * this site. Absolute URLs and in-page anchors (`#code-of-conduct`) are already
 * meaningful and pass through untouched.
 */
export function resolveMarkdownUrl(
  url: string | undefined,
  base: string,
): string | undefined {
  if (!url || url.startsWith("#") || ABSOLUTE_URL.test(url)) return url;
  return base + url.replace(/^\.?\//, "");
}
