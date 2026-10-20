/**
 * Optional artwork for issue section headings.
 * Map a topic string to a filename (or an absolute image URL).
 * Leave a topic out, or leave the base URL empty, and that heading has no icon.
 */
export const sectionIconFiles: Record<string, string> = {};

const configuredIconBaseUrl = "";

export function sectionIconBaseUrl(): string {
  return (process.env.SECTION_ICON_BASE_URL || configuredIconBaseUrl).replace(/\/$/, "");
}

/** Image URL for a topic heading, or undefined when that topic has no icon yet. */
export function sectionIconUrl(topic: string | undefined): string | undefined {
  if (!topic) return undefined;
  const file = sectionIconFiles[topic];
  if (!file) return undefined;
  if (/^https?:\/\//i.test(file)) return file;
  const base = sectionIconBaseUrl();
  if (!base) return undefined;
  return `${base}/${file.replace(/^\//, "")}`;
}
