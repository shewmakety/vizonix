import Link from "next/link";
import { customizeCard, preferencesPath, whatWeDo, whatWeDoBody } from "@/lib/site";

export function WhatWeDo() {
  return (
    <section className="what-we-do">
      <h2 className="what-we-do-heading">{whatWeDo.heading}</h2>
      <p>{whatWeDoBody()}</p>
      <p className="what-we-do-action">
        <Link href={preferencesPath}>{customizeCard.action}</Link>
      </p>
    </section>
  );
}
