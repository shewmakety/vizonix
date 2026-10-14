import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { checkLinks } from "./check-links";

const port = 3456;
const base = `http://127.0.0.1:${port}`;

const pages: Array<[string, string]> = [
  ["/", "Aviation"],
  ["/aviation", "maintenance and AOG teams"],
  ["/aviation/issues", "Sample issue"],
  ["/aviation/issues/2026-10-14", "Sample issue"],
  ["/aviation/tools", "AOGLine"],
  ["/aviation/tools/aogline", "Sample listing"],
  ["/aviation/tools/dutyline", "Sample listing"],
  ["/legal", "Lawyers and law practices"],
  ["/legal/issues", "Sample issue"],
  ["/legal/issues/2026-10-14", "Sample issue"],
  ["/legal/tools", "ClauseHarbor"],
  ["/legal/tools/clauseharbor", "Sample listing"],
  ["/warehousing", "not publishing yet"],
  ["/marketing-sales", "not publishing yet"],
  ["/sponsor", "Aviation is the first list"],
  ["/sponsor/confirmed", "Payment received"],
  ["/about", "rate card"],
  ["/privacy", "Resend"],
  ["/terms", "not legal advice"],
  ["/subscribe", "Aviation is the launch section"],
  ["/confirm", "confirmation"],
  ["/unsubscribe", "Unsubscribe"],
  ["/llms.txt", "Aviation"],
  ["/llms-full.txt", "Why it can make the operation money"],
  ["/sitemap.xml", "/aviation"],
  ["/robots.txt", "GPTBot"],
];

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("next start did not become ready.");
}

async function expectPage(pathname: string, snippet: string) {
  const response = await fetch(`${base}${pathname}`);
  const body = await response.text();
  if (response.status !== 200) {
    throw new Error(`${pathname} returned ${response.status}`);
  }
  if (!body.includes(snippet)) {
    throw new Error(`${pathname} did not include "${snippet}"`);
  }
  if (/[\u2013\u2014]/.test(body)) {
    throw new Error(`${pathname} contains an em dash or an en dash.`);
  }
}

async function expectStatus(pathname: string, init: RequestInit, status: number) {
  const response = await fetch(`${base}${pathname}`, init);
  if (response.status !== status) {
    const body = await response.text();
    throw new Error(`${pathname} returned ${response.status}, expected ${status}. ${body.slice(0, 240)}`);
  }
}

function stopServer(server: ChildProcess) {
  if (!server.pid) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

async function main() {
  const server: ChildProcess = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    stdio: "inherit",
    detached: true,
    env: {
      ...process.env,
      TOKEN_SECRET: "smoke-test-secret",
      PUBLISH_SECRET: "smoke-publish-secret",
      STRIPE_SECRET_KEY: "sk_test_smoke_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_smoke",
      NEXT_PUBLIC_SITE_URL: "https://vizonix.com",
    },
  });

  try {
    await waitForServer();
    for (const [pathname, snippet] of pages) {
      await expectPage(pathname, snippet);
    }

    await expectStatus("/api/subscribe", { method: "POST", body: "not-json" }, 400);
    await expectStatus(
      "/api/subscribe",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "reader@example.com",
          segment: "aviation",
          company_website: "https://spam.example",
        }),
      },
      200,
    );
    await expectStatus("/api/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, 400);
    await expectStatus("/api/unsubscribe", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, 400);
    await expectStatus("/api/publish", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, 401);
    await expectStatus("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, 400);
    await expectStatus("/api/stripe/webhook", { method: "POST", body: "{}" }, 400);

    const issue = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-14.json"), "utf8"),
    );
    await expectStatus(
      "/api/publish",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer smoke-publish-secret",
        },
        body: JSON.stringify({ issue, send: false, write: false }),
      },
      200,
    );

    const robots = await fetch(`${base}/robots.txt`).then((response) => response.text());
    for (const bot of ["ClaudeBot", "PerplexityBot", "Google-Extended"]) {
      if (!robots.includes(bot)) throw new Error(`robots.txt is missing ${bot}`);
    }

    const failures = await checkLinks(base, pages.map(([pathname]) => pathname));
    if (failures.length > 0) {
      throw new Error(`Link check failed: ${JSON.stringify(failures)}`);
    }
    console.log("Smoke test passed.");
  } finally {
    stopServer(server);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
