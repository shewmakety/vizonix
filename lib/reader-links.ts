import { preferencesPath, unsubscribePath } from "@/lib/segment-memory";
import { absoluteUrl } from "@/lib/site";
import { signToken, tokenSecret } from "@/lib/tokens";

/** Substituted per reader after the issue body is rendered once for the group. */
export const PREFERENCES_HREF = "__VZ_PREFERENCES_URL__";
export const UNSUBSCRIBE_HREF = "__VZ_UNSUBSCRIBE_URL__";

export function fillReaderLinks(
  template: string,
  links: { preferencesUrl: string; unsubscribeUrl: string },
): string {
  return template.split(PREFERENCES_HREF).join(links.preferencesUrl).split(UNSUBSCRIBE_HREF).join(links.unsubscribeUrl);
}

export function signedReaderLinks(
  email: string,
  segment: string,
  secret = tokenSecret(),
): { preferencesUrl: string; unsubscribeUrl: string } | null {
  if (!secret) return null;
  const normalized = email.trim().toLowerCase();
  return {
    preferencesUrl: absoluteUrl(
      preferencesPath(signToken({ email: normalized, segment, purpose: "preferences" }, secret)),
    ),
    unsubscribeUrl: absoluteUrl(
      unsubscribePath(segment, signToken({ email: normalized, segment, purpose: "unsubscribe" }, secret)),
    ),
  };
}
