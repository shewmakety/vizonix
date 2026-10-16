import { describe, expect, it } from "vitest";
import {
  classifiedRatio,
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
    expect(price.classified.price).toBe(100);
    expect(price.classified.founding).toBe(50);
    expect(price.banner.price).toBe(100);
    expect(price.banner.founding).toBe(50);
    expect(price.featured.price).toBe(150);
    expect(price.featured.founding).toBe(75);
    expect(price.featured.unit).toBe("month");
    expect(price.bundle.price).toBe(500);
    expect(price.bundle.founding).toBe(250);
    expect(foundingSponsorCap).toBe(10);
  });

  it("scales the published ladder from the rate card", () => {
    expect(secondaryRatio).toBeCloseTo(175 / 300);
    expect(classifiedRatio).toBeCloseTo(100 / 300);
    expect(primaryLadder.map((row) => row.primary)).toEqual([300, 400, 750, 1250, 2500, 4500, null]);
    expect(publishedPrimaryLadder().map((row) => row.label)).toEqual(["0-1,000", "1,000-2,500"]);
    expect(scaledFromPrimary(300, secondaryRatio)).toBe(175);
    expect(scaledFromPrimary(300, classifiedRatio)).toBe(100);
    expect(scaledFromPrimary(400, secondaryRatio)).toBe(233);
    expect(scaledFromPrimary(400, classifiedRatio)).toBe(133);
    expect(formatUsd(300)).toBe("$300");
    const full = buildLlmsFullTxt();
    expect(full).toContain("Secondary $175");
    expect(full).toContain("Classified $100");
    expect(full).not.toContain("2,500-5,000");
    expect(full).not.toContain("$4,500");
    expect(full).not.toContain("60%");
    expect(full).not.toContain("35%");
  });

  it("builds stripe env keys without putting secrets in the name", () => {
    expect(stripePriceEnvKey("legal", "primary", false)).toBe("STRIPE_PRICE_LEGAL_PRIMARY");
    expect(stripePriceEnvKey("legal", "primary", true)).toBe("STRIPE_PRICE_LEGAL_PRIMARY_FOUNDING");
    expect(stripePriceEnvKey("marketing-sales", "classified", false)).toBe(
      "STRIPE_PRICE_MARKETING_SALES_CLASSIFIED",
    );
    expect(stripeLinkEnvKey("legal", "bundle")).toBe("NEXT_PUBLIC_STRIPE_LINK_LEGAL_BUNDLE");
  });
});
