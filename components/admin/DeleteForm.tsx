"use client";

import { useRef, useState } from "react";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { submitAdmin } from "@/components/admin/submit-admin";
import type { TurnstileAction } from "@/lib/turnstile-public";

export function DeleteForm({
  action,
  path,
  noun,
  returnTo,
  note = "This removes the record.",
}: {
  action: TurnstileAction;
  path: string;
  noun: string;
  returnTo: string;
  note?: string;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Complete the verification, then delete.");
      return;
    }
    setWorking(true);
    setError("");
    const result = await submitAdmin(path, "DELETE", { turnstileToken: token });
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
      <h2>Delete this {noun}</h2>
      <p className="form-note">{note}</p>
      <TurnstileField ref={turnstile} action={action} onToken={setToken} />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button className="button secondary" type="submit" disabled={working || !token}>
          {working ? "Deleting" : `Delete ${noun}`}
        </button>
      </div>
    </form>
  );
}
