import { describe, expect, it } from "vitest";
import { getIssue, getTool, listTools } from "@/lib/content";
import {
  directoryCanonical,
  directoryChips,
  filterDirectoryTools,
  knownTopicKeys,
  toolTopicKeys,
  withDirectoryQuery,
} from "@/lib/directory";
import { toolSchema, type ToolEntry } from "@/lib/schema";
import {
  getSegment,
  topicPageDescription,
  topicPageHeading,
  topicPagePath,
} from "@/lib/segments";
import { sitemapPaths } from "@/lib/site-index";
import { buildLlmsTxt } from "@/lib/llms";

describe("tool directory topics", () => {
  const aviation = getSegment("aviation");
  const legal = getSegment("legal");
  if (!aviation || !legal) throw new Error("missing segment");
  const topics = aviation.topics ?? [];
  const known = knownTopicKeys(topics);
  const tools = listTools("aviation");

  it("maps every Oct 16 issue section onto a directory topic and tool", () => {
    const issue = getIssue("aviation", "2026-10-16");
    const industry = issue?.sections?.filter((section) => section.topic !== "AI Productivity Tools") ?? [];
    expect(issue?.sections).toHaveLength(8);
    expect(issue?.sections?.at(-1)?.topic).toBe("AI Productivity Tools");
    expect(industry).toHaveLength(7);
    expect(topics.filter((topic) => topic.issueTopic).map((topic) => topic.issueTopic)).toEqual(
      industry.map((section) => section.topic),
    );
    expect(topics.at(-1)?.key).toBe("general-ai");
    for (const section of industry) {
      const topic = topics.find((item) => item.issueTopic === section.topic);
      expect(topic).toBeTruthy();
      for (const listed of section.tools) {
        const entry = getTool("aviation", listed.slug);
        expect(entry?.topic).toBe(topic?.key);
        expect(entry?.topics).toBeUndefined();
      }
    }
    expect(tools.every((tool) => tool.topic && known.has(tool.topic))).toBe(true);
    expect(listTools("legal").every((tool) => !tool.topic && !tool.topics)).toBe(true);
  });

  it("filters by topic, search, and the Other bucket", () => {
    const predictive = filterDirectoryTools(tools, { topic: "predictive-maintenance", knownKeys: known });
    expect(predictive.map((tool) => tool.slug)).toEqual(
      expect.arrayContaining(["standardaero-maintenance-insight", "veryon-defect-analysis"]),
    );
    expect(predictive).toHaveLength(10);
    const byCompany = filterDirectoryTools(tools, { q: "aar", knownKeys: known });
    expect(byCompany.map((tool) => tool.slug)).toEqual(["airvoyant"]);
    const narrowed = filterDirectoryTools(tools, {
      topic: "predictive-maintenance",
      q: "skyselect",
      knownKeys: known,
    });
    expect(narrowed).toHaveLength(0);
    const legalTools = listTools("legal");
    expect(filterDirectoryTools(legalTools, { topic: "other", knownKeys: new Set() })).toHaveLength(legalTools.length);
    expect(filterDirectoryTools(tools, { topic: "other", knownKeys: known })).toHaveLength(0);
    const both = filterDirectoryTools(
      [{ ...tools[0], topic: "aog-support", topics: ["predictive-maintenance"] }],
      { topic: "predictive-maintenance", knownKeys: known },
    );
    expect(both).toHaveLength(1);
    expect(toolTopicKeys({ topic: "aog-support", topics: ["aog-support", "troubleshooting"] })).toEqual([
      "aog-support",
      "troubleshooting",
    ]);
  });

  it("builds shareable chip links, topic pages, and canonical URLs", () => {
    const chips = directoryChips("aviation", topics, tools, "query");
    expect(chips.find((chip) => chip.key === "all")?.href).toBe("/aviation/tools");
    expect(chips.find((chip) => chip.key === "predictive-maintenance")).toMatchObject({
      label: "Predictive Maintenance",
      count: 10,
      href: "/aviation/tools?topic=predictive-maintenance",
    });
    expect(chips.at(-1)?.key).toBe("general-ai");
    expect(chips.find((chip) => chip.key === "records-and-documentation")?.count).toBe(2);
    expect(chips.find((chip) => chip.key === "flight-operations")?.count).toBe(3);
    expect(chips.find((chip) => chip.key === "general-ai")?.count).toBe(15);
    expect(chips.some((chip) => chip.key === "other")).toBe(false);
    const pathChips = directoryChips("aviation", topics, tools, "path");
    expect(pathChips.find((chip) => chip.key === "aog-support")?.href).toBe("/aviation/tools/topic/aog-support");
    const untagged = { topic: undefined, topics: undefined } as ToolEntry;
    const legalChips = directoryChips("legal", [], [untagged], "query");
    expect(legalChips.map((chip) => chip.key)).toEqual(["all", "other"]);
    expect(legalChips[0].count).toBe(1);
    expect(legalChips[1].count).toBe(1);
    expect(directoryChips("legal", [], [], "query").map((chip) => chip.key)).toEqual(["all"]);
    expect(withDirectoryQuery("/aviation/tools?topic=predictive-maintenance", { q: "Veryon", view: "list" })).toBe(
      "/aviation/tools?topic=predictive-maintenance&q=Veryon&view=list",
    );
    expect(withDirectoryQuery("/aviation/tools/topic/aog-support", { view: "cards" })).toBe(
      "/aviation/tools/topic/aog-support",
    );
    expect(directoryCanonical(aviation, "predictive-maintenance")).toBe(
      "/aviation/tools/topic/predictive-maintenance",
    );
    expect(directoryCanonical(aviation, "other")).toBe("/aviation/tools");
    expect(directoryCanonical(aviation, undefined)).toBe("/aviation/tools");
    const topic = topics.find((item) => item.key === "predictive-maintenance");
    expect(topic).toBeTruthy();
    if (!topic) return;
    expect(topicPageHeading(aviation.name, topic)).toBe("AI tools for predictive maintenance in aviation");
    expect(topicPagePath("aviation", topic.key)).toBe("/aviation/tools/topic/predictive-maintenance");
    expect(topicPageDescription(aviation.name, topic).length).toBeLessThanOrEqual(160);
    expect(topicPageHeading(aviation.name, topics.find((item) => item.key === "general-ai")!)).toBe(
      "General AI assistants for aviation teams",
    );
    const paths = sitemapPaths();
    for (const item of topics) {
      expect(paths).toContain(topicPagePath("aviation", item.key));
    }
    expect(paths).not.toContain("/legal/tools/topic/other");
    expect(buildLlmsTxt()).toContain("/aviation/tools/topic/predictive-maintenance");
  });

  it("keeps topic optional and reserves the topic slug", () => {
    const aviationTool = getTool("aviation", "airvoyant");
    expect(aviationTool).toBeTruthy();
    if (!aviationTool) return;
    const ungrouped = { ...aviationTool, segment: "legal", topic: undefined, topics: undefined };
    expect(toolSchema.safeParse(ungrouped).success).toBe(true);
    expect(toolSchema.safeParse({ ...ungrouped, topic: "predictive-maintenance" }).success).toBe(false);
    expect(toolSchema.safeParse({ ...aviationTool, slug: "topic" }).success).toBe(false);
    expect(toolSchema.safeParse({ ...aviationTool, topic: "not-a-topic" }).success).toBe(false);
    expect(
      toolSchema.safeParse({ ...aviationTool, topic: undefined, topics: ["aog-support", "troubleshooting"] }).success,
    ).toBe(true);
    expect(tools.some((tool) => tool.slug === "topic")).toBe(false);
  });
});
