export type DirectoryView = "cards" | "list";

export function directoryViewFromQuery(value: string | string[] | undefined): DirectoryView {
  const view = Array.isArray(value) ? value[0] : value;
  return view === "list" ? "list" : "cards";
}
