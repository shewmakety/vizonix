import fs from "fs";
import path from "path";
import { calendarInstant, clampInstant } from "@/lib/dates";
import { parseIssue, parseTool, type Issue, type ToolEntry } from "@/lib/schema";
import { getSegment } from "@/lib/segments";

/** Shared catalog. Any section that lists this topic key gets these tools. */
export const generalAiTopicKey = "general-ai";

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function issuesDir(segment: string): string {
  return path.join(process.cwd(), "content", segment, "issues");
}

export function toolsDir(segment: string): string {
  return path.join(process.cwd(), "content", segment, "tools");
}

export function listIssues(segment: string): Issue[] {
  const dir = issuesDir(segment);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => parseIssue(readJson(path.join(dir, file))))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Newest issue that is not marked sample. Sample issues are not mailed as the welcome. */
export function latestPublishedIssue(segment: string): Issue | undefined {
  return listIssues(segment).find((issue) => !issue.sample);
}

export function getIssue(segment: string, date: string): Issue | undefined {
  const file = path.join(issuesDir(segment), `${date}.json`);
  if (!fs.existsSync(file)) return undefined;
  return parseIssue(readJson(file));
}

export function generalAiDir(): string {
  return path.join(process.cwd(), "content", "general-ai", "tools");
}

export function segmentUsesGeneralAi(segment: string): boolean {
  return getSegment(segment)?.topics?.some((topic) => topic.key === generalAiTopicKey) ?? false;
}

/** General AI entries with the section slug filled in so the same files can serve more than one section. */
export function loadGeneralAi(segment: string): ToolEntry[] {
  const dir = generalAiDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const raw = readJson(path.join(dir, file));
      const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return parseTool({ ...record, segment });
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readSegmentTools(segment: string): ToolEntry[] {
  const dir = toolsDir(segment);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => parseTool(readJson(path.join(dir, file))));
}

export function listTools(segment: string): ToolEntry[] {
  const tools = readSegmentTools(segment);
  if (!segmentUsesGeneralAi(segment)) {
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }
  const slugs = new Set(tools.map((tool) => tool.slug));
  const extras = loadGeneralAi(segment).filter((tool) => !slugs.has(tool.slug));
  return [...tools, ...extras].sort((a, b) => a.name.localeCompare(b.name));
}

export function getTool(segment: string, slug: string): ToolEntry | undefined {
  const file = path.join(toolsDir(segment), `${slug}.json`);
  if (fs.existsSync(file)) return parseTool(readJson(file));
  if (!segmentUsesGeneralAi(segment)) return undefined;
  return loadGeneralAi(segment).find((tool) => tool.slug === slug);
}

export function toolSourceFile(tool: Pick<ToolEntry, "segment" | "slug">): string | undefined {
  const segmentFile = path.join(toolsDir(tool.segment), `${tool.slug}.json`);
  if (fs.existsSync(segmentFile)) return segmentFile;
  const shared = path.join(generalAiDir(), `${tool.slug}.json`);
  if (fs.existsSync(shared)) return shared;
  return undefined;
}

/** File mtime, clamped so a checkout clock cannot publish a future date. */
export function fileUpdatedAt(file: string | undefined, now = new Date()): Date {
  if (!file || !fs.existsSync(file)) return clampInstant(new Date(0), now);
  return clampInstant(fs.statSync(file).mtime, now);
}

export function toolUpdatedAt(tool: Pick<ToolEntry, "segment" | "slug">, now = new Date()): Date {
  return fileUpdatedAt(toolSourceFile(tool), now);
}

/** Later of the issue's calendar day and the file mtime, never in the future. */
export function issueModifiedInstant(issue: Issue, now = new Date()): Date {
  const calendar = clampInstant(calendarInstant(issue.date), now);
  const file = path.join(issuesDir(issue.segment), `${issue.date}.json`);
  const updated = fileUpdatedAt(fs.existsSync(file) ? file : undefined, now);
  return updated.getTime() > calendar.getTime() ? updated : calendar;
}

export function writeIssueFile(issue: Issue): string {
  const dir = issuesDir(issue.segment);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${issue.date}.json`);
  fs.writeFileSync(file, `${JSON.stringify(issue, null, 2)}\n`);
  return file;
}

export function allIssues(): Issue[] {
  return listSegmentContentDirs().flatMap((segment) => listIssues(segment));
}

export function allTools(): ToolEntry[] {
  return listSegmentContentDirs().flatMap((segment) => listTools(segment));
}

function listSegmentContentDirs(): string[] {
  const root = path.join(process.cwd(), "content");
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter((entry) => {
    if (!getSegment(entry)) return false;
    const issues = path.join(root, entry, "issues");
    const tools = path.join(root, entry, "tools");
    return fs.existsSync(issues) || fs.existsSync(tools);
  });
}
