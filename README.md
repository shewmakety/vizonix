# Vizonix

Vizonix is a free weekday morning email and a website. It covers emerging AI tools, bots, models, and resources that make a specific business more profitable. Aviation is the launch section, for airlines, MROs, parts suppliers, operators, and maintenance / AOG teams. A path that is not a live section returns a 404.

The email is free. Revenue is weekly sponsorship from AI companies. Launch prices live in `lib/rate-card.ts` and on [/sponsor](https://vizonix.com/sponsor). The first active entry in `lib/segments.ts` is the featured section on the home page and the default list for signup.

## Local development

Requirements: Node.js 22.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The aviation section, its first real issue, and the tool pages render without API keys. Signup, sending, and checkout need the env vars below.

```bash
npm test
npm run build
npm run smoke
```

`npm test` is the unit suite. `npm run smoke` starts the production server, requests every public page, checks internal links, and rejects em dashes and en dashes in HTML. Build first.

## Environment variables

Copy `.env.example` to `.env.local` for local work, and set the same keys in Vercel. Do not commit real keys.

| Variable | Required for | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production links | Canonical URL, no trailing slash. Default `https://vizonix.com`. |
| `TOKEN_SECRET` | Signup | HMAC secret for confirm, unsubscribe, and topic links. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Signup | Cloudflare Turnstile site key for the sign-up and suggestion forms. Required in production. |
| `TURNSTILE_SECRET_KEY` | Signup | Server-side Turnstile secret. Required in production. Never prefix it with `NEXT_PUBLIC_`. |
| `SUPABASE_URL` | Topic choices | Project URL. Server only. Do not prefix with `NEXT_PUBLIC_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Topic choices | Service role key for `subscriber_prefs` and `topic_suggestions`. Server only. |
| `PUBLISH_SECRET` | `POST /api/publish` and `POST /api/linkedin-post` | Bearer token. |
| `RESEND_API_KEY` | Email and the list | Resend API key. |
| `EMAIL_FROM` | Email | Verified sender, for example `Vizonix <admin@vizonix.com>`. |
| `RESEND_SEGMENT_ID_AVIATION` | Aviation list | Resend segment id for the launch section. Audiences were renamed to Segments in November 2025. |
| `RESEND_AUDIENCE_ID_AVIATION` | Legacy alias | Used only if the aviation segment id is empty. |
| `RESEND_TEST_TO` | Test sends | Single recipient when you are not broadcasting. |
| `NOTIFY_EMAIL` | Owner alerts | Confirmed subscriber, sponsor purchase, and sponsor inquiry. Comma-separated. Defaults to admin@vizonix.com,tyshewmake@gmail.com. Sent from `EMAIL_FROM` through Resend. |
| `OPS_EMAIL` | Legacy recipient | Included with the default list only when `NOTIFY_EMAIL` is unset. |
| `STRIPE_SECRET_KEY` | Checkout | Secret key. |
| `STRIPE_WEBHOOK_SECRET` | Webhook | Signing secret for `/api/stripe/webhook`. |
| `STRIPE_PRICE_AVIATION_*` | Aviation checkout | Price id per placement. Featured must be a monthly recurring Price. The others are one-time. See `.env.example`. |
| `STRIPE_PRICE_AVIATION_*_FOUNDING` | Aviation founding rate | Optional Price at the founding amount. |
| `STRIPE_FOUNDING_PROMOTION_CODE` | Founding coupon | `promo_` id. 50% off, repeating for 3 months, max 10 redemptions. Do not also set a founding Price. |
| `NEXT_PUBLIC_STRIPE_LINK_AVIATION_*` | Optional | Payment Link URLs for the launch section. |
| `GITHUB_TOKEN` | Vercel publish and bookings | Fine-grained token, Contents read and write, this repo only. |
| `GITHUB_REPO` | Same | `owner/name`. |
| `GITHUB_BRANCH` | Same | Defaults to `main`. |
| `INDEXNOW_KEY` | IndexNow | Optional override. Hex key, 8 to 128 characters. When this is unset, publish uses the committed key `37974ccaf24526ab8e10a675a3fa4935`. The public file is [https://www.vizonix.com/37974ccaf24526ab8e10a675a3fa4935.txt](https://www.vizonix.com/37974ccaf24526ab8e10a675a3fa4935.txt). |
| `GSC_SERVICE_ACCOUNT_JSON` | Google Search Console | Service-account JSON, or a path to that file. When set, a real publish calls `sitemaps.submit`. When unset, the submit is logged as skipped. Add the service account email as a user on the property. |
| `GSC_SITE_URL` | Google Search Console | Optional. Exact property. Defaults to `https://www.vizonix.com/`. Use `sc-domain:vizonix.com` for a domain property. |
| `GSC_SITEMAP_URL` | Google Search Console | Optional. Sitemap to submit. Defaults to `https://www.vizonix.com/sitemap.xml`. |
| `UNIPILE_DSN` | LinkedIn post | Unipile API base, for example `https://api1.unipile.com:13111`. |
| `UNIPILE_API_KEY` | LinkedIn post | Sent as `X-API-KEY`. Do not commit it. |
| `UNIPILE_ACCOUNT_ID` | LinkedIn post | Optional. First LinkedIn account is used when this is empty, and the id is logged. |
| `LINKEDIN_ORG_ID_VIZONIX` | LinkedIn post | Optional. The organization named Vizonix is used when this is empty, and the id is logged. |
| `LINKEDIN_AUTOPOST` | LinkedIn post | Set to `true` to post after a real broadcast. Any other value skips the post. |

Ty needs to set every row marked required before that feature works. The site still builds if they are empty.

## Content format

Issues and tools are JSON in the repo.

- `content/{segment}/issues/YYYY-MM-DD.json`
- `content/{segment}/tools/{slug}.json`
- `content/drafts/` is not published until the script copies a file into `issues/`
- `content/bookings.json` stores paid reservations with no email address and no card data

An optional `glossary` defines terms from that issue. Include only terms specific to AI and robotics, such as LLM, agent, computer vision, AMR, and cobot. General aviation, business, and IT vocabulary (FOD, API, proof of concept) stays in the story. Definitions stay in plain English. The page and the email sort the rows alphabetically. The schema rejects a glossary term on that general list.

An issue has one lead, industry topic sections, then one `General AI Productivity Tools` section, one playbook, quick links, and three sponsor slots: `primary`, `secondary`, and `classified`. Tools can sit in a flat `tools` array or in `sections`, which group them by topic and can carry an intro and a coverage note. When `sections` is set, the last section must be titled `General AI Productivity Tools` and it must come after the industry topics. That section covers general-purpose productivity AI for any business user: writing, meetings and notes, email, scheduling, research, spreadsheets, presentations, and automation. Use real products, an accurate one-line description, and the official URL. The website renders that heading in the same gray pill as the other topic headings. The email includes it as a normal section heading. Empty slots render as house ads. Each numbered section can also carry an optional `sponsor` with `name`, `line`, `url`, and an optional `logo`. With none set, the section shows "Sponsor this section - Open" and links to the same rates page as the primary sponsor block. That line is part of the section, so a reader who turns the topic off does not see it. A sponsor object with `"house": true` is also a house ad and is not marked as a paid placement. Word ceilings match the rate card: primary 110, secondary 60, classified 35.

The aviation issue (`2026-10-16`) is the first real issue. It is indexable and listed in the sitemap. A section URL that is not in `lib/segments.ts` as `active` returns a 404 and is left out of the sitemap.

Publish from a draft file:

```bash
npm run publish-issue -- content/drafts/example-aviation.json
npm run publish-issue -- content/drafts/example-aviation.json --send --test-to you@example.com
```

The script writes `content/{segment}/issues/{date}.json`. Commit and push that file so Vercel deploys the archive page. Then send.

`--send` without a segment id sends one message to `--test-to` or `RESEND_TEST_TO`. With a segment id, it loads confirmed contacts, groups them by the topics they turned off, and sends one Resend batch per group. Readers with no saved topics get the full issue. A batch is one rendered issue, delivered as separate copies so each footer link is signed for that reader. Resend allows 100 emails per batch, so a larger group is split, with an idempotency key on each chunk. `--test-to` still sends one full copy to that address and does not load the list. `--no-write` skips the file write and the IndexNow ping. Sample issues are refused unless you pass `--allow-sample`.

Apply `supabase/migrations/20261021143000_reader_personalization.sql` in the Supabase SQL editor before the first personalized send. The app does not apply it. If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is unset, the send logs a warning and every confirmed subscriber gets the full issue. If those variables are set and the read fails, the issue is not emailed.

A real broadcast can also post the issue to the Vizonix LinkedIn company page. Set `LINKEDIN_AUTOPOST=true` plus `UNIPILE_DSN` and `UNIPILE_API_KEY`. A test send, a sample issue, and `--no-linkedin` do not post. The API body field `"linkedin": false` is the same opt-out. After a successful post, the marker `content/{segment}/linkedin/{date}.json` blocks a second post. On Vercel that marker is committed with `GITHUB_TOKEN`. The LinkedIn step never fails the publish after the email has gone out.

To post an issue that was already emailed, call `POST /api/linkedin-post` with the same `PUBLISH_SECRET` bearer token. The body is `{ "segment": "aviation", "date": "2026-10-16" }`. It loads `content/{segment}/issues/{date}.json` and posts that issue. It does not send email. A sample issue is refused. The same marker blocks a second post.

```bash
curl -X POST https://www.vizonix.com/api/linkedin-post \
  -H "Authorization: Bearer $PUBLISH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"segment":"aviation","date":"2026-10-16"}'
```

The same payload can be posted in production:

```bash
curl -X POST https://vizonix.com/api/publish \
  -H "Authorization: Bearer $PUBLISH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"issue": { }, "send": false}'
```

On Vercel the route commits the JSON through the GitHub API (`GITHUB_TOKEN`, `GITHUB_REPO`) and then sends. Locally it writes the file.

## Signup

`POST /api/subscribe` creates a Resend contact with `unsubscribed: true`, adds the section segment, and emails a confirm link. The reader is not subscribed until they open `/confirm` and submit. That second step avoids mail clients that prefetch links. Topic checkboxes and an optional suggestion travel in that confirm link and are written to Supabase only after confirm. `/join` is the same form for a link such as `/join?src=linkedin`. The `src` value is stored with the preference row and the suggestion.

`/preferences?token=` lets a reader change topics without an account. Each reader email footer includes Manage your topics. `POST /api/preferences` and `POST /api/suggest` check that token.

Unsubscribe only happens from the signed link at the bottom of a briefing email. `/unsubscribe` accepts that token and does not email a link to an address someone types in. A single test copy still uses a normal Resend send. A list send uses the batch API, one rendered issue per exclusion set, with a signed unsubscribe link and a signed topic link for each reader. The visible unsubscribe link opens this site. `List-Unsubscribe` uses `/api/unsubscribe?token=` and `List-Unsubscribe-Post` so a mail client can leave in one click. A broadcast cannot vary the sections per reader, so the list send does not use one.

## Vercel

`vercel.json` sets `"framework": "nextjs"` and clears `outputDirectory`. That overrides a project imported while the repo was empty. Vercel had saved the preset as Other, finished `next build`, and then looked for a static `public` folder. Next.js does not publish that way. Do not set the output directory to `public` or to `.next`.

The file overrides the dashboard for each deployment. Still check the project once, because a stuck production override can keep demanding `public`:

1. Open the Vercel project, then Project Settings, then Build and Deployment.
2. Framework Preset: Next.js.
3. Build Command: leave the override off. The repo script is `next build`.
4. Output Directory: leave the override off. If the field says `public`, clear it.
5. Root Directory: leave it empty. The app is at the repo root.
6. If Production Overrides still shows `public`, reset those overrides, then redeploy with the build cache off.

Then:

1. Set the env vars from `.env.example`. `NEXT_PUBLIC_SITE_URL` must be set before the production build so the sitemap and email links use the real domain.
2. Hobby is enough until you take payment. Move to Pro when the project is commercial.
3. Add `vizonix.com` and `www.vizonix.com` on the Vercel project.
4. Point the apex and `www` at Vercel in DNS. Keep the domain on a free DNS plan.

Vercel redeploys when `main` changes. Issue pages and tool pages are generated from the JSON in that deploy.

## Resend

`vizonix.com` is already verified in Resend. Do not add the SPF, DKIM, or DMARC records again.

1. Set `EMAIL_FROM` to an address on that domain, for example `Vizonix <admin@vizonix.com>`.
2. Create a Resend segment for Aviation. Copy its id into `RESEND_SEGMENT_ID_AVIATION`.
3. Send a test: `npm run publish-issue -- content/aviation/issues/2026-10-16.json --send --test-to you@example.com --no-write`

Resend's free tier covers the list while it is small. The broadcast path uses segments, which replaced audiences.

## Stripe

Create one Stripe Product per placement for the aviation section, for example `Aviation - Primary sponsor (week)`. Attach a one-time Price at the launch amount. Put the Price id in `STRIPE_PRICE_AVIATION_PRIMARY` and the matching keys for secondary, classified, banner, featured, and bundle. When another section goes live, repeat the same products with that section's slug.

Featured is priced per month. The others are priced per week. Checkout sends quantity for multi-week or multi-month buys.

Founding offer, first 10 sponsors, half price, locked 3 months:

- Preferred: a second Price at the founding amount, `STRIPE_PRICE_AVIATION_PRIMARY_FOUNDING` and the same pattern for the other placements. Checkout uses it when the founding box is checked.
- Also create a coupon for 50% off and a promotion code `FOUNDING`. Put the `promo_` id in `STRIPE_FOUNDING_PROMOTION_CODE`. A one-time Price uses a coupon with duration once. The 3 month lock is the business rule: let those sponsors reuse the founding Price for 3 months, then move them to the current tier with a 25% loyalty discount for 3 more months. A single coupon capped at 10 redemptions will run out if each week is a redemption, so prefer the founding Price ids for repeat weeks.
- Optional later: a subscription Price for 4 weeks billed monthly, at 10% off the weekly run rate.

Checkout is `POST /api/checkout`. It stores the preferred week in Checkout metadata (`segment`, `placement`, `week_start`, `end_date`).

Webhook:

1. Endpoint `https://www.vizonix.com/api/stripe/webhook`
2. Event `checkout.session.completed`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

The webhook writes `content/bookings.json` through the GitHub API when `GITHUB_TOKEN` and `GITHUB_REPO` are set. The file records section, placement, and dates. It does not record the email. The email, company, ad-copy URL, amount paid, and a Stripe Dashboard link are in the owner notice (`NOTIFY_EMAIL`, default admin@vizonix.com,tyshewmake@gmail.com, sent from `EMAIL_FROM`). A matching newsletter or banner placement with overlapping dates is rejected at checkout. Featured listings can overlap. A completed founding checkout is counted toward the cap of 10. A new confirmed subscriber sends the same owner list a separate notice. The Resend contacts list has no total, so that notice does not include a subscriber count.

Payment Links are optional. If you add one, create custom fields with keys `segment`, `placement`, and `preferred_week` (`YYYY-MM-DD`). Put the URL in `NEXT_PUBLIC_STRIPE_LINK_AVIATION_*`. The sponsor page lists a link for every live section that has one set. Checkout is the path that captures the week without Dashboard field setup.

Exclusivity is 50% above the listed price. V1 checkout charges the listed price and flags the request. Confirm the surcharge by email before you mark the week exclusive.

## SEO

The app ships metadata, Open Graph (including a generated image), `sitemap.xml`, `robots.txt`, JSON-LD, `/llms.txt`, and `/llms-full.txt`.

`robots.txt` allows `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `ClaudeBot`, `Claude-SearchBot`, `PerplexityBot`, `Google-Extended`, and the other agents listed in `app/robots.ts`. `/api/` is disallowed.

A real publish (the issue file was written, from `scripts/publish-issue.ts` or `POST /api/publish`) tells search engines about the new URLs. IndexNow gets the issue URL, the segment page, the toolbox, and `sitemap.xml`. Bing, Yandex, and the other IndexNow engines share that ping. The key is the committed public file, unless `INDEXNOW_KEY` overrides it. Google retired the anonymous sitemap ping, so Search Console is a separate call: when `GSC_SERVICE_ACCOUNT_JSON` is set, publish calls `sitemaps.submit` for `https://www.vizonix.com/sitemap.xml` (or `GSC_SITEMAP_URL`) on the property in `GSC_SITE_URL` (default `https://www.vizonix.com/`). When the JSON is unset, that call is logged as skipped. A failure from either call is logged and does not block the email. Sample issues and `--no-write` do not ping.

Each issue URL in the sitemap uses that issue's date as `lastmod` (noon UTC on the date-only day, clamped so it is not in the future). A section that is not active is left out of the sitemap and its URL returns a 404.

## Adding a section

Routes, nav, the home page, signup, the sitemap, sponsor checkout, and the email payoff line all read `segments` in `lib/segments.ts`. You do not add a route file. The first entry with `status: "active"` is the featured launch section. Only `active` sections are public. Any other slug returns a 404.

1. Add one object to the `segments` array. Fields:

   - `slug`: lowercase, hyphenated, used in the URL and the content folder. Example: `field-service`.
   - `name`: the label in the nav.
   - `status`: `"active"` when the section should be public. Anything else stays off the site.
   - `audience`, `summary`, `promise`: the landing-page copy.
   - `payoffLabel`: the sentence in front of each "why this changes the money" line. No trailing period.
   - `resendSegmentEnv`: `RESEND_SEGMENT_ID_` plus the slug in uppercase, with hyphens turned into underscores. `field-service` becomes `RESEND_SEGMENT_ID_FIELD_SERVICE`.
   - `resendAudienceEnv`: the same name with `AUDIENCE` instead of `SEGMENT`.

2. Array order is nav order and home-card order. The first `active` object is the featured section.
3. Create `content/{slug}/issues/` and `content/{slug}/tools/`. Copy `content/drafts/example-aviation.json`, change `segment`, and set `"sample": true` until the companies are real. Sample pages are `noindex` and stay out of the sitemap.
4. Add the Resend and Stripe env vars. The Price key helper uppercases the slug and replaces hyphens with underscores, so a slug of `field-service` looks up `STRIPE_PRICE_FIELD_SERVICE_PRIMARY`.

No new page, no new API route, and no change to the email template. The payoff line is read from the segment object. Do not hardcode it in a component.

## Tests

GitHub Actions runs `npm test`, `npm run build`, and `npm run smoke` on every push and pull request. The smoke test includes the internal link check.

## Manual steps still left

These are outside the repo:

1. Set the env vars in Vercel. The list Ty must set is the table above. Minimum for a public deploy of the sample site: `NEXT_PUBLIC_SITE_URL`. Minimum before collecting emails: `TOKEN_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_SEGMENT_ID_AVIATION`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY`. Production sign-ups fail closed when either Turnstile key is missing. Tests and preview can use Cloudflare's always-pass keys (`1x00000000000000000000AA` and `1x0000000000000000000000000000000AA`) or leave them unset. Minimum before charging a sponsor: the Stripe keys, the aviation Price ids, `STRIPE_WEBHOOK_SECRET`, and `GITHUB_TOKEN` plus `GITHUB_REPO` so bookings are saved.
2. The Resend domain `vizonix.com` is already verified. Create the Aviation segment, then set `RESEND_API_KEY` and `EMAIL_FROM`.
3. Create the Stripe products, prices, the FOUNDING promotion code, and the webhook.
4. Point `vizonix.com` at Vercel.
5. Use admin@vizonix.com as the only contact address. It is set in `lib/site.ts`. Sponsor inquiries go to the sponsor page.
6. The aviation issue is `content/aviation/issues/2026-10-16.json`.
7. For Google, create a Search Console service account, add its email as a user on the property, and set `GSC_SERVICE_ACCOUNT_JSON`. Set `GSC_SITE_URL` and `GSC_SITEMAP_URL` only if the property is not `https://www.vizonix.com/` or the sitemap is not `https://www.vizonix.com/sitemap.xml`. IndexNow does not need another secret.
8. Have the terms page reviewed before you rely on it in a dispute.
