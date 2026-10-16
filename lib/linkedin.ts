import fs from "fs";
import path from "path";
import { githubConfigured, readRepoFile, writeRepoFile } from "@/lib/github";
import { issueSections, type Issue } from "@/lib/schema";
import { getSegment } from "@/lib/segments";

export type LinkedInPostResult = {
  ok: boolean;
  postId?: string;
  skipped?: string;
  error?: string;
};

const POST_LIMIT = 1200;
const REQUEST_TIMEOUT_MS = 20_000;

const hashtagsBySegment: Record<string, string[]> = {
  aviation: ["#Aviation", "#AI", "#MRO"],
  legal: ["#Legal", "#AI"],
  warehousing: ["#Warehousing", "#AI"],
  "marketing-sales": ["#Marketing", "#AI", "#Sales"],
};

function sanitize(text: string): string {
  return text.replace(/\u2014/g, "-").replace(/\u2013/g, "-").replace(/\s+/g, " ").trim();
}

function clip(text: string, max: number): string {
  const clean = sanitize(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, Math.max(0, max - 3));
  const lastSpace = cut.lastIndexOf(" ");
  const shortened = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${shortened}...`;
}

function firstSentences(text: string, count: number): string {
  const clean = sanitize(text);
  const parts = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length === 0) return clean;
  return parts.slice(0, count).join(" ");
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function linkedInIssueUrl(issue: Pick<Issue, "segment" | "date">): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.vizonix.com").replace(/\/$/, "");
  return `${base}/${issue.segment}/issues/${issue.date}`;
}

/** Post copy for one issue. The issue URL is kept whole, and the result stays within 1200 characters. */
export function buildLinkedInPost(issue: Issue, issueUrl: string): string {
  const segmentName = getSegment(issue.segment)?.name ?? issue.segment;
  const tags = hashtagsBySegment[issue.segment] ?? ["#Vizonix", "#AI"];
  const sections = issueSections(issue);
  const tools = sections.flatMap((section, sectionIndex) =>
    section.tools.map((tool) => ({ tool, sectionIndex })),
  );
  const usedSections = new Set<number>();
  const bullets = [clip(firstSentences(issue.lead.summary, 2), 280)];
  if (tools[0]) {
    const tool = tools[0].tool;
    const who = tool.company ? `${tool.name} (${tool.company})` : tool.name;
    bullets.push(clip(`${who}: ${firstSentences(tool.summary, 1)}`, 280));
    usedSections.add(tools[0].sectionIndex);
  }
  if (tools[1]) {
    const tool = tools[1].tool;
    const who = tool.company ? `${tool.name} (${tool.company})` : tool.name;
    bullets.push(clip(`${who}: ${firstSentences(tool.summary, 1)}`, 280));
    usedSections.add(tools[1].sectionIndex);
  } else {
    const intro = sections.find((section) => section.intro);
    if (intro?.intro) {
      const label = intro.topic ? `${intro.topic}: ` : "";
      bullets.push(clip(`${label}${firstSentences(intro.intro, 1)}`, 280));
    }
  }

  const remaining = sections
    .filter((section, index) => !usedSections.has(index) && section.topic)
    .map((section) => section.topic as string);
  const plus = remaining.length
    ? `Plus ${joinList(remaining)} and the playbook ${issue.playbook.title}.`
    : `Plus the playbook ${issue.playbook.title}.`;

  let hook = clip(issue.lead.title || issue.subject, 180);
  let plusLine = clip(plus, 240);
  let lines = bullets.map((bullet) => sanitize(bullet)).filter(Boolean);

  const render = () => {
    const parts = [
      hook,
      "",
      `Today's Vizonix ${segmentName} briefing:`,
      ...lines.map((bullet) => `- ${bullet}`),
      "",
      plusLine,
      "",
      `Read the full issue: ${issueUrl}`,
      `Free every morning. Subscribe at vizonix.com/${issue.segment}`,
      "",
      tags.join(" "),
    ];
    return parts.join("\n");
  };

  while (render().length > POST_LIMIT && lines.length > 0) {
    const last = lines[lines.length - 1];
    if (last.length > 80) {
      lines[lines.length - 1] = clip(last, Math.max(60, last.length - 40));
      continue;
    }
    if (lines.length > 1) {
      lines.pop();
      continue;
    }
    break;
  }
  while (render().length > POST_LIMIT && plusLine.length > 40) {
    plusLine = clip(plusLine, Math.max(40, plusLine.length - 30));
  }
  while (render().length > POST_LIMIT && hook.length > 40) {
    hook = clip(hook, Math.max(40, hook.length - 20));
  }
  if (render().length > POST_LIMIT) lines = [];
  return render();
}

function markerPath(issue: Pick<Issue, "segment" | "date">): string {
  return `content/${issue.segment}/linkedin/${issue.date}.json`;
}

function safeMarker(issue: Pick<Issue, "segment" | "date">): boolean {
  return !issue.segment.includes("/") && !issue.segment.includes("..") && /^\d{4}-\d{2}-\d{2}$/.test(issue.date);
}

async function readMarker(issue: Issue): Promise<boolean> {
  const relative = markerPath(issue);
  if (process.env.VERCEL) {
    const remote = await readRepoFile(relative);
    return Boolean(remote?.text);
  }
  return fs.existsSync(path.join(process.cwd(), relative));
}

async function writeMarker(issue: Issue, postId: string): Promise<void> {
  const relative = markerPath(issue);
  const body = `${JSON.stringify({ postId, postedAt: new Date().toISOString() }, null, 2)}\n`;
  if (process.env.VERCEL) {
    await writeRepoFile(relative, body, `Record LinkedIn post for ${issue.segment} ${issue.date}`);
    return;
  }
  const full = path.join(process.cwd(), relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
}

function dsn(): string {
  return (process.env.UNIPILE_DSN || "").trim().replace(/\/$/, "");
}

function apiKey(): string {
  return (process.env.UNIPILE_API_KEY || "").trim();
}

function isRetryableError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

async function unipileFetch(url: string, init: RequestInit, attempt = 0): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json",
        "X-API-KEY": apiKey(),
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
    if (response.status >= 500 && attempt === 0) {
      return unipileFetch(url, init, attempt + 1);
    }
    return response;
  } catch (error) {
    if (attempt === 0 && isRetryableError(error)) {
      return unipileFetch(url, init, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

type AccountRow = { id?: string; type?: string; provider?: string };

function accountRows(body: unknown): AccountRow[] {
  if (!body || typeof body !== "object") return [];
  const record = body as { items?: unknown; data?: unknown };
  const list = Array.isArray(record.items) ? record.items : Array.isArray(record.data) ? record.data : [];
  return list.filter((item): item is AccountRow => Boolean(item) && typeof item === "object");
}

function isLinkedInAccount(account: AccountRow): boolean {
  const kind = (account.type || account.provider || "").toUpperCase();
  return kind === "LINKEDIN" && Boolean(account.id);
}

async function resolveAccountId(): Promise<string | undefined> {
  const configured = process.env.UNIPILE_ACCOUNT_ID?.trim();
  if (configured) return configured;
  let cursor = "";
  for (let page = 0; page < 5; page += 1) {
    const url = new URL(`${dsn()}/api/v1/accounts`);
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await unipileFetch(url.toString(), { method: "GET" });
    if (!response.ok) return undefined;
    const body = (await response.json()) as { cursor?: string | null };
    const match = accountRows(body).find(isLinkedInAccount);
    if (match?.id) {
      console.log(`Resolved UNIPILE_ACCOUNT_ID=${match.id}`);
      return match.id;
    }
    if (!body.cursor) return undefined;
    cursor = body.cursor;
  }
  return undefined;
}

async function resolveOrgId(accountId: string): Promise<string | undefined> {
  const configured = process.env.LINKEDIN_ORG_ID_VIZONIX?.trim();
  if (configured) return configured;
  const url = new URL(`${dsn()}/api/v1/users/me`);
  url.searchParams.set("account_id", accountId);
  const response = await unipileFetch(url.toString(), { method: "GET" });
  if (!response.ok) return undefined;
  const body = (await response.json()) as {
    organizations?: Array<{ id?: string; name?: string }>;
  };
  const org = body.organizations?.find((item) => item.name?.trim().toLowerCase() === "vizonix" && item.id);
  if (!org?.id) return undefined;
  console.log(`Resolved LINKEDIN_ORG_ID_VIZONIX=${org.id}`);
  return org.id;
}

async function canPostAsOrg(accountId: string, orgId: string): Promise<boolean> {
  const url = new URL(`${dsn()}/api/v1/linkedin/company/${encodeURIComponent(orgId)}`);
  url.searchParams.set("account_id", accountId);
  const response = await unipileFetch(url.toString(), { method: "GET" });
  if (!response.ok) return false;
  const body = (await response.json()) as {
    viewer_permissions?: { canCreateOrganicShare?: boolean };
  };
  return body.viewer_permissions?.canCreateOrganicShare === true;
}

async function issuePageIsLive(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (head.status === 200) return true;
  } catch {
    // Fall through to GET when HEAD is blocked.
  }
  try {
    const get = await fetch(url, { method: "GET", redirect: "follow" });
    return get.status === 200;
  } catch {
    return false;
  }
}

async function postIssue(issue: Issue): Promise<LinkedInPostResult> {
  if (issue.sample) return { ok: false, skipped: "sample" };
  if (process.env.LINKEDIN_AUTOPOST?.trim() !== "true") {
    return { ok: false, skipped: "LINKEDIN_AUTOPOST is not true" };
  }
  if (!dsn() || !apiKey()) {
    return { ok: false, skipped: "UNIPILE_DSN or UNIPILE_API_KEY is not set" };
  }
  if (!safeMarker(issue)) return { ok: false, error: "Issue path is not safe for a LinkedIn marker." };
  if (process.env.VERCEL && !githubConfigured()) {
    return { ok: false, error: "GITHUB_TOKEN and GITHUB_REPO are required to record the LinkedIn post on Vercel." };
  }

  let posted: boolean;
  try {
    posted = await readMarker(issue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the LinkedIn marker.";
    return { ok: false, error: message };
  }
  if (posted) return { ok: false, skipped: "already posted" };

  const issueUrl = linkedInIssueUrl(issue);
  if (!(await issuePageIsLive(issueUrl))) {
    return { ok: false, skipped: "issue page not live" };
  }

  const accountId = await resolveAccountId();
  if (!accountId) return { ok: false, skipped: "no LinkedIn account" };
  const orgId = await resolveOrgId(accountId);
  if (!orgId) return { ok: false, skipped: "Vizonix organization was not found" };
  if (!(await canPostAsOrg(accountId, orgId))) {
    return { ok: false, skipped: "cannot create an organic share" };
  }

  const text = buildLinkedInPost(issue, issueUrl);
  if (!text.includes(issueUrl)) {
    return { ok: false, error: "LinkedIn post text is missing the issue URL." };
  }

  const form = new FormData();
  form.set("account_id", accountId);
  form.set("text", text);
  form.set("as_organization", orgId);
  form.set("external_link", issueUrl);
  const response = await unipileFetch(`${dsn()}/api/v1/posts`, { method: "POST", body: form });
  if (response.status !== 201 && response.status !== 200) {
    return { ok: false, error: `Unipile post failed (${response.status}).` };
  }
  const created = (await response.json()) as { post_id?: string | null };
  const postId = created.post_id?.trim();
  if (!postId) return { ok: false, error: "Unipile did not return a post id." };

  try {
    await writeMarker(issue, postId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The LinkedIn marker was not saved.";
    console.warn(`LinkedIn post ${postId} was published, but the marker was not saved. ${message}`);
    return { ok: true, postId, error: message };
  }
  return { ok: true, postId };
}

export async function postIssueToLinkedIn(issue: Issue): Promise<LinkedInPostResult> {
  try {
    return await postIssue(issue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "LinkedIn post failed.";
    console.warn(`LinkedIn post failed: ${message}`);
    return { ok: false, error: message };
  }
}
