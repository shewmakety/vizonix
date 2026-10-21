"use client";

import { ALWAYS_ON_NOTE, OPTIONAL_AVIATION_SECTIONS, SUGGESTION_MAX } from "@/lib/reader-topics";

function topicDomId(prefix: string, topic: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${slug || "section"}`;
}

export function SectionPicker({
  included,
  onIncluded,
  suggestion,
  onSuggestion,
  idPrefix,
}: {
  included: readonly string[];
  onIncluded: (included: string[]) => void;
  suggestion: string;
  onSuggestion: (value: string) => void;
  idPrefix: string;
}) {
  const chosen = new Set(included);
  return (
    <>
      <fieldset className="section-picks">
        <legend>Sections</legend>
        <p className="form-note">All start on. Uncheck any you want left out of the email.</p>
        <p className="form-note">{ALWAYS_ON_NOTE}</p>
        {OPTIONAL_AVIATION_SECTIONS.map((topic) => {
          const id = topicDomId(idPrefix, topic);
          return (
            <label className="check" key={topic} htmlFor={id}>
              <input
                id={id}
                type="checkbox"
                checked={chosen.has(topic)}
                onChange={(event) => {
                  if (event.target.checked) onIncluded([...included, topic]);
                  else onIncluded(included.filter((item) => item !== topic));
                }}
              />
              <span>{topic}</span>
            </label>
          );
        })}
      </fieldset>
      <label htmlFor={`${idPrefix}-suggestion`}>Suggest a topic</label>
      <textarea
        id={`${idPrefix}-suggestion`}
        className="short"
        name="suggestion"
        maxLength={SUGGESTION_MAX}
        value={suggestion}
        onChange={(event) => onSuggestion(event.target.value)}
      />
    </>
  );
}
