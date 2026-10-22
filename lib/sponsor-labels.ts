import { listIssues } from "@/lib/content";
import { getPlacement } from "@/lib/rate-card";
import { activeSegments } from "@/lib/segments";
import { renderedIssueSlotIds, sectionSpots, sponsorSlotSpec } from "@/lib/sponsor-slots";

export type PlacementChoice = { id: string; label: string };

export type InquiryFormOptions = {
  segments: PlacementChoice[];
  placementsBySegment: Record<string, PlacementChoice[]>;
};

/** Placement names for one segment. Section labels follow that segment's latest issue. */
export function placementChoices(segment: string): PlacementChoice[] {
  const issue = listIssues(segment)[0];
  const slots = renderedIssueSlotIds.map((id) => ({
    id,
    label: sponsorSlotSpec(id)?.name ?? id,
  }));
  const spots = sectionSpots.map((id, index) => {
    const topic = issue?.sections?.[index]?.topic;
    return { id, label: topic ? `Section ${id} - ${topic}` : `Section ${id}` };
  });
  return [...slots, ...spots];
}

export function placementLabel(segment: string, placement: string): string {
  return (
    placementChoices(segment).find((item) => item.id === placement)?.label ??
    getPlacement(placement)?.name ??
    placement
  );
}

/** Active sections and the slots the inquiry form can ask about. */
export function inquiryFormOptions(): InquiryFormOptions {
  const live = activeSegments();
  return {
    segments: live.map((segment) => ({ id: segment.slug, label: segment.name })),
    placementsBySegment: Object.fromEntries(
      live.map((segment) => [segment.slug, placementChoices(segment.slug)]),
    ),
  };
}
