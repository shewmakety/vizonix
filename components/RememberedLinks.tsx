"use client";

import Link from "next/link";
import { featuredSegment, getSegment } from "@/lib/segments";
import { useRememberedSlug } from "@/components/useRememberedSlug";

export function RememberedHomeLink() {
  const slug = useRememberedSlug();
  const segment = getSegment(slug ?? "") ?? featuredSegment();
  return <Link href={`/${segment.slug}`}>Go to the {segment.name.toLowerCase()} home page</Link>;
}
