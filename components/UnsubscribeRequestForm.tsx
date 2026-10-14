"use client";

import { useState } from "react";
import { featuredSegment, segments } from "@/lib/segments";

export function UnsubscribeRequestForm() {
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"idle" | "working" | "ok" | "error">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setKind("working");
    const response = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        segment: form.get("segment"),
      }),
    });
    const body = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setKind("error");
      setMessage(body.error || "Could not send the link.");
      return;
    }
    setKind("ok");
    setMessage(body.message || "If that address is on the list, we sent an unsubscribe link.");
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>Email me an unsubscribe link</h2>
      <label htmlFor="unsub-email">Email</label>
      <input id="unsub-email" name="email" type="email" required autoComplete="email" />
      <label htmlFor="unsub-segment">Section</label>
      <select id="unsub-segment" name="segment" defaultValue={featuredSegment().slug}>
        {segments.map((segment) => (
          <option key={segment.slug} value={segment.slug}>
            {segment.name}
          </option>
        ))}
      </select>
      <div className="actions">
        <button className="button" type="submit" disabled={kind === "working"}>
          {kind === "working" ? "Sending" : "Send the link"}
        </button>
      </div>
      {kind === "error" ? <p className="form-error">{message}</p> : null}
      {kind === "ok" ? <p className="form-ok">{message}</p> : null}
    </form>
  );
}
