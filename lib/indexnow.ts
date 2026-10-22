import { getSegment, toolDirectoryPath } from "@/lib/segments";
import { absoluteUrl, siteUrl } from "@/lib/site";

const KEY_PATTERN = /^[a-f0-9]{8,128}$/i;

/** Public IndexNow key. Served at /{key}.txt. Not a secret. */
export const INDEXNOW_PUBLIC_KEY = "37974ccaf24526ab8e10a675a3fa4935";

export function indexNowKey(): string | undefined {
  const key = process.env.INDEXNOW_KEY?.trim() ?? "";
  return KEY_PATTERN.test(key) ? key : undefined;
}

/** Env wins. The committed key is used when INDEXNOW_KEY is missing or not a hex key. */
export function indexNowKeyForPublish(envValue: string | undefined = process.env.INDEXNOW_KEY): string {
  const fromEnv = envValue?.trim() ?? "";
  if (KEY_PATTERN.test(fromEnv)) return fromEnv;
  return INDEXNOW_PUBLIC_KEY;
}

/** Middleware rewrite target for https://host/{key}.txt */
export function indexNowRewritePath(pathname: string): string | null {
  const key = indexNowKey();
  if (!key || pathname !== `/${key}.txt`) return null;
  return "/indexnow.txt";
}

/** Issue URL, segment page, toolbox, and the sitemap. */
export function indexNowTargets(issue: { segment: string; date: string }): string[] {
  const segment = getSegment(issue.segment);
  const toolbox = segment ? toolDirectoryPath(segment) : `/${issue.segment}/tools`;
  return [
    absoluteUrl(`/${issue.segment}/issues/${issue.date}`),
    absoluteUrl(`/${issue.segment}`),
    absoluteUrl(toolbox),
    absoluteUrl("/sitemap.xml"),
  ];
}

export async function pingIndexNow(
  urls: string[],
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const key = indexNowKeyForPublish();
  if (urls.length === 0) return { ok: false, skipped: "no urls" };
  const origin = siteUrl();
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(origin).host,
        key,
        keyLocation: `${origin}/${key}.txt`,
        urlList: urls,
      }),
    });
    if (!response.ok) return { ok: false, error: `IndexNow responded ${response.status}` };
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "IndexNow request failed";
    return { ok: false, error: message };
  }
}
