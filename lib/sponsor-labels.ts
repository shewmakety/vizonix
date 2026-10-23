import { listIssues } from "@/lib/content";
import { getPlacement } from "@/lib/rate-card";
import { activeSegments } from "@/lib/segments";
import { renderedFormatIds, sectionSpots, sponsorSlotSpec } from "@/lib/sponsor-slots";

import type { InquiryFormOptions, PlacementChoice } from "@/lib/sponsor-labels-client";

export type { InquiryFormOptions, PlacementChoice };

/** Primary, secondary, and section sponsor. The numbered section is a separate field. */
export function placementChoices(_segment?: string): PlacementChoice[] {
  return renderedFormatIds.map((id) => ({
    id,
    label: sponsorSlotSpec(id)?.name ?? id,
  }));
}

/**
 * Unlaunched verticals. Those names stay off public sponsor pages.
 * A numbered section whose topic uses one of these words is listed by number only.
 */
const unlaunchedVertical = /\b(?:warehousing|legal|marketing)\b/i;

function sectionChoiceLabel(id: string, topic: string | undefined, publicLabels: boolean): string {
  const name = topic?.trim() ?? "";
  if (!name || (publicLabels && unlaunchedVertical.test(name))) return `Section ${id}`;
  return `Section ${id} - ${name}`;
}

/**
 * Numbered sections for one segment.
 * Labels come from that segment's latest issue. A segment with no issue gets Section 01, Section 02, and so on.
 * Public labels drop unlaunched vertical names. Admin labels keep the issue topic.
 */
export function numberedSectionChoices(
  segment: string,
  options?: { publicLabels?: boolean },
): PlacementChoice[] {
  const publicLabels = options?.publicLabels === true;
  const sections = listIssues(segment)[0]?.sections ?? [];
  if (sections.length === 0) {
    return sectionSpots.map((id) => ({ id, label: `Section ${id}` }));
  }
  return sections.slice(0, sectionSpots.length).map((section, index) => {
    const id = sectionSpots[index] ?? "";
    return { id, label: sectionChoiceLabel(id, section.topic, publicLabels) };
  });
}

export function numberedSectionIds(segment: string): string[] {
  return numberedSectionChoices(segment).map((item) => item.id);
}

export function placementLabel(segment: string, placement: string): string {
  return (
    numberedSectionChoices(segment).find((item) => item.id === placement)?.label ??
    placementChoices().find((item) => item.id === placement)?.label ??
    getPlacement(placement)?.name ??
    placement
  );
}

/** Active briefings and the numbered sections on each one's latest issue. */
export function inquiryFormOptions(): InquiryFormOptions {
  const live = activeSegments();
  return {
    segments: live.map((segment) => ({ id: segment.slug, label: segment.name })),
    sectionsBySegment: Object.fromEntries(
      live.map((segment) => [segment.slug, numberedSectionChoices(segment.slug, { publicLabels: true })]),
    ),
  };
}
