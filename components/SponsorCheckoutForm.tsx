"use client";

import { useMemo, useState } from "react";
import { formatUsd, getPlacement, launchPlacements } from "@/lib/rate-card";
import { segments } from "@/lib/segments";

type Status = { kind: "idle" | "working" | "error"; message: string };

export function SponsorCheckoutForm() {
  const active = segments.filter((segment) => segment.status === "active");
  const [placement, setPlacement] = useState("primary");
  const [founding, setFounding] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const selected = getPlacement(placement);
  const price = selected ? (founding ? selected.founding : selected.price) : null;
  const unit = selected?.unit === "month" ? "month" : "week";
  const quantityLabel = unit === "month" ? "Number of months" : "Number of weeks";

  const helper = useMemo(() => {
    if (!selected) return "";
    if (selected.id === "banner" || selected.id === "featured") {
      return "Banner and featured listings can start on any day.";
    }
    return "A newsletter week starts on Monday and covers Monday through Friday.";
  }, [selected]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
      }),
    });
    const body = (await response.json()) as { error?: string; url?: string };
    if (!response.ok || !body.url) {
      setStatus({ kind: "error", message: body.error || "Checkout could not start." });
      return;
    }
    window.location.href = body.url;
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>Reserve a week</h2>
      <p className="form-note">
        Checkout charges the launch price
        {price !== null ? ` (${formatUsd(price)} per ${unit} before any code you enter on Stripe)` : ""}.
        The week is blocked after Stripe confirms payment.
      </p>
      <label htmlFor="sponsor-segment">Section</label>
      <select id="sponsor-segment" name="segment" defaultValue={active[0]?.slug ?? "legal"}>
        {active.map((segment) => (
          <option key={segment.slug} value={segment.slug}>
            {segment.name}
          </option>
        ))}
      </select>
      <label htmlFor="placement">Placement</label>
      <select
        id="placement"
        name="placement"
        value={placement}
        onChange={(event) => setPlacement(event.target.value)}
      >
        {launchPlacements.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({formatUsd(item.price)}
            {item.unit === "month" ? " / month" : " / week"})
          </option>
        ))}
      </select>
      <p className="form-note">{helper}</p>
      <label htmlFor="startDate">Preferred start date</label>
      <input id="startDate" name="startDate" type="date" required />
      <label htmlFor="quantity">{quantityLabel}</label>
      <input id="quantity" name="quantity" type="number" min={1} max={12} defaultValue={1} />
      <label htmlFor="company">Company</label>
      <input id="company" name="company" autoComplete="organization" />
      <label htmlFor="sponsor-email">Email for the receipt</label>
      <input id="sponsor-email" name="email" type="email" required autoComplete="email" />
      <label htmlFor="adCopyUrl">Link to ad copy, optional</label>
      <input id="adCopyUrl" name="adCopyUrl" type="url" placeholder="https://" />
      <label className="check">
        <input
          name="founding"
          type="checkbox"
          checked={founding}
          onChange={(event) => setFounding(event.target.checked)}
        />
        <span>
          Request the founding rate
          {selected ? ` (${formatUsd(selected.founding)} per ${unit})` : ""}. On the Stripe page, enter
          code FOUNDING if the price has not already been reduced. The first 10 sponsors, locked for 3
          months.
        </span>
      </label>
      <label className="check">
        <input name="exclusivity" type="checkbox" />
        <span>
          Request exclusivity for that week (50% above the listed price). Checkout charges the listed
          price. We confirm the surcharge by email before the week is marked exclusive.
        </span>
      </label>
      <div className="hp" aria-hidden="true">
        <label htmlFor="sponsor-company-website">Company website</label>
        <input id="sponsor-company-website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="actions">
        <button className="button" type="submit" disabled={status.kind === "working"}>
          {status.kind === "working" ? "Opening Stripe" : "Continue to Stripe"}
        </button>
      </div>
      {status.kind === "error" ? <p className="form-error">{status.message}</p> : null}
    </form>
  );
}
