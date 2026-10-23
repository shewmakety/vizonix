import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());

vi.mock("stripe", () => {
  class StripeMock {
    checkout = { sessions: { create } };
  }
  return { default: StripeMock };
});

import { POST } from "@/app/api/checkout/route";
import { TURNSTILE_TEST_SECRET } from "@/lib/turnstile";
import { TURNSTILE_TEST_TOKEN } from "@/lib/turnstile-public";

const envKeys = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_AVIATION_PRIMARY",
  "STRIPE_PRICE_AVIATION_SECONDARY",
  "TURNSTILE_SECRET_KEY",
  "VERCEL_ENV",
] as const;
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function request(body: unknown): Request {
  return new Request("https://www.vizonix.com/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("checkout route", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_checkout";
    process.env.STRIPE_PRICE_AVIATION_PRIMARY = "price_primary";
    process.env.STRIPE_PRICE_AVIATION_SECONDARY = "price_secondary";
    process.env.TURNSTILE_SECRET_KEY = TURNSTILE_TEST_SECRET;
    process.env.VERCEL_ENV = "preview";
    create.mockReset();
    create.mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.com/c/pay/cs_test" });
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = previousEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("turns Managed Payments off and refuses a retired placement", async () => {
    const oneTime = await POST(
      request({
        segment: "aviation",
        placement: "primary",
        startDate: "2027-01-04",
        email: "buyer@firm.example",
        company: "Hangar Co",
        adCopy: "A short line for the week.",
        quantity: 1,
        turnstileToken: TURNSTILE_TEST_TOKEN,
      }),
    );
    expect(oneTime.status).toBe(200);
    const retired = await POST(
      request({
        segment: "aviation",
        placement: "featured",
        startDate: "2027-01-04",
        email: "buyer@firm.example",
        turnstileToken: TURNSTILE_TEST_TOKEN,
      }),
    );
    expect(retired.status).toBe(400);
    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0][0] as { mode: string; managed_payments: unknown };
    expect(params.mode).toBe("payment");
    expect(params.managed_payments).toEqual({ enabled: false });
  });
});
