"use client";

import { useEffect, useRef, useState } from "react";
import { SponsorField, SponsorVerification } from "@/components/SponsorField";
import type { TurnstileHandle } from "@/components/TurnstileField";
import { site } from "@/lib/site";
import { inquiryBudgets } from "@/lib/sponsor-inquiry";
import type { PlacementChoice } from "@/lib/sponsor-labels";
import {
  checkoutAdCopyHelp,
  checkoutAdCopyLabel,
  checkoutSegmentHelp,
  inquiryFieldCopy,
  inquiryPlacementHelp,
  inquiryPlacementLabel,
  inquirySegmentLabel,
  sponsoredSectionHelp,
  sponsoredSectionLabel,
  sponsorContactLead,
  sponsorHumanPending,
  sponsorInquiryPrefillEvent,
  sponsorRequiredLegend,
  sponsorVerifyHelp,
  type SponsorInquiryPrefill,
} from "@/lib/sponsor-form-copy";
import {
  buyerCopyMax,
  renderedFormatIds,
  sponsorNameMax,
  sponsorSlotSpec,
  type RenderedFormatId,
} from "@/lib/sponsor-slots";

type Status = { kind: "idle" | "working" | "error" | "sent"; message: string };

function isFormat(value: string): value is RenderedFormatId {
  return (renderedFormatIds as readonly string[]).includes(value);
}

export function SponsorInquiryForm({
  segments,
  sectionsBySegment,
  initialPlacement = "primary",
}: {
  segments: PlacementChoice[];
  sectionsBySegment: Record<string, PlacementChoice[]>;
  initialPlacement?: string;
}) {
  const [segment, setSegment] = useState(segments[0]?.id ?? "");
  const [placement, setPlacement] = useState<RenderedFormatId>(isFormat(initialPlacement) ? initialPlacement : "primary");
  const [sectionId, setSectionId] = useState("");
  const [company, setCompany] = useState("");
  const [adCopy, setAdCopy] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstile = useRef<TurnstileHandle>(null);
  const numbered = sectionsBySegment[segment] ?? [];
  const sectionHelp = checkoutSegmentHelp(segments.map((item) => item.label));
  const copyMax = buyerCopyMax(placement);

  function onSegment(next: string) {
    setSegment(next);
    const options = sectionsBySegment[next] ?? [];
    if (sectionId && !options.some((item) => item.id === sectionId)) setSectionId("");
  }

  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<SponsorInquiryPrefill>).detail;
      if (!detail || detail.placement !== "section") return;
      if (!segments.some((item) => item.id === detail.segment)) return;
      const options = sectionsBySegment[detail.segment] ?? [];
      if (!options.some((item) => item.id === detail.section)) return;
      setSegment(detail.segment);
      setPlacement("section");
      setSectionId(detail.section);
      setCompany(detail.company);
      setAdCopy(detail.adCopy.slice(0, buyerCopyMax("section")));
    }
    window.addEventListener(sponsorInquiryPrefillEvent, onPrefill);
    return () => window.removeEventListener(sponsorInquiryPrefillEvent, onPrefill);
  }, [sectionsBySegment, segments]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (placement === "section" && !String(form.get("section") ?? "").trim()) {
      setStatus({ kind: "error", message: "Choose the numbered section." });
      return;
    }
    if (!turnstileToken) {
      setStatus({ kind: "error", message: sponsorHumanPending });
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
        adCopy: form.get("adCopy"),
        budget: form.get("budget"),
        message: form.get("message"),
        segment: form.get("segment"),
        placement: form.get("placement"),
        section: form.get("section"),
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
        and secondary weeks use the checkout form. A section sponsor needs the numbered section.
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
        <select
          name="placement"
          value={placement}
          onChange={(event) => {
            const next = event.target.value;
            if (isFormat(next)) setPlacement(next);
          }}
        >
          {renderedFormatIds.map((id) => (
            <option key={id} value={id}>
              {sponsorSlotSpec(id)?.name ?? id}
            </option>
          ))}
        </select>
      </SponsorField>
      {placement === "section" ? (
        <SponsorField id="inquiry-sponsored-section" label={sponsoredSectionLabel} required help={sponsoredSectionHelp}>
          <select name="section" value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
            <option value="">Select a section</option>
            {numbered.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </SponsorField>
      ) : null}
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
        help={`${inquiryFieldCopy.company.help} ${company.length} of ${sponsorNameMax} characters.`}
      >
        <input
          name="company"
          autoComplete="organization"
          maxLength={sponsorNameMax}
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
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
        id="inquiry-ad-copy"
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
