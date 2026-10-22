import fs from "fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SponsorCheckoutForm } from "@/components/SponsorCheckoutForm";
import { SponsorInquiryForm } from "@/components/SponsorInquiryForm";
import { parseCheckoutRequest } from "@/lib/checkout";
import { formatUsd, getPlacement, placements } from "@/lib/rate-card";
import { site } from "@/lib/site";
import {
  checkoutAdCopyHelp,
  checkoutAdCopyLabel,
  checkoutCompanyHelp,
  checkoutEmailHelp,
  checkoutExclusivityHelp,
  checkoutExclusivityLabel,
  checkoutFoundingHelp,
  checkoutFoundingLabel,
  checkoutPlacementHelp,
  checkoutQuantityHelp,
  checkoutSectionQuoteNote,
  checkoutSegmentHelp,
  checkoutStartHelp,
  inquiryFieldCopy,
  inquiryPlacementHelp,
  inquiryPlacementLabel,
  inquirySegmentLabel,
  sponsorContactNote,
  sponsorRequiredLegend,
  sponsorVerifyHelp,
  type InquiryFieldName,
} from "@/lib/sponsor-form-copy";
import { parseInquiry } from "@/lib/sponsor-inquiry";
import { inquiryFormOptions } from "@/lib/sponsor-labels";
import { bookingPlacements } from "@/lib/sponsor-placements";
import { activeSegments } from "@/lib/segments";

const formSources = [
  "components/SponsorInquiryForm.tsx",
  "components/SponsorCheckoutForm.tsx",
  "components/SponsorField.tsx",
  "lib/sponsor-form-copy.ts",
];

const inquiryIds: Record<InquiryFieldName, string> = {
  name: "inquiry-name",
  company: "inquiry-company",
  email: "inquiry-email",
  promote: "inquiry-promote",
  budget: "inquiry-budget",
  message: "inquiry-message",
};

function render(node: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(node);
}

function fieldTag(html: string, id: string): string {
  const tag = html.match(new RegExp(`<(input|select|textarea)[^>]*id="${id}"[^>]*>`));
  expect(tag?.[0]).toBeTruthy();
  return tag?.[0] ?? "";
}

function selectValues(html: string, name: string): string[] {
  const select = html.match(new RegExp(`<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)</select>`));
  return [...(select?.[1] ?? "").matchAll(/value="([^"]*)"/g)].map((match) => match[1]);
}

function expectMarked(html: string, id: string, label: string, help: string, required: boolean) {
  expect(html).toContain(`for="${id}"`);
  expect(html).toContain(label);
  expect(html).toContain(`id="${id}-help"`);
  expect(html).toContain(help);
  expect(html).toContain(`aria-describedby="${id}-help"`);
  const tag = fieldTag(html, id).replace(/aria-required="(?:true|false)"/g, "");
  if (required) {
    expect(html).toContain(`>${label} <span class="field-flag">Required</span>`);
    expect(tag).toMatch(/(?:^|\s)required(?:=""|=|\s|>|\/)/);
    expect(fieldTag(html, id)).toContain('aria-required="true"');
  } else {
    expect(html).toContain(`>${label} <span class="field-flag optional">Optional</span>`);
    expect(tag).not.toMatch(/(?:^|\s)required(?:=""|=|\s|>|\/)/);
    expect(fieldTag(html, id)).toContain('aria-required="false"');
  }
}

describe("public sponsor forms", () => {
  it("keeps sponsor form copy on the segment list and the site contact", () => {
    for (const file of formSources) {
      expect(fs.readFileSync(file, "utf8").toLowerCase()).not.toContain("aviation");
    }
    expect(site.email).toBe("admin@vizonix.com");
    expect(sponsorContactNote(site.email)).toBe("You can also email admin@vizonix.com.");
    expect(checkoutSegmentHelp(["Robotics", "Warehousing"])).toBe(
      "The briefing this sponsorship runs in. Live sections: Robotics and Warehousing.",
    );
    expect(checkoutSegmentHelp(["Robotics"])).not.toContain("Aviation");
  });

  it("marks inquiry fields to match server validation and describes each one", () => {
    const options = inquiryFormOptions();
    const html = render(createElement(SponsorInquiryForm, options));
    const sectionHelp = checkoutSegmentHelp(options.segments.map((item) => item.label));
    expect(html).toContain(sponsorRequiredLegend);
    expect(html).toContain("mailto:admin@vizonix.com");
    expect(html).toContain(sponsorVerifyHelp);
    expect(html).toContain("turnstile-slot");
    expect(html).toContain('aria-labelledby="inquiry-verify-label"');
    expect(html).toContain('aria-required="true"');
    expect(fs.readFileSync("components/SponsorInquiryForm.tsx", "utf8")).toContain('action="inquiry"');
    expect(fs.readFileSync("components/TurnstileField.tsx", "utf8")).toContain(
      "https://challenges.cloudflare.com/turnstile/v0/api.js",
    );

    const section = options.segments[0];
    expect(section).toBeTruthy();
    const base = {
      name: "Ada",
      company: "Hangar Co",
      email: "ada@hangar.example",
      promote: "A parts tool",
      message: "We would like a week.",
      segment: section?.id ?? "",
      placement: "primary",
    };
    expect(parseInquiry(base).ok).toBe(true);
    expect(parseInquiry({ ...base, budget: "" }).ok).toBe(true);
    expect(parseInquiry({ ...base, segment: "" }).ok).toBe(false);
    expect(parseInquiry({ ...base, placement: "" }).ok).toBe(false);
    expect(parseInquiry({ ...base, placement: "classified" }).ok).toBe(false);
    expectMarked(html, "inquiry-segment", inquirySegmentLabel, sectionHelp, true);
    expectMarked(html, "inquiry-placement", inquiryPlacementLabel, inquiryPlacementHelp, true);
    expect(selectValues(html, "placement")).toEqual([...bookingPlacements]);

    for (const name of Object.keys(inquiryIds) as InquiryFieldName[]) {
      const field = inquiryFieldCopy[name];
      expectMarked(html, inquiryIds[name], field.label, field.help, field.required);
      if (field.required) {
        expect(parseInquiry({ ...base, [name]: "  " }).ok).toBe(false);
      }
    }
  });

  it("marks checkout fields to match server validation for each placement", () => {
    const now = new Date("2026-10-22T15:00:00.000Z");
    const monday = "2026-10-26";
    const sections = activeSegments();
    const section = sections[0];
    expect(section).toBeTruthy();
    const sectionHelp = checkoutSegmentHelp(sections.map((item) => item.name));
    const primaryHtml = render(createElement(SponsorCheckoutForm));
    const retiredHtml = render(createElement(SponsorCheckoutForm, { initialPlacement: "featured" }));

    for (const html of [primaryHtml, retiredHtml]) {
      expect(html).toContain(sponsorRequiredLegend);
      expect(html).toContain(sponsorContactNote(site.email).replace(`${site.email}.`, ""));
      expect(html).toContain(`mailto:${site.email}`);
      expect(html).toContain(sponsorVerifyHelp);
      expect(html).toContain("turnstile-slot");
      expect(html).toContain(sectionHelp);
      expect(html).toContain(section.name);
    }
    expect(fs.readFileSync("components/SponsorCheckoutForm.tsx", "utf8")).toContain('action="checkout"');

    expectMarked(primaryHtml, "sponsor-segment", "Section", sectionHelp, true);
    expectMarked(primaryHtml, "placement", "Placement", checkoutPlacementHelp, true);
    expectMarked(primaryHtml, "startDate", "Preferred start date", checkoutStartHelp, true);
    expectMarked(primaryHtml, "quantity", "Number of weeks", checkoutQuantityHelp, true);
    expectMarked(primaryHtml, "company", "Company", checkoutCompanyHelp, false);
    expectMarked(primaryHtml, "sponsor-email", "Email for the receipt", checkoutEmailHelp, true);
    expectMarked(primaryHtml, "adCopyUrl", checkoutAdCopyLabel, checkoutAdCopyHelp, false);
    expect(selectValues(primaryHtml, "placement")).toEqual([...placements]);
    expect(primaryHtml).toContain(checkoutSectionQuoteNote);
    expect(primaryHtml).not.toContain("Featured");
    expect(primaryHtml).not.toContain("banner");
    expect(retiredHtml).not.toContain("Featured listing");
    const primary = getPlacement("primary");
    expect(primary).toBeTruthy();
    expect(primaryHtml).toContain(
      `>${checkoutFoundingLabel} <span class="field-flag optional">Optional</span>`,
    );
    expect(primaryHtml).toContain(checkoutFoundingLabel);
    expect(primaryHtml).toContain(
      checkoutFoundingHelp(`${formatUsd(primary?.founding ?? 0)} per week`),
    );
    expect(primaryHtml).toContain('id="founding"');
    expect(fieldTag(primaryHtml, "founding")).toContain('aria-required="false"');
    expect(fieldTag(primaryHtml, "founding").replace(/aria-required="false"/, "")).not.toMatch(/\srequired(?:=""|=|\s|>)/);
    expect(primaryHtml).toContain(
      `>${checkoutExclusivityLabel} <span class="field-flag optional">Optional</span>`,
    );
    expect(primaryHtml).toContain(checkoutExclusivityLabel);
    expect(primaryHtml).toContain(checkoutExclusivityHelp());
    expect(primaryHtml).toContain('id="exclusivity"');

    const order = {
      segment: section.slug,
      placement: "primary",
      startDate: monday,
      email: "buyer@firm.example",
      quantity: 1,
    };
    expect(parseCheckoutRequest(order, { now, reservations: [] }).ok).toBe(true);
    expect(parseCheckoutRequest({ ...order, company: "", adCopyUrl: "" }, { now, reservations: [] }).ok).toBe(true);
    expect(parseCheckoutRequest({ ...order, quantity: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, segment: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, placement: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, startDate: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, email: "" }, { now, reservations: [] }).ok).toBe(false);
    const retired = parseCheckoutRequest({ ...order, placement: "featured" }, { now, reservations: [] });
    expect(retired.ok).toBe(false);
    const quoted = parseCheckoutRequest({ ...order, placement: "01" }, { now, reservations: [] });
    expect(quoted.ok).toBe(false);
    if (!quoted.ok) expect(quoted.error).toMatch(/quoted/i);
  });
});
