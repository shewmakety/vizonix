import fs from "fs";
import path from "path";
import { z } from "zod";

/** Filter labels. They match the issue sections, plus Robotics. */
export const toolboxCategories = [
  { key: "recruiting", label: "Recruiting" },
  { key: "sales-and-marketing", label: "Sales and marketing" },
  { key: "predictive-maintenance", label: "Predictive maintenance" },
  { key: "maintenance-activity-optimization", label: "Maintenance activity optimization" },
  { key: "troubleshooting-support", label: "Troubleshooting support" },
  { key: "warehousing", label: "Warehousing" },
  { key: "aog-support", label: "AOG support" },
  { key: "general-ai-productivity-tools", label: "General AI Productivity Tools" },
  { key: "robotics", label: "Robotics" },
] as const;

export type ToolboxCategoryKey = (typeof toolboxCategories)[number]["key"];

const categoryLabel = z.enum(toolboxCategories.map((category) => category.label) as [string, ...string[]]);

const toolboxEntrySchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    vendor: z.string().trim().min(1).max(180),
    use: z.string().trim().min(1).max(180),
    categories: z.array(categoryLabel).min(1).max(4),
    tags: z.array(z.enum(["AI", "Robotics"])).min(1).max(2),
    url: z.string().url(),
  })
  .strict();

export type ToolboxEntry = z.infer<typeof toolboxEntrySchema>;

let cached: ToolboxEntry[] | undefined;

export function toolboxPathFor(segmentSlug: string): string | null {
  return segmentSlug === "aviation" ? "/aviation/toolbox" : null;
}

export function listToolbox(): ToolboxEntry[] {
  if (cached) return cached;
  const file = path.join(process.cwd(), "content", "aviation", "toolbox.json");
  const parsed = z.array(toolboxEntrySchema).min(60).parse(JSON.parse(fs.readFileSync(file, "utf8")));
  cached = parsed;
  return parsed;
}

export function toolboxCategory(key: string | undefined) {
  const cleaned = key?.trim();
  if (!cleaned) return undefined;
  return toolboxCategories.find((category) => category.key === cleaned);
}

export function filterToolbox(
  entries: ToolboxEntry[],
  input: { category?: string; q?: string },
): ToolboxEntry[] {
  const category = toolboxCategory(input.category);
  const query = input.q?.trim().toLowerCase() ?? "";
  return entries.filter((entry) => {
    if (category && !entry.categories.includes(category.label)) return false;
    if (!query) return true;
    const haystack = [entry.name, entry.vendor, entry.use, ...entry.categories, ...entry.tags]
      .join("\n")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function toolboxHref(input: { category?: string; q?: string } = {}): string {
  const params = new URLSearchParams();
  const category = input.category?.trim();
  const q = input.q?.trim();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const search = params.toString();
  return search ? `/aviation/toolbox?${search}` : "/aviation/toolbox";
}
