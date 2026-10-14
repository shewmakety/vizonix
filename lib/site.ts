export const site = {
  name: "Vizonix",
  description:
    "A free weekday morning briefing on AI tools, bots, models, and resources that make a specific business more profitable. Legal practices first.",
  emailHello: "hello@vizonix.com",
  emailSponsors: "sponsors@vizonix.com",
  emailPrivacy: "privacy@vizonix.com",
};

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://vizonix.com";
  return raw.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
