import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { issueSchema, sortedGlossary, type Issue } from "@/lib/schema";

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
      ...section.tools.flatMap((tool) => [tool.name, tool.summary, tool.whyItMatters, tool.pricing]),
    ]),
    issue.playbook.title,
    issue.playbook.intro,
    ...issue.playbook.steps,
    ...issue.quickLinks.flatMap((link) => [link.title, link.note]),
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
    expect(html.indexOf("Quick links")).toBeLessThan(html.indexOf("Classified"));
    expect(html.indexOf("Classified")).toBeLessThan(html.indexOf("AI Glossary"));
    expect(html.indexOf('class="glossary-heading"')).toBeGreaterThan(html.lastIndexOf("Quick links"));
    expect(email.indexOf("Quick links")).toBeLessThan(email.indexOf("Classified"));
    expect(email.indexOf("Classified")).toBeLessThan(email.indexOf("AI Glossary"));
    expect(email.indexOf("AI Glossary")).toBeLessThan(email.indexOf("Unsubscribe"));
    expect(text.indexOf("QUICK LINKS")).toBeLessThan(text.indexOf("CLASSIFIED"));
    expect(text.indexOf("CLASSIFIED")).toBeLessThan(text.indexOf("AI GLOSSARY"));
    expect(text.indexOf("AI GLOSSARY")).toBeLessThan(text.indexOf("Read this issue on the web"));

    let previous = -1;
    for (const entry of sortedGlossary(issue.glossary)) {
      const at = html.indexOf(`class="glossary-term">${entry.term}</dt>`);
      expect(at).toBeGreaterThan(previous);
      expect(html).toContain(`class="glossary-definition">${entry.definition.replaceAll("'", "&#x27;")}</dd>`);
      expect(email).toContain(
        `font-style:italic;font-weight:bold;line-height:1.2;color:#1c1915;">${entry.term}</p>`,
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
});
