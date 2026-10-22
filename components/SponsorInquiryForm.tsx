"use client";

import { useRef, useState } from "react";
import { SponsorField, SponsorVerification } from "@/components/SponsorField";
import type { TurnstileHandle } from "@/components/TurnstileField";
import { site } from "@/lib/site";
import { inquiryBudgets } from "@/lib/sponsor-inquiry";
import type { PlacementChoice } from "@/lib/sponsor-labels";
import {
  checkoutSegmentHelp,
  inquiryFieldCopy,
  inquiryPlacementHelp,
  inquiryPlacementLabel,
  inquirySegmentLabel,
  sponsorContactLead,
  sponsorRequiredLegend,
  sponsorVerifyHelp,
} from "@/lib/sponsor-form-copy";

type Status = { kind: "idle" | "working" | "error" | "sent"; message: string };

export function SponsorInquiryForm({
  segments,
  placementsBySegment,
}: {
  segments: PlacementChoice[];
  placementsBySegment: Record<string, PlacementChoice[]>;
}) {
  const [segment, setSegment] = useState(segments[0]?.id ?? "");
  const [placement, setPlacement] = useState(placementsBySegment[segments[0]?.id ?? ""]?.[0]?.id ?? "primary");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstile = useRef<TurnstileHandle>(null);
  const placements = placementsBySegment[segment] ?? [];
  const sectionHelp = checkoutSegmentHelp(segments.map((item) => item.label));

  function onSegment(next: string) {
    setSegment(next);
    const options = placementsBySegment[next] ?? [];
    if (!options.some((item) => item.id === placement)) {
      setPlacement(options[0]?.id ?? "primary");
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!turnstileToken) {
      setStatus({ kind: "error", message: "Verification is still loading. Try again." });
      return;
    }
    setStatus({ kind: "working", message: "" });
    const response = await fetch("/api/sponsor-inquiry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        company: form.get("company"),
        email: form.get("email"),
        promote: form.get("promote"),
        budget: form.get("budget"),
        message: form.get("message"),
        segment: form.get("segment"),
        placement: form.get("placement"),
        company_website: form.get("company_website"),
        turnstileToken,
      }),
    });
    turnstile.current?.reset();
    const body = (await response.json()) as { error?: string; ok?: boolean };
    if (!response.ok || !body.ok) {
      setStatus({ kind: "error", message: body.error || "The inquiry could not be sent." });
      return;
    }
    setStatus({ kind: "sent", message: "" });
  }

  if (status.kind === "sent") {
    return (
      <div className="form-card" id="inquiry">
        <h2>Thanks</h2>
        <p className="form-ok">Thanks. We have your note and will reply by email.</p>
      </div>
    );
  }

  return (
    <form className="form-card" id="inquiry" onSubmit={onSubmit}>
      <h2>Ask about a sponsorship</h2>
      <p className="form-note">
        Use this for a question, a section sponsor, or a run that checkout does not cover. Paid primary
        and secondary weeks use the checkout form.
      </p>
      <p className="form-note">{sponsorRequiredLegend}</p>
      <p className="form-note">
        {sponsorContactLead} <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
      <SponsorField id="inquiry-segment" label={inquirySegmentLabel} required help={sectionHelp}>
        <select name="segment" value={segment} onChange={(event) => onSegment(event.target.value)}>
          {segments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </SponsorField>
      <SponsorField id="inquiry-placement" label={inquiryPlacementLabel} required help={inquiryPlacementHelp}>
        <select name="placement" value={placement} onChange={(event) => setPlacement(event.target.value)}>
          {placements.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </SponsorField>
      <SponsorField
        id="inquiry-name"
        label={inquiryFieldCopy.name.label}
        required={inquiryFieldCopy.name.required}
        help={inquiryFieldCopy.name.help}
      >
        <input name="name" autoComplete="name" />
      </SponsorField>
      <SponsorField
        id="inquiry-company"
        label={inquiryFieldCopy.company.label}
        required={inquiryFieldCopy.company.required}
        help={inquiryFieldCopy.company.help}
      >
        <input name="company" autoComplete="organization" />
      </SponsorField>
      <SponsorField
        id="inquiry-email"
        label={inquiryFieldCopy.email.label}
        required={inquiryFieldCopy.email.required}
        help={inquiryFieldCopy.email.help}
      >
        <input name="email" type="email" autoComplete="email" />
      </SponsorField>
      <SponsorField
        id="inquiry-promote"
        label={inquiryFieldCopy.promote.label}
        required={inquiryFieldCopy.promote.required}
        help={inquiryFieldCopy.promote.help}
      >
        <input name="promote" />
      </SponsorField>
      <SponsorField
        id="inquiry-budget"
        label={inquiryFieldCopy.budget.label}
        required={inquiryFieldCopy.budget.required}
        help={inquiryFieldCopy.budget.help}
      >
        <select name="budget" defaultValue="">
          <option value="">Select a range</option>
          {inquiryBudgets.map((budget) => (
            <option key={budget} value={budget}>
              {budget}
            </option>
          ))}
        </select>
      </SponsorField>
      <SponsorField
        id="inquiry-message"
        label={inquiryFieldCopy.message.label}
        required={inquiryFieldCopy.message.required}
        help={inquiryFieldCopy.message.help}
      >
        <textarea name="message" />
      </SponsorField>
      <div className="hp" aria-hidden="true">
        <label htmlFor="inquiry-company-website">Company website</label>
        <input id="inquiry-company-website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <SponsorVerification
        id="inquiry-verify"
        action="inquiry"
        help={sponsorVerifyHelp}
        turnstileRef={turnstile}
        onToken={setTurnstileToken}
      />
      <div className="actions">
        <button className="button" type="submit" disabled={status.kind === "working"}>
          {status.kind === "working" ? "Sending" : "Send the inquiry"}
        </button>
      </div>
      {status.kind === "error" ? <p className="form-error">{status.message}</p> : null}
    </form>
  );
}
