import { describe, expect, it } from "vitest";
import { allTools } from "@/lib/content";
import { isFeaturedActive, pickFeaturedSlugs, presentDirectory } from "@/lib/featured";
import { collectionJsonLd } from "@/lib/jsonld";
import { parseTool, type ToolEntry } from "@/lib/schema";
import { relatedTools } from "@/lib/tool-page";

const today = "2026-10-16";

function entry(partial: Partial<ToolEntry> & Pick<ToolEntry, "slug">): ToolEntry {
  return {
    segment: "aviation",
    name: partial.name ?? partial.slug,
    sample: false,
    category: "Test",
    summary: "Summary text for the fixture.",
    paragraphs: ["Summary text for the fixture."],
    whyItMatters: "It changes the cost of the job.",
    pricing: "Contact the vendor",
    url: "https://example.com/tool",
    ...partial,
  };
}

function paid(slug: string, topic: string, until = "2026-12-31"): ToolEntry {
  return entry({
    slug,
    topic,
    featured: { until, tier: "founding", blurb: `Longer blurb for ${slug}.` },
  });
}

describe("featured listings", () => {
  it("ignores an expired flag and keeps a same-day flag", () => {
    const active = entry({ slug: "live", featured: { until: today, tier: "standard" } });
    const expired = entry({ slug: "old", featured: { until: "2026-10-15", tier: "standard" } });
    expect(isFeaturedActive(active, today)).toBe(true);
    expect(isFeaturedActive(expired, today)).toBe(false);
    expect(pickFeaturedSlugs([active, expired], today)).toEqual(["live"]);
  });

  it("rotates at most three featured tools per topic, stably", () => {
    const tools = ["d", "b", "a", "c"].map((slug) => paid(slug, "aog-support"));
    const first = pickFeaturedSlugs(tools, "2026-10-16");
    const again = pickFeaturedSlugs(tools, "2026-10-16");
    const next = pickFeaturedSlugs(tools, "2026-10-17");
    expect(first).toEqual(again);
    expect(first).toHaveLength(3);
    expect(first).toEqual(["a", "b", "c"]);
    expect(next[0]).toBe("b");
    expect(next).not.toEqual(first);
  });

  it("puts the rotated tools first and leaves the other bucket unsponsored", () => {
    const knownKeys = new Set(["aog-support", "parts"]);
    const catalog = [
      entry({ slug: "plain", topic: "aog-support" }),
      ...["d", "b", "a", "c"].map((slug) => paid(slug, "aog-support")),
    ];
    const presented = presentDirectory(catalog, { topic: "aog-support", knownKeys, today: "2026-10-16" });
    expect(presented.sponsoredSlugs).toEqual(["a", "b", "c"]);
    expect(presented.tools.slice(0, 3).map((tool) => tool.slug)).toEqual(["a", "b", "c"]);
    expect(presented.tools.map((tool) => tool.slug)).toContain("plain");
    expect(presented.tools.map((tool) => tool.slug)).toContain("d");

    const loose = entry({
      slug: "loose",
      featured: { until: "2099-01-01", tier: "standard" },
    });
    const other = presentDirectory([loose], { topic: "other", knownKeys, today });
    expect(other.sponsoredSlugs).toEqual([]);
    expect(other.tools.map((tool) => tool.slug)).toEqual(["loose"]);
  });

  it("unions at most three featured tools from each topic on the full directory", () => {
    const knownKeys = new Set(["alpha", "beta"]);
    const catalog = [
      ...["a1", "a2", "a3", "a4"].map((slug) => paid(slug, "alpha")),
      ...["b1", "b2", "b3", "b4"].map((slug) => paid(slug, "beta")),
    ];
    const presented = presentDirectory(catalog, { knownKeys, today: "2026-10-16" });
    expect(presented.sponsoredSlugs).toEqual(["a1", "a2", "a3", "b1", "b2", "b3"]);
  });

  it("keeps sponsored tools out of the organic ItemList", () => {
    const json = collectionJsonLd({
      name: "Directory",
      description: "Tools",
      path: "/aviation/tools",
      tools: [
        { name: "Paid", segment: "aviation", slug: "paid" },
        { name: "Editorial", segment: "aviation", slug: "editorial" },
      ],
      sponsoredSlugs: ["paid"],
    }) as {
      mainEntity: { itemListElement: Array<{ name: string; position: number }> };
      hasPart: { name: string; description: string; itemListElement: Array<{ name: string }> };
    };
    expect(json.mainEntity.itemListElement).toHaveLength(1);
    expect(json.mainEntity.itemListElement[0]).toMatchObject({ name: "Editorial", position: 1 });
    expect(json.hasPart.name).toBe("Sponsored listings");
    expect(json.hasPart.description).toContain("not a ranking");
    expect(json.hasPart.itemListElement[0].name).toBe("Paid (Sponsored)");
    expect(JSON.stringify(json)).not.toContain("aggregateRating");
  });

  it("sorts active featured tools ahead of the rest in related tools", () => {
    const self = entry({ slug: "self", topic: "aog-support" });
    const peers = [
      entry({ slug: "normal-1", topic: "aog-support" }),
      paid("featured-b", "aog-support"),
      paid("expired", "aog-support", "2026-01-01"),
      paid("featured-a", "aog-support"),
      entry({ slug: "normal-2", topic: "aog-support" }),
    ];
    expect(relatedTools(self, peers, 4, today).map((tool) => tool.slug)).toEqual([
      "featured-b",
      "featured-a",
      "normal-1",
      "expired",
    ]);
  });

  it("requires a featured call to action to have both a label and a URL", () => {
    const base = {
      slug: "fixture-tool",
      segment: "aviation",
      name: "Fixture",
      sample: true,
      category: "Test",
      summary: "A fixture listing.",
      paragraphs: ["A fixture listing."],
      whyItMatters: "It does not change a real operation.",
      pricing: "Free",
      url: "https://example.com",
    };
    expect(
      parseTool({
        ...base,
        featured: {
          until: "2026-12-31",
          tier: "founding",
          blurb: "A longer paid blurb.",
          cta: "Visit",
          ctaUrl: "https://example.com/go",
        },
      }).featured?.tier,
    ).toBe("founding");
    expect(() =>
      parseTool({
        ...base,
        featured: { until: "2026-12-31", tier: "standard", cta: "Visit" },
      }),
    ).toThrow(/call to action/);
  });

  it("does not mark a real directory tool as sponsored", () => {
    expect(allTools().filter((tool) => tool.featured)).toEqual([]);
  });
});
