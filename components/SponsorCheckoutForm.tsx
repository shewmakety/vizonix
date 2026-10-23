"use client";

import { useRef, useState } from "react";
import { SponsorCheck, SponsorField, SponsorVerification } from "@/components/SponsorField";
import type { TurnstileHandle } from "@/components/TurnstileField";
import { formatUsd, getPlacement } from "@/lib/rate-card";
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
  sponsorInquiryPrefillEvent,
  checkoutStartHelp,
  sponsoredSectionHelp,
  sponsoredSectionLabel,
  sponsorContactLead,
  sponsorHumanPending,
  sponsorRequiredLegend,
  sponsorVerifyHelp,
} from "@/lib/sponsor-form-copy";
import type { PlacementChoice } from "@/lib/sponsor-labels";
import {
  buyerCopyMax,
  renderedFormatIds,
  sponsorNameMax,
  sponsorSlotSpec,
  type RenderedFormatId,
} from "@/lib/sponsor-slots";

type Status = { kind: "idle" | "working" | "error"; message: string };

function isFormat(value: string): value is RenderedFormatId {
  return (renderedFormatIds as readonly string[]).includes(value);
}

export function SponsorCheckoutForm({
  initialPlacement = "primary",
  sectionsBySegment = {},
}: {
  initialPlacement?: string;
  sectionsBySegment?: Record<string, PlacementChoice[]>;
}) {
  const active = activeSegments();
  const starting = isFormat(initialPlacement) ? initialPlacement : "primary";
  const [segment, setSegment] = useState(active[0]?.slug ?? "");
  const [placement, setPlacement] = useState<RenderedFormatId>(starting);
  const [spot, setSpot] = useState("");
  const [founding, setFounding] = useState(false);
  const [company, setCompany] = useState("");
  const [adCopy, setAdCopy] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstile = useRef<TurnstileHandle>(null);
  const selected = getPlacement(placement);
  const priced = placement !== "section" && selected?.price != null;
  const price = !priced || selected?.price == null ? null : founding ? selected.founding : selected.price;
  const heading = "Reserve a newsletter week";
  const sectionNames = active.map((item) => item.name);
  const foundingPrice =
    selected?.founding == null ? "the founding price" : `${formatUsd(selected.founding)} per week`;
  const numbered = sectionsBySegment[segment] ?? [];
  const copyMax = buyerCopyMax(placement);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (placement === "section") {
      const chosen = String(form.get("section") ?? "").trim();
      if (!chosen) {
        setStatus({ kind: "error", message: "Choose the numbered section." });
        return;
      }
      const detail = {
        placement: "section" as const,
        segment: String(form.get("segment") ?? ""),
        section: chosen,
        company: company.trim(),
        adCopy: adCopy.trim(),
      };
      window.dispatchEvent(new CustomEvent(sponsorInquiryPrefillEvent, { detail }));
      document.getElementById("inquiry")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setStatus({ kind: "idle", message: "" });
      return;
    }
    if (!turnstileToken) {
      setStatus({ kind: "error", message: sponsorHumanPending });
      return;
    }
    setStatus({ kind: "working", message: "" });
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        segment: form.get("segment"),
        placement: form.get("placement"),
        section: form.get("section"),
        startDate: form.get("startDate"),
        quantity: Number(form.get("quantity") || 1),
        email: form.get("email"),
        company: form.get("company"),
        adCopy: form.get("adCopy"),
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
      {placement === "section" ? (
        <p className="form-note">{checkoutSectionQuoteNote}</p>
      ) : (
        <p className="form-note">
          Checkout charges the launch price
          {price !== null ? ` at ${formatUsd(price)} per week` : ""}. A newsletter week is blocked after
          Stripe confirms payment. The founding rate, when the box is checked, does not combine with
          another discount.
        </p>
      )}
      <p className="form-note">{sponsorRequiredLegend}</p>
      <p className="form-note">
        {sponsorContactLead} <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
      <SponsorField id="sponsor-segment" label="Section" required help={checkoutSegmentHelp(sectionNames)}>
        <select
          name="segment"
          value={segment}
          onChange={(event) => {
            setSegment(event.target.value);
            setSpot("");
          }}
        >
          {active.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </SponsorField>
      <SponsorField id="placement" label="Placement" required help={checkoutPlacementHelp}>
        <select
          name="placement"
          value={placement}
          onChange={(event) => {
            const next = event.target.value;
            if (isFormat(next)) setPlacement(next);
          }}
        >
          {renderedFormatIds.map((id) => {
            const item = getPlacement(id);
            const name = sponsorSlotSpec(id)?.name ?? id;
            const amount = item?.price;
            return (
              <option key={id} value={id}>
                {amount == null ? name : `${name} (${formatUsd(amount)} / week)`}
              </option>
            );
          })}
        </select>
      </SponsorField>
      {placement === "section" ? (
        <SponsorField id="sponsored-section" label={sponsoredSectionLabel} required help={sponsoredSectionHelp}>
          <select name="section" value={spot} onChange={(event) => setSpot(event.target.value)}>
            <option value="">Select a section</option>
            {numbered.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </SponsorField>
      ) : null}
      {placement === "section" ? null : (
        <SponsorField id="startDate" label="Preferred start date" required help={checkoutStartHelp}>
          <input name="startDate" type="date" />
        </SponsorField>
      )}
      {placement === "section" ? null : (
        <SponsorField id="quantity" label="Number of weeks" required help={checkoutQuantityHelp}>
          <input name="quantity" type="number" min={1} max={12} step={1} defaultValue={1} />
        </SponsorField>
      )}
      <SponsorField
        id="company"
        label="Company name"
        required
        help={`${checkoutCompanyHelp} ${company.length} of ${sponsorNameMax} characters.`}
      >
        <input
          name="company"
          autoComplete="organization"
          maxLength={sponsorNameMax}
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
      </SponsorField>
      {placement === "section" ? null : (
        <SponsorField id="sponsor-email" label="Email for the receipt" required help={checkoutEmailHelp}>
          <input name="email" type="email" autoComplete="email" />
        </SponsorField>
      )}
      <SponsorField
        id="adCopy"
        label={checkoutAdCopyLabel}
        required
        help={`${checkoutAdCopyHelp(placement)} ${adCopy.length} of ${copyMax} characters.`}
      >
        <textarea
          name="adCopy"
          maxLength={copyMax}
          value={adCopy}
          onChange={(event) => setAdCopy(event.target.value)}
        />
      </SponsorField>
      {priced ? (
        <SponsorCheck
          id="founding"
          name="founding"
          label={checkoutFoundingLabel}
          help={checkoutFoundingHelp(foundingPrice)}
          checked={founding}
          onChange={(event) => setFounding(event.target.checked)}
        />
      ) : null}
      {priced && selected?.newsletter ? (
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
        {placement === "section" ? (
          <button className="button" type="submit">
            Send the inquiry form
          </button>
        ) : (
          <button className="button" type="submit" disabled={status.kind === "working"}>
            {status.kind === "working" ? "Opening Stripe" : "Continue to Stripe"}
          </button>
        )}
      </div>
      {status.kind === "error" ? <p className="form-error">{status.message}</p> : null}
    </form>
  );
}
