import { preferencesPath, unsubscribePath } from "@/lib/segment-memory";
import { absoluteUrl } from "@/lib/site";
import { signToken } from "@/lib/tokens";

export function readerLinks(
  email: string,
  segment: string,
  secret: string,
): { preferencesUrl: string; unsubscribeUrl: string } {
  return {
    preferencesUrl: absoluteUrl(
      preferencesPath(signToken({ email, segment, purpose: "preferences" }, secret)),
    ),
    unsubscribeUrl: absoluteUrl(
      unsubscribePath(segment, signToken({ email, segment, purpose: "unsubscribe" }, secret)),
    ),
  };
}
