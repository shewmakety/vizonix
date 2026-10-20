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

  it("places quote cards after the top story and leaves an issue without ramp unchanged", () => {
    const bare = getIssue("aviation", "2026-10-16")!;
    const plain = renderToStaticMarkup(createElement(IssueBody, { issue: bare }));
    expect(plain).not.toContain("The Ramp");
    expect(plain).not.toContain("platform.twitter.com");

    const issue = getIssue("aviation", "2026-10-20")!;

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

    expect(html).toContain(
      `class="section-icon" src="${sectionIconBaseUrl}/the-ramp.svg" alt="" width="40" height="40"`,
    );
    const email = renderIssueEmail(withRamp(issue), { mode: "test" });
    expect(email.indexOf(issue.lead.title)).toBeLessThan(email.indexOf("The Ramp"));
    expect(email.indexOf("The Ramp")).toBeLessThan(email.indexOf(">01<"));
    expect(email).toContain(
      `src="${sectionIconBaseUrl}/the-ramp@2x.png" alt="The Ramp" width="34" height="34"`,
    );
    expect(email).toContain("View on X");
    expect(email).toContain("font-style:italic");
    expect(email).not.toContain("<script");
    const text = renderIssueText(withRamp(issue), { mode: "test" });
    expect(text.indexOf("THE RAMP")).toBeLessThan(text.indexOf("RECRUITING"));
    expect(text).toContain(`View on X: ${post.url}`);
  });

  it("publishes the October 20 ramp posts with the icon, byline, link, and note", () => {
    const issue = getIssue("aviation", "2026-10-20")!;
    expect(issue.ramp?.intro).toBe(
      "The best of what aviation and AI voices were saying on X over the past two days.",
    );
    expect(issue.ramp?.posts.map((post) => post.author)).toEqual(["Geoff Fawkes", "GMitchell", "ada", "Virtusa"]);
    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "test" });
    expect(html.indexOf(issue.lead.title)).toBeLessThan(html.indexOf("The Ramp"));
    expect(html.indexOf("The Ramp")).toBeLessThan(html.indexOf(">01<"));
    expect(html).toContain(`class="section-icon" src="${sectionIconBaseUrl}/the-ramp.svg"`);
    expect(email).toContain(`src="${sectionIconBaseUrl}/the-ramp@2x.png" alt="The Ramp" width="34" height="34"`);
    expect(email.indexOf(issue.lead.title)).toBeLessThan(email.indexOf("The Ramp"));
    expect(email.indexOf("The Ramp")).toBeLessThan(email.indexOf(">01<"));
    expect(text.indexOf("THE RAMP")).toBeLessThan(text.indexOf("RECRUITING"));
    expect(html).not.toContain("Synergix");
    expect(email).not.toContain("Synergix");
    for (const post of issue.ramp!.posts) {
      expect(html).toContain(post.author);
      expect(html).toContain(`@${post.handle.replace(/^@/, "")}`);
      expect(html).toContain(`href="${post.url}"`);
      expect(html).toContain((post.note ?? "").replaceAll("'", "&#x27;"));
      expect(email).toContain(`href="${post.url}"`);
      expect(email).toContain((post.note ?? "").replaceAll("'", "&#39;"));
      expect(text).toContain(`View on X: ${post.url}`);
      expect(text).toContain(post.note!);
    }
    expect(email).toContain("industry.<br><br>https://t.co/BLr93GkS9n");
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
    expect(email).toContain('src="https://cdn.example.com/icons/recruiting@2x.png" alt="Recruiting" width="34" height="34"');
    expect(email).not.toContain(sectionIconBaseUrl);
  });
});
