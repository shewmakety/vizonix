"use client";

import { useState } from "react";

export function TokenForm({
  token,
  endpoint,
  label,
}: {
  token: string;
  endpoint: string;
  label: string;
}) {
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"idle" | "working" | "ok" | "error">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKind("working");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
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
      <button className="button" type="submit" disabled={kind === "working" || kind === "ok"}>
        {kind === "working" ? "Working" : label}
      </button>
      {kind === "error" ? <p className="form-error">{message}</p> : null}
      {kind === "ok" ? <p className="form-ok">{message}</p> : null}
    </form>
  );
}
