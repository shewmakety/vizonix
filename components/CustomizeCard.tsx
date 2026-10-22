import Link from "next/link";
import { customizeCard, preferencesPath } from "@/lib/site";

export function CustomizeCard() {
  return (
    <section className="what-we-do">
      <h2 className="what-we-do-heading">{customizeCard.heading}</h2>
      <p>{customizeCard.copy}</p>
      <p className="what-we-do-action">
        <Link href={preferencesPath}>{customizeCard.action}</Link>
      </p>
    </section>
  );
}
