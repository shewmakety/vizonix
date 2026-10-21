"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SectionChoices } from "@/components/SectionChoices";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { useRememberedSlug } from "@/components/useRememberedSlug";
import { excludedFromFormData } from "@/lib/reader-sections";
import { activeSegments, featuredSegment, getSegment } from "@/lib/segments";
import { customizeLinkLabel, customizePitch, customizeWebPath } from "@/lib/site";

type Status = { kind: "idle" | "working" | "ok" | "error"; message: string };

export function SignupForm({
  defaultSegment = featuredSegment().slug,
  showSegment = true,
  heading = "Get the briefing",
  submitLabel = "Send confirmation",
  pendingLabel = "Sending",
  source,
}: {
  defaultSegment?: string;
  showSegment?: boolean;
  heading?: string;
  submitLabel?: string;
  pendingLabel?: string;
  source?: string;
}) {
  const remembered = useRememberedSlug();
  const [segment, setSegment] = useState(defaultSegment);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstile = useRef<TurnstileHandle>(null);

  useEffect(() => {
    const known = remembered ? getSegment(remembered) : undefined;
    if (!showSegment || touched || !known || known.status !== "active") return;
    setSegment(known.slug);
  }, [remembered, showSegment, touched]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const chosenSegment = String(form.get("segment") ?? segment);
    const excludedSections = excludedFromFormData(form, chosenSegment);
    const suggestion = String(form.get("suggestion") ?? "").trim();
    if (!turnstileToken) {
      setStatus({ kind: "error", message: "Verification is still loading. Try again." });
      return;
    }
    setStatus({ kind: "working", message: "" });
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        firstName: form.get("firstName"),
        segment: chosenSegment,
        company_website: form.get("company_website"),
        turnstileToken,
        ...(excludedSections !== undefined ? { excludedSections } : {}),
        ...(suggestion ? { suggestion } : {}),
        ...(source ? { source } : {}),
      }),
    });
    const body = (await response.json()) as { error?: string; message?: string; status?: string };
    turnstile.current?.reset();
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
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>{heading}</h2>
      <p className="form-note">{customizePitch}</p>
      <p className="form-note">
        <Link href={customizeWebPath}>{customizeLinkLabel}</Link>
      </p>
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
      <SectionChoices key={segment} segment={segment} />
      <div className="hp" aria-hidden="true">
        <label htmlFor="company_website">Company website</label>
        <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <TurnstileField ref={turnstile} action="signup" onToken={setTurnstileToken} />
      <div className="actions">
        <button className="button" type="submit" disabled={status.kind === "working"}>
          {status.kind === "working" ? pendingLabel : submitLabel}
        </button>
      </div>
      {status.kind === "error" ? <p className="form-error">{status.message}</p> : null}
      {status.kind === "ok" ? <p className="form-ok">{status.message}</p> : null}
    </form>
  );
}
