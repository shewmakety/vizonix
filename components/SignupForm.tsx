"use client";

import { useEffect, useState } from "react";
import { SectionPicker } from "@/components/SectionPicker";
import { useRememberedSlug } from "@/components/useRememberedSlug";
import { cleanSource, includedFromExcluded } from "@/lib/reader-topics";
import { activeSegments, featuredSegment, getSegment } from "@/lib/segments";

type Status = { kind: "idle" | "working" | "ok" | "error"; message: string };

export function SignupForm({
  defaultSegment = featuredSegment().slug,
  showSegment = true,
  heading = "Get the briefing",
  source,
}: {
  defaultSegment?: string;
  showSegment?: boolean;
  heading?: string;
  source?: string;
}) {
  const remembered = useRememberedSlug();
  const [segment, setSegment] = useState(defaultSegment);
  const [touched, setTouched] = useState(false);
  const [included, setIncluded] = useState<string[]>(() => includedFromExcluded([]));
  const [suggestion, setSuggestion] = useState("");
  const [campaign, setCampaign] = useState(source ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  useEffect(() => {
    const known = remembered ? getSegment(remembered) : undefined;
    if (!showSegment || touched || !known || known.status !== "active") return;
    setSegment(known.slug);
  }, [remembered, showSegment, touched]);

  useEffect(() => {
    if (source) return;
    const fromQuery = cleanSource(new URLSearchParams(window.location.search).get("src"));
    if (fromQuery) setCampaign(fromQuery);
  }, [source]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus({ kind: "working", message: "" });
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        firstName: form.get("firstName"),
        segment: form.get("segment"),
        company_website: form.get("company_website"),
        includedSections: segment === "aviation" ? included : undefined,
        suggestion,
        source: campaign || undefined,
      }),
    });
    const body = (await response.json()) as { error?: string; message?: string; status?: string };
    if (!response.ok) {
      setStatus({ kind: "error", message: body.error || "Could not start the signup." });
      return;
    }
    const message =
      body.status === "already_subscribed"
        ? "That address is already confirmed for this section."
        : "Check your inbox for a confirmation email. You are not on the list until you click it.";
    setStatus({ kind: "ok", message: body.message || message });
    event.currentTarget.reset();
    setIncluded(includedFromExcluded([]));
    setSuggestion("");
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>{heading}</h2>
      <p className="form-note">
        Free, one section at a time. We send a confirmation email first. You can leave from any issue.
      </p>
      <label htmlFor="firstName">Name, optional</label>
      <input id="firstName" name="firstName" autoComplete="given-name" maxLength={60} />
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" />
      {showSegment ? (
        <>
          <label htmlFor="segment">Section</label>
          <select
            id="segment"
            name="segment"
            value={segment}
            onChange={(event) => {
              setTouched(true);
              setSegment(event.target.value);
            }}
          >
            {activeSegments().map((segment) => (
              <option key={segment.slug} value={segment.slug}>
                {segment.name}
              </option>
            ))}
          </select>
        </>
      ) : (
        <input type="hidden" name="segment" value={defaultSegment} />
      )}
      {segment === "aviation" ? (
        <SectionPicker
          idPrefix="signup"
          included={included}
          onIncluded={setIncluded}
          suggestion={suggestion}
          onSuggestion={setSuggestion}
        />
      ) : null}
      <div className="hp" aria-hidden="true">
        <label htmlFor="company_website">Company website</label>
        <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="actions">
        <button className="button" type="submit" disabled={status.kind === "working"}>
          {status.kind === "working" ? "Sending" : "Send confirmation"}
        </button>
      </div>
      {status.kind === "error" ? <p className="form-error">{status.message}</p> : null}
      {status.kind === "ok" ? <p className="form-ok">{status.message}</p> : null}
    </form>
  );
}
