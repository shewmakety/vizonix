import { describe, expect, it } from "vitest";
import { segmentCardLabel } from "@/lib/segments";
import { getSegment } from "@/lib/segments";
import {
  confirmPath,
  resolveRememberedSlug,
  rootRedirectForCookie,
  segmentAliasRewrite,
  segmentDirectoryHref,
  segmentHomeHref,
  segmentSubscribeHref,
  segmentUnsubscribeHref,
  unsubscribePath,
} from "@/lib/segment-memory";

describe("section memory", () => {
  it("redirects the marketing root only for a launched section", () => {
    expect(rootRedirectForCookie(undefined)).toBeNull();
    expect(rootRedirectForCookie(null)).toBeNull();
    expect(rootRedirectForCookie("")).toBeNull();
    expect(rootRedirectForCookie("nope")).toBeNull();
    expect(rootRedirectForCookie("aviation")).toBe("/aviation");
    expect(rootRedirectForCookie("legal")).toBeNull();
    expect(rootRedirectForCookie("warehousing")).toBeNull();
    expect(rootRedirectForCookie("marketing-sales")).toBeNull();
  });

  it("keeps logo, directory, and account links inside the section", () => {
    expect(segmentHomeHref("/aviation/tools")).toBe("/aviation");
    expect(segmentHomeHref("/aviation/tools/topic/general-ai")).toBe("/aviation");
    expect(segmentHomeHref("/legal/issues/2026-10-14", "aviation")).toBe("/legal");
    expect(segmentDirectoryHref("/aviation/issues/2026-10-16", "legal")).toBe("/aviation/tools");
    expect(segmentDirectoryHref("/legal/tools/clauseharbor")).toBe("/legal/tools");

    expect(segmentHomeHref("/about")).toBe("/aviation");
    expect(segmentHomeHref("/", "aviation")).toBe("/aviation");
    expect(segmentHomeHref("/about", "legal")).toBe("/legal");
    expect(segmentHomeHref("/sponsor", "bogus")).toBe("/aviation");
    expect(segmentDirectoryHref("/about")).toBe("/aviation/tools");
    expect(segmentDirectoryHref("/privacy", "warehousing")).toBe("/warehousing/tools");
    expect(segmentSubscribeHref("/aviation")).toBe("/aviation/subscribe");
    expect(segmentSubscribeHref("/about", "legal")).toBe("/legal/subscribe");
    expect(segmentSubscribeHref("/subscribe")).toBe("/aviation/subscribe");
    expect(segmentUnsubscribeHref("/terms", "aviation")).toBe("/aviation/unsubscribe");
    expect(segmentUnsubscribeHref("/legal")).toBe("/legal/unsubscribe");
  });

  it("rewrites section confirm, subscribe, and unsubscribe onto the shared pages", () => {
    expect(segmentAliasRewrite("/aviation/confirm")).toBe("/confirm");
    expect(segmentAliasRewrite("/legal/unsubscribe")).toBe("/unsubscribe");
    expect(segmentAliasRewrite("/marketing-sales/subscribe")).toBe("/subscribe");
    expect(segmentAliasRewrite("/aviation/tools")).toBeNull();
    expect(segmentAliasRewrite("/confirm")).toBeNull();
    expect(segmentAliasRewrite("/aviation/confirm/extra")).toBeNull();
  });

  it("builds section email links and ignores a spoofed header when it is unknown", () => {
    expect(confirmPath("aviation", "a/b")).toBe("/aviation/confirm?token=a%2Fb");
    expect(unsubscribePath("legal", "tok")).toBe("/legal/unsubscribe?token=tok");
    expect(unsubscribePath("aviation")).toBe("/aviation/unsubscribe");
    expect(resolveRememberedSlug("legal", "aviation")).toBe("legal");
    expect(resolveRememberedSlug("not-a-section", "aviation")).toBe("aviation");
    expect(resolveRememberedSlug(null, "nope")).toBeUndefined();
  });

  it("labels only Aviation as the launch section", () => {
    expect(segmentCardLabel(getSegment("aviation")!)).toBe("Launch");
    expect(segmentCardLabel(getSegment("legal")!)).toBe("In preparation");
    expect(segmentCardLabel(getSegment("warehousing")!)).toBe("In preparation");
    expect(segmentCardLabel(getSegment("marketing-sales")!)).toBe("In preparation");
  });
});
