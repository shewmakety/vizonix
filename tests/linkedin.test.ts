import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getIssue } from "@/lib/content";
import { buildLinkedInPost, linkedInIssueUrl, postIssueToLinkedIn } from "@/lib/linkedin";
import type { Issue } from "@/lib/schema";

const envKeys = [
  "LINKEDIN_AUTOPOST",
  "UNIPILE_DSN",
  "UNIPILE_API_KEY",
  "UNIPILE_ACCOUNT_ID",
  "LINKEDIN_ORG_ID_VIZONIX",
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL",
  "GITHUB_TOKEN",
  "GITHUB_REPO",
] as const;

const saved: Record<string, string | undefined> = {};
const markerDate = "2099-12-31";
const markerFile = path.join(process.cwd(), "content", "aviation", "linkedin", `${markerDate}.json`);

function issue(): Issue {
  const loaded = getIssue("aviation", "2026-10-16");
  if (!loaded) throw new Error("Missing aviation issue.");
  return loaded;
}

function dash(code: number): string {
  return String.fromCharCode(code);
}

beforeEach(() => {
  for (const key of envKeys) saved[key] = process.env[key];
});

afterEach(() => {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (fs.existsSync(markerFile)) fs.unlinkSync(markerFile);
  const dir = path.dirname(markerFile);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
});

describe("LinkedIn post text", () => {
  it("stays within 1300 characters, keeps the URL, and uses regular hyphens", () => {
    const url = "https://www.vizonix.com/aviation/issues/2026-10-16";
    const text = buildLinkedInPost(issue(), url);
    expect(text.length).toBeLessThanOrEqual(1300);
    expect(text).toBe(`AI moves into the hangar, plus 7 places to put it to work

On October 13, Veryon launched Veryon for Business Aviation, one platform that combines maintenance tracking, MRO management, defect analysis and technical publications for charter operators, management companies, MROs and flight departments.

- SmartMatch (Aviation Job Search): AI candidate matching built for aviation hiring.
- Flight Leads (Levo): An AI sales dashboard for charter operators, launched July 2, 2026.
- Maintenance Insight (StandardAero): Predictive maintenance and reliability tools that use AI, machine learning and digital twins to analyze engine failure modes and inform work scoping.
- Tailsight: AI maintenance planning and optimization for airline tech ops.

Read the full issue: ${url}
Free AI briefing for aviation. Subscribe: https://www.vizonix.com/aviation

#Aviation #AI #MRO`);
    expect(text).not.toContain("TalentVista (TalentVista)");
    expect(text).not.toContain("Tailsight (Tailsight)");
    expect(text).not.toContain("...");
    expect(text).not.toContain("Plus ");
    expect(text).not.toContain(dash(0x2013));
    expect(text).not.toContain(dash(0x2014));

    const marked = structuredClone(issue());
    marked.subject = `Hangar${dash(0x2014)}desk${dash(0x2013)}note`;
    marked.lead.summary = `One sentence${dash(0x2014)}here. Second sentence.`;
    const cleaned = buildLinkedInPost(marked, url);
    expect(cleaned).not.toContain(dash(0x2013));
    expect(cleaned).not.toContain(dash(0x2014));
    expect(cleaned).toContain("Hangar-desk-note");
    expect(cleaned).toContain(url);
  });

  it("trims bullets before it would cut the issue URL", () => {
    const url = "https://www.vizonix.com/aviation/issues/2026-10-16";
    const huge = structuredClone(issue());
    huge.subject = "T".repeat(180);
    huge.lead.title = "T".repeat(180);
    huge.lead.summary = `${"This sentence keeps going without a stop ".repeat(80).trim()}.`;
    if (huge.playbook) huge.playbook.title = "Playbook title ".repeat(20);
    for (const section of huge.sections ?? []) {
      for (const tool of section.tools) {
        tool.summary = `${"Tool sentence without a stop ".repeat(40).trim()}.`;
      }
    }
    const text = buildLinkedInPost(huge, url);
    expect(text.length).toBeLessThanOrEqual(1300);
    expect(text).toContain(url);
    expect(text).not.toContain("...");
    expect(text).toContain("Read the full issue: https://www.vizonix.com/aviation/issues/2026-10-16");
  });
});

describe("LinkedIn post gates", () => {
  it("skips sample issues, a flag that is off, and an existing marker without calling the network", async () => {
    process.env.LINKEDIN_AUTOPOST = "true";
    process.env.UNIPILE_DSN = "https://unipile.test";
    process.env.UNIPILE_API_KEY = "super-secret-unipile-key";
    const fetchMock = vi.fn(() => {
      throw new Error("network was called");
    });
    vi.stubGlobal("fetch", fetchMock);

    const sample = { ...issue(), sample: true };
    expect(await postIssueToLinkedIn(sample)).toMatchObject({ ok: false, skipped: "sample" });

    process.env.LINKEDIN_AUTOPOST = "false";
    expect(await postIssueToLinkedIn(issue())).toMatchObject({
      ok: false,
      skipped: "LINKEDIN_AUTOPOST is not true",
    });

    process.env.LINKEDIN_AUTOPOST = "true";
    delete process.env.UNIPILE_API_KEY;
    expect(await postIssueToLinkedIn(issue())).toMatchObject({
      ok: false,
      skipped: "UNIPILE_DSN or UNIPILE_API_KEY is not set",
    });

    process.env.UNIPILE_API_KEY = "super-secret-unipile-key";
    fs.mkdirSync(path.dirname(markerFile), { recursive: true });
    fs.writeFileSync(markerFile, JSON.stringify({ postId: "already", postedAt: "2026-10-16T00:00:00.000Z" }));
    const dated = { ...issue(), date: markerDate };
    expect(await postIssueToLinkedIn(dated)).toMatchObject({ ok: false, skipped: "already posted" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts once the page is live and records the marker", async () => {
    process.env.LINKEDIN_AUTOPOST = "true";
    process.env.UNIPILE_DSN = "https://unipile.test";
    process.env.UNIPILE_API_KEY = "super-secret-unipile-key";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.vizonix.com";
    delete process.env.UNIPILE_ACCOUNT_ID;
    delete process.env.LINKEDIN_ORG_ID_VIZONIX;
    delete process.env.VERCEL;

    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });

    const dated = { ...issue(), date: markerDate };
    const pageUrl = linkedInIssueUrl(dated);
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      const headers = init?.headers as Record<string, string> | undefined;
      if (url.startsWith("https://www.vizonix.com")) {
        expect(headers?.["X-API-KEY"]).toBeUndefined();
        if (init?.method === "HEAD") return new Response(null, { status: 404 });
        return new Response("ok", { status: 200 });
      }
      expect(headers?.["X-API-KEY"]).toBe("super-secret-unipile-key");
      if (url.endsWith("/api/v1/accounts")) {
        return Response.json({
          items: [
            { id: "acc_mail", type: "GOOGLE" },
            { id: "acc_1", type: "LINKEDIN" },
          ],
        });
      }
      if (url.includes("/api/v1/users/me")) {
        return Response.json({
          organizations: [
            { id: "org_other", name: "Other Co", mailbox_id: "m1" },
            { id: "org_vz", name: "Vizonix", mailbox_id: "m2" },
          ],
        });
      }
      if (url.includes("/api/v1/linkedin/company/")) {
        return Response.json({ viewer_permissions: { canCreateOrganicShare: true } });
      }
      if (url.endsWith("/api/v1/posts")) {
        const form = init?.body as FormData;
        expect(form.get("account_id")).toBe("acc_1");
        expect(form.get("as_organization")).toBe("org_vz");
        expect(form.get("external_link")).toBe(pageUrl);
        const text = String(form.get("text"));
        expect(text.length).toBeLessThanOrEqual(1300);
        expect(text).toContain(pageUrl);
        expect(text).not.toContain(dash(0x2013));
        expect(text).not.toContain(dash(0x2014));
        return Response.json({ object: "PostCreated", post_id: "post_1" }, { status: 201 });
      }
      return new Response("missing", { status: 404 });
    });

    const result = await postIssueToLinkedIn(dated);
    expect(result).toEqual({ ok: true, postId: "post_1" });
    expect(calls.some((call) => call.startsWith("POST https://unipile.test/api/v1/posts"))).toBe(true);
    const marker = JSON.parse(fs.readFileSync(markerFile, "utf8")) as { postId: string };
    expect(marker.postId).toBe("post_1");
    const logged = logs.join("\n");
    expect(logged).toContain("Resolved UNIPILE_ACCOUNT_ID=acc_1");
    expect(logged).toContain("Resolved LINKEDIN_ORG_ID_VIZONIX=org_vz");
    expect(logged).not.toContain("super-secret-unipile-key");
  });

  it("skips when the issue page is not live and when the account cannot post", async () => {
    process.env.LINKEDIN_AUTOPOST = "true";
    process.env.UNIPILE_DSN = "https://unipile.test";
    process.env.UNIPILE_API_KEY = "super-secret-unipile-key";
    process.env.UNIPILE_ACCOUNT_ID = "acc_pinned";
    process.env.LINKEDIN_ORG_ID_VIZONIX = "org_pinned";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.vizonix.com";

    vi.stubGlobal("fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Response(null, { status: init?.method === "HEAD" ? 404 : 404 });
    });
    const unpublished = { ...issue(), date: "2099-12-29" };
    expect(await postIssueToLinkedIn(unpublished)).toMatchObject({ ok: false, skipped: "issue page not live" });

    let posted = false;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("https://www.vizonix.com")) return new Response("ok", { status: 200 });
      if (url.includes("/api/v1/linkedin/company/")) {
        return Response.json({ viewer_permissions: { canCreateOrganicShare: false } });
      }
      if (url.endsWith("/api/v1/posts")) posted = true;
      return new Response("no", { status: 500 });
    });
    expect(await postIssueToLinkedIn(unpublished)).toMatchObject({
      ok: false,
      skipped: "cannot create an organic share",
    });
    expect(posted).toBe(false);
  });

  it("retries a Unipile 500 once", async () => {
    process.env.LINKEDIN_AUTOPOST = "true";
    process.env.UNIPILE_DSN = "https://unipile.test";
    process.env.UNIPILE_API_KEY = "super-secret-unipile-key";
    process.env.UNIPILE_ACCOUNT_ID = "acc_pinned";
    process.env.LINKEDIN_ORG_ID_VIZONIX = "org_pinned";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.vizonix.com";
    const dated = { ...issue(), date: markerDate };
    let postAttempts = 0;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://www.vizonix.com")) return new Response("ok", { status: 200 });
      if (url.includes("/api/v1/linkedin/company/")) {
        return Response.json({ viewer_permissions: { canCreateOrganicShare: true } });
      }
      if (url.endsWith("/api/v1/posts")) {
        postAttempts += 1;
        if (postAttempts === 1) return new Response("down", { status: 500 });
        return Response.json({ post_id: "post_retry" }, { status: 201 });
      }
      return new Response("no", { status: 404 });
    });
    expect(await postIssueToLinkedIn(dated)).toEqual({ ok: true, postId: "post_retry" });
    expect(postAttempts).toBe(2);
  });
});
