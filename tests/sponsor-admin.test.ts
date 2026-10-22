import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";
import { resetLegacyImportForTests, recordPaidReservation, type Reservation } from "@/lib/bookings";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { sectionSponsorOpenLabel } from "@/lib/issue-present";
import { availabilityAnchor, markAvailability, mondayOnOrBefore } from "@/lib/sponsor-calendar";
import { applyBookingsToIssue, type SponsorBookingCreative } from "@/lib/sponsor-creative";
import { placementChoices } from "@/lib/sponsor-labels";
import { bookingPlacements, isLiveBookingStatus } from "@/lib/sponsor-placements";
import { blocksCheckout, importReservationRows, type Booking, type Sponsor } from "@/lib/sponsor-store";
import { segments } from "@/lib/segments";
import { sitemapPaths } from "@/lib/site-index";
import { createAdminSession, verifyAdminSession } from "@/lib/admin-session";
import { TURNSTILE_TEST_SECRET } from "@/lib/turnstile";
import { TURNSTILE_TEST_TOKEN } from "@/lib/turnstile-public";
import { resetInquiryLimits } from "@/lib/sponsor-inquiry";

const send = vi.hoisted(() => vi.fn());

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = { send };
    },
  };
});

const envKeys = [
  "ADMIN_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TURNSTILE_SECRET_KEY",
  "VERCEL_ENV",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "NOTIFY_EMAIL",
] as const;

const saved: Record<string, string | undefined> = {};

const sponsorId = "00000000-0000-4000-8000-0000000000aa";
const bookingId = "00000000-0000-4000-8000-0000000000bb";

function creative(overrides: Partial<SponsorBookingCreative> = {}): SponsorBookingCreative {
  return {
    segment: "aviation",
    placement: "primary",
    startDate: "2026-10-21",
    endDate: "2026-10-21",
    status: "paid",
    headline: "Northwind",
    body: "A paid line for the top of the issue.",
    cta: "Book a demo",
    url: "https://example.com/northwind",
    logo: "https://example.com/northwind.png",
    createdAt: "2026-10-21T12:00:00.000Z",
    ...overrides,
  };
}

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "cs_new",
    stripeSessionId: "cs_new",
    segment: "legal",
    placement: "primary",
    startDate: "2026-10-26",
    endDate: "2026-10-30",
    founding: true,
    exclusivityRequested: false,
    status: "paid",
    createdAt: "2026-10-22T00:00:00.000Z",
    ...overrides,
  };
}

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: bookingId,
    sponsor_id: sponsorId,
    segment: "legal",
    placement: "primary",
    start_date: "2026-10-26",
    end_date: "2026-10-30",
    status: "paid",
    price: 150,
    stripe_session_id: "cs_new",
    headline: "Northwind",
    body: null,
    cta: null,
    url: "https://example.com/ad",
    logo: null,
    founding: true,
    exclusivity_requested: false,
    legacy_id: "cs_new",
    created_at: "2026-10-22T00:00:00.000Z",
    updated_at: "2026-10-22T00:00:00.000Z",
    ...overrides,
  };
}

function request(path: string, body: unknown, cookie?: string): Request {
  const headers = new Headers({
    "content-type": "application/json",
    origin: "https://vizonix.com",
    "x-forwarded-for": "203.0.113.8",
  });
  if (cookie) headers.set("cookie", `vizonix_admin=${cookie}`);
  return new Request(`https://vizonix.com${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  for (const key of envKeys) saved[key] = process.env[key];
  process.env.ADMIN_PASSWORD = "correct horse";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  process.env.TURNSTILE_SECRET_KEY = TURNSTILE_TEST_SECRET;
  process.env.VERCEL_ENV = "preview";
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
  process.env.NOTIFY_EMAIL = "desk@example.com";
  resetLegacyImportForTests();
  resetInquiryLimits();
  send.mockReset();
  send.mockResolvedValue({ data: { id: "email_1" }, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("sponsor migration", () => {
  it("locks the tables to the service role and lists every placement", () => {
    const dir = path.join(process.cwd(), "supabase", "migrations");
    const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sql") && file.includes("sponsor_admin"));
    expect(files).toEqual(["20261022090000_sponsor_admin.sql"]);
    const sql = fs.readFileSync(path.join(dir, files[0]), "utf8");
    expect(sql).toContain("create table public.sponsors");
    expect(sql).toContain("create table public.bookings");
    expect(sql).toContain("create table public.inquiries");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("force row level security");
    expect(sql).toContain("revoke all on table public.sponsors from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table public.bookings to service_role");
    expect(sql).toContain("bookings_sponsor_id_idx");
    expect(sql).not.toMatch(/[\u2013\u2014]/);
    for (const placement of bookingPlacements) expect(sql).toContain(`'${placement}'`);
    const legacy = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "bookings.json"), "utf8")) as unknown[];
    expect(legacy).toEqual([]);
  });

  it("keeps the admin out of the sitemap and the crawler index", () => {
    const paths = sitemapPaths();
    expect(paths).not.toContain("/admin");
    expect(paths).not.toContain("/admin/sponsors");
    const robots = fs.readFileSync(path.join(process.cwd(), "app", "robots.ts"), "utf8");
    expect(robots).toContain('"/admin"');
    const response = middleware(new NextRequest("https://vizonix.com/admin/sponsors"));
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    const layout = fs.readFileSync(path.join(process.cwd(), "app", "admin", "layout.tsx"), "utf8");
    expect(layout).toContain("index: false");
    expect(layout).toContain("follow: false");
  });

  it("does not hard-code one section into the admin", () => {
    const roots = ["app/admin", "app/api/admin", "components/admin", "lib/sponsor-placements.ts", "lib/sponsor-labels.ts"];
    const found: string[] = [];
    for (const root of roots) {
      const full = path.join(process.cwd(), root);
      if (fs.statSync(full).isDirectory()) {
        for (const entry of fs.readdirSync(full, { recursive: true })) {
          const file = path.join(full, String(entry));
          if (file.endsWith(".ts") || file.endsWith(".tsx")) found.push(file);
        }
      } else found.push(full);
    }
    const offenders = found.filter((file) => /\baviation\b/i.test(fs.readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
    expect(placementChoices("not-a-section").map((item) => item.id)).toEqual(
      bookingPlacements.filter((id) => id !== "classified"),
    );
    expect(placementChoices("not-a-section").find((item) => item.id === "01")?.label).toBe("Section 01");
    const live = segments.find((segment) => segment.status === "active");
    expect(live).toBeTruthy();
    expect(placementChoices(live!.slug).some((item) => item.label.startsWith("Section 01 - "))).toBe(true);
  });
});

describe("live sponsor creatives", () => {
  it("overlays a paid booking and leaves the house ad when nothing is sold", () => {
    const issue = getIssue("aviation", "2026-10-21");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const sections = issue.sections?.length ?? 0;
    const untouched = applyBookingsToIssue(issue, [
      creative({ segment: "legal" }),
      creative({ startDate: "2026-10-22", endDate: "2026-10-23" }),
      creative({ status: "cancelled" }),
      creative({ status: "pending" }),
      creative({ body: "" }),
      creative({ placement: "01", body: "", headline: "" }),
    ]);
    expect(untouched.sponsors.primary).toEqual(issue.sponsors.primary);
    expect(untouched.sections?.[0]?.sponsor).toBeUndefined();

    const sold = applyBookingsToIssue(issue, [
      creative(),
      creative({
        placement: "01",
        headline: "Hangar Lane",
        body: "Parts search for an AOG desk.",
        url: "https://example.com/hangar",
        logo: "https://example.com/hangar.png",
      }),
    ]);
    expect(sold.sponsors.primary?.name).toBe("Northwind");
    expect(sold.sponsors.primary?.house).toBe(false);
    expect(sold.sponsors.primary?.logo).toBe("https://example.com/northwind.png");
    expect(sold.sections?.[0]?.sponsor?.name).toBe("Hangar Lane");
    expect(sold.sections?.[1]?.sponsor).toBeUndefined();

    const html = renderToStaticMarkup(createElement(IssueBody, { issue: sold }));
    const email = renderIssueEmail(sold, { mode: "broadcast" });
    const text = renderIssueText(sold, { mode: "broadcast" });
    expect(html).toContain("Northwind");
    expect(html).toContain("Hangar Lane");
    expect(html).not.toContain("Primary sponsor - open");
    expect(html.match(new RegExp(sectionSponsorOpenLabel, "g"))).toHaveLength(sections - 1);
    expect(email).toContain("https://example.com/northwind.png");
    expect(email).toContain("Hangar Lane");
    expect(text).toContain("Northwind");
    expect(text).toContain("Hangar Lane");

    const page = fs.readFileSync(path.join(process.cwd(), "app", "[segment]", "issues", "[date]", "page.tsx"), "utf8");
    const publish = fs.readFileSync(path.join(process.cwd(), "lib", "publish.ts"), "utf8");
    const subscribe = fs.readFileSync(path.join(process.cwd(), "lib", "subscribe.ts"), "utf8");
    expect(page).toContain("issueForDelivery");
    expect(publish).toContain("issueForDelivery");
    expect(subscribe).toContain("issueForDelivery");
  });
});

describe("availability", () => {
  it("marks sold, held, and open dates for the selected section", () => {
    expect(mondayOnOrBefore("2026-10-21")).toBe("2026-10-19");
    expect(availabilityAnchor("2026-10-21", new Date("2026-11-01T00:00:00.000Z"))).toBe("2026-10-19");
    const sponsors: Sponsor[] = [
      {
        id: sponsorId,
        company: "Northwind",
        contact: "Ada",
        email: "ada@example.com",
        url: "",
        logo: "",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const bookings = [
      {
        id: bookingId,
        sponsorId,
        segment: "legal",
        placement: "primary",
        startDate: "2026-10-19",
        endDate: "2026-10-20",
        status: "paid",
        price: 300,
        stripeSessionId: "cs_paid",
        headline: "",
        body: "",
        cta: "",
        url: "",
        logo: "",
        founding: false,
        exclusivityRequested: false,
        legacyId: "",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "00000000-0000-4000-8000-0000000000cc",
        sponsorId: null,
        segment: "legal",
        placement: "primary",
        startDate: "2026-10-21",
        endDate: "2026-10-21",
        status: "pending",
        price: null,
        stripeSessionId: "",
        headline: "Held desk",
        body: "",
        cta: "",
        url: "",
        logo: "",
        founding: false,
        exclusivityRequested: false,
        legacyId: "",
        createdAt: "",
        updatedAt: "",
      },
    ] as Booking[];
    const days = markAvailability({ start: "2026-10-19", weeks: 1, bookings, sponsors });
    expect(days.map((day) => day.kind)).toEqual(["sold", "sold", "held", "open", "open", "open", "open"]);
    expect(days[0]?.labels).toEqual(["Northwind"]);
    expect(days[2]?.labels).toEqual(["Held desk"]);
    expect(isLiveBookingStatus("paid")).toBe(true);
    expect(blocksCheckout({ placement: "01", status: "paid" })).toBe(false);
    expect(blocksCheckout({ placement: "primary", status: "cancelled" })).toBe(false);
  });
});

describe("sponsor admin auth and storage", () => {
  it("signs a session for the right password and rejects the admin API without it", async () => {
    const issued = createAdminSession(Date.parse("2026-10-22T00:00:00.000Z"));
    expect(verifyAdminSession(issued, Date.parse("2026-10-22T01:00:00.000Z"))).toBe(true);
    expect(verifyAdminSession(issued, Date.parse("2026-10-22T13:00:00.000Z"))).toBe(false);
    expect(verifyAdminSession(`${issued}x`)).toBe(false);

    const { POST } = await import("@/app/api/admin/login/route");
    const missing = await POST(request("/api/admin/login", { password: "correct horse" }));
    expect(missing.status).toBe(403);
    const badToken = await POST(
      request("/api/admin/login", { password: "correct horse", turnstileToken: "nope" }),
    );
    expect(badToken.status).toBe(403);
    const badPassword = await POST(
      request("/api/admin/login", { password: "nope", turnstileToken: TURNSTILE_TEST_TOKEN }),
    );
    expect(badPassword.status).toBe(401);
    const signedIn = await POST(
      request("/api/admin/login", { password: "correct horse", turnstileToken: TURNSTILE_TEST_TOKEN }),
    );
    expect(signedIn.status).toBe(200);
    const cookie = signedIn.cookies.get("vizonix_admin")?.value;
    expect(cookie).toBeTruthy();
    expect(signedIn.headers.get("set-cookie")).toContain("HttpOnly");
    expect(verifyAdminSession(cookie)).toBe(true);

    const sponsors = await import("@/app/api/admin/sponsors/route");
    const locked = await sponsors.POST(
      request("/api/admin/sponsors", { company: "Northwind", turnstileToken: TURNSTILE_TEST_TOKEN }),
    );
    expect(locked.status).toBe(401);
  });

  it("writes a paid Stripe booking and a public inquiry to Supabase", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const target = String(url);
      const method = init?.method ?? "GET";
      if (target.includes("/bookings") && method === "GET") return Response.json([]);
      if (target.includes("/sponsors")) {
        return Response.json([
          {
            id: sponsorId,
            company: "Northwind",
            contact: "Ada",
            email: "ada@example.com",
            url: null,
            logo: null,
            created_at: "2026-10-22T00:00:00.000Z",
            updated_at: "2026-10-22T00:00:00.000Z",
          },
        ]);
      }
      if (target.includes("/inquiries")) {
        return Response.json([
          {
            id: "00000000-0000-4000-8000-0000000000dd",
            name: "Ada",
            company: "Hangar Co",
            email: "ada@hangar.example",
            promote: "A parts search tool",
            budget: "$150 to $300",
            message: "We would like the founding listing.",
            status: "new",
            created_at: "2026-10-22T00:00:00.000Z",
            updated_at: "2026-10-22T00:00:00.000Z",
          },
        ]);
      }
      return Response.json([bookingRow()]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const saved = await recordPaidReservation(reservation(), {
      price: 150,
      company: "Northwind",
      contact: "Ada",
      email: "ada@example.com",
      creativeUrl: "https://example.com/ad",
    });
    expect(saved).toMatchObject({ duplicate: false, stored: "supabase" });
    const bookingCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/rest/v1/bookings") && (call[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(bookingCall).toBeTruthy();
    const storedBooking = JSON.parse(String((bookingCall?.[1] as RequestInit).body)) as {
      price: number;
      stripe_session_id: string;
      segment: string;
      headline: string;
    };
    expect(storedBooking).toMatchObject({
      price: 150,
      stripe_session_id: "cs_new",
      segment: "legal",
      headline: "Northwind",
    });
    expect(String(bookingCall?.[0])).not.toContain("github.com");

    const { POST } = await import("@/app/api/sponsor-inquiry/route");
    const response = await POST(
      request("/api/sponsor-inquiry", {
        name: "Ada",
        company: "Hangar Co",
        email: "Ada@Hangar.Example",
        promote: "A parts search tool",
        budget: "$150 to $300",
        message: "We would like the founding listing.",
        turnstileToken: TURNSTILE_TEST_TOKEN,
      }),
    );
    expect(response.status).toBe(200);
    const inquiryCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/rest/v1/inquiries"));
    const storedInquiry = JSON.parse(String((inquiryCall?.[1] as RequestInit).body)) as { email: string; status: string };
    expect(storedInquiry).toMatchObject({ email: "ada@hangar.example", status: "new" });
    expect(send).toHaveBeenCalled();
  });

  it("copies a legacy reservation into a booking row", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return Response.json([]);
      return new Response(null, { status: 201 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const inserted = await importReservationRows([reservation({ id: "cs_old", stripeSessionId: "cs_old" })]);
    expect(inserted).toBe(1);
    const body = JSON.parse(String((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body)) as {
      legacy_id: string;
      stripe_session_id: string;
      placement: string;
    };
    expect(body).toMatchObject({ legacy_id: "cs_old", stripe_session_id: "cs_old", placement: "primary" });
  });
});
