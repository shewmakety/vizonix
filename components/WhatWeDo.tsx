import { whatWeDo } from "@/lib/site";

export function WhatWeDo() {
  return (
    <section className="what-we-do">
      <h2 className="what-we-do-heading">{whatWeDo.heading}</h2>
      <p>{whatWeDo.copy}</p>
    </section>
  );
}
