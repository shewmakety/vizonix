import { afterEach, describe, expect, it } from "vitest";
import { sectionIconBaseUrl, sectionIconFiles, sectionIconUrl, toolboxIllustrationUrl } from "@/lib/icons";

const recruitingStem = sectionIconFiles.Recruiting;

afterEach(() => {
  if (recruitingStem) sectionIconFiles.Recruiting = recruitingStem;
  delete process.env.SECTION_ICON_BASE_URL;
});

describe("section icons", () => {
  it("uses the svg on the web and the png in email from one base URL", () => {
    expect(sectionIconUrl("Recruiting")).toBe(`${sectionIconBaseUrl}/recruiting.svg`);
    expect(sectionIconUrl("Recruiting", "email")).toBe(`${sectionIconBaseUrl}/recruiting@2x.png`);
    expect(sectionIconUrl("AOG support: parts, rotables and technicians", "email")).toBe(
      `${sectionIconBaseUrl}/aog@2x.png`,
    );
    expect(sectionIconUrl("The Ramp")).toBe(`${sectionIconBaseUrl}/the-ramp.svg`);
    expect(sectionIconUrl("Quick links", "email")).toBe(`${sectionIconBaseUrl}/quick-links@2x.png`);
    expect(toolboxIllustrationUrl()).toBe(`${sectionIconBaseUrl}/toolbox.svg`);
    expect(toolboxIllustrationUrl("email")).toBe(`${sectionIconBaseUrl}/toolbox@2x.png`);
  });

  it("returns nothing for an unmapped heading and keeps an absolute file URL", () => {
    expect(sectionIconUrl(undefined)).toBeUndefined();
    expect(sectionIconUrl("Tool Highlights")).toBeUndefined();
    sectionIconFiles.Recruiting = "https://cdn.example.com/recruiting.png";
    expect(sectionIconUrl("Recruiting", "email")).toBe("https://cdn.example.com/recruiting.png");
  });
});
