"use client";

import { optionalSectionsFor } from "@/lib/reader-sections";

export function SectionChoices({
  segment,
  excluded = [],
  showSuggestion = true,
}: {
  segment: string;
  excluded?: readonly string[];
  showSuggestion?: boolean;
}) {
  const sections = optionalSectionsFor(segment);
  if (sections.length === 0) return null;
  const skipped = new Set(excluded);

  return (
    <fieldset className="topic-picker">
      <legend>Topics in the briefing</legend>
      <p className="form-note">
        Top story, The Ramp, and sponsor slots stay in every issue. Uncheck a topic to leave it out of the email.
      </p>
      <input type="hidden" name="topic_picker" value="1" />
      {sections.map((section) => {
        const id = `topic-${segment}-${section.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
        return (
          <label className="check" htmlFor={id} key={section}>
            <input id={id} type="checkbox" name="sections" value={section} defaultChecked={!skipped.has(section)} />
            <span>{section}</span>
          </label>
        );
      })}
      {showSuggestion ? (
        <>
          <label htmlFor={`suggestion-${segment}`}>Suggest a topic</label>
          <textarea
            id={`suggestion-${segment}`}
            name="suggestion"
            maxLength={500}
            placeholder="Optional. A topic you want in a future issue."
          />
        </>
      ) : null}
    </fieldset>
  );
}
