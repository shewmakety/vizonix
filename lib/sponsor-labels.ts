import { listIssues } from "@/lib/content";
import { getPlacement, launchPlacements } from "@/lib/rate-card";
import { sectionSpots } from "@/lib/sponsor-placements";

export type PlacementChoice = { id: string; label: string };

/** Placement names for one segment. Section labels follow that segment's latest issue. */
export function placementChoices(segment: string): PlacementChoice[] {
  const issue = listIssues(segment)[0];
  const spots = sectionSpots.map((id, index) => {
    const topic = issue?.sections?.[index]?.topic;
    return { id, label: topic ? `Section ${id} - ${topic}` : `Section ${id}` };
  });
  return [...launchPlacements.map((item) => ({ id: item.id, label: item.name })), ...spots];
}

export function placementLabel(segment: string, placement: string): string {
  return placementChoices(segment).find((item) => item.id === placement)?.label ?? getPlacement(placement)?.name ?? placement;
}
