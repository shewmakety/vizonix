import { absoluteUrl, siteUrl } from "@/lib/site";

const KEY_PATTERN = /^[a-f0-9]{8,128}$/i;

export function indexNowKey(): string | undefined {
  const key = process.env.INDEXNOW_KEY?.trim() ?? "";
  return KEY_PATTERN.test(key) ? key : undefined;
}

/** Middleware rewrite target for https://host/{key}.txt */
export function indexNowRewritePath(pathname: string): string | null {
  const key = indexNowKey();
  if (!key || pathname !== `/${key}.txt`) return null;
  return "/indexnow.txt";
}

export function indexNowTargets(issue: { segment: string; date: string }): string[] {
  return [
    absoluteUrl(`/${issue.segment}/issues/${issue.date}`),
    absoluteUrl(`/${issue.segment}`),
    absoluteUrl(`/${issue.segment}/issues`),
    absoluteUrl("/llms.txt"),
  ];
}

export async function pingIndexNow(
  urls: string[],
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const key = indexNowKey();
  if (!key) return { ok: false, skipped: "INDEXNOW_KEY is not set" };
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
