const STORAGE_KEY = "regradar-for";

/** IDC mode is on when the URL has ?for=idc, and stays on for the rest of the browser session. */
export function readIdcMode(): boolean {
  const fromUrl = new URLSearchParams(window.location.search).get("for") === "idc";
  try {
    if (fromUrl) sessionStorage.setItem(STORAGE_KEY, "idc");
    return fromUrl || sessionStorage.getItem(STORAGE_KEY) === "idc";
  } catch {
    // Storage unavailable: fall back to the URL alone.
    return fromUrl;
  }
}
