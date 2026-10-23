import fs from "fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SponsorCheckoutForm } from "@/components/SponsorCheckoutForm";
import { SponsorInquiryForm } from "@/components/SponsorInquiryForm";
import { parseCheckoutRequest } from "@/lib/checkout";
import { formatUsd, getPlacement } from "@/lib/rate-card";
import { site } from "@/lib/site";
import {
  checkoutAdCopyHelp,
  checkoutAdCopyLabel,
  sponsorHumanLabel,
  sponsoredSectionHelp,
  sponsoredSectionLabel,
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
import { activeSegments } from "@/lib/segments";
import { buyerCopyMax, renderedFormatIds, sponsorNameMax } from "@/lib/sponsor-slots";

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
      adCopy: "A parts tool for the desk.",
      message: "We would like a week.",
      segment: section?.id ?? "",
      placement: "primary",
    };
    expect(parseInquiry(base).ok).toBe(true);
    expect(parseInquiry({ ...base, budget: "" }).ok).toBe(true);
    expect(parseInquiry({ ...base, segment: "" }).ok).toBe(false);
    expect(parseInquiry({ ...base, placement: "" }).ok).toBe(false);
    expect(parseInquiry({ ...base, placement: "classified" }).ok).toBe(false);
    expect(parseInquiry({ ...base, placement: "section" }).ok).toBe(false);
    const numbered = options.sectionsBySegment[section?.id ?? ""] ?? [];
    const spot = numbered[0]?.id ?? "";
    expect(spot).toBeTruthy();
    const quoted = parseInquiry({ ...base, placement: "section", section: spot });
    expect(quoted.ok).toBe(true);
    if (quoted.ok) expect(quoted.value.placement).toBe(spot);
    expect(parseInquiry({ ...base, placement: "section", section: "99" }).ok).toBe(false);
    expect(parseInquiry({ ...base, company: "a".repeat(sponsorNameMax + 1) }).ok).toBe(false);
    expect(parseInquiry({ ...base, adCopy: "a".repeat(buyerCopyMax("primary") + 1) }).ok).toBe(false);
    expect(parseInquiry({ ...base, placement: "section", section: spot, adCopy: "a".repeat(buyerCopyMax("section") + 1) }).ok).toBe(false);
    expectMarked(html, "inquiry-segment", inquirySegmentLabel, sectionHelp, true);
    expectMarked(html, "inquiry-placement", inquiryPlacementLabel, inquiryPlacementHelp, true);
    expectMarked(html, "inquiry-ad-copy", checkoutAdCopyLabel, checkoutAdCopyHelp("primary"), true);
    expect(fieldTag(html, "inquiry-ad-copy")).toContain(`maxLength="${buyerCopyMax("primary")}"`);
    expect(fieldTag(html, "inquiry-company")).toContain(`maxLength="${sponsorNameMax}"`);
    expect(selectValues(html, "placement")).toEqual([...renderedFormatIds]);
    expect(html).toContain(sponsorHumanLabel.replaceAll("'", "&#x27;"));
    expect(html).not.toContain("Verification");
    expect(html).not.toContain('type="file"');
    const sectionHtml = render(
      createElement(SponsorInquiryForm, { ...options, initialPlacement: "section" }),
    );
    expect(selectValues(sectionHtml, "section").filter(Boolean)).toEqual(numbered.map((item) => item.id));
    expectMarked(sectionHtml, "inquiry-sponsored-section", sponsoredSectionLabel, sponsoredSectionHelp, true);
    expect(fieldTag(sectionHtml, "inquiry-ad-copy")).toContain(`maxLength="${buyerCopyMax("section")}"`);

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
    expectMarked(primaryHtml, "company", "Company name", checkoutCompanyHelp, true);
    expectMarked(primaryHtml, "sponsor-email", "Email for the receipt", checkoutEmailHelp, true);
    expectMarked(primaryHtml, "adCopy", checkoutAdCopyLabel, checkoutAdCopyHelp("primary"), true);
    expect(fieldTag(primaryHtml, "company")).toContain(`maxLength="${sponsorNameMax}"`);
    expect(fieldTag(primaryHtml, "adCopy")).toContain(`maxLength="${buyerCopyMax("primary")}"`);
    expect(selectValues(primaryHtml, "placement")).toEqual([...renderedFormatIds]);
    expect(primaryHtml).toContain(sponsorHumanLabel.replaceAll("'", "&#x27;"));
    expect(primaryHtml).not.toContain("Verification");
    expect(primaryHtml).not.toContain('type="file"');
    expect(primaryHtml).not.toContain("adCopyUrl");
    expect(primaryHtml).not.toContain('id="sponsored-section"');
    const sectionsBySegment = Object.fromEntries(
      sections.map((item) => [item.slug, [{ id: "01", label: "Section 01 - Desk" }]]),
    );
    const sectionCheckout = render(
      createElement(SponsorCheckoutForm, { initialPlacement: "section", sectionsBySegment }),
    );
    expectMarked(sectionCheckout, "sponsored-section", sponsoredSectionLabel, sponsoredSectionHelp, true);
    expect(selectValues(sectionCheckout, "section").filter(Boolean)).toEqual(["01"]);
    expect(fieldTag(sectionCheckout, "adCopy")).toContain(`maxLength="${buyerCopyMax("section")}"`);
    expect(sectionCheckout).toContain(checkoutSectionQuoteNote);
    expect(sectionCheckout).toContain("Send the inquiry form");
    expect(sectionCheckout).toContain('type="submit"');
    expect(sectionCheckout).not.toContain('href="#inquiry"');
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
      company: "Hangar Co",
      adCopy: "A short line for the week.",
      quantity: 1,
    };
    expect(parseCheckoutRequest(order, { now, reservations: [] }).ok).toBe(true);
    expect(parseCheckoutRequest({ ...order, company: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, adCopy: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, adCopy: "a".repeat(buyerCopyMax("primary") + 1) }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, quantity: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, segment: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, placement: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, startDate: "" }, { now, reservations: [] }).ok).toBe(false);
    expect(parseCheckoutRequest({ ...order, email: "" }, { now, reservations: [] }).ok).toBe(false);
    const retired = parseCheckoutRequest({ ...order, placement: "featured" }, { now, reservations: [] });
    expect(retired.ok).toBe(false);
    const missingSection = parseCheckoutRequest({ ...order, placement: "section" }, { now, reservations: [] });
    expect(missingSection.ok).toBe(false);
    if (!missingSection.ok) expect(missingSection.error).toMatch(/numbered section/i);
    const quoted = parseCheckoutRequest({ ...order, placement: "section", section: "01" }, { now, reservations: [] });
    expect(quoted.ok).toBe(false);
    if (!quoted.ok) expect(quoted.error).toMatch(/quoted/i);
    const spot = parseCheckoutRequest({ ...order, placement: "01" }, { now, reservations: [] });
    expect(spot.ok).toBe(false);
    if (!spot.ok) expect(spot.error).toMatch(/quoted/i);
  });
});
