/** Types and pure functions that can be imported in client components. */

export type PlacementChoice = { id: string; label: string };

export type InquiryFormOptions = {
  segments: PlacementChoice[];
  sectionsBySegment: Record<string, PlacementChoice[]>;
};
