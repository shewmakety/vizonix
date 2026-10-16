import fs from "fs";
import path from "path";
import { githubConfigured, readRepoFile, writeRepoFile } from "@/lib/github";
import { issueSections, productivitySectionTopic, type Issue, type IssueTool } from "@/lib/schema";
import { getSegment } from "@/lib/segments";

export type LinkedInPostResult = {
  ok: boolean;
  postId?: string;
  skipped?: string;
  error?: string;
};

const POST_LIMIT = 1300;
const REQUEST_TIMEOUT_MS = 20_000;

const hashtagsBySegment: Record<string, string[]> = {
  aviation: ["#Aviation", "#AI", "#MRO"],
};

function sanitize(text: string): string {
  return text.replace(/\u2014/g, "-").replace(/\u2013/g, "-").replace(/\s+/g, " ").trim();
}

function sentences(text: string): string[] {
  return sanitize(text)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** One complete sentence. A short dateline is skipped when a later sentence says what the product does. */
function descriptiveSentence(text: string): string {
  const parts = sentences(text);
  const useful = parts.find((part) => part.length >= 40);
  return useful ?? parts[0] ?? sanitize(text);
}

function sameName(toolName: string, company: string | undefined): boolean {
  const vendor = company?.trim();
  if (!vendor) return false;
  return vendor.toLowerCase() === toolName.trim().toLowerCase();
}

function toolLabel(tool: IssueTool): string {
  if (tool.company && !sameName(tool.name, tool.company)) return `${tool.name} (${tool.company})`;
  return tool.name;
}

function toolsInOrder(issue: Issue): IssueTool[] {
  const sections = issueSections(issue);
  const industry = sections.filter((section) => section.topic !== productivitySectionTopic);
  const rest = sections.filter((section) => section.topic === productivitySectionTopic);
  return [...industry, ...rest].flatMap((section) => section.tools);
}

/** One tool from each industry section, up to four, each described in one complete sentence. */
function pickTools(issue: Issue): IssueTool[] {
  const sections = issueSections(issue).filter((section) => section.topic !== productivitySectionTopic);
  const picked: IssueTool[] = [];
  for (const section of sections) {
    const tool =
      section.tools.find((item) => descriptiveSentence(item.summary).length <= 180) ?? section.tools[0];
    if (tool) picked.push(tool);
    if (picked.length === 4) break;
  }
  if (picked.length >= 3) return picked;
  for (const tool of toolsInOrder(issue)) {
    if (picked.includes(tool)) continue;
    picked.push(tool);
    if (picked.length === 4) break;
  }
  return picked;
}

export function linkedInIssueUrl(issue: Pick<Issue, "segment" | "date">): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.vizonix.com").replace(/\/$/, "");
  return `${base}/${issue.segment}/issues/${issue.date}`;
}

function subscribeLine(issue: Pick<Issue, "segment">, issueUrl: string): string {
  const segmentName = (getSegment(issue.segment)?.name ?? issue.segment).toLowerCase();
  let origin = "https://www.vizonix.com";
  try {
    origin = new URL(issueUrl).origin;
  } catch {
    origin = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, "");
  }
  return `Free AI briefing for ${segmentName}. Subscribe: ${origin}/${issue.segment}`;
}

/** Post copy for one issue. Sentences stay whole, and the result stays within 1300 characters. */
export function buildLinkedInPost(issue: Issue, issueUrl: string): string {
  const tags = hashtagsBySegment[issue.segment] ?? ["#Vizonix", "#AI"];
  const hook = sanitize(issue.subject || issue.lead.title);
  let story = descriptiveSentence(issue.lead.summary);
  let bullets = pickTools(issue).map((tool) => `${toolLabel(tool)}: ${descriptiveSentence(tool.summary)}`);

  const render = () => {
    const parts = [hook, ""];
    if (story) parts.push(story, "");
    for (const bullet of bullets) parts.push(`- ${bullet}`);
    if (bullets.length) parts.push("");
    parts.push(
      `Read the full issue: ${issueUrl}`,
      subscribeLine(issue, issueUrl),
      "",
      tags.join(" "),
    );
    return parts.join("\n");
  };

  while (render().length > POST_LIMIT && bullets.length > 0) bullets.pop();
  if (render().length > POST_LIMIT) story = "";
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
