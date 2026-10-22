"use client";

import { useRef, useState } from "react";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { submitAdmin } from "@/components/admin/submit-admin";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Complete the verification, then try again.");
      return;
    }
    setWorking(true);
    setError("");
    const result = await submitAdmin("/api/admin/login", "POST", { password, turnstileToken: token });
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
    <form className="form-card admin-card" onSubmit={onSubmit}>
      <h1>Sponsor admin</h1>
      <p className="form-note">Sign in to manage sponsors, bookings, and inquiries.</p>
      <label htmlFor="admin-password">Password</label>
      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <TurnstileField ref={turnstile} action="admin-login" onToken={setToken} />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button className="button" type="submit" disabled={working || !token}>
          {working ? "Signing in" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
