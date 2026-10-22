"use client";

import { useRef, useState } from "react";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { submitAdmin } from "@/components/admin/submit-admin";

export function LogoutButton() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Complete the verification, then sign out.");
      return;
    }
    setWorking(true);
    const result = await submitAdmin("/api/admin/logout", "POST", { turnstileToken: token });
    turnstile.current?.reset();
    setToken("");
    setWorking(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.assign("/admin/sponsors");
  }

  return (
    <form className="admin-logout" onSubmit={onSubmit}>
      <TurnstileField ref={turnstile} action="admin-logout" onToken={setToken} />
      <button className="button secondary small" type="submit" disabled={working || !token}>
        {working ? "Signing out" : "Sign out"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
