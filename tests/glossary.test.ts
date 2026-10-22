import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { isGeneralGlossaryTerm, issueSchema, sortedGlossary, type Issue } from "@/lib/schema";

function editorialText(issue: Issue): string {
  const parts = [
    issue.subject,
    issue.preheader,
    issue.lead.kicker,
    issue.lead.title,
    issue.lead.summary,
    issue.lead.whyItMatters,
    ...(issue.sections ?? []).flatMap((section) => [
      section.topic,
      section.intro,
      section.coverageNote,
      section.robotics?.headline,
      section.robotics?.summary,
      section.robotics?.whyItMatters,
      section.robotics?.sourceName,
      ...section.tools.flatMap((tool) => [tool.name, tool.summary, tool.whyItMatters, tool.pricing]),
    ]),
    ...(issue.playbook ? [issue.playbook.title, issue.playbook.intro, ...issue.playbook.steps] : []),
    ...(issue.quickLinks?.flatMap((link) => [link.title, link.note]) ?? []),
  ];
  return parts.filter(Boolean).join("\n").toLowerCase();
}

describe("AI glossary", () => {
  it("stays off issues that have no glossary", () => {
    const issue = getIssue("aviation", "2026-10-16")!;
    expect(issue.glossary).toBeUndefined();
    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    expect(html).not.toContain("AI Glossary");
    expect(email).not.toContain("AI Glossary");
    expect(renderIssueText(issue, { mode: "test" })).not.toContain("AI GLOSSARY");
  });

  it("renders today's terms in alphabetical order after the rest of the issue", () => {
    const issue = getIssue("aviation", "2026-10-20")!;
    expect(issue.glossary?.length).toBeGreaterThan(0);
    const terms = issue.glossary!.map((entry) => entry.term);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
    const body = editorialText(issue);
    for (const term of terms) {
      expect(body, term).toContain(term.toLowerCase());
    }
    expect(body).not.toContain("llm");
    expect(body).not.toContain("false positive");

    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "test" });
    expect(html).not.toContain("Quick links");
    expect(html).not.toContain(issue.playbook?.title ?? "missing playbook");
    expect(html.indexOf("Classified")).toBeLessThan(html.indexOf("AI Glossary"));
    expect(email).not.toContain("Quick links");
    expect(email).not.toContain(issue.playbook?.title ?? "missing playbook");
    expect(email.indexOf("Classified")).toBeLessThan(email.indexOf("AI Glossary"));
    expect(email.indexOf("AI Glossary")).toBeLessThan(email.indexOf("Unsubscribe"));
    expect(text).not.toContain("QUICK LINKS");
    expect(text).not.toContain(issue.playbook?.title ?? "missing playbook");
    expect(text.indexOf("CLASSIFIED")).toBeLessThan(text.indexOf("AI GLOSSARY"));
    expect(text.indexOf("AI GLOSSARY")).toBeLessThan(text.lastIndexOf("READ ON WEB"));

    let previous = -1;
    for (const entry of sortedGlossary(issue.glossary)) {
      const at = html.indexOf(`class="glossary-term">${entry.term}</td>`);
      expect(at).toBeGreaterThan(previous);
      expect(html).toContain(`class="glossary-definition">${entry.definition.replaceAll("'", "&#x27;")}</td>`);
      expect(email).toContain(
        `class="glossary-term" style="font-size:13px;font-weight:700;color:#13233b;padding:6px 10px 6px 0;width:30%;border-top:1px solid #eceff3;font-family:Arial,Helvetica,sans-serif;">${entry.term}</td>`,
      );
      expect(email).toContain(entry.definition.replaceAll("'", "&#39;"));
      previous = at;
    }
  });

  it("sorts glossary rows and rejects an empty list or a repeated term", () => {
    const issue = getIssue("aviation", "2026-10-16")!;
    const shuffled = issueSchema.parse({
      ...issue,
      glossary: [
        { term: "Threshold", definition: "The line an alert has to cross." },
        { term: "Agent", definition: "Software that takes the next step." },
      ],
    });
    expect(sortedGlossary(shuffled.glossary).map((entry) => entry.term)).toEqual(["Agent", "Threshold"]);
    expect(issueSchema.safeParse({ ...issue, glossary: [] }).success).toBe(false);
    expect(
      issueSchema.safeParse({
        ...issue,
        glossary: [
          { term: "Model", definition: "The trained program." },
          { term: "model", definition: "The same term again." },
        ],
      }).success,
    ).toBe(false);
  });

  it("keeps the October 21 glossary to AI and robotics terms", () => {
    const issue = getIssue("aviation", "2026-10-21")!;
    expect(issue.glossary?.map((entry) => entry.term)).toEqual([
      "Agent",
      "Agentic AI",
      "Autonomous",
      "Conversational AI",
      "Copilot",
      "Digital twin",
      "Model Context Protocol",
      "Predictive maintenance",
      "Probabilistic forecasting",
      "Retrofit autonomy",
      "Robotic arm",
      "Rover",
      "Voice AI",
    ]);
  });

  it("rejects general aviation, business, and IT glossary terms", () => {
    const issue = getIssue("aviation", "2026-10-16")!;
    for (const term of ["FOD", "API", "Proof of concept", "Back-tested", "Public beta"]) {
      const parsed = issueSchema.safeParse({
        ...issue,
        glossary: [{ term, definition: "A general term that does not belong in this list." }],
      });
      expect(parsed.success, term).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((item) => item.message.includes("specific to AI and robotics"))).toBe(true);
      }
    }
    expect(isGeneralGlossaryTerm("LLM")).toBe(false);
    expect(isGeneralGlossaryTerm("computer vision")).toBe(false);
    expect(isGeneralGlossaryTerm("AMR")).toBe(false);
    expect(isGeneralGlossaryTerm("cobot")).toBe(false);
  });
});
