import { describe, expect, it } from "vitest";
import {
  classifiedRatio,
  formatUsd,
  foundingSponsorCap,
  launchPlacements,
  primaryLadder,
  scaledFromPrimary,
  secondaryRatio,
  stripeLinkEnvKey,
  stripePriceEnvKey,
} from "@/lib/rate-card";

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

  it("scales the ladder by the published ratios", () => {
    expect(secondaryRatio).toBe(0.6);
    expect(classifiedRatio).toBe(0.35);
    expect(primaryLadder.map((row) => row.primary)).toEqual([300, 400, 750, 1250, 2500, 4500, null]);
    expect(scaledFromPrimary(400, secondaryRatio)).toBe(240);
    expect(scaledFromPrimary(400, classifiedRatio)).toBe(140);
    expect(formatUsd(300)).toBe("$300");
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
