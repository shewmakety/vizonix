import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("reader personalization migration", () => {
  it("declares the tables and keeps them off the public API", () => {
    const dir = path.join(process.cwd(), "supabase", "migrations");
    const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sql") && file.includes("reader_personalization"));
    expect(files).toEqual(["20261021143000_reader_personalization.sql"]);
    const sql = fs.readFileSync(path.join(dir, files[0]), "utf8");
    expect(sql).toContain("create table public.subscriber_prefs");
    expect(sql).toContain("email text primary key");
    expect(sql).toContain("excluded_sections text[]");
    expect(sql).toContain("create table public.topic_suggestions");
    expect(sql).toContain("status text not null default 'new'");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("force row level security");
    expect(sql).toContain("revoke all on table public.subscriber_prefs from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table public.subscriber_prefs to service_role");
    expect(sql.toLowerCase()).not.toContain("hello@");
    expect(sql).not.toMatch(/[\u2013\u2014]/);
  });
});
