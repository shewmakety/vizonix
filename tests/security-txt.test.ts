import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const securityTxt = [
  "Contact: mailto:admin@vizonix.com",
  "Expires: 2027-10-22T07:04:36.301Z",
  "Preferred-Languages: en",
  "",
].join("\n");

describe("security.txt", () => {
  it("publishes the contact file at public/.well-known/security.txt", () => {
    const body = fs.readFileSync(path.join(process.cwd(), "public", ".well-known", "security.txt"), "utf8");
    expect(body).toBe(securityTxt);
  });
});
