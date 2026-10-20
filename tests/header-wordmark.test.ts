import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { welcomePlainMessage } from "@/lib/email";
import { sectionWordmark } from "@/lib/site";

const pathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

import { SiteHeader } from "@/components/SiteHeader";

describe("header wordmark", () => {
  beforeEach(() => {
    pathname.value = "/";
  });

  it("keeps Vizonix on the homepage and general pages", () => {
    for (const path of ["/", "/about", "/sponsor", "/privacy", "/media-kit"]) {
      pathname.value = path;
      const html = renderToStaticMarkup(createElement(SiteHeader));
      expect(html).toContain('class="brand-mark">V</span>');
      expect(html).toContain('class="brand-name">Vizonix</span>');
      expect(html).not.toContain("Vizonix - Aviation");
    }
  });

  it("reads Vizonix - Aviation on aviation pages", () => {
    for (const path of ["/aviation", "/aviation/issues", "/aviation/issues/2026-10-20", "/aviation/tools"]) {
      pathname.value = path;
      const html = renderToStaticMarkup(createElement(SiteHeader));
      expect(html).toContain('class="brand-mark">V</span>');
      expect(html).toContain(`class="brand-name">${sectionWordmark("Aviation")}</span>`);
    }
  });

  it("uses the same wordmark on the email masthead", () => {
    const message = welcomePlainMessage("Aviation", "https://vizonix.com/aviation", "https://vizonix.com/unsub");
    expect(message.html).toContain(`uppercase;">${sectionWordmark("Aviation")}</p>`);
  });
});
