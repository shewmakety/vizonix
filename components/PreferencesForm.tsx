"use client";

import { useRef, useState } from "react";
import { SectionChoices } from "@/components/SectionChoices";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { excludedFromFormData } from "@/lib/reader-sections";

type Status = { kind: "idle" | "working" | "ok" | "error"; message: string };

export function PreferencesForm({
  token,
  segment,
  excluded,
}: {
  token: string;
  segment: string;
  excluded: string[];
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [saveToken, setSaveToken] = useState("");
  const [suggestToken, setSuggestToken] = useState("");
  const saveTurnstile = useRef<TurnstileHandle>(null);
  const suggestTurnstile = useRef<TurnstileHandle>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const honeypot = String(form.get("company_website") ?? "");
    if (honeypot.trim()) {
      setStatus({ kind: "ok", message: "Topics saved." });
      return;
    }
    const excludedSections = excludedFromFormData(form, segment) ?? [];
    const suggestion = String(form.get("suggestion") ?? "").trim();
    if (!saveToken || (suggestion && !suggestToken)) {
      setStatus({ kind: "error", message: "Verification is still loading. Try again." });
      return;
    }
    setStatus({ kind: "working", message: "" });

    const saved = await fetch("/api/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        excludedSections,
        turnstileToken: saveToken,
        company_website: honeypot,
      }),
    });
    saveTurnstile.current?.reset();
    const savedBody = (await saved.json()) as { error?: string; message?: string };
    if (!saved.ok) {
      setStatus({ kind: "error", message: savedBody.error || "Could not save those topics." });
      return;
    }

    if (!suggestion) {
      setStatus({ kind: "ok", message: savedBody.message || "Topics saved." });
      return;
    }

    const suggested = await fetch("/api/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        text: suggestion,
        source: "preferences",
        turnstileToken: suggestToken,
        company_website: honeypot,
      }),
    });
    suggestTurnstile.current?.reset();
    const suggestedBody = (await suggested.json()) as { error?: string };
    if (!suggested.ok) {
      setStatus({
        kind: "error",
        message: `Topics saved. The suggestion was not sent. ${suggestedBody.error || "Try it again."}`,
      });
      return;
    }
    setStatus({ kind: "ok", message: "Topics saved, and the suggestion was sent." });
    const field = event.currentTarget.elements.namedItem("suggestion");
    if (field instanceof HTMLTextAreaElement) field.value = "";
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>Your topics</h2>
      <SectionChoices segment={segment} excluded={excluded} />
      <div className="hp" aria-hidden="true">
        <label htmlFor="preferences-company-website">Company website</label>
        <input id="preferences-company-website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <TurnstileField ref={saveTurnstile} action="preferences" onToken={setSaveToken} />
      <TurnstileField ref={suggestTurnstile} action="suggest" onToken={setSuggestToken} />
      <div className="actions">
        <button className="button" type="submit" disabled={status.kind === "working"}>
          {status.kind === "working" ? "Saving" : "Update My Preferences"}
        </button>
      </div>
      {status.kind === "error" ? <p className="form-error">{status.message}</p> : null}
      {status.kind === "ok" ? <p className="form-ok">{status.message}</p> : null}
    </form>
  );
}
