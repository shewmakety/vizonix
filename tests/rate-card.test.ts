import { describe, expect, it } from "vitest";
import {
  formatUsd,
  foundingSponsorCap,
  launchPlacements,
  primaryLadder,
  publishedPrimaryLadder,
  scaledFromPrimary,
  secondaryRatio,
  stripeLinkEnvKey,
  stripePriceEnvKey,
} from "@/lib/rate-card";
import { buildLlmsFullTxt } from "@/lib/llms";

describe("launch rate card", () => {
  it("matches the Oct 14 2026 launch prices", () => {
    const price = Object.fromEntries(launchPlacements.map((item) => [item.id, item]));
    expect(price.primary.price).toBe(300);
    expect(price.primary.founding).toBe(150);
    expect(price.secondary.price).toBe(175);
    expect(price.secondary.founding).toBe(90);
    expect(price.section.price).toBeNull();
    expect(price.section.founding).toBeNull();
    expect(price.section.quoted).toBe(true);
    expect(launchPlacements.map((item) => item.id)).toEqual(["primary", "secondary", "section"]);
    expect(foundingSponsorCap).toBe(10);
  });

  it("scales the published ladder from the rate card", () => {
    expect(secondaryRatio).toBeCloseTo(175 / 300);
    expect(primaryLadder.map((row) => row.primary)).toEqual([300, 400, 750, 1250, 2500, 4500, null]);
    expect(publishedPrimaryLadder().map((row) => row.label)).toEqual(["0-1,000", "1,000-2,500"]);
    expect(scaledFromPrimary(300, secondaryRatio)).toBe(175);
    expect(scaledFromPrimary(400, secondaryRatio)).toBe(233);
    expect(formatUsd(300)).toBe("$300");
    const full = buildLlmsFullTxt();
    const rateCard = full.split("## Launch rate card")[1] ?? "";
    expect(full).toContain("Secondary $175");
    expect(full).not.toContain("Classified");
    expect(full).toContain("Section sponsor: Quote.");
    expect(rateCard).not.toContain("Featured tool listing");
    expect(rateCard).not.toContain("Section site banner");
    expect(full).not.toContain("2,500-5,000");
    expect(full).not.toContain("$4,500");
    expect(rateCard).not.toContain("60%");
    expect(rateCard).not.toContain("35%");
  });

  it("builds stripe env keys without putting secrets in the name", () => {
    expect(stripePriceEnvKey("field-service", "primary", false)).toBe("STRIPE_PRICE_FIELD_SERVICE_PRIMARY");
    expect(stripePriceEnvKey("field-service", "primary", true)).toBe("STRIPE_PRICE_FIELD_SERVICE_PRIMARY_FOUNDING");
    expect(stripePriceEnvKey("field-service", "secondary", false)).toBe("STRIPE_PRICE_FIELD_SERVICE_SECONDARY");
    expect(stripeLinkEnvKey("field-service", "primary")).toBe("NEXT_PUBLIC_STRIPE_LINK_FIELD_SERVICE_PRIMARY");
  });
});
