export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Allow site paths and http(s) URLs. Rejects javascript: and other schemes. */
export function publicHref(value: string): string {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Blocked URL");
  }
  return url.toString();
}
