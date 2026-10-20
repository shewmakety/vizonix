import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { INDEXNOW_PUBLIC_KEY, indexNowKeyForPublish } from "@/lib/indexnow";

describe("IndexNow public key", () => {
  it("serves the committed 32-character key at /{key}.txt", () => {
    expect(INDEXNOW_PUBLIC_KEY).toMatch(/^[a-f0-9]{32}$/);
    const filename = `${INDEXNOW_PUBLIC_KEY}.txt`;
    const body = fs.readFileSync(path.join(process.cwd(), "public", filename), "utf8");
    expect(body).toBe(`${INDEXNOW_PUBLIC_KEY}\n`);
  });

  it("uses INDEXNOW_KEY when set and the committed key otherwise", () => {
    expect(indexNowKeyForPublish(undefined)).toBe(INDEXNOW_PUBLIC_KEY);
    expect(indexNowKeyForPublish("")).toBe(INDEXNOW_PUBLIC_KEY);
    expect(indexNowKeyForPublish("not-a-key")).toBe(INDEXNOW_PUBLIC_KEY);
    expect(indexNowKeyForPublish("0123456789abcdef")).toBe("0123456789abcdef");
  });
});
