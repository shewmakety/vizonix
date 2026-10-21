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

/** Short line under the issue title and in the sign-up block. Regular hyphen. */
export const customizePitch = "Pick your topics - get only the sections you care about";

/** Link label for the topic picker. Email uses the signed manage-topics URL. */
export const customizeLinkLabel = "Customize your issue";

/** Heading of the issue sign-up card on the web and in the email. */
export const signupBlockHeading = "Sign-Up Now";

/** Public page where a new reader picks topics. Preferences needs a signed email link. */
export const customizeWebPath = "/join";

/** Card on the aviation issue page and in the issue email. The email does not list the tools. */
export const toolboxCard = {
  heading: "The Vizonix Toolbox",
  line: "Every AI and robotics tool worth knowing for aviation, in one place",
  button: "Open the Toolbox",
} as const;

/** Display size of the toolbox drawing inside the issue card. Height is the icon size. Width keeps the 1120x480 drawing in proportion. */
export const toolboxCardIcon = { width: 149, height: 64 } as const;

/** Shown at the top of every issue. Not stored on the issue JSON. */
export const whatWeDo = {
  heading: "What We Do",
  copy: "The VIZONIX Daily is a new, free briefing that helps aviation leaders put AI and robotics to work. Every weekday we pick the developments that matter to MROs, operators and suppliers, explain them in plain English, and show where they pay off. Choose the topics you care about, and we'll tailor every issue to you.",
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
