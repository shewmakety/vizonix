import { describe, expect, it } from "vitest";
import Stripe from "stripe";

describe("stripe request encoding", () => {
  it("puts managed_payments[enabled]=false on the Checkout request body", async () => {
    let body = "";
    const httpClient: Stripe.HttpClient = {
      getClientName: () => "test",
      makeRequest: async (_host, _port, path, method, _headers, requestData) => {
        expect(method).toBe("POST");
        expect(path).toBe("/v1/checkout/sessions");
        body = requestData ?? "";
        return {
          getStatusCode: () => 200,
          getHeaders: () => ({ "request-id": "req_test" }),
          getRawResponse: () => ({}),
          toStream: () => {
            throw new Error("unused");
          },
          toJSON: async () => ({
            id: "cs_test",
            object: "checkout.session",
            url: "https://checkout.stripe.com/c/pay/cs_test",
          }),
        };
      },
    };
    const stripe = new Stripe("sk_test_checkout", { httpClient });
    const params = {
      mode: "payment" as const,
      line_items: [{ price: "price_primary", quantity: 1 }],
      success_url: "https://www.vizonix.com/sponsor/confirmed?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.vizonix.com/sponsor?status=cancelled",
      managed_payments: { enabled: false },
    };
    await stripe.checkout.sessions.create(params);
    expect(body).toContain("managed_payments[enabled]=false");
  });
});