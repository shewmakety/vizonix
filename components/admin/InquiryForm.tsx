"use client";

import { useRef, useState } from "react";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { submitAdmin } from "@/components/admin/submit-admin";
import { inquiryStatuses, type InquiryStatus } from "@/lib/sponsor-placements";

export type InquiryFormValues = {
  name: string;
  company: string;
  email: string;
  promote: string;
  budget: string;
  message: string;
  status: InquiryStatus;
};

export function InquiryForm({
  initial,
  path,
  method,
  returnTo,
}: {
  initial: InquiryFormValues;
  path: string;
  method: "POST" | "PATCH";
  returnTo: string;
}) {
  const [values, setValues] = useState(initial);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);

  function set<K extends keyof InquiryFormValues>(field: K, value: InquiryFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Complete the verification, then save.");
      return;
    }
    setWorking(true);
    setError("");
    const result = await submitAdmin(path, method, { ...values, turnstileToken: token });
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
      <label htmlFor="inquiry-promote">What do they want to promote?</label>
      <input id="inquiry-promote" required value={values.promote} onChange={(event) => set("promote", event.target.value)} />
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
