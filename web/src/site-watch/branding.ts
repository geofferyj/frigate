// Branding for the Site pages and the rest of the Frigate UI.
// Colours and the logo swap live in theme.css (Frigate's CSS theme variables); the name is here.

export const BRAND = "Horus";

/** Browser tab title for one of our pages. */
export function pageTitle(section: string) {
  return `${section} · ${BRAND}`;
}

let observing = false;

/**
 * Frigate's pages set `document.title` to "<Page> - Frigate" from their translations. Rather than
 * patching every translation file, watch the <title> element and swap the product name whenever
 * it changes. Safe to call many times.
 */
export function brandDocumentTitles() {
  if (observing || typeof document === "undefined") {
    return;
  }
  observing = true;
  const apply = () => {
    if (document.title.includes("Frigate")) {
      document.title = document.title.replace(/Frigate/g, BRAND);
    }
  };
  apply();
  const title = document.querySelector("title");
  if (title) {
    new MutationObserver(apply).observe(title, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
}
