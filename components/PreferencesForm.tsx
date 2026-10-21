"use client";

import { useState } from "react";
import { SectionPicker } from "@/components/SectionPicker";
import { includedFromExcluded, OPTIONAL_AVIATION_SECTIONS } from "@/lib/reader-topics";

type Status = { kind: "idle" | "working" | "ok" | "error"; message: string };

export function PreferencesForm({
  token,
  initialExcluded,
}: {
  token: string;
  initialExcluded: string[];
}) {
  const [included, setIncluded] = useState(() => includedFromExcluded(initialExcluded));
  const [suggestion, setSuggestion] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "working", message: "" });
    const excludedSections = OPTIONAL_AVIATION_SECTIONS.filter((topic) => !included.includes(topic));
    const preferences = await fetch("/api/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, excludedSections }),
    });
    const preferencesBody = (await preferences.json()) as { error?: string; message?: string };
    if (!preferences.ok) {
      setStatus({ kind: "error", message: preferencesBody.error || "Could not save those topics." });
      return;
    }
    const text = suggestion.trim();
    if (text) {
      const suggested = await fetch("/api/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, text, source: "preferences" }),
      });
      const suggestedBody = (await suggested.json()) as { error?: string; message?: string };
      if (!suggested.ok) {
        setStatus({
          kind: "error",
          message: suggestedBody.error || "Topics were saved, but the suggestion was not.",
        });
        return;
      }
      setSuggestion("");
    }
    setStatus({ kind: "ok", message: preferencesBody.message || "Saved. The next briefing uses these sections." });
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>Your sections</h2>
      <SectionPicker
        idPrefix="pref"
        included={included}
        onIncluded={setIncluded}
        suggestion={suggestion}
        onSuggestion={setSuggestion}
      />
      <div className="actions">
        <button className="button" type="submit" disabled={status.kind === "working"}>
          {status.kind === "working" ? "Saving" : "Save topics"}
        </button>
      </div>
      {status.kind === "error" ? <p className="form-error">{status.message}</p> : null}
      {status.kind === "ok" ? <p className="form-ok">{status.message}</p> : null}
    </form>
  );
}
