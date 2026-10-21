/**
 * Public base for section icons. Change this one constant when the custom domain is ready.
 * SECTION_ICON_BASE_URL overrides it for a preview or a test.
 */
export const sectionIconBaseUrl =
  "https://pub-06a3d59a0eda4064b8f07fbcffd3df6d.r2.dev/vizonix/icons/v1";

/**
 * Heading label to file stem. Each stem is published as stem.svg and stem@2x.png.
 * A heading that continues after a colon, such as "AOG support: ...", uses the shorter label.
 */
export const sectionIconFiles: Record<string, string> = {
  Recruiting: "recruiting",
  "Sales and marketing": "sales",
  "Predictive maintenance": "predictive",
  "Maintenance activity optimization": "maintenance",
  "Troubleshooting support": "troubleshooting",
  Warehousing: "warehousing",
  "AOG support": "aog",
  "AI Productivity Tools": "ai-tools",
  "General AI Productivity Tools": "ai-tools",
  "The Ramp": "the-ramp",
  "Top story": "top-story",
  Playbook: "playbook",
  "Quick links": "quick-links",
};

export type SectionIconVariant = "web" | "email";

function iconBase(): string {
  return (process.env.SECTION_ICON_BASE_URL || sectionIconBaseUrl).replace(/\/$/, "");
}

function iconStem(topic: string): string | undefined {
  const direct = sectionIconFiles[topic];
  if (direct) return direct;
  const key = Object.keys(sectionIconFiles)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => topic.startsWith(`${candidate}:`));
  return key ? sectionIconFiles[key] : undefined;
}

/** SVG on the site, @2x PNG in email. Undefined when the heading has no icon. */
export function sectionIconUrl(
  topic: string | undefined,
  variant: SectionIconVariant = "web",
): string | undefined {
  if (!topic) return undefined;
  const file = iconStem(topic);
  if (!file) return undefined;
  if (/^https?:\/\//i.test(file)) return file;
  const base = iconBase();
  if (!base) return undefined;
  const stem = file
    .replace(/^\//, "")
    .replace(/@2x\.(png|svg)$/i, "")
    .replace(/\.(png|svg)$/i, "");
  const name = variant === "email" ? `${stem}@2x.png` : `${stem}.svg`;
  return `${base}/${name}`;
}

/** Toolbox card icon. SVG on the site, @2x PNG in email. Same public base as the section icons. */
export function toolboxIllustrationUrl(variant: SectionIconVariant = "web"): string {
  const base = iconBase();
  const name = variant === "email" ? "toolbox-v2@2x.png" : "toolbox-v2.svg";
  return `${base}/${name}`;
}
