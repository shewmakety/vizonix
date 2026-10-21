import { allIssues, allTools, issueModifiedInstant, toolUpdatedAt } from "@/lib/content";
import { clampInstant } from "@/lib/dates";
import { toolTopicKeys } from "@/lib/directory";
import { segments, toolDirectoryPath, topicPagePath } from "@/lib/segments";

export type IndexPath = {
  path: string;
  sample: boolean;
};

export type SitemapEntry = {
  path: string;
  lastModified: Date;
};

/** First aviation issue publish time. Static pages use this, then clamp to now. */
export const SITE_PUBLISHED_AT = new Date("2026-10-15T10:28:02.000Z");

const staticPaths = ["/", "/about", "/privacy", "/terms", "/subscribe", "/join", "/sponsor", "/media-kit"];

export function allIndexPaths(): IndexPath[] {
  const paths: IndexPath[] = staticPaths.map((path) => ({ path, sample: false }));

  for (const segment of segments) {
    if (segment.status !== "active") continue;
    paths.push(
      { path: `/${segment.slug}`, sample: false },
      { path: `/${segment.slug}/issues`, sample: false },
      { path: toolDirectoryPath(segment), sample: false },
    );
    for (const topic of segment.topics ?? []) {
      paths.push({ path: topicPagePath(segment.slug, topic.key), sample: false });
    }
  }

  for (const issue of allIssues()) {
    const segment = segments.find((item) => item.slug === issue.segment);
    if (!segment || segment.status !== "active") continue;
    paths.push({
      path: `/${issue.segment}/issues/${issue.date}`,
      sample: issue.sample,
    });
  }

  for (const tool of allTools()) {
    const segment = segments.find((item) => item.slug === tool.segment);
    if (!segment || segment.status !== "active") continue;
    paths.push({
      path: `/${tool.segment}/tools/${tool.slug}`,
      sample: tool.sample,
    });
  }

  return paths;
}

export function sitemapPaths(): string[] {
  return allIndexPaths()
    .filter((entry) => !entry.sample)
    .map((entry) => entry.path);
}

function latest(dates: Date[], fallback: Date, now: Date): Date {
  const best = dates.reduce((current, date) => (date.getTime() > current.getTime() ? date : current), fallback);
  return clampInstant(best, now);
}

export function sitemapEntries(now = new Date()): SitemapEntry[] {
  const epoch = clampInstant(SITE_PUBLISHED_AT, now);
  const issues = allIssues().filter((issue) => {
    const segment = segments.find((item) => item.slug === issue.segment);
    return segment?.status === "active" && !issue.sample;
  });
  const tools = allTools().filter((tool) => {
    const segment = segments.find((item) => item.slug === tool.segment);
    return segment?.status === "active" && !tool.sample;
  });

  const issueInstant = new Map(issues.map((issue) => [issue, issueModifiedInstant(issue, now)]));
  const toolInstant = new Map(tools.map((tool) => [tool.slug + tool.segment, toolUpdatedAt(tool, now)]));

  const dates = new Map<string, Date>();
  for (const path of staticPaths) dates.set(path, epoch);

  for (const segment of segments) {
    if (segment.status !== "active") continue;
    const segmentIssues = issues.filter((issue) => issue.segment === segment.slug);
    const segmentTools = tools.filter((tool) => tool.segment === segment.slug);
    const newestIssue = latest(
      segmentIssues.map((issue) => issueInstant.get(issue) ?? epoch),
      epoch,
      now,
    );
    dates.set(`/${segment.slug}`, newestIssue);
    dates.set(`/${segment.slug}/issues`, newestIssue);
    dates.set(
      toolDirectoryPath(segment),
      latest(
        segmentTools.map((tool) => toolInstant.get(tool.slug + tool.segment) ?? epoch),
        epoch,
        now,
      ),
    );
    for (const topic of segment.topics ?? []) {
      const topicTools = segmentTools.filter((tool) => toolTopicKeys(tool).includes(topic.key));
      dates.set(
        topicPagePath(segment.slug, topic.key),
        latest(
          topicTools.map((tool) => toolInstant.get(tool.slug + tool.segment) ?? epoch),
          epoch,
          now,
        ),
      );
    }
  }

  for (const issue of issues) {
    dates.set(`/${issue.segment}/issues/${issue.date}`, issueModifiedInstant(issue, now));
  }
  for (const tool of tools) {
    dates.set(
      `/${tool.segment}/tools/${tool.slug}`,
      toolInstant.get(tool.slug + tool.segment) ?? epoch,
    );
  }

  if (issues.length > 0) {
    dates.set(
      "/",
      latest(
        issues.map((issue) => issueInstant.get(issue) ?? epoch),
        epoch,
        now,
      ),
    );
  }

  return sitemapPaths().map((path) => ({
    path,
    lastModified: dates.get(path) ?? epoch,
  }));
}
