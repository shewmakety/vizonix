"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DirectoryView } from "@/lib/directory-view";
import type { ToolEntry } from "@/lib/schema";

const storageKey = "vizonix-tool-directory-view";

export function ToolDirectory({
  segmentSlug,
  tools,
  initialView,
}: {
  segmentSlug: string;
  tools: ToolEntry[];
  initialView: DirectoryView;
}) {
  const [view, setView] = useState<DirectoryView>(initialView);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("view");
    if (fromQuery === "list" || fromQuery === "cards") {
      try {
        window.localStorage.setItem(storageKey, fromQuery);
      } catch {
        // Private browsing can block storage. The query string still holds the choice.
      }
      return;
    }
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(storageKey);
    } catch {
      return;
    }
    if (saved !== "list" && saved !== "cards") return;
    setView(saved);
    if (saved === "list") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "list");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  function choose(next: DirectoryView) {
    setView(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // Private browsing can block storage. The query string still holds the choice.
    }
    const url = new URL(window.location.href);
    if (next === "cards") url.searchParams.delete("view");
    else url.searchParams.set("view", "list");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <>
      <div className="view-toggle" role="group" aria-label="Directory view">
        <button type="button" aria-pressed={view === "cards"} onClick={() => choose("cards")}>
          Cards
        </button>
        <button type="button" aria-pressed={view === "list"} onClick={() => choose("list")}>
          List
        </button>
      </div>
      {view === "list" ? (
        <ul className="tool-directory-list">
          {tools.map((tool) => (
            <li key={tool.slug}>
              <span className="tool-directory-name">
                {tool.sample ? <span className="pill sample">Sample listing</span> : null}
                <Link href={`/${segmentSlug}/tools/${tool.slug}`}>{tool.name}</Link>
              </span>
              <span className="meta">{tool.company ?? ""}</span>
              <p className="blurb">{tool.summary}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="tool-grid">
          {tools.map((tool) => (
            <article className="card" key={tool.slug}>
              {tool.sample ? <p className="pill sample">Sample listing</p> : null}
              <p className="meta">{tool.category}</p>
              <h2>
                <Link href={`/${segmentSlug}/tools/${tool.slug}`}>{tool.name}</Link>
              </h2>
              <p>{tool.summary}</p>
              {tool.company ? <p className="meta">{tool.company}</p> : null}
              {tool.bestFor ? <p className="meta">{tool.bestFor}</p> : null}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
