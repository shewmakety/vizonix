"use client";

import { useRef, useState } from "react";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { submitAdmin } from "@/components/admin/submit-admin";
import { inquiryStatuses, type InquiryStatus } from "@/lib/sponsor-placements";
import type { PlacementChoice } from "@/lib/sponsor-labels-client";
import { buyerCopyMax, formatForPlacement, isSectionSpot } from "@/lib/sponsor-slots";

export type InquiryFormValues = {
  name: string;
  company: string;
  email: string;
  promote: string;
  budget: string;
  message: string;
  adCopy: string;
  segment: string;
  placement: string;
  status: InquiryStatus;
};

export function InquiryForm({
  initial,
  path,
  method,
  returnTo,
  segments,
  placementsBySegment,
  sectionsBySegment,
}: {
  initial: InquiryFormValues;
  path: string;
  method: "POST" | "PATCH";
  returnTo: string;
  segments: PlacementChoice[];
  placementsBySegment: Record<string, PlacementChoice[]>;
  sectionsBySegment: Record<string, PlacementChoice[]>;
}) {
  const [values, setValues] = useState(initial);
  const [product, setProduct] = useState(isSectionSpot(initial.placement) ? "section" : initial.placement);
  const [spot, setSpot] = useState(isSectionSpot(initial.placement) ? initial.placement : "");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);
  const placementOptions = values.segment
    ? (placementsBySegment[values.segment] ?? [])
    : (Object.values(placementsBySegment)[0] ?? []);
  const numbered = values.segment ? (sectionsBySegment[values.segment] ?? []) : (Object.values(sectionsBySegment)[0] ?? []);
  const copyMax = formatForPlacement(product) ? buyerCopyMax(formatForPlacement(product)!) : 1200;

  function set<K extends keyof InquiryFormValues>(field: K, value: InquiryFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Complete the verification, then save.");
      return;
    }
    if (product === "section" && !spot) {
      setError("Choose the numbered section.");
      return;
    }
    setWorking(true);
    setError("");
    const placement = product === "section" ? spot : product;
    const result = await submitAdmin(path, method, { ...values, placement, section: spot, turnstileToken: token });
    turnstile.current?.reset();
    setToken("");
    setWorking(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.assign(returnTo);
  }

  return (
    <form className="form-card admin-card" onSubmit={onSubmit}>
      <label htmlFor="inquiry-name">Name</label>
      <input id="inquiry-name" required value={values.name} onChange={(event) => set("name", event.target.value)} />
      <label htmlFor="inquiry-company">Company</label>
      <input id="inquiry-company" required value={values.company} onChange={(event) => set("company", event.target.value)} />
      <label htmlFor="inquiry-email">Email</label>
      <input
        id="inquiry-email"
        type="email"
        required
        value={values.email}
        onChange={(event) => set("email", event.target.value)}
      />
      <label htmlFor="inquiry-segment">Section</label>
      <select id="inquiry-segment" value={values.segment} onChange={(event) => set("segment", event.target.value)}>
        <option value="">Not specified</option>
        {segments.map((segment) => (
          <option key={segment.id} value={segment.id}>
            {segment.label}
          </option>
        ))}
      </select>
      <label htmlFor="inquiry-placement">Placement</label>
      <select id="inquiry-placement" value={product} onChange={(event) => setProduct(event.target.value)}>
        <option value="">Not specified</option>
        {placementOptions.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
        {product && !placementOptions.some((item) => item.id === product) ? <option value={product}>{product}</option> : null}
      </select>
      {product === "section" ? (
        <>
          <label htmlFor="inquiry-sponsored-section">Sponsored section</label>
          <select id="inquiry-sponsored-section" value={spot} onChange={(event) => setSpot(event.target.value)} required>
            <option value="">Select a section</option>
            {numbered.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <label htmlFor="inquiry-promote">What do they want to promote?</label>
      <input id="inquiry-promote" required value={values.promote} onChange={(event) => set("promote", event.target.value)} />
      <label htmlFor="inquiry-ad-copy">Ad copy</label>
      <textarea
        id="inquiry-ad-copy"
        maxLength={copyMax}
        value={values.adCopy}
        onChange={(event) => set("adCopy", event.target.value)}
      />
      <p className="form-note">
        Ad copy is optional on older inquiries. When it is filled in, the limit is {copyMax} characters for this
        placement.
      </p>
      <label htmlFor="inquiry-budget">Budget</label>
      <input id="inquiry-budget" value={values.budget} onChange={(event) => set("budget", event.target.value)} />
      <label htmlFor="inquiry-status">Status</label>
      <select
        id="inquiry-status"
        value={values.status}
        onChange={(event) => set("status", event.target.value as InquiryStatus)}
      >
        {inquiryStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <label htmlFor="inquiry-message">Message</label>
      <textarea
        id="inquiry-message"
        required
        value={values.message}
        onChange={(event) => set("message", event.target.value)}
      />
      <TurnstileField ref={turnstile} action="admin-inquiry" onToken={setToken} />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button className="button" type="submit" disabled={working || !token}>
          {working ? "Saving" : "Save inquiry"}
        </button>
      </div>
    </form>
  );
}
