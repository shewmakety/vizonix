const skipPrefixes = ["mailto:", "tel:", "javascript:", "#"];

export type LinkFailure = { url: string; status: number; from: string };

function extractHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const pattern = /href="([^"]+)"/g;
  let match = pattern.exec(html);
  while (match) {
    hrefs.push(match[1]);
    match = pattern.exec(html);
  }
  return hrefs;
}

export async function checkLinks(baseUrl: string, seeds: string[]): Promise<LinkFailure[]> {
  const origin = new URL(baseUrl).origin;
  const queue = seeds.map((path) => new URL(path, baseUrl).toString());
  const seen = new Set<string>();
  const failures: LinkFailure[] = [];

  while (queue.length > 0 && seen.size < 80) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    let response: Response;
    try {
      response = await fetch(url, { redirect: "manual" });
    } catch {
      failures.push({ url, status: 0, from: "request" });
      continue;
    }
    if (response.status >= 400) {
      failures.push({ url, status: response.status, from: "response" });
      continue;
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        const next = new URL(location, url);
        if (next.origin === origin) queue.push(next.toString());
      }
      continue;
    }
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) continue;
    const html = await response.text();
    if (/[\u2013\u2014]/.test(html)) {
      failures.push({ url, status: 422, from: "em-or-en-dash-in-html" });
    }
    for (const href of extractHrefs(html)) {
      if (skipPrefixes.some((prefix) => href.startsWith(prefix))) continue;
      let next: URL;
      try {
        next = new URL(href, url);
      } catch {
        failures.push({ url: href, status: 0, from: url });
        continue;
      }
      if (next.origin !== origin) continue;
      if (next.pathname.startsWith("/api/")) continue;
      next.hash = "";
      queue.push(next.toString());
    }
  }

  return failures;
}

async function main() {
  const base = process.argv[2];
  if (!base) {
    console.error("Usage: npm run check-links -- http://127.0.0.1:3456");
    process.exit(1);
  }
  const failures = await checkLinks(base, ["/"]);
  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log("Link check passed.");
}

if (process.argv[1]?.includes("check-links")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
