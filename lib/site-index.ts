import { allIssues, allTools } from "@/lib/content";
import { segments, topicPagePath } from "@/lib/segments";

export type IndexPath = {
  path: string;
  sample: boolean;
};

const staticPaths = [
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/subscribe",
  "/sponsor",
  "/sponsor/confirmed",
  "/confirm",
  "/unsubscribe",
];

export function allIndexPaths(): IndexPath[] {
  const paths: IndexPath[] = staticPaths.map((path) => ({ path, sample: false }));

  for (const segment of segments) {
    paths.push(
      { path: `/${segment.slug}`, sample: false },
      { path: `/${segment.slug}/issues`, sample: false },
      { path: `/${segment.slug}/tools`, sample: false },
    );
    for (const topic of segment.topics ?? []) {
      paths.push({ path: topicPagePath(segment.slug, topic.key), sample: false });
    }
  }

  for (const issue of allIssues()) {
    paths.push({
      path: `/${issue.segment}/issues/${issue.date}`,
      sample: issue.sample,
    });
  }

  for (const tool of allTools()) {
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
