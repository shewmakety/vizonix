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
  segmentCurrentIssueHref,
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
    expect(segmentHomeHref("/missing/issues/2026-10-14", "aviation")).toBe("/aviation");
    expect(segmentDirectoryHref("/aviation/issues/2026-10-16", "legal")).toBe("/aviation/toolbox");
    expect(segmentDirectoryHref("/legal/tools/clauseharbor")).toBe("/aviation/toolbox");

    expect(segmentHomeHref("/about")).toBe("/aviation");
    expect(segmentHomeHref("/", "aviation")).toBe("/aviation");
    expect(segmentHomeHref("/about", "legal")).toBe("/aviation");
    expect(segmentHomeHref("/sponsor", "bogus")).toBe("/aviation");
    expect(segmentDirectoryHref("/about")).toBe("/aviation/toolbox");
    expect(segmentDirectoryHref("/privacy", "warehousing")).toBe("/aviation/toolbox");
    expect(segmentCurrentIssueHref("/aviation/issues/2026-10-16")).toBe("/aviation/latest");
    expect(segmentCurrentIssueHref("/about")).toBe("/aviation/latest");
    expect(segmentCurrentIssueHref("/sponsor", "legal")).toBe("/aviation/latest");
    expect(segmentSubscribeHref("/aviation")).toBe("/aviation/subscribe");
    expect(segmentSubscribeHref("/about", "legal")).toBe("/aviation/subscribe");
    expect(segmentSubscribeHref("/subscribe")).toBe("/aviation/subscribe");
    expect(segmentUnsubscribeHref("/terms", "aviation")).toBe("/aviation/unsubscribe");
    expect(segmentUnsubscribeHref("/legal")).toBe("/aviation/unsubscribe");
  });

  it("rewrites section confirm, subscribe, and unsubscribe onto the shared pages", () => {
    expect(segmentAliasRewrite("/aviation/confirm")).toBe("/confirm");
    expect(segmentAliasRewrite("/legal/unsubscribe")).toBeNull();
    expect(segmentAliasRewrite("/marketing-sales/subscribe")).toBeNull();
    expect(segmentAliasRewrite("/aviation/tools")).toBeNull();
    expect(segmentAliasRewrite("/confirm")).toBeNull();
    expect(segmentAliasRewrite("/aviation/confirm/extra")).toBeNull();
  });

  it("builds section email links and ignores a spoofed header when it is unknown", () => {
    expect(confirmPath("aviation", "a/b")).toBe("/aviation/confirm?token=a%2Fb");
    expect(unsubscribePath("field-service", "tok")).toBe("/field-service/unsubscribe?token=tok");
    expect(unsubscribePath("aviation")).toBe("/aviation/unsubscribe");
    expect(resolveRememberedSlug("legal", "aviation")).toBe("aviation");
    expect(resolveRememberedSlug("not-a-section", "aviation")).toBe("aviation");
    expect(resolveRememberedSlug(null, "nope")).toBeUndefined();
  });

  it("labels only Aviation as the launch section", () => {
    expect(segmentCardLabel(getSegment("aviation")!)).toBe("Launch");
    expect(getSegment("legal")).toBeUndefined();
    expect(getSegment("warehousing")).toBeUndefined();
    expect(getSegment("marketing-sales")).toBeUndefined();
  });
});
