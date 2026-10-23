import { numberedSectionChoices, placementChoices, type PlacementChoice } from "@/lib/sponsor-labels";
import { segments } from "@/lib/segments";
import { listSponsors, type Sponsor } from "@/lib/sponsor-store";

export function adminSegments(): Array<{ slug: string; name: string }> {
  return segments.map((segment) => ({ slug: segment.slug, name: segment.name }));
}

export function placementsBySegment(): Record<string, PlacementChoice[]> {
  return Object.fromEntries(segments.map((segment) => [segment.slug, placementChoices(segment.slug)]));
}

export function sectionsBySegment(): Record<string, PlacementChoice[]> {
  return Object.fromEntries(segments.map((segment) => [segment.slug, numberedSectionChoices(segment.slug)]));
}

export async function sponsorOptions(): Promise<Array<{ id: string; company: string }>> {
  const sponsors: Sponsor[] = await listSponsors();
  return sponsors.map((sponsor) => ({ id: sponsor.id, company: sponsor.company }));
}
