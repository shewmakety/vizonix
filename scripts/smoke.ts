import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { checkLinks } from "./check-links";

const port = 3456;
const base = `http://127.0.0.1:${port}`;

const pages: Array<[string, string]> = [
  ["/", "Aviation"],
  ["/aviation", "maintenance / AOG teams"],
  ["/aviation/issues", "AI moves into the hangar workflow"],
  ["/aviation/issues/2026-10-16", "Veryon puts an AI assistant"],
  ["/aviation/tools", "Airvoyant"],
  ["/aviation/tools/airvoyant", "Contact the vendor"],
  ["/aviation/tools/veryon-defect-analysis", "https://veryon.com/press-media/veryon-unveils-next-generation-defect-analysis"],
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
      fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-16.json"), "utf8"),
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

    const aviationIssue = await fetch(`${base}/aviation/issues/2026-10-16`).then((response) => response.text());
    if (aviationIssue.includes("noindex")) {
      throw new Error("The real aviation issue is marked noindex.");
    }
    if (aviationIssue.includes("Sample issue") || aviationIssue.includes("AOGLine")) {
      throw new Error("The real aviation issue still contains sample content.");
    }
    await expectStatus("/aviation/issues/2026-10-14", { method: "GET" }, 404);
    await expectStatus("/aviation/tools/aogline", { method: "GET" }, 404);
    await expectStatus("/aviation/tools/dutyline", { method: "GET" }, 404);

    const sitemap = await fetch(`${base}/sitemap.xml`).then((response) => response.text());
    if (!sitemap.includes("/aviation/issues/2026-10-16")) {
      throw new Error("Sitemap is missing the real aviation issue.");
    }
    if (sitemap.includes("aogline") || sitemap.includes("/aviation/issues/2026-10-14")) {
      throw new Error("Sitemap still lists fictional aviation content.");
    }

    const llmsFull = await fetch(`${base}/llms-full.txt`).then((response) => response.text());
    if (!llmsFull.includes("https://veryon.com/") || llmsFull.includes("AOGLine")) {
      throw new Error("llms-full.txt is missing the real lead or still names AOGLine.");
    }

    const home = await fetch(`${base}/`).then((response) => response.text());
    if (home.includes("Sponsor a week")) {
      throw new Error("The home page still shows Sponsor a week.");
    }
    if (home.includes("nav-soon") || home.includes(">Soon<")) {
      throw new Error("Segment links are still in the header.");
    }

    const aviation = await fetch(`${base}/aviation`).then((response) => response.text());
    if (!aviation.includes("Subscribe to Vizonix") || aviation.includes("Subscribe to Aviation")) {
      throw new Error("Aviation signup heading was not renamed.");
    }
    if (!aviation.includes("Tool Highlights")) {
      throw new Error("Aviation page is missing Tool Highlights.");
    }

    const legal = await fetch(`${base}/legal`).then((response) => response.text());
    if (!legal.includes("Subscribe to Vizonix") || legal.includes("Subscribe to Legal")) {
      throw new Error("Legal signup heading was not renamed.");
    }

    const directory = await fetch(`${base}/aviation/tools`).then((response) => response.text());
    if (!directory.includes("Tool directory") || !directory.includes('aria-pressed="true"')) {
      throw new Error("Tool directory is missing the view toggle.");
    }
    if (!directory.includes("tool-grid") || directory.includes("tool-directory-list")) {
      throw new Error("The default directory view is not cards.");
    }
    const listView = await fetch(`${base}/aviation/tools?view=list`).then((response) => response.text());
    if (!listView.includes("tool-directory-list") || !listView.includes("Airvoyant")) {
      throw new Error("The list view did not render tool names.");
    }

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
