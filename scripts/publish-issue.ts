import fs from "fs";
import { AppError } from "../lib/errors";
import { indexNowKeyForPublish } from "../lib/indexnow";
import { publishIssue } from "../lib/publish";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

/**
 * --send with a segment id groups confirmed subscribers by the topics they
 * turned off and sends each group once from lib/publish.ts.
 * --test-to sends one full copy. --no-write skips the file, the IndexNow ping,
 * and the Search Console sitemap submit.
 */
async function main() {
  const file = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error(
      "Usage: npm run publish-issue -- content/drafts/example-aviation.json [--send] [--allow-sample] [--test-to you@example.com] [--no-write] [--no-linkedin]",
    );
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  process.env.INDEXNOW_KEY = indexNowKeyForPublish();
  const result = await publishIssue(raw, {
    send: process.argv.includes("--send"),
    write: !process.argv.includes("--no-write"),
    allowSample: process.argv.includes("--allow-sample"),
    testTo: argValue("--test-to"),
    linkedin: !process.argv.includes("--no-linkedin"),
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.written === "local") {
    console.log("Commit and push the issue file so the archive page deploys.");
  }
  if (!result.delivery) {
    console.log("Email was not sent. Re-run with --send after the page is deployed, or pass --test-to.");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof AppError ? error.message : error instanceof Error ? error.message : "Publish failed.";
  console.error(message);
  process.exit(1);
});
