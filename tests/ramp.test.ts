import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { sectionIconBaseUrl, sectionIconFiles } from "@/lib/icons";
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

const recruitingStem = sectionIconFiles.Recruiting;

afterEach(() => {
  if (recruitingStem) sectionIconFiles.Recruiting = recruitingStem;
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

  it("keeps ramp data on the issue and leaves it out of the page and the email", () => {
    const bare = getIssue("aviation", "2026-10-16")!;
    const plain = renderToStaticMarkup(createElement(IssueBody, { issue: bare }));
    expect(plain).not.toContain('class="ramp-heading"');
    expect(plain).not.toContain("/the-ramp.svg");

    const issue = getIssue("aviation", "2026-10-20")!;
    expect(issue.ramp?.posts.length).toBeGreaterThan(0);
    const stored = withRamp(issue);
    expect(issueSchema.safeParse(stored).success).toBe(true);

    const html = renderToStaticMarkup(createElement(IssueBody, { issue: stored }));
    const email = renderIssueEmail(stored, { mode: "test" });
    const text = renderIssueText(stored, { mode: "test" });
    expect(html).not.toContain('class="ramp-heading"');
    expect(html).not.toContain(post.text);
    expect(html).not.toContain("/the-ramp.svg");
    expect(email).not.toContain(">The Ramp</td>");
    expect(email).not.toContain("the-ramp@2x.png");
    expect(email).not.toContain(post.text);
    expect(text).not.toContain("THE RAMP");
    expect(text).not.toContain(`View on X: ${post.url}`);
    expect(html).toContain("AI Glossary");
    expect(email).toContain(">AI Glossary</h2>");
  });

  it("keeps the October 20 ramp posts in the issue file without rendering them", () => {
    const issue = getIssue("aviation", "2026-10-20")!;
    expect(issue.ramp?.intro).toBe(
      "The best of what aviation and AI voices were saying on X over the past two days.",
    );
    expect(issue.ramp?.posts.map((item) => item.author)).toEqual(["Geoff Fawkes", "GMitchell", "ada", "Virtusa"]);
    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "test" });
    expect(html).not.toContain('class="ramp-heading"');
    expect(email).not.toContain(">The Ramp</td>");
    expect(text).not.toContain("THE RAMP");
    for (const item of issue.ramp!.posts) {
      expect(html).not.toContain(`href="${item.url}"`);
      expect(email).not.toContain(`href="${item.url}"`);
      expect(text).not.toContain(item.url);
    }
  });

  it("omits an icon when the topic is not mapped and honors a base URL override", () => {
    const issue = getIssue("aviation", "2026-10-20")!;
    delete sectionIconFiles.Recruiting;
    const unmapped = renderToStaticMarkup(createElement(IssueBody, { issue }));
    expect(unmapped).not.toContain("/recruiting.svg");
    expect(unmapped).toContain(`${sectionIconBaseUrl}/sales.svg`);

    sectionIconFiles.Recruiting = recruitingStem;
    process.env.SECTION_ICON_BASE_URL = "https://cdn.example.com/icons";
    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    expect(html).toContain('class="section-icon" src="https://cdn.example.com/icons/recruiting.svg"');
    expect(html).not.toContain(sectionIconBaseUrl);

    const email = renderIssueEmail(issue, { mode: "test" });
    expect(email).toContain('src="https://cdn.example.com/icons/recruiting@2x.png" alt="Recruiting" width="28" height="28"');
    expect(email).not.toContain(sectionIconBaseUrl);
  });
});
