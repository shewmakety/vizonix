"use client";

import { useRef, useState } from "react";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import type { TurnstileAction } from "@/lib/turnstile-public";

export function TokenForm({
  token,
  endpoint,
  label,
  action,
}: {
  token: string;
  endpoint: string;
  label: string;
  action: Extract<TurnstileAction, "confirm" | "unsubscribe">;
}) {
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"idle" | "working" | "ok" | "error">("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstile = useRef<TurnstileHandle>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstileToken) {
      setKind("error");
      setMessage("Verification is still loading. Try again.");
      return;
    }
    setKind("working");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, turnstileToken }),
    });
    turnstile.current?.reset();
    const body = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setKind("error");
      setMessage(body.error || "That link could not be used.");
      return;
    }
    setKind("ok");
    setMessage(body.message || "Done.");
  }

  return (
    <form onSubmit={onSubmit}>
      <TurnstileField ref={turnstile} action={action} onToken={setTurnstileToken} />
      <button className="button" type="submit" disabled={kind === "working" || kind === "ok"}>
        {kind === "working" ? "Working" : label}
      </button>
      {kind === "error" ? <p className="form-error">{message}</p> : null}
      {kind === "ok" ? <p className="form-ok">{message}</p> : null}
    </form>
  );
}
