import fs from "fs";
import path from "path";
import { parseIssue, parseTool, type Issue, type ToolEntry } from "@/lib/schema";

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

export function getIssue(segment: string, date: string): Issue | undefined {
  const file = path.join(issuesDir(segment), `${date}.json`);
  if (!fs.existsSync(file)) return undefined;
  return parseIssue(readJson(file));
}

export function listTools(segment: string): ToolEntry[] {
  const dir = toolsDir(segment);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => parseTool(readJson(path.join(dir, file))))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getTool(segment: string, slug: string): ToolEntry | undefined {
  const file = path.join(toolsDir(segment), `${slug}.json`);
  if (!fs.existsSync(file)) return undefined;
  return parseTool(readJson(file));
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
    const issues = path.join(root, entry, "issues");
    const tools = path.join(root, entry, "tools");
    return fs.existsSync(issues) || fs.existsSync(tools);
  });
}
