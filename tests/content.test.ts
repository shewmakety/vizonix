import { describe, expect, it } from "vitest";
import { getIssue, getTool, listIssues, listTools } from "@/lib/content";
import { formatNumericDate } from "@/lib/dates";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { issueSchema, issueTools } from "@/lib/schema";
import { directoryViewFromQuery } from "@/lib/directory-view";
import { absoluteUrl, sectionWordmark } from "@/lib/site";
import {
  featuredSegment,
  getSegment,
  isToolDirectoryPath,
  segmentHeaderName,
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
    expect(toolDirectoryHref("/")).toBe("/aviation/toolbox");
    expect(toolDirectoryHref("/about")).toBe("/aviation/toolbox");
    expect(toolDirectoryHref("/sponsor")).toBe("/aviation/toolbox");
    expect(toolDirectoryHref("/subscribe")).toBe("/aviation/toolbox");
    expect(toolDirectoryHref("/aviation")).toBe("/aviation/toolbox");
    expect(toolDirectoryHref("/aviation/issues/2026-10-16")).toBe("/aviation/toolbox");
    expect(toolDirectoryHref("/legal/tools/clauseharbor")).toBe("/aviation/toolbox");
    expect(toolDirectoryHref("/warehousing")).toBe("/aviation/toolbox");
    expect(toolDirectoryHref("/about", "/tools")).toBe("/tools");
    expect(isToolDirectoryPath("/aviation/tools")).toBe(true);
    expect(isToolDirectoryPath("/aviation/toolbox")).toBe(true);
    expect(isToolDirectoryPath("/aviation/tools/airvoyant")).toBe(true);
    expect(isToolDirectoryPath("/aviation")).toBe(false);
    expect(isToolDirectoryPath("/")).toBe(false);
    expect(isToolDirectoryPath("/tools", "/tools")).toBe(true);
  });

  it("loads the first real aviation issue and real tool pages", () => {
    const issues = listIssues("aviation");
    expect(issues).toHaveLength(6);
    expect(issues.map((issue) => issue.date)).toEqual([
      "2026-10-26",
      "2026-10-22",
      "2026-10-21",
      "2026-10-20",
      "2026-10-19",
      "2026-10-16",
    ]);
    expect(issues[0].sample).toBe(false);
    expect(issues[0].subject).toBe(
      "The AI company behind the FAA traffic tool SMART just raised $325 million. Plus 7 places to put AI and robotics to work",
    );
    expect(issues[0].sections).toHaveLength(8);
    expect(issues[0].sections?.at(-1)?.topic).toBe("General AI Productivity Tools");
    expect(issueTools(issues[0]).map((tool) => tool.slug)).toEqual([
      "unseq-baggage-hold-robot",
      "google-meet-speech-translation",
      "skywise-core-x3",
      "google-chat-meeting-recaps",
      "pratt-whitney-percept",
      "autostore-cube-storage",
      "asi-operational-ai",
      "chatgpt-slides-collaboration",
      "google-docs-live-mobile",
    ]);

    const first = getIssue("aviation", "2026-10-16");
    expect(first?.sample).toBe(false);
    expect(first?.sponsors.primary?.name).toBe("Vizonix");
    expect(first?.sponsors.primary?.house).toBe(true);
    expect(first?.sponsors.primary?.sample).toBe(false);
    expect(first?.sponsors.primary?.ctaUrl).toBe("https://www.vizonix.com/sponsor");
    expect(first?.sponsors.secondary).toBeNull();
    expect(first?.sponsors.classified).toBeNull();
    expect(first?.subject).toBe("AI moves into the hangar, plus 7 places to put it to work");
    expect(first?.sections).toHaveLength(8);
    expect(first?.sections?.at(-1)?.topic).toBe("General AI Productivity Tools");
    expect(first?.sections?.some((section) => section.coverageNote)).toBe(true);
    expect(issueTools(first!)).toHaveLength(15);
    expect(issueTools(first!).map((tool) => tool.slug)).toContain("airvoyant");
    expect(issueTools(first!).map((tool) => tool.slug)).not.toContain("aogline");

    const tools = listTools("aviation");
    expect(tools).toHaveLength(99);
    expect(tools.every((tool) => tool.sample === false)).toBe(true);
    const priced = tools.filter((tool) => tool.topic !== "general-ai" && tool.pricing !== "Contact the vendor");
    expect(priced.map((tool) => tool.slug).sort()).toEqual([
      "aeroquote",
      "ajw-apollo",
      "asi-operational-ai",
      "autostore-cube-storage",
      "cae-ready-for-work",
      "flightbridge-21x-ai-concierge",
      "flyexclusive-contrails-fms",
      "ge-aerospace-celma-records-ai",
      "gulfstream-performance-analytics",
      "pratt-whitney-percept",
      "rolls-royce-optimiser",
      "sensos-jssi-tracking",
      "skywise-core-x3",
      "uas-skyx",
      "unseq-baggage-hold-robot",
    ]);
    expect(getTool("aviation", "flightbridge-21x-ai-concierge")?.pricing).toBe("Not announced (beta)");
    expect(getTool("aviation", "rolls-royce-optimiser")?.pricing).toBe("Internal Rolls-Royce system");
    expect(getTool("aviation", "aeroquote")?.pricing).toBe(
      "$299 per month plus $2 per quote sent; first 20 quotes free",
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

  it("renders each section with its own payoff line and the sponsor slots", () => {
    const aviation = getIssue("aviation", "2026-10-16");
    expect(aviation).toBeTruthy();
    if (!aviation) return;
    const other = { ...aviation, segment: "field-service" };

    const html = renderIssueEmail(aviation, { mode: "broadcast" });
    const text = renderIssueText(aviation, { mode: "test" });
    expect(html).toContain("Primary sponsor - open");
    expect(html).toContain("Secondary sponsor");
    expect(html).not.toContain("Classified - open");
    expect(html).not.toContain("This quick-link slot is open");
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).toContain("See founding sponsor rates");
    expect(html).toContain("https://www.vizonix.com/sponsor");
    expect(html).toContain(">Recruiting</td>");
    expect(html).toContain("Thin this week: we did not find a verified, aviation-specific AI recruiting launch");
    expect(html).toContain("https://www.atec-amt.org/news/aviation-technical-workforce-expansion-continues-amid-strong-demand");
    const directory = absoluteUrl("/aviation/toolbox?src=email");
    const issueUrl = absoluteUrl("/aviation/issues/2026-10-16");
    expect(html).toContain(`href="${directory}"`);
    expect(html).toContain("The Vizonix Toolbox");
    expect(html).toContain("Open the Toolbox");
    expect(html).not.toContain("Visit the Toolbox");
    expect(html).toContain(">READ ON WEB<");
    expect(html).toContain(`href="${issueUrl}"`);
    expect(html).not.toContain("Read on the web");
    const wordmark = sectionWordmark(segmentHeaderName(getSegment("aviation")!));
    const numeric = formatNumericDate(aviation.date);
    expect(wordmark).toBe("Vizonix - Customizable AI & Robotics News For Aviation");
    expect(numeric).toBe("10-16-2026");
    expect(html).toContain(`<span style="color:#c9b98f;"> · ${numeric}</span></h1>`);
    expect(html).not.toContain("letter-spacing:0.08em;line-height:1.4;color:#c9b98f;");
    expect(html.indexOf(escapeHtml(wordmark))).toBeLessThan(html.indexOf("The Vizonix Toolbox"));
    expect(text.startsWith(`${wordmark}\n${aviation.subject} · ${numeric}\n`)).toBe(true);
    expect(html.indexOf(aviation.lead.title)).toBeLessThan(html.indexOf("The Vizonix Toolbox"));
    expect(html.indexOf("The Vizonix Toolbox")).toBeLessThan(html.indexOf(">Unsubscribe</a>"));
    expect(text).toContain(`Open the Toolbox: ${directory}`);
    expect(text).toContain(`READ ON WEB: ${issueUrl}`);
    expect(text.indexOf(aviation.lead.title)).toBeLessThan(text.indexOf("The Vizonix Toolbox"));
    expect(text.indexOf("The Vizonix Toolbox")).toBeLessThan(text.lastIndexOf(`READ ON WEB: ${issueUrl}`));
    expect(text).not.toContain("Nordic Dino");
    expect(html).toContain("$ Why it pays:");
    expect(html).not.toContain("Why it can make the operation money.");
    expect(html).not.toContain("Why it can make the practice money.");
    expect(html.indexOf(">AOG Support: Parts, Rotables &amp; Technicians</td>")).toBeLessThan(
      html.indexOf(">General AI Productivity Tools</td>"),
    );
    expect(html.indexOf(">General AI Productivity Tools</td>")).toBeLessThan(html.indexOf("The Vizonix Toolbox"));
    expect(html).not.toContain(aviation.playbook?.title ?? "missing playbook");
    expect(html).not.toContain(">Quick links</h2>");
    expect(text).not.toContain("QUICK LINKS");
    const withoutClosers = { ...aviation };
    delete withoutClosers.playbook;
    delete withoutClosers.quickLinks;
    expect(issueSchema.safeParse(withoutClosers).success).toBe(true);
    expect(issueSchema.safeParse(aviation).success).toBe(true);
    expect(html).toContain("https://copilot.microsoft.com/");
    expect(html).toContain("https://otter.ai/");
    expect(html).toContain("https://www.notion.com/product/ai");
    expect(html).not.toContain("Holdshort Systems");
    expect(html).not.toContain("Sample issue");
    expect(text).toContain("PRIMARY SPONSOR");
    expect(text).toContain("SECONDARY SPONSOR");
    expect(text).not.toContain("CLASSIFIED");
    expect(text).not.toContain("This quick-link slot is open");
    expect(text.indexOf("PRIMARY SPONSOR")).toBeLessThan(text.indexOf("SECONDARY SPONSOR"));
    expect(text).toContain("One standout this week.");
    expect(text).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(text).toContain(absoluteUrl("/aviation/unsubscribe"));
    expect(html).not.toMatch(/[\u2013\u2014]/);
    expect(text).not.toMatch(/[\u2013\u2014]/);

    const otherHtml = renderIssueEmail(other, { mode: "test" });
    const otherText = renderIssueText(other, { mode: "test" });
    expect(otherHtml).toContain(`href="${absoluteUrl("/field-service/tools")}"`);
    expect(otherHtml).not.toContain("The Vizonix Toolbox");
    expect(otherText).toContain(`Tool Directory: ${absoluteUrl("/field-service/tools")}`);
    expect(otherText).not.toContain("The Vizonix Toolbox");
    expect(otherText).toContain(absoluteUrl("/field-service/unsubscribe"));
    expect(otherHtml).toContain("$ Why it pays:");
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
        secondary: {
          name: "Too Long",
          url: "/sponsor",
          copy: Array.from({ length: 61 }, () => "word").join(" "),
          cta: "Go",
          ctaUrl: "/sponsor",
        },
      },
    };
    expect(issueSchema.safeParse(tooLong).success).toBe(false);
  });
});
