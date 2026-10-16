"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { withDirectoryQuery, type DirectoryChip } from "@/lib/directory";
import type { DirectoryView } from "@/lib/directory-view";
import type { ToolEntry } from "@/lib/schema";

const storageKey = "vizonix-tool-directory-view";

export function ToolDirectory({
  segmentSlug,
  tools,
  sponsoredSlugs,
  initialView,
  chips,
  activeKey,
  query,
  searchAction,
  hiddenTopic,
}: {
  segmentSlug: string;
  tools: ToolEntry[];
  sponsoredSlugs: string[];
  initialView: DirectoryView;
  chips: DirectoryChip[];
  activeKey: string;
  query: string;
  searchAction: string;
  hiddenTopic?: string;
}) {
  const [view, setView] = useState<DirectoryView>(initialView);
  const sponsored = new Set(sponsoredSlugs);

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
      <div className="topic-chips" role="group" aria-label="Topics">
        {chips.map((chip) => {
          const pressed = chip.key === activeKey;
          const href = withDirectoryQuery(chip.href, { q: query, view });
          return (
            <Link
              key={chip.key}
              href={href}
              aria-pressed={pressed}
              aria-label={`${chip.label}, ${chip.count} ${chip.count === 1 ? "tool" : "tools"}`}
            >
              {chip.label} <span className="topic-count">({chip.count})</span>
            </Link>
          );
        })}
      </div>
      <form className="directory-search" method="get" action={searchAction}>
        <label htmlFor="tool-search">Search tools</label>
        <input
          id="tool-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Name, company, or description"
        />
        {hiddenTopic ? <input type="hidden" name="topic" value={hiddenTopic} /> : null}
        {view === "list" ? <input type="hidden" name="view" value="list" /> : null}
        <button type="submit">Search</button>
      </form>
      <div className="view-toggle" role="group" aria-label="Directory view">
        <button type="button" aria-pressed={view === "cards"} onClick={() => choose("cards")}>
          Cards
        </button>
        <button type="button" aria-pressed={view === "list"} onClick={() => choose("list")}>
          List
        </button>
      </div>
      {tools.length === 0 ? (
        <p className="notice">No tools match that filter.</p>
      ) : view === "list" ? (
        <ul className="tool-directory-list">
          {tools.map((tool) => {
            const paid = sponsored.has(tool.slug);
            return (
              <li key={tool.slug} className={paid ? "sponsored" : undefined}>
                <span className="tool-directory-name">
                  {paid ? <span className="pill sponsored">Sponsored</span> : null}
                  {tool.sample ? <span className="pill sample">Sample listing</span> : null}
                  <Link href={`/${segmentSlug}/tools/${tool.slug}`}>{tool.name}</Link>
                </span>
                <span className="meta">{tool.company ?? ""}</span>
                <div className={paid ? "blurb sponsored-blurb" : "blurb"}>
                  {paid && tool.featured?.logo ? (
                    <img className="tool-logo" src={tool.featured.logo} alt="" />
                  ) : null}
                  <p>{paid && tool.featured?.blurb ? tool.featured.blurb : tool.summary}</p>
                  {paid && tool.featured?.cta && tool.featured.ctaUrl ? (
                    <p>
                      <a href={tool.featured.ctaUrl} rel="sponsored noopener noreferrer">
                        {tool.featured.cta}
                      </a>
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="tool-grid">
          {tools.map((tool) => {
            const paid = sponsored.has(tool.slug);
            return (
              <article className={paid ? "card sponsored" : "card"} key={tool.slug}>
                {paid ? <p className="pill sponsored">Sponsored</p> : null}
                {tool.sample ? <p className="pill sample">Sample listing</p> : null}
                {paid && tool.featured?.logo ? (
                  <img className="tool-logo" src={tool.featured.logo} alt="" />
                ) : null}
                <p className="meta">{tool.category}</p>
                <h2>
                  <Link href={`/${segmentSlug}/tools/${tool.slug}`}>{tool.name}</Link>
                </h2>
                <p>{paid && tool.featured?.blurb ? tool.featured.blurb : tool.summary}</p>
                {tool.company ? <p className="meta">{tool.company}</p> : null}
                {tool.bestFor ? <p className="meta">{tool.bestFor}</p> : null}
                {paid && tool.featured?.cta && tool.featured.ctaUrl ? (
                  <p>
                    <a href={tool.featured.ctaUrl} rel="sponsored noopener noreferrer">
                      {tool.featured.cta}
                    </a>
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
