"use client";

import { useRef, useState } from "react";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { submitAdmin } from "@/components/admin/submit-admin";

export type SponsorFormValues = {
  company: string;
  contact: string;
  email: string;
  url: string;
  logo: string;
};

export function SponsorForm({
  initial,
  path,
  method,
  returnTo,
}: {
  initial: SponsorFormValues;
  path: string;
  method: "POST" | "PATCH";
  returnTo: string;
}) {
  const [values, setValues] = useState(initial);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);

  function set(field: keyof SponsorFormValues, value: string) {
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
      <label htmlFor="sponsor-company">Company</label>
      <input id="sponsor-company" required value={values.company} onChange={(event) => set("company", event.target.value)} />
      <label htmlFor="sponsor-contact">Contact</label>
      <input id="sponsor-contact" required value={values.contact} onChange={(event) => set("contact", event.target.value)} />
      <label htmlFor="sponsor-email">Email</label>
      <input
        id="sponsor-email"
        type="email"
        required
        value={values.email}
        onChange={(event) => set("email", event.target.value)}
      />
      <label htmlFor="sponsor-url">URL</label>
      <input id="sponsor-url" value={values.url} onChange={(event) => set("url", event.target.value)} />
      <label htmlFor="sponsor-logo">Logo URL</label>
      <input id="sponsor-logo" value={values.logo} onChange={(event) => set("logo", event.target.value)} />
      <TurnstileField ref={turnstile} action="admin-sponsor" onToken={setToken} />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button className="button" type="submit" disabled={working || !token}>
          {working ? "Saving" : "Save sponsor"}
        </button>
      </div>
    </form>
  );
}
