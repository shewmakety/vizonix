"use client";

import { useState } from "react";
import { inquiryBudgets } from "@/lib/sponsor-inquiry";

type Status = { kind: "idle" | "working" | "error" | "sent"; message: string };

export function SponsorInquiryForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
        company_website: form.get("company_website"),
      }),
    });
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
        Use this for a question, a bundle, or a run that checkout does not cover. Paid weeks and the
        monthly Featured listing use the checkout form.
      </p>
      <label htmlFor="inquiry-name">Name</label>
      <input id="inquiry-name" name="name" required autoComplete="name" />
      <label htmlFor="inquiry-company">Company</label>
      <input id="inquiry-company" name="company" required autoComplete="organization" />
      <label htmlFor="inquiry-email">Email</label>
      <input id="inquiry-email" name="email" type="email" required autoComplete="email" />
      <label htmlFor="inquiry-promote">What do you want to promote?</label>
      <input id="inquiry-promote" name="promote" required />
      <label htmlFor="inquiry-budget">Budget, optional</label>
      <select id="inquiry-budget" name="budget" defaultValue="">
        <option value="">Select a range</option>
        {inquiryBudgets.map((budget) => (
          <option key={budget} value={budget}>
            {budget}
          </option>
        ))}
      </select>
      <label htmlFor="inquiry-message">Message</label>
      <textarea id="inquiry-message" name="message" required />
      <div className="hp" aria-hidden="true">
        <label htmlFor="inquiry-company-website">Company website</label>
        <input id="inquiry-company-website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="actions">
        <button className="button" type="submit" disabled={status.kind === "working"}>
          {status.kind === "working" ? "Sending" : "Send the inquiry"}
        </button>
      </div>
      {status.kind === "error" ? <p className="form-error">{status.message}</p> : null}
    </form>
  );
}
