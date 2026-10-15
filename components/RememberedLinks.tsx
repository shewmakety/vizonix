"use client";

import Link from "next/link";
import { segmentUnsubscribeHref } from "@/lib/segment-memory";
import { featuredSegment, getSegment } from "@/lib/segments";
import { useRememberedSlug } from "@/components/useRememberedSlug";

export function RememberedHomeLink() {
  const slug = useRememberedSlug();
  const segment = getSegment(slug ?? "") ?? featuredSegment();
  return <Link href={`/${segment.slug}`}>Go to the {segment.name.toLowerCase()} home page</Link>;
}

export function RememberedUnsubscribeLink() {
  const slug = useRememberedSlug();
  return <Link href={segmentUnsubscribeHref("/privacy", slug)}>unsubscribe page</Link>;
}
