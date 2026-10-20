import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { checkLinks } from "./check-links";

const port = 3456;
const base = `http://127.0.0.1:${port}`;

const pages: Array<[string, string]> = [
  ["/", "Aviation"],
  ["/aviation", "maintenance / AOG teams"],
  ["/aviation/issues", "When should a predictive alert ground an aircraft"],
  ["/aviation/issues/2026-10-20", "False alerts are the real test"],
  ["/aviation/issues/2026-10-19", "Jeppesen ForeFlight brings its Airflow AI agents"],
  ["/aviation/issues/2026-10-16", "Veryon puts an AI assistant"],
  ["/aviation/tools", "Airvoyant"],
  ["/aviation/tools/topic/recruiting-pilots-and-technicians", "AI tools for recruiting pilots and technicians in aviation"],
  ["/aviation/tools/topic/sales-and-marketing", "AI tools for sales and marketing in aviation"],
  ["/aviation/tools/topic/predictive-maintenance", "AI tools for predictive maintenance in aviation"],
  ["/aviation/tools/topic/maintenance-optimization", "AI tools for maintenance optimization in aviation"],
  ["/aviation/tools/topic/troubleshooting", "AI tools for troubleshooting in aviation"],
  ["/aviation/tools/topic/warehousing-and-inventory", "AI tools for warehousing and inventory in aviation"],
  ["/aviation/tools/topic/aog-support", "AI tools for AOG support in aviation"],
  ["/aviation/tools/topic/records-and-documentation", "AI tools for records and documentation in aviation"],
  ["/aviation/tools/topic/flight-operations", "AI tools for flight operations in aviation"],
  ["/aviation/tools/topic/general-ai", "General AI assistants for aviation teams"],
  ["/aviation/feed.xml", "AI moves into the hangar, plus 7 places"],
  ["/aviation/tools/chatgpt", "ChatGPT is OpenAI"],
  ["/aviation/tools/jeppesen-foreflight-airflow", "wider rollout is expected in 2027"],
  ["/aviation/tools/bluetail-ai", "Bluetail"],
  ["/aviation/tools/airvoyant", "Contact the vendor"],
  ["/aviation/tools/veryon-defect-analysis", "https://veryon.com/press-media/veryon-unveils-next-generation-defect-analysis"],
  ["/sponsor", "Aviation is the first list"],
  ["/media-kit", "Audience numbers will be published after our first full month."],
  ["/sponsor/confirmed", "Payment received"],
  ["/about", "rate card"],
  ["/privacy", "Resend"],
  ["/terms", "not legal advice"],
  ["/subscribe", "Aviation is the launch section"],
  ["/confirm", "confirmation"],
  ["/unsubscribe", "Unsubscribe"],
  ["/llms.txt", "Aviation"],
  ["/llms-full.txt", "Why it can make you money"],
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
    await expectStatus("/api/sponsor-inquiry", { method: "POST", body: "not-json" }, 400);
    await expectStatus(
      "/api/sponsor-inquiry",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company_website: "https://spam.example" }),
      },
      200,
    );

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
    if (!aviationIssue.includes("Friday, October 16, 2026") || aviationIssue.includes("Thursday, October 15, 2026")) {
      throw new Error("The aviation issue date did not stay on Friday, October 16, 2026.");
    }
    const mondayIssue = await fetch(`${base}/aviation/issues/2026-10-19`).then((response) => response.text());
    if (mondayIssue.includes("noindex")) {
      throw new Error("The October 19 aviation issue is marked noindex.");
    }
    if (!mondayIssue.includes("Monday, October 19, 2026") || mondayIssue.includes("Sunday, October 18, 2026")) {
      throw new Error("The October 19 issue date did not stay on Monday, October 19, 2026.");
    }
    await expectStatus("/aviation/issues/2026-10-14", { method: "GET" }, 404);
    await expectStatus("/legal/issues", { method: "GET" }, 404);
    await expectStatus("/legal/issues/2026-10-14", { method: "GET" }, 404);
    await expectStatus("/legal/tools", { method: "GET" }, 404);
    await expectStatus("/legal/tools/clauseharbor", { method: "GET" }, 404);
    await expectStatus("/legal/tools/docketline", { method: "GET" }, 404);
    await expectStatus("/legal/tools/billwise-counsel", { method: "GET" }, 404);
    await expectStatus("/legal/tools/precedent-north", { method: "GET" }, 404);
    await expectStatus("/warehousing/issues", { method: "GET" }, 404);
    await expectStatus("/warehousing/tools", { method: "GET" }, 404);
    await expectStatus("/marketing-sales/tools", { method: "GET" }, 404);
    await expectStatus("/aviation/tools/aogline", { method: "GET" }, 404);
    await expectStatus("/aviation/tools/dutyline", { method: "GET" }, 404);

    const sitemap = await fetch(`${base}/sitemap.xml`).then((response) => response.text());
    if (!sitemap.includes("/aviation/issues/2026-10-19") || !sitemap.includes("/aviation/issues/2026-10-16")) {
      throw new Error("Sitemap is missing an aviation issue.");
    }
    if (sitemap.includes("aogline") || sitemap.includes("/aviation/issues/2026-10-14")) {
      throw new Error("Sitemap still lists fictional aviation content.");
    }
    for (const path of ["/legal", "/warehousing", "/marketing-sales"]) {
      if (sitemap.includes(`https://vizonix.com${path}<`) || sitemap.includes(`https://vizonix.com${path}/`)) {
        throw new Error(`Sitemap lists a planned section: ${path}`);
      }
    }
    if (!sitemap.includes("/aviation/tools/topic/predictive-maintenance")) {
      throw new Error("Sitemap is missing the predictive maintenance topic page.");
    }
    if (!sitemap.includes("/media-kit")) {
      throw new Error("Sitemap is missing the media kit.");
    }

    const sponsor = await fetch(`${base}/sponsor`).then((response) => response.text());
    if (sponsor.includes("use the form on this page") || sponsor.includes("$180") || sponsor.includes("$105")) {
      throw new Error("Sponsor page still has the old form wording or the old ladder prices.");
    }
    if (!sponsor.includes("$175") || !sponsor.includes("$100") || !sponsor.includes("inquiry")) {
      throw new Error("Sponsor page is missing the rate card prices or the inquiry form.");
    }
    if (sponsor.includes("2,500-5,000") || sponsor.includes("$4,500")) {
      throw new Error("Sponsor page still publishes tiers above 2,500 subscribers.");
    }

    const mediaKit = await fetch(`${base}/media-kit`).then((response) => response.text());
    if (!mediaKit.includes("Tyler Shewmake") || !mediaKit.includes("/aviation/issues/2026-10-19")) {
      throw new Error("Media kit is missing the founder or the latest issue.");
    }
    const pdf = await fetch(`${base}/media-kit.pdf`);
    if (pdf.status !== 200 || !pdf.headers.get("content-type")?.includes("application/pdf")) {
      throw new Error("Media kit PDF was not served.");
    }
    const pdfBytes = Buffer.from(await pdf.arrayBuffer());
    if (!pdfBytes.subarray(0, 8).toString().startsWith("%PDF")) {
      throw new Error("Media kit PDF is not a PDF.");
    }

    const airvoyant = await fetch(`${base}/aviation/tools/airvoyant`).then((response) => response.text());
    if (airvoyant.includes("pill sponsored")) {
      throw new Error("A real tool is marked Sponsored.");
    }

    const llmsFull = await fetch(`${base}/llms-full.txt`).then((response) => response.text());
    if (!llmsFull.includes("https://veryon.com/") || llmsFull.includes("AOGLine")) {
      throw new Error("llms-full.txt is missing the real lead or still names AOGLine.");
    }
    const rateCard = llmsFull.split("## Launch rate card")[1] ?? "";
    if (llmsFull.includes("2,500-5,000") || llmsFull.includes("$4,500") || rateCard.includes("60%")) {
      throw new Error("llms-full.txt still publishes hidden price tiers.");
    }

    const homeResponse = await fetch(`${base}/`, { redirect: "manual" });
    const home = await homeResponse.text();
    if (homeResponse.status !== 200) {
      throw new Error(`Home without a section cookie returned ${homeResponse.status}.`);
    }
    if (home.includes("Sponsor a week")) {
      throw new Error("The home page still shows Sponsor a week.");
    }
    if (home.includes("nav-soon") || home.includes(">Soon<")) {
      throw new Error("Segment links are still in the header.");
    }
    if (!home.includes("Tool Directory") || !home.includes('href="/aviation/tools"')) {
      throw new Error("Home header is missing the Tool Directory link.");
    }
    if (!home.includes("Free daily AI briefing for a specific business.")) {
      throw new Error("Home is missing the marketing landing heading.");
    }
    if (!home.includes("https://x.com/Vizonixai") || !home.includes("https://www.linkedin.com/company/vizonix")) {
      throw new Error("Home footer is missing the X or LinkedIn profile.");
    }
    if (home.includes("Sample listings are fictional") || home.includes("Sample data on the site")) {
      throw new Error("Home still has sample-data copy.");
    }
    if (
      home.includes("In preparation") ||
      home.includes("Coming soon") ||
      home.includes('href="/legal"') ||
      home.includes('href="/warehousing"') ||
      home.includes('href="/marketing-sales"')
    ) {
      throw new Error("Home still mentions a section that is not aviation.");
    }
    if (home.includes('class="pill live"') || !home.includes("Launch")) {
      throw new Error("Home still labels a section Live. Only Aviation is launched.");
    }
    if (!home.includes('class="brand" href="/aviation"')) {
      throw new Error("Home logo did not fall back to the aviation section.");
    }

    const remembered = await fetch(`${base}/`, {
      redirect: "manual",
      headers: { cookie: "vz_segment=aviation" },
    });
    const rememberedLocation = remembered.headers.get("location") || "";
    if (remembered.status !== 307 || !rememberedLocation.endsWith("/aviation")) {
      throw new Error(`Aviation cookie did not 307 / to /aviation (${remembered.status} ${rememberedLocation}).`);
    }
    const plannedCookie = await fetch(`${base}/`, {
      redirect: "manual",
      headers: { cookie: "vz_segment=legal" },
    });
    if (plannedCookie.status !== 200) {
      throw new Error(`A legal cookie redirected the marketing root (${plannedCookie.status}).`);
    }

    const sectionVisit = await fetch(`${base}/aviation`, { redirect: "manual" });
    const setCookie = sectionVisit.headers.get("set-cookie") || "";
    if (!setCookie.includes("vz_segment=aviation")) {
      throw new Error("Visiting /aviation did not set vz_segment.");
    }

    const aviationConfirm = await fetch(`${base}/aviation/confirm`);
    const aviationConfirmHtml = await aviationConfirm.text();
    if (aviationConfirm.status !== 200 || !aviationConfirmHtml.includes("Confirm your subscription")) {
      throw new Error("Section confirm URL did not render the confirm page.");
    }
    if (!aviationConfirmHtml.includes('class="brand" href="/aviation"')) {
      throw new Error("Confirm page did not keep the reader in Aviation.");
    }
    const aviationSubscribe = await fetch(`${base}/aviation/subscribe`);
    const aviationSubscribeHtml = await aviationSubscribe.text();
    if (aviationSubscribe.status !== 200 || !aviationSubscribeHtml.includes("Aviation is the launch section")) {
      throw new Error("Section subscribe URL did not render the subscribe page.");
    }
    if (!aviationSubscribeHtml.includes('class="brand" href="/aviation"')) {
      throw new Error("Subscribe page did not keep the reader in Aviation.");
    }

    const about = await fetch(`${base}/about`).then((response) => response.text());
    if (!about.includes("Tool Directory") || !about.includes('href="/aviation/tools"')) {
      throw new Error("About header is missing the default Tool Directory link.");
    }

    const aviation = await fetch(`${base}/aviation`).then((response) => response.text());
    if (!aviation.includes("Subscribe to Vizonix") || aviation.includes("Subscribe to Aviation")) {
      throw new Error("Aviation signup heading was not renamed.");
    }
    if (!aviation.includes("Tool Highlights")) {
      throw new Error("Aviation page is missing Tool Highlights.");
    }
    if (!aviation.includes("AI for Aviation: the free daily briefing")) {
      throw new Error("Aviation page is missing its heading.");
    }
    if (aviation.includes("Site banner, open")) {
      throw new Error("The open banner placeholder is still on the aviation page.");
    }
    const headEnd = aviation.indexOf("</head>");
    const head = headEnd === -1 ? "" : aviation.slice(0, headEnd);
    if (!head.includes("<title>") || !head.includes('name="description"') || !head.includes("canonical")) {
      throw new Error("Aviation title, description, or canonical is outside the document head.");
    }
    if (!head.includes("application/rss+xml") || !head.includes("/aviation/feed.xml")) {
      throw new Error("Aviation head is missing the RSS alternate link.");
    }
    if (!aviation.includes("Tool Directory") || !aviation.includes('href="/aviation/tools"')) {
      throw new Error("Aviation header is missing its Tool Directory link.");
    }

    for (const path of ["/legal", "/warehousing", "/marketing-sales", "/legal/confirm"]) {
      const response = await fetch(`${base}${path}`);
      const html = await response.text();
      if (response.status !== 404) {
        throw new Error(`${path} returned ${response.status}. Expected a 404.`);
      }
      if (!html.includes("noindex")) {
        throw new Error(`${path} is indexable.`);
      }
      if (html.includes("Coming soon") || html.includes("not publishing yet")) {
        throw new Error(`${path} still renders a coming soon page.`);
      }
    }

    const directory = await fetch(`${base}/aviation/tools`).then((response) => response.text());
    if (!directory.includes("Tool directory") || !directory.includes('aria-pressed="true"')) {
      throw new Error("Tool directory is missing the view toggle.");
    }
    if (!directory.includes('aria-current="page"') || !directory.includes("Tool Directory")) {
      throw new Error("Tool Directory is not marked active on the directory page.");
    }
    if (!directory.includes("tool-grid") || directory.includes("tool-directory-list")) {
      throw new Error("The default directory view is not cards.");
    }
    if (!directory.includes("Search tools") || !directory.includes('aria-label="Topics"')) {
      throw new Error("Tool directory is missing topic chips or search.");
    }
    if (!directory.includes("Predictive Maintenance")) {
      throw new Error("Tool directory is missing topic chips.");
    }
    const listView = await fetch(`${base}/aviation/tools?view=list`).then((response) => response.text());
    if (!listView.includes("tool-directory-list") || !listView.includes("Airvoyant")) {
      throw new Error("The list view did not render tool names.");
    }
    const filtered = await fetch(`${base}/aviation/tools?topic=predictive-maintenance&q=Veryon&view=list`).then(
      (response) => response.text(),
    );
    if (!filtered.includes("tool-directory-list") || !filtered.includes("Defect Analysis")) {
      throw new Error("Topic and search filter did not render the matching tool.");
    }
    if (filtered.includes("Airvoyant") || filtered.includes("TalentVista")) {
      throw new Error("Topic and search filter included a tool outside the query.");
    }
    if (!filtered.includes("/aviation/tools/topic/predictive-maintenance")) {
      throw new Error("Filtered directory did not canonicalize to the topic page.");
    }
    if (!filtered.includes('aria-pressed="true"')) {
      throw new Error("Filtered directory is missing a pressed topic chip.");
    }
    const topicPage = await fetch(`${base}/aviation/tools/topic/predictive-maintenance`).then((response) => response.text());
    if (!topicPage.includes("AI tools for predictive maintenance in aviation")) {
      throw new Error("Topic page is missing its heading.");
    }
    if (topicPage.includes("noindex") || topicPage.includes("Airvoyant")) {
      throw new Error("Topic page should be indexable and limited to that topic.");
    }
    await expectStatus("/aviation/tools/topic", { method: "GET" }, 404);
    await expectStatus("/aviation/tools/topic/not-a-topic", { method: "GET" }, 404);
    const toolPage = await fetch(`${base}/aviation/tools/airvoyant`).then((response) => response.text());
    if (!toolPage.includes('href="/aviation/tools/topic/aog-support"') || !toolPage.includes("AOG Support")) {
      throw new Error("Tool page is missing its topic link.");
    }
    const llms = await fetch(`${base}/llms.txt`).then((response) => response.text());
    const llmsFullBody = await fetch(`${base}/llms-full.txt`).then((response) => response.text());
    for (const body of [llms, llmsFullBody]) {
      if (body.includes("ClauseHarbor") || body.includes("/legal/tools") || body.includes("/legal/issues")) {
        throw new Error("llms output still lists legal sample pages.");
      }
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
