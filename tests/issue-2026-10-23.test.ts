import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue, getTool } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { issueSchema, productivitySectionTopic } from "@/lib/schema";
import { getSegment, segmentTopics } from "@/lib/segments";

function emailAddresses(value: string): string[] {
  const found = value.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
  return [...new Set(found.filter((address) => !/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(address)))];
}

describe("Friday, October 23, 2026 aviation issue", () => {
  const raw = fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-23.json"), "utf8");

  it("validates, keeps plain hyphens, and omits the retired closer blocks", () => {
    const issue = getIssue("aviation", "2026-10-23");
    expect(issue).toBeTruthy();
    expect(issueSchema.safeParse(JSON.parse(raw)).success).toBe(true);
    expect(issue?.sample).toBe(false);
    expect(issue?.subject.startsWith("The VIZONIX Daily")).toBe(false);
    expect(raw).not.toMatch(/[\u2013\u2014]/);
    expect(raw).not.toContain("hello@");
    expect(issue?.ramp).toBeUndefined();
    expect(issue?.playbook).toBeUndefined();
    expect(issue?.quickLinks).toBeUndefined();
    expect(issue?.glossary?.length).toBeGreaterThan(0);
    expect(issue?.sections?.at(-1)?.topic).toBe(productivitySectionTopic);
    expect(issue?.sections?.at(-1)?.topic).toBe("General AI Productivity Tools");

    const topics = segmentTopics(getSegment("aviation"));
    for (const section of issue?.sections ?? []) {
      const topic = topics.find((item) => item.issueTopic === section.topic);
      for (const tool of section.tools) {
        if (!tool.url.startsWith("/aviation/tools/")) continue;
        const page = getTool("aviation", tool.slug);
        expect(page, tool.slug).toBeTruthy();
        expect(page?.category, tool.slug).toBe(section.topic);
        expect(page?.topic, tool.slug).toBe(topic?.key);
        expect(tool.url).toBe(`/aviation/tools/${tool.slug}`);
      }
    }

    const html = renderToStaticMarkup(createElement(IssueBody, { issue: issue! }));
    const email = renderIssueEmail(issue!, { mode: "broadcast" });
    const text = renderIssueText(issue!, { mode: "broadcast" });
    for (const body of [html, email, text]) {
      expect(body).toContain("admin@vizonix.com");
      expect(body).not.toContain("hello@");
      expect(emailAddresses(body)).toEqual(["admin@vizonix.com"]);
    }
  });
});
