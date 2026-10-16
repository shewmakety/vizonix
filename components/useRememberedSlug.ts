"use client";

import { useEffect, useState } from "react";
import { SEGMENT_COOKIE } from "@/lib/segment-memory";
import { getSegment } from "@/lib/segments";

/** Reads vz_segment after mount so server HTML can stay cacheable. */
export function useRememberedSlug(): string | undefined {
  const [slug, setSlug] = useState<string | undefined>(undefined);
  useEffect(() => {
    const row = document.cookie.split("; ").find((part) => part.startsWith(`${SEGMENT_COOKIE}=`));
    if (!row) return;
    const value = decodeURIComponent(row.slice(SEGMENT_COOKIE.length + 1));
    const segment = getSegment(value);
    if (segment?.status === "active") setSlug(value);
  }, []);
  return slug;
}
