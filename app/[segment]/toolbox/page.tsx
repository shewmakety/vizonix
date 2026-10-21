import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crumbs } from "@/components/Crumbs";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { capDescription, pageMeta } from "@/lib/meta";
import { getSegment } from "@/lib/segments";
import { absoluteUrl } from "@/lib/site";
import {
  filterToolbox,
  listToolbox,
  toolboxCategories,
  toolboxCategory,
  toolboxHref,
  type ToolboxEntry,
} from "@/lib/toolbox";

type Props = {
  params: Promise<{ segment: string }>;
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
};

function first(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

export function generateStaticParams() {
  return [{ segment: "aviation" }];
}

function listingTitle(categoryLabel: string | undefined): string {
  return categoryLabel ? `${categoryLabel} - Aviation Toolbox` : "Aviation Toolbox";
}

function listingDescription(categoryLabel: string | undefined): string {
  const base = categoryLabel
    ? `${categoryLabel} tools in the Aviation Toolbox for MROs, operators, parts suppliers and FBOs.`
    : "AI and robotics tools for aviation MROs, operators, parts suppliers and FBOs, each linked to the vendor's official site.";
  return capDescription(base);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { segment: slug } = await params;
  if (slug !== "aviation" || !getSegment(slug)) return { robots: { index: false, follow: false } };
  const query = await searchParams;
  const categoryKey = first(query.category);
  const q = first(query.q);
  const category = toolboxCategory(categoryKey);
  if (categoryKey && !category) return { robots: { index: false, follow: false } };
  const title = listingTitle(category?.label);
  return pageMeta({
    title,
    description: listingDescription(category?.label),
    canonical: toolboxHref({ category: category?.key }),
    robots: q ? { index: false, follow: true } : undefined,
  });
}

function itemListJsonLd(title: string, description: string, path: string, entries: ToolboxEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: absoluteUrl(path),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.name,
        description: entry.use,
        url: entry.url,
      })),
    },
  };
}

export default async function ToolboxPage({ params, searchParams }: Props) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment || segment.status !== "active" || slug !== "aviation") notFound();
  const query = await searchParams;
  const categoryKey = first(query.category);
  const q = first(query.q);
  const category = toolboxCategory(categoryKey);
  if (categoryKey && !category) notFound();
  const catalog = listToolbox();
  const entries = filterToolbox(catalog, { category: category?.key, q });
  const title = listingTitle(category?.label);
  const description = listingDescription(category?.label);
  const path = toolboxHref({ category: category?.key });
  const counts = new Map(
    toolboxCategories.map((item) => [
      item.key,
      catalog.filter((entry) => entry.categories.includes(item.label)).length,
    ]),
  );

  return (
    <section className="toolbox">
      <div className="wrap">
        <Crumbs
          items={[
            { name: "Vizonix", href: "/" },
            { name: segment.name, href: `/${segment.slug}` },
            { name: "Toolbox" },
          ]}
        />
        <p className="kicker">Aviation</p>
        <h1>{title}</h1>
        <p className="lede">
          {catalog.length} AI and robotics tools for MROs, operators, parts suppliers and FBOs. Each
          link goes to the vendor&apos;s official site.
        </p>
        <nav className="toolbox-chips" aria-label="Categories">
          <a href={toolboxHref({ q })} aria-pressed={!category}>
            All <span>({catalog.length})</span>
          </a>
          {toolboxCategories.map((item) => (
            <a
              key={item.key}
              href={toolboxHref({ category: item.key, q })}
              aria-pressed={item.key === category?.key}
            >
              {item.label} <span>({counts.get(item.key) ?? 0})</span>
            </a>
          ))}
        </nav>
        <form className="toolbox-search" method="get" action="/aviation/toolbox">
          <label htmlFor="toolbox-search">Search the Toolbox</label>
          <input
            id="toolbox-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, vendor, or what it does"
          />
          {category ? <input type="hidden" name="category" value={category.key} /> : null}
          <button type="submit">Search</button>
        </form>
        {entries.length === 0 ? (
          <p className="notice">No tools match that filter.</p>
        ) : (
          <div className="toolbox-grid">
            {entries.map((entry) => (
              <article className="toolbox-card" key={`${entry.name}-${entry.vendor}`}>
                <p className="toolbox-tags">
                  {entry.tags.map((tag) => (
                    <span className={tag === "AI" ? "toolbox-tag ai" : "toolbox-tag robotics"} key={tag}>
                      {tag}
                    </span>
                  ))}
                </p>
                <h2>
                  <a href={entry.url} rel="noopener noreferrer">
                    {entry.name}
                  </a>
                </h2>
                <p className="toolbox-vendor">{entry.vendor}</p>
                <p>{entry.use}</p>
                <p className="toolbox-cats">{entry.categories.join(" · ")}</p>
              </article>
            ))}
          </div>
        )}
      </div>
      <JsonLd
        data={[
          itemListJsonLd(title, description, path, entries),
          breadcrumbJsonLd([
            { name: "Vizonix", path: "/" },
            { name: segment.name, path: `/${segment.slug}` },
            { name: "Toolbox", path: "/aviation/toolbox" },
          ]),
        ]}
      />
    </section>
  );
}
