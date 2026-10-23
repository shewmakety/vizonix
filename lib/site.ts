import { getSegment } from "@/lib/segments";

export const site = {
  name: "Vizonix",
  description:
    "A free weekday morning briefing on AI tools, bots, models, and resources that make a specific business more profitable. Aviation first.",
  email: "admin@vizonix.com",
  /**
   * CAN-SPAM postal address, printed at the bottom of the issue email.
   */
  postalAddress: "16703 Early Riser Ave Suite #510, Land O' Lakes, FL 34638",
};

export const editor = {
  name: "Tyler Shewmake",
  jobTitle: "Founder and Editor",
  path: "/about#editor",
};

/** Short line under the issue title. Regular hyphen. */
export const customizePitch = "Pick your topics - get only the sections you care about";

/** Link label for the topic picker in the issue header. Email uses the signed manage-topics URL. */
export const customizeLinkLabel = "Customize your issue";

/** Public page where a new reader picks topics. Preferences needs a signed email link. */
export const customizeWebPath = "/join";

/** Where the What We Do card sends a reader who is already on the site. */
export const preferencesPath = "/preferences";

/**
 * Sentence and button on the What We Do card.
 * The heading is not shown. The sentence continues that card's body.
 */
export const customizeCard = {
  heading: "Customize",
  copy: "Make Vizonix yours. Choose which sections you get, drop the ones you don't need, and change it anytime.",
  action: "Update my preferences",
} as const;

/** Card on the issue page and in the issue email. The email does not list the tools. */
export const toolboxCard = {
  heading: "The Vizonix Toolbox",
  button: "Open the Toolbox",
} as const;

/** Two or three sentences. The audience comes from the segment, not a hard-coded edition name. */
export function toolboxCardCopy(segmentSlug: string): string {
  const segment = getSegment(segmentSlug);
  const audience = segment
    ? segment.audience.charAt(0).toLowerCase() + segment.audience.slice(1)
    : "the teams this briefing covers";
  return `The Toolbox is a curated, regularly updated list of AI and robotics tools for ${audience}. It is organized by the same topics as the issue. Each listing says what the tool does and links to it.`;
}

/** Display size of the toolbox icon inside the issue card. Slightly wide, and tall enough to read at 64px. */
export const toolboxCardIcon = { width: 80, height: 64 } as const;

/** Shown at the top of every issue. Not stored on the issue JSON. */
export const whatWeDo = {
  heading: "What We Do",
  copy: "The Vizonix Daily is a new, free briefing that helps aviation leaders put AI and robotics to work. Every weekday we pick the developments that matter to MROs, operators and suppliers, explain them in plain English, and show where they pay off. Choose the topics you care about, and we'll tailor every issue to you.",
} as const;

/** What We Do body. The customize sentence continues the same paragraph. */
export function whatWeDoBody(): string {
  return `${whatWeDo.copy} ${customizeCard.copy}`;
}

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
