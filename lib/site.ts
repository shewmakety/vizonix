export const site = {
  name: "Vizonix",
  description:
    "A free weekday morning briefing on AI tools, bots, models, and resources that make a specific business more profitable. Aviation first.",
  email: "admin@vizonix.com",
};

export const editor = {
  name: "Tyler Shewmake",
  jobTitle: "Founder and Editor",
  path: "/about#editor",
};

/** Shown at the top of every issue. Not stored on the issue JSON. */
export const whatWeDo = {
  heading: "What We Do",
  copy: "The VIZONIX Daily is a free, five-minute briefing on how AI and robotics are changing aviation operations. Each weekday we pick the news that matters to MROs, operators and suppliers, explain it in plain English, and show where to put AI and robotics to work.",
} as const;

/** Public profiles. Do not add a URL that is not live. */
export const socialProfiles = [
  { name: "X", href: "https://x.com/Vizonixai" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/vizonix" },
] as const;

export const organizationSameAs = socialProfiles.map((profile) => profile.href);

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://vizonix.com";
  return raw.replace(/\/$/, "");
}

/** Navy wordmark for a section, for example "Vizonix - AI & Robotics News For Aviation". */
export function sectionWordmark(sectionName: string): string {
  return `${site.name} - ${sectionName}`;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
