import {
  featuredSegment,
  getSegment,
  segmentFromPathname,
  toolDirectoryHref,
  toolDirectoryPath,
  type Segment,
} from "@/lib/segments";

export const SEGMENT_COOKIE = "vz_segment";
export const SEGMENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/** Request header set by middleware. Not accepted from the browser. */
export const SEGMENT_HEADER = "x-vz-segment";

/** Shared pages that keep a section URL in the browser. */
export const SEGMENT_ALIAS_TAILS = ["confirm", "unsubscribe", "subscribe"] as const;

export function segmentCookieAttributes(secure = process.env.NODE_ENV === "production") {
  return {
    path: "/",
    maxAge: SEGMENT_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    httpOnly: true,
    secure,
  };
}

/** Known section from the cookie, including sections still in preparation. */
export function rememberedSegment(cookieValue: string | null | undefined): Segment | undefined {
  if (!cookieValue) return undefined;
  return getSegment(cookieValue);
}

export function resolveRememberedSlug(
  headerSlug: string | null | undefined,
  cookieValue: string | null | undefined,
): string | undefined {
  if (headerSlug && getSegment(headerSlug)) return headerSlug;
  return rememberedSegment(cookieValue)?.slug;
}

/**
 * Where GET / should send a returning reader.
 * Only a launched section. A missing, unknown, or planned cookie stays on /.
 */
export function rootRedirectForCookie(cookieValue: string | null | undefined): string | null {
  const segment = rememberedSegment(cookieValue);
  if (!segment || segment.status !== "active") return null;
  return `/${segment.slug}`;
}

function segmentForChrome(pathname: string, cookieValue?: string | null): Segment {
  return segmentFromPathname(pathname) ?? rememberedSegment(cookieValue) ?? featuredSegment();
}

/** Logo and Home. Never the bare marketing root. */
export function segmentHomeHref(pathname: string, cookieValue?: string | null): string {
  return `/${segmentForChrome(pathname, cookieValue).slug}`;
}

/** Tool Directory. The page's section wins over the cookie. */
export function segmentDirectoryHref(pathname: string, cookieValue?: string | null): string {
  if (segmentFromPathname(pathname)) return toolDirectoryHref(pathname);
  const remembered = rememberedSegment(cookieValue);
  if (remembered) return toolDirectoryPath(remembered);
  return toolDirectoryHref(pathname);
}

export function segmentSubscribeHref(pathname: string, cookieValue?: string | null): string {
  return `/${segmentForChrome(pathname, cookieValue).slug}/subscribe`;
}

export function segmentUnsubscribeHref(pathname: string, cookieValue?: string | null): string {
  return `/${segmentForChrome(pathname, cookieValue).slug}/unsubscribe`;
}

export function confirmPath(segmentSlug: string, token: string): string {
  return `/${segmentSlug}/confirm?token=${encodeURIComponent(token)}`;
}

export function unsubscribePath(segmentSlug: string, token?: string): string {
  if (!token) return `/${segmentSlug}/unsubscribe`;
  return `/${segmentSlug}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** /aviation/confirm rewrites to /confirm. Other section URLs stay put. */
export function segmentAliasRewrite(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  if (!getSegment(parts[0])) return null;
  if (!SEGMENT_ALIAS_TAILS.includes(parts[1] as (typeof SEGMENT_ALIAS_TAILS)[number])) return null;
  return `/${parts[1]}`;
}
