import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { SponsorCheckoutForm } from "@/components/SponsorCheckoutForm";
import { SponsorInquiryForm } from "@/components/SponsorInquiryForm";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { sectionSponsorOpenLabel } from "@/lib/issue-present";
import { sponsorFaqJsonLd } from "@/lib/jsonld";
import { mediaKitFormats } from "@/lib/media-kit";
import { checkoutPlacements, launchPlacements, placements } from "@/lib/rate-card";
import { featuredSegment } from "@/lib/segments";
import { sectionSponsorSchema, sponsorSchema } from "@/lib/schema";
import { inquiryFormOptions } from "@/lib/sponsor-labels";
import { bookingPlacements } from "@/lib/sponsor-placements";
import {
  formatForPlacement,
  renderedFormatIds,
  renderedIssueSlotIds,
  sectionLineMax,
  sectionSpots,
  sponsorCopyMax,
  sponsorCtaMax,
  sponsorNameMax,
  sponsorSlotSpec,
} from "@/lib/sponsor-slots";

function selectValues(html: string, name: string): string[] {
  const select = html.match(new RegExp(`<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)</select>`));
  return [...(select?.[1] ?? "").matchAll(/value="([^"]*)"/g)].map((match) => match[1]);
}

const creative = {
  name: "Hangar",
  url: "https://example.com",
  copy: "A short line.",
  cta: "Look",
  ctaUrl: "https://example.com/go",
};

describe("sponsor slots match the issue renderer", () => {
  it("keeps the rate card, checkout, inquiry, and media kit on the rendered formats", () => {
    expect(launchPlacements.map((item) => item.id)).toEqual([...renderedFormatIds]);
    expect(mediaKitFormats().map((item) => item.id)).toEqual([...renderedFormatIds]);
    expect([...placements]).toEqual([...renderedIssueSlotIds]);
    expect(checkoutPlacements.map((item) => item.id)).toEqual([...renderedIssueSlotIds]);
    expect([...bookingPlacements]).toEqual([...renderedIssueSlotIds, ...sectionSpots]);
    expect(new Set(bookingPlacements.map((id) => formatForPlacement(id)))).toEqual(new Set(renderedFormatIds));

    for (const id of renderedIssueSlotIds) {
      expect(getWords(id)).toEqual({
        target: sponsorSlotSpec(id)?.targetWords,
        max: sponsorSlotSpec(id)?.maxWords,
      });
    }

    const inquiry = renderToStaticMarkup(createElement(SponsorInquiryForm, inquiryFormOptions()));
    const checkout = renderToStaticMarkup(createElement(SponsorCheckoutForm));
    expect(selectValues(inquiry, "placement")).toEqual([...renderedFormatIds]);
    expect(selectValues(checkout, "placement")).toEqual([...renderedFormatIds]);
    for (const retired of ["classified", "banner", "featured", "bundle"]) {
      expect(selectValues(inquiry, "placement")).not.toContain(retired);
      expect(selectValues(checkout, "placement")).not.toContain(retired);
    }
  });

  it("renders primary, secondary, and a section line, and skips retired blocks", () => {
    const issue = getIssue(featuredSegment().slug, "2026-10-22");
    expect(issue?.sections?.length).toBe(sectionSpots.length);
    if (!issue) return;
    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "broadcast" });
    for (const view of [html, email, text]) {
      const lower = view.toLowerCase();
      expect(lower).toContain("primary sponsor");
      expect(lower).toContain("secondary sponsor");
      expect(view).toContain(sectionSponsorOpenLabel);
      expect(lower).not.toContain("classified");
      expect(view).not.toContain("The Ramp");
      expect(lower).not.toContain("quick-link");
    }
    expect(html.match(/class="section-sponsor/g)?.length).toBe(sectionSpots.length);
    expect(email.toLowerCase()).toContain(sectionSponsorOpenLabel.toLowerCase());
  });

  it("enforces the same character ceilings the renderer specs publish", () => {
    expect(sponsorSchema.safeParse(creative).success).toBe(true);
    expect(sponsorSchema.safeParse({ ...creative, name: "a".repeat(sponsorNameMax + 1) }).success).toBe(false);
    expect(sponsorSchema.safeParse({ ...creative, copy: "a".repeat(sponsorCopyMax + 1) }).success).toBe(false);
    expect(sponsorSchema.safeParse({ ...creative, cta: "a".repeat(sponsorCtaMax + 1) }).success).toBe(false);
    expect(
      sectionSponsorSchema.safeParse({
        name: "a".repeat(sponsorNameMax + 1),
        line: "Line",
        url: "https://example.com",
      }).success,
    ).toBe(false);
    expect(
      sectionSponsorSchema.safeParse({
        name: "Hangar",
        line: "a".repeat(sectionLineMax + 1),
        url: "https://example.com",
      }).success,
    ).toBe(false);
    expect(
      sectionSponsorSchema.safeParse({
        name: "Hangar",
        line: "A short line.",
        url: "https://example.com",
      }).success,
    ).toBe(true);
  });

  it("does not publish a sponsor cap", () => {
    const faq = JSON.stringify(sponsorFaqJsonLd());
    expect(faq).not.toMatch(/at most|three sponsors|two newsletter/i);
    expect(faq).toContain("primary sponsor");
    expect(faq).toContain("secondary sponsor");
    expect(faq).toContain("numbered section");
  });
});

function getWords(id: string): { target: number | null | undefined; max: number | null | undefined } {
  const placement = launchPlacements.find((item) => item.id === id);
  return { target: placement?.targetWords, max: placement?.maxWords };
}
