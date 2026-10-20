import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { sectionIconFiles } from "@/lib/icons";
import { issueSchema, type Issue } from "@/lib/schema";

const post = {
  author: "Ava Chen",
  handle: "avachen",
  url: "https://x.com/avachen/status/1234567890123456789",
  text: "A predictive alert is only useful when the hangar still trusts it.",
  postedAt: "2026-10-20T23:30:00-04:00",
  note: "Worth a look before the morning meeting.",
};

function withRamp(issue: Issue): Issue {
  return {
    ...issue,
    ramp: {
      intro: "A few posts on AI in aviation.",
      posts: [
        { ...post },
        {
          author: post.author,
          handle: "@avachen",
          url: "https://twitter.com/avachen/status/44",
          text: post.text,
          postedAt: "2026-10-20",
        },
      ],
    },
  };
}

afterEach(() => {
  delete sectionIconFiles["Recruiting pilots and technicians"];
  delete process.env.SECTION_ICON_BASE_URL;
});

describe("The Ramp", () => {
  it("accepts x.com and twitter.com status links and rejects other urls", () => {
    const issue = getIssue("aviation", "2026-10-20");
    expect(issue).toBeTruthy();
    expect(issueSchema.safeParse(issue).success).toBe(true);
    expect(issueSchema.safeParse(withRamp(issue!)).success).toBe(true);
    const badHost = withRamp(issue!);
    badHost.ramp!.posts[0].url = "https://example.com/avachen/status/1234567890123456789";
    expect(issueSchema.safeParse(badHost).success).toBe(false);
    const profile = withRamp(issue!);
    profile.ramp!.posts[0].url = "https://x.com/avachen";
    expect(issueSchema.safeParse(profile).success).toBe(false);
    const empty = { ...issue!, ramp: { posts: [] } };
    expect(issueSchema.safeParse(empty).success).toBe(false);
  });

  it("places quote cards after the top story and leaves an issue without ramp unchanged", () => {
    const issue = getIssue("aviation", "2026-10-20")!;
    const plain = renderToStaticMarkup(createElement(IssueBody, { issue }));
    expect(plain).not.toContain("The Ramp");
    expect(plain).not.toContain("platform.twitter.com");

    const html = renderToStaticMarkup(createElement(IssueBody, { issue: withRamp(issue) }));
    expect(html.indexOf(issue.lead.title)).toBeLessThan(html.indexOf("The Ramp"));
    expect(html.indexOf("The Ramp")).toBeLessThan(html.indexOf(">01<"));
    expect(html).toContain('class="ramp-heading"');
    expect(html).not.toContain('class="section-number" aria-hidden="true">00');
    expect(html).toContain('class="ramp-quote"');
    expect(html).toContain(post.text);
    expect(html).toContain("Ava Chen");
    expect(html).toContain("@avachen");
    expect(html).toContain("Tuesday, October 20, 2026");
    expect(html).toContain("View on X");
    expect(html).toContain(post.note);
    expect(html).not.toContain("widgets.js");
    expect(html).not.toContain("platform.twitter.com");

    const email = renderIssueEmail(withRamp(issue), { mode: "test" });
    expect(email.indexOf(issue.lead.title)).toBeLessThan(email.indexOf("The Ramp"));
    expect(email.indexOf("The Ramp")).toBeLessThan(email.indexOf(">01<"));
    expect(email).toContain("View on X");
    expect(email).toContain("font-style:italic");
    expect(email).not.toContain("<script");
    const text = renderIssueText(withRamp(issue), { mode: "test" });
    expect(text.indexOf("THE RAMP")).toBeLessThan(text.indexOf("RECRUITING"));
    expect(text).toContain(`View on X: ${post.url}`);
  });

  it("shows a section icon only when that topic is mapped", () => {
    const issue = getIssue("aviation", "2026-10-20")!;
    sectionIconFiles["Recruiting pilots and technicians"] = "recruiting.png";
    const unmapped = renderToStaticMarkup(createElement(IssueBody, { issue }));
    expect(unmapped).not.toContain("section-icon");

    process.env.SECTION_ICON_BASE_URL = "https://cdn.example.com/icons";
    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    expect(html).toContain('class="section-icon" src="https://cdn.example.com/icons/recruiting.png"');
    expect(html.match(/section-icon/g)).toHaveLength(1);

    const email = renderIssueEmail(issue, { mode: "test" });
    expect(email).toContain('src="https://cdn.example.com/icons/recruiting.png"');
    expect(email.match(/src="https:\/\/cdn\.example\.com\/icons\/recruiting\.png"/g)).toHaveLength(1);
  });
});
