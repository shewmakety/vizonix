import { describe, expect, it } from "vitest";
import { getIssue, getTool, listIssues, listTools } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { issueSchema, issueTools } from "@/lib/schema";
import { directoryViewFromQuery } from "@/lib/directory-view";
import { absoluteUrl } from "@/lib/site";
import {
  featuredSegment,
  getSegment,
  isToolDirectoryPath,
  segments,
  toolDirectoryHref,
  toolsIndexPath,
} from "@/lib/segments";

describe("segment config and sample content", () => {
  it("lists aviation as the only public section", () => {
    expect(segments.map((segment) => segment.slug)).toEqual(["aviation"]);
    expect(featuredSegment().slug).toBe("aviation");
    expect(segments.find((segment) => segment.slug === "aviation")?.status).toBe("active");
    expect(segments.filter((segment) => segment.status === "planned")).toHaveLength(0);
    expect(getSegment("legal")).toBeUndefined();
    expect(getSegment("warehousing")).toBeUndefined();
    expect(getSegment("marketing-sales")).toBeUndefined();
    expect(segments.find((segment) => segment.slug === "aviation")?.payoffLabel).toBe(
      "Why it can make you money",
    );
    expect(segments.find((segment) => segment.slug === "aviation")?.audience).toBe(
      "Airlines, MROs, parts suppliers, operators, and maintenance / AOG teams",
    );
    expect(segments.find((segment) => segment.slug === "aviation")?.summary).toContain(
      "maintenance / AOG teams",
    );
    expect(segments.find((segment) => segment.slug === "aviation")?.summary).not.toContain(
      "maintenance and AOG",
    );
    expect(directoryViewFromQuery(undefined)).toBe("cards");
    expect(directoryViewFromQuery("cards")).toBe("cards");
    expect(directoryViewFromQuery("list")).toBe("list");
    expect(directoryViewFromQuery(["list"])).toBe("list");
    expect(directoryViewFromQuery("grid")).toBe("cards");
    expect(toolsIndexPath).toBeNull();
    expect(toolDirectoryHref("/")).toBe("/aviation/tools");
    expect(toolDirectoryHref("/about")).toBe("/aviation/tools");
    expect(toolDirectoryHref("/sponsor")).toBe("/aviation/tools");
    expect(toolDirectoryHref("/subscribe")).toBe("/aviation/tools");
    expect(toolDirectoryHref("/aviation")).toBe("/aviation/tools");
    expect(toolDirectoryHref("/aviation/issues/2026-10-16")).toBe("/aviation/tools");
    expect(toolDirectoryHref("/legal/tools/clauseharbor")).toBe("/aviation/tools");
    expect(toolDirectoryHref("/warehousing")).toBe("/aviation/tools");
    expect(toolDirectoryHref("/about", "/tools")).toBe("/tools");
    expect(isToolDirectoryPath("/aviation/tools")).toBe(true);
    expect(isToolDirectoryPath("/aviation/tools/airvoyant")).toBe(true);
    expect(isToolDirectoryPath("/aviation")).toBe(false);
    expect(isToolDirectoryPath("/")).toBe(false);
    expect(isToolDirectoryPath("/tools", "/tools")).toBe(true);
  });

  it("loads the first real aviation issue and real tool pages", () => {
    const issues = listIssues("aviation");
    expect(issues).toHaveLength(1);
    expect(issues[0].sample).toBe(false);
    expect(issues[0].date).toBe("2026-10-16");
    expect(issues[0].sponsors.primary?.name).toBe("Vizonix");
    expect(issues[0].sponsors.primary?.house).toBe(true);
    expect(issues[0].sponsors.primary?.sample).toBe(false);
    expect(issues[0].sponsors.primary?.ctaUrl).toBe("https://www.vizonix.com/sponsor");
    expect(issues[0].sponsors.secondary).toBeNull();
    expect(issues[0].sponsors.classified).toBeNull();
    expect(issues[0].subject).toBe("AI moves into the hangar, plus 7 places to put it to work");
    expect(issues[0].sections).toHaveLength(8);
    expect(issues[0].sections?.at(-1)?.topic).toBe("AI Productivity Tools");
    expect(issues[0].sections?.some((section) => section.coverageNote)).toBe(true);
    expect(issueTools(issues[0])).toHaveLength(15);
    expect(issueTools(issues[0]).map((tool) => tool.slug)).toContain("airvoyant");
    expect(issueTools(issues[0]).map((tool) => tool.slug)).not.toContain("aogline");

    const tools = listTools("aviation");
    expect(tools).toHaveLength(72);
    expect(tools.every((tool) => tool.sample === false)).toBe(true);
    expect(tools.filter((tool) => tool.topic !== "general-ai").every((tool) => tool.pricing === "Contact the vendor")).toBe(
      true,
    );
    expect(tools.filter((tool) => tool.topic === "general-ai")).toHaveLength(15);
    expect(getTool("aviation", "hirevue")?.summary).toContain("general-purpose");
    expect(getTool("aviation", "hirevue")?.summary).toContain("not an aviation-specific");
    expect(getTool("aviation", "elevatus")?.summary).toContain("not an aviation-specific");
    expect(getTool("aviation", "upbrains-8130-extractor")?.summary).toContain("not an aviation-only");
    expect(getTool("aviation", "jeppesen-foreflight-airflow")?.summary).toContain("2027");
    expect(getTool("aviation", "chatgpt")?.url).toBe("https://chatgpt.com/");
    expect(getTool("legal", "chatgpt")).toBeUndefined();
    for (const slug of ["flyhire", "partscollab", "ge-ai-material-assistant", "veryon-tracking-ai-agents", "ils-on-demand-intelligence"]) {
      expect(tools.map((tool) => tool.slug)).not.toContain(slug);
    }
    for (const slug of ["aogline", "baywright", "stockramp", "dutyline"]) {
      expect(tools.map((tool) => tool.slug)).not.toContain(slug);
    }
    expect(getIssue("aviation", "2026-10-14")).toBeUndefined();
  });

  it("publishes issues and tools only for aviation", () => {
    for (const slug of ["legal", "warehousing", "marketing-sales"]) {
      expect(listIssues(slug)).toEqual([]);
      expect(listTools(slug)).toEqual([]);
      expect(getIssue(slug, "2026-10-14")).toBeUndefined();
    }
    for (const slug of ["clauseharbor", "docketline", "billwise-counsel", "precedent-north"]) {
      expect(getTool("legal", slug)).toBeUndefined();
    }
  });

  it("renders each section with its own payoff line and the three sponsor slots", () => {
    const aviation = getIssue("aviation", "2026-10-16");
    expect(aviation).toBeTruthy();
    if (!aviation) return;
    const other = { ...aviation, segment: "field-service" };

    const html = renderIssueEmail(aviation, { mode: "broadcast" });
    const text = renderIssueText(aviation, { mode: "test" });
    expect(html).toContain("Primary sponsor - open");
    expect(html).toContain("Secondary sponsor");
    expect(html).toContain("Classified");
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).toContain("See founding sponsor rates");
    expect(html).toContain("https://www.vizonix.com/sponsor");
    expect(html).toContain("Recruiting pilots and technicians");
    expect(html).toContain("Thin this week: we did not find a verified, aviation-specific AI recruiting launch");
    expect(html).toContain("https://www.atec-amt.org/news/aviation-technical-workforce-expansion-continues-amid-strong-demand");
    const directory = absoluteUrl("/aviation/tools");
    const issueUrl = absoluteUrl("/aviation/issues/2026-10-16");
    expect(html).toContain(`href="${directory}"`);
    expect(html).toContain("Tool Directory");
    expect(html).toContain("Read on the web");
    expect(html).toContain(`href="${issueUrl}"`);
    expect(html.indexOf("Vizonix Aviation")).toBeLessThan(html.indexOf("Tool Directory"));
    expect(html.indexOf("Tool Directory")).toBeLessThan(html.indexOf(aviation.lead.title));
    expect(text).toContain(`Tool Directory: ${directory}`);
    expect(text).toContain(`Read on the web: ${issueUrl}`);
    expect(text.indexOf("Tool Directory:")).toBeLessThan(text.indexOf(aviation.lead.title));
    expect(html).toContain("Why it can make you money.");
    expect(html).not.toContain("Why it can make the operation money.");
    expect(html).not.toContain("Why it can make the practice money.");
    expect(html.indexOf("AOG support: parts, rotables and technicians")).toBeLessThan(
      html.indexOf("AI Productivity Tools"),
    );
    expect(html.indexOf("AI Productivity Tools")).toBeLessThan(html.indexOf(aviation.playbook.title));
    expect(html).toContain("https://copilot.microsoft.com/");
    expect(html).toContain("https://otter.ai/");
    expect(html).toContain("https://www.notion.com/product/ai");
    expect(html).not.toContain("Holdshort Systems");
    expect(html).not.toContain("Sample issue");
    expect(text).toContain("PRIMARY SPONSOR");
    expect(text).toContain("SECONDARY SPONSOR");
    expect(text).toContain("CLASSIFIED");
    expect(text.indexOf("PRIMARY SPONSOR")).toBeLessThan(text.indexOf("SECONDARY SPONSOR"));
    expect(text.indexOf("SECONDARY SPONSOR")).toBeLessThan(text.indexOf("CLASSIFIED"));
    expect(text).toContain("One standout this week.");
    expect(text).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(text).toContain(absoluteUrl("/aviation/unsubscribe"));
    expect(html).not.toMatch(/[\u2013\u2014]/);
    expect(text).not.toMatch(/[\u2013\u2014]/);

    const otherHtml = renderIssueEmail(other, { mode: "test" });
    const otherText = renderIssueText(other, { mode: "test" });
    expect(otherHtml).toContain(`href="${absoluteUrl("/field-service/tools")}"`);
    expect(otherText).toContain(`Tool Directory: ${absoluteUrl("/field-service/tools")}`);
    expect(otherText).toContain(absoluteUrl("/field-service/unsubscribe"));
    expect(otherHtml).toContain("Why it matters.");
    expect(otherHtml).not.toContain("Why it can make you money.");
    expect(otherHtml).not.toContain("Why it can make the operation money.");
  });

  it("rejects sponsor copy that is longer than the rate card ceiling", () => {
    const issue = getIssue("aviation", "2026-10-16");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const tooLong = {
      ...issue,
      sponsors: {
        ...issue.sponsors,
        classified: {
          name: "Too Long",
          url: "/sponsor",
          copy: Array.from({ length: 40 }, () => "word").join(" "),
          cta: "Go",
          ctaUrl: "/sponsor",
        },
      },
    };
    expect(issueSchema.safeParse(tooLong).success).toBe(false);
  });
});
