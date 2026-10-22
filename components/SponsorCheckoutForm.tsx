"use client";

import { useRef, useState } from "react";
import { SponsorCheck, SponsorField, SponsorVerification } from "@/components/SponsorField";
import type { TurnstileHandle } from "@/components/TurnstileField";
import { checkoutPlacements, formatUsd, getPlacement } from "@/lib/rate-card";
import { activeSegments } from "@/lib/segments";
import { site } from "@/lib/site";
import {
  checkoutAdCopyHelp,
  checkoutAdCopyLabel,
  checkoutCompanyHelp,
  checkoutEmailHelp,
  checkoutExclusivityHelp,
  checkoutExclusivityLabel,
  checkoutFoundingHelp,
  checkoutFoundingLabel,
  checkoutPlacementHelp,
  checkoutQuantityHelp,
  checkoutSectionQuoteNote,
  checkoutSegmentHelp,
  checkoutStartHelp,
  sponsorContactLead,
  sponsorRequiredLegend,
  sponsorVerifyHelp,
} from "@/lib/sponsor-form-copy";

type Status = { kind: "idle" | "working" | "error"; message: string };

export function SponsorCheckoutForm({ initialPlacement = "primary" }: { initialPlacement?: string }) {
  const active = activeSegments();
  const starting = checkoutPlacements.some((item) => item.id === initialPlacement)
    ? initialPlacement
    : (checkoutPlacements[0]?.id ?? "primary");
  const [placement, setPlacement] = useState(starting);
  const [founding, setFounding] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstile = useRef<TurnstileHandle>(null);
  const selected = getPlacement(placement);
  const price = selected?.price == null ? null : founding ? selected.founding : selected.price;
  const heading = "Reserve a newsletter week";
  const sectionNames = active.map((segment) => segment.name);
  const foundingPrice =
    selected?.founding == null ? "the founding price" : `${formatUsd(selected.founding)} per week`;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!turnstileToken) {
      setStatus({ kind: "error", message: "Verification is still loading. Try again." });
      return;
    }
    setStatus({ kind: "working", message: "" });
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        segment: form.get("segment"),
        placement: form.get("placement"),
        startDate: form.get("startDate"),
        quantity: Number(form.get("quantity") || 1),
        email: form.get("email"),
        company: form.get("company"),
        adCopyUrl: form.get("adCopyUrl"),
        founding: form.get("founding") === "on",
        exclusivity: form.get("exclusivity") === "on",
        company_website: form.get("company_website"),
        turnstileToken,
      }),
    });
    turnstile.current?.reset();
    const body = (await response.json()) as { error?: string; url?: string };
    if (!response.ok || !body.url) {
      setStatus({ kind: "error", message: body.error || "Checkout could not start." });
      return;
    }
    window.location.href = body.url;
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>{heading}</h2>
      <p className="form-note">
        Checkout charges the launch price
        {price !== null ? ` at ${formatUsd(price)} per week` : ""}. A newsletter week is blocked after
        Stripe confirms payment. The founding rate, when the box is checked, does not combine with
        another discount. {checkoutSectionQuoteNote}
      </p>
      <p className="form-note">{sponsorRequiredLegend}</p>
      <p className="form-note">
        {sponsorContactLead} <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
      <SponsorField id="sponsor-segment" label="Section" required help={checkoutSegmentHelp(sectionNames)}>
        <select name="segment" defaultValue={active[0]?.slug ?? ""}>
          {active.map((segment) => (
            <option key={segment.slug} value={segment.slug}>
              {segment.name}
            </option>
          ))}
        </select>
      </SponsorField>
      <SponsorField id="placement" label="Placement" required help={checkoutPlacementHelp}>
        <select name="placement" value={placement} onChange={(event) => setPlacement(event.target.value)}>
          {checkoutPlacements.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({formatUsd(item.price)} / week)
            </option>
          ))}
        </select>
      </SponsorField>
      <SponsorField id="startDate" label="Preferred start date" required help={checkoutStartHelp}>
        <input name="startDate" type="date" />
      </SponsorField>
      <SponsorField id="quantity" label="Number of weeks" required help={checkoutQuantityHelp}>
        <input name="quantity" type="number" min={1} max={12} step={1} defaultValue={1} />
      </SponsorField>
      <SponsorField id="company" label="Company" required={false} help={checkoutCompanyHelp}>
        <input name="company" autoComplete="organization" />
      </SponsorField>
      <SponsorField id="sponsor-email" label="Email for the receipt" required help={checkoutEmailHelp}>
        <input name="email" type="email" autoComplete="email" />
      </SponsorField>
      <SponsorField id="adCopyUrl" label={checkoutAdCopyLabel} required={false} help={checkoutAdCopyHelp}>
        <input name="adCopyUrl" type="url" placeholder="https://" />
      </SponsorField>
      <SponsorCheck
        id="founding"
        name="founding"
        label={checkoutFoundingLabel}
        help={checkoutFoundingHelp(foundingPrice)}
        checked={founding}
        onChange={(event) => setFounding(event.target.checked)}
      />
      {selected?.newsletter ? (
        <SponsorCheck
          id="exclusivity"
          name="exclusivity"
          label={checkoutExclusivityLabel}
          help={checkoutExclusivityHelp()}
        />
      ) : null}
      <div className="hp" aria-hidden="true">
        <label htmlFor="sponsor-company-website">Company website</label>
        <input id="sponsor-company-website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <SponsorVerification
        id="checkout-verify"
        action="checkout"
        help={sponsorVerifyHelp}
        turnstileRef={turnstile}
        onToken={setTurnstileToken}
      />
      <div className="actions">
        <button className="button" type="submit" disabled={status.kind === "working"}>
          {status.kind === "working" ? "Opening Stripe" : "Continue to Stripe"}
        </button>
      </div>
      {status.kind === "error" ? <p className="form-error">{status.message}</p> : null}
    </form>
  );
}
