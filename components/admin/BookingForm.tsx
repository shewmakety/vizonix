"use client";

import { useRef, useState } from "react";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { submitAdmin } from "@/components/admin/submit-admin";
import { getPlacement, wordCount } from "@/lib/rate-card";
import { formatForPlacement, isSectionSpot, sectionLineMax } from "@/lib/sponsor-slots";
import { bookingStatuses, type BookingStatus } from "@/lib/sponsor-placements";
import type { PlacementChoice } from "@/lib/sponsor-labels-client";

export type BookingFormValues = {
  sponsorId: string;
  segment: string;
  placement: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  price: string;
  stripeSessionId: string;
  headline: string;
  body: string;
  cta: string;
  url: string;
  logo: string;
  founding: boolean;
  exclusivityRequested: boolean;
};

export function BookingForm({
  initial,
  path,
  method,
  returnTo,
  sponsors,
  segments,
  placementsBySegment,
  sectionsBySegment,
}: {
  initial: BookingFormValues;
  path: string;
  method: "POST" | "PATCH";
  returnTo: string;
  sponsors: Array<{ id: string; company: string }>;
  segments: Array<{ slug: string; name: string }>;
  placementsBySegment: Record<string, PlacementChoice[]>;
  sectionsBySegment: Record<string, PlacementChoice[]>;
}) {
  const [values, setValues] = useState(initial);
  const [product, setProduct] = useState(isSectionSpot(initial.placement) ? "section" : initial.placement || "primary");
  const [spot, setSpot] = useState(isSectionSpot(initial.placement) ? initial.placement : "");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);
  const placements = placementsBySegment[values.segment] ?? [];
  const numbered = sectionsBySegment[values.segment] ?? [];
  const ceiling = getPlacement(formatForPlacement(product) ?? "")?.maxWords ?? null;
  const words = values.body.trim() ? wordCount(values.body) : 0;

  function set<K extends keyof BookingFormValues>(field: K, value: BookingFormValues[K]) {
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
      <label htmlFor="booking-sponsor">Sponsor</label>
      <select id="booking-sponsor" value={values.sponsorId} onChange={(event) => set("sponsorId", event.target.value)}>
        <option value="">No sponsor record</option>
        {sponsors.map((sponsor) => (
          <option key={sponsor.id} value={sponsor.id}>
            {sponsor.company}
          </option>
        ))}
      </select>
      <label htmlFor="booking-segment">Section</label>
      <select
        id="booking-segment"
        value={values.segment}
        onChange={(event) => {
          const next = event.target.value;
          set("segment", next);
          const options = sectionsBySegment[next] ?? [];
          if (spot && !options.some((item) => item.id === spot)) setSpot("");
        }}
      >
        {segments.map((segment) => (
          <option key={segment.slug} value={segment.slug}>
            {segment.name}
          </option>
        ))}
        {segments.some((segment) => segment.slug === values.segment) ? null : (
          <option value={values.segment}>{values.segment}</option>
        )}
      </select>
      <label htmlFor="booking-placement">Placement</label>
      <select id="booking-placement" value={product} onChange={(event) => setProduct(event.target.value)}>
        {placements.map((placement) => (
          <option key={placement.id} value={placement.id}>
            {placement.label}
          </option>
        ))}
        {placements.some((placement) => placement.id === product) ? null : (
          <option value={product}>{product}</option>
        )}
      </select>
      {product === "section" ? (
        <>
          <label htmlFor="booking-section">Sponsored section</label>
          <select id="booking-section" value={spot} onChange={(event) => setSpot(event.target.value)} required>
            <option value="">Select a section</option>
            {numbered.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <div className="admin-split">
        <div>
          <label htmlFor="booking-start">Start date</label>
          <input
            id="booking-start"
            type="date"
            required
            value={values.startDate}
            onChange={(event) => set("startDate", event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="booking-end">End date</label>
          <input
            id="booking-end"
            type="date"
            required
            value={values.endDate}
            onChange={(event) => set("endDate", event.target.value)}
          />
        </div>
      </div>
      <div className="admin-split">
        <div>
          <label htmlFor="booking-status">Status</label>
          <select
            id="booking-status"
            value={values.status}
            onChange={(event) => set("status", event.target.value as BookingStatus)}
          >
            {bookingStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="booking-price">Price in USD</label>
          <input
            id="booking-price"
            inputMode="decimal"
            value={values.price}
            onChange={(event) => set("price", event.target.value)}
          />
        </div>
      </div>
      <label htmlFor="booking-session">Stripe session id</label>
      <input
        id="booking-session"
        value={values.stripeSessionId}
        onChange={(event) => set("stripeSessionId", event.target.value)}
      />
      <label htmlFor="booking-headline">Creative headline</label>
      <input id="booking-headline" value={values.headline} onChange={(event) => set("headline", event.target.value)} />
      <label htmlFor="booking-body">Creative body</label>
      <textarea id="booking-body" value={values.body} onChange={(event) => set("body", event.target.value)} />
      {ceiling ? (
        <p className={words > ceiling ? "form-error" : "form-note"}>
          {words} words. The newsletter ceiling for this placement is {ceiling}.
        </p>
      ) : (
        <p className="form-note">
          Section sponsor uses the headline as the company name and a line of up to {sectionLineMax} characters.
          Newsletter slots use the body as the ad copy. A logo can be added here later.
        </p>
      )}
      <label htmlFor="booking-cta">Call to action</label>
      <input id="booking-cta" value={values.cta} onChange={(event) => set("cta", event.target.value)} />
      <label htmlFor="booking-url">Creative URL</label>
      <input id="booking-url" value={values.url} onChange={(event) => set("url", event.target.value)} />
      <label htmlFor="booking-logo">Logo URL</label>
      <input id="booking-logo" value={values.logo} onChange={(event) => set("logo", event.target.value)} />
      <label className="check">
        <input type="checkbox" checked={values.founding} onChange={(event) => set("founding", event.target.checked)} />
        <span>Founding rate</span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={values.exclusivityRequested}
          onChange={(event) => set("exclusivityRequested", event.target.checked)}
        />
        <span>Exclusivity requested</span>
      </label>
      <TurnstileField ref={turnstile} action="admin-booking" onToken={setToken} />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button className="button" type="submit" disabled={working || !token}>
          {working ? "Saving" : "Save booking"}
        </button>
      </div>
    </form>
  );
}
