# Vizonix

Vizonix is a free weekday morning email and a website. It covers emerging AI tools, bots, models, and resources that make a specific business more profitable. Aviation is the launch section, for airlines, MROs, parts suppliers, operators, and maintenance and AOG teams. Legal is the second live section. Warehousing and marketing and sales are in the same app and stay planned until you add content and flip their status.

The email is free. Revenue is weekly sponsorship from AI companies. Launch prices live in `lib/rate-card.ts` and on [/sponsor](https://vizonix.com/sponsor). The first active entry in `lib/segments.ts` is the featured section on the home page and the default list for signup.

## Local development

Requirements: Node.js 22.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The aviation section, the legal section, both sample issues, and the sample tool pages render without API keys. Signup, sending, and checkout need the env vars below.

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
| `TOKEN_SECRET` | Signup | HMAC secret for confirm and unsubscribe links. |
| `PUBLISH_SECRET` | `POST /api/publish` | Bearer token. |
| `RESEND_API_KEY` | Email and the list | Resend API key. |
| `EMAIL_FROM` | Email | Verified sender, for example `Vizonix <news@vizonix.com>`. |
| `RESEND_SEGMENT_ID_AVIATION` | Aviation list | Resend segment id for the launch section. Audiences were renamed to Segments in November 2025. |
| `RESEND_SEGMENT_ID_LEGAL` | Legal list | Same, for the second live section. |
| `RESEND_SEGMENT_ID_WAREHOUSING` | That list | Same, when the section opens. |
| `RESEND_SEGMENT_ID_MARKETING_SALES` | That list | Same. Hyphens in the slug become underscores. |
| `RESEND_AUDIENCE_ID_*` | Legacy alias | Used only if the matching segment id is empty. |
| `RESEND_TEST_TO` | Test sends | Single recipient when you are not broadcasting. |
| `OPS_EMAIL` | Booking mail | Private notice when a checkout completes. |
| `STRIPE_SECRET_KEY` | Checkout | Secret key. |
| `STRIPE_WEBHOOK_SECRET` | Webhook | Signing secret for `/api/stripe/webhook`. |
| `STRIPE_PRICE_AVIATION_*` | Aviation checkout | One-time Price id per placement. See `.env.example`. |
| `STRIPE_PRICE_AVIATION_*_FOUNDING` | Aviation founding rate | Optional Price at the founding amount. |
| `STRIPE_PRICE_LEGAL_*` | Legal checkout | Same pattern for the second live section. |
| `STRIPE_PRICE_LEGAL_*_FOUNDING` | Legal founding rate | Optional. |
| `STRIPE_FOUNDING_PROMOTION_CODE` | Founding coupon | `promo_` id, used when the founding Price is unset. |
| `NEXT_PUBLIC_STRIPE_LINK_AVIATION_*` | Optional | Payment Link URLs for the launch section. |
| `NEXT_PUBLIC_STRIPE_LINK_LEGAL_*` | Optional | Payment Link URLs for legal. |
| `GITHUB_TOKEN` | Vercel publish and bookings | Fine-grained token, Contents read and write, this repo only. |
| `GITHUB_REPO` | Same | `owner/name`. |
| `GITHUB_BRANCH` | Same | Defaults to `main`. |

Ty needs to set every row marked required before that feature works. The site still builds and the sample pages still render if they are empty.

## Content format

Issues and tools are JSON in the repo.

- `content/{segment}/issues/YYYY-MM-DD.json`
- `content/{segment}/tools/{slug}.json`
- `content/drafts/` is not published until the script copies a file into `issues/`
- `content/bookings.json` stores paid reservations with no email address and no card data

An issue has one lead, 3 to 8 tool blurbs, one playbook, quick links, and three sponsor slots: `primary`, `secondary`, and `classified`. Empty slots render as house ads. Word ceilings match the rate card: primary 110, secondary 60, classified 35.

The seeded aviation issue (`2026-10-14`) and its four tool pages are the launch sample. The legal issue on the same date, and its four tool pages, are the second sample. Both are labeled on the page, excluded from the sitemap, and marked `noindex`. Delete them before a public launch, or leave them until the first real issue replaces the archive.

Publish from a draft file:

```bash
npm run publish-issue -- content/drafts/example-aviation.json
npm run publish-issue -- content/drafts/example-aviation.json --send --test-to you@example.com
npm run publish-issue -- content/drafts/example-legal.json
```

The script writes `content/{segment}/issues/{date}.json`. Commit and push that file so Vercel deploys the archive page. Then send.

`--send` without a segment id sends one message to `--test-to` or `RESEND_TEST_TO`. With a segment id, it creates a Resend broadcast and sends it. Sample issues are refused unless you pass `--allow-sample`.

The same payload can be posted in production:

```bash
curl -X POST https://vizonix.com/api/publish \
  -H "Authorization: Bearer $PUBLISH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"issue": { }, "send": false}'
```

On Vercel the route commits the JSON through the GitHub API (`GITHUB_TOKEN`, `GITHUB_REPO`) and then sends. Locally it writes the file.

## Signup

`POST /api/subscribe` creates a Resend contact with `unsubscribed: true`, adds the section segment, and emails a confirm link. The reader is not subscribed until they open `/confirm` and submit. That second step avoids mail clients that prefetch links.

Unsubscribe is `/unsubscribe`. The broadcast footer also includes Resend's `{{{RESEND_UNSUBSCRIBE_URL}}}`.

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

1. Set `EMAIL_FROM` to an address on that domain, for example `Vizonix <news@vizonix.com>`.
2. Create a segment for each section (Aviation, Legal, Warehousing, Marketing and sales). Copy each segment id into `RESEND_SEGMENT_ID_*`. Aviation is the launch list.
3. Send a test: `npm run publish-issue -- content/aviation/issues/2026-10-14.json --send --test-to you@example.com --allow-sample --no-write`

Resend's free tier covers the list while it is small. The broadcast path uses segments, which replaced audiences.

## Stripe

Create one Stripe Product per placement for the aviation section, for example `Aviation - Primary sponsor (week)`. Attach a one-time Price at the launch amount. Put the Price id in `STRIPE_PRICE_AVIATION_PRIMARY` and the matching keys for secondary, classified, banner, featured, and bundle. Repeat the same products for legal with `STRIPE_PRICE_LEGAL_*` when you sell that section.

Featured is priced per month. The others are priced per week. Checkout sends quantity for multi-week or multi-month buys.

Founding offer, first 10 sponsors, half price, locked 3 months:

- Preferred: a second Price at the founding amount, `STRIPE_PRICE_AVIATION_PRIMARY_FOUNDING` and the same pattern for the other placements and for legal. Checkout uses it when the founding box is checked.
- Also create a coupon for 50% off and a promotion code `FOUNDING`. Put the `promo_` id in `STRIPE_FOUNDING_PROMOTION_CODE`. A one-time Price uses a coupon with duration once. The 3 month lock is the business rule: let those sponsors reuse the founding Price for 3 months, then move them to the current tier with a 25% loyalty discount for 3 more months. A single coupon capped at 10 redemptions will run out if each week is a redemption, so prefer the founding Price ids for repeat weeks.
- Optional later: a subscription Price for 4 weeks billed monthly, at 10% off the weekly run rate.

Checkout is `POST /api/checkout`. It stores the preferred week in Checkout metadata (`segment`, `placement`, `week_start`, `end_date`).

Webhook:

1. Endpoint `https://vizonix.com/api/stripe/webhook`
2. Event `checkout.session.completed`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

The webhook writes `content/bookings.json` through the GitHub API when `GITHUB_TOKEN` and `GITHUB_REPO` are set. The file records section, placement, and dates. It does not record the email. The email, company, and ad-copy URL are in the Stripe session and in the optional `OPS_EMAIL` notice. A matching placement and overlapping dates is rejected at checkout.

Payment Links are optional. If you add one, create custom fields with keys `segment`, `placement`, and `preferred_week` (`YYYY-MM-DD`). Put the URL in `NEXT_PUBLIC_STRIPE_LINK_AVIATION_*` or `NEXT_PUBLIC_STRIPE_LINK_LEGAL_*`. The sponsor page lists a link for every live section that has one set. Checkout is the path that captures the week without Dashboard field setup.

Exclusivity is 50% above the listed price. V1 checkout charges the listed price and flags the request. Confirm the surcharge by email before you mark the week exclusive.

## SEO

The app ships metadata, Open Graph (including a generated image), `sitemap.xml`, `robots.txt`, JSON-LD, `/llms.txt`, and `/llms-full.txt`.

`robots.txt` allows `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `ClaudeBot`, `Claude-SearchBot`, `PerplexityBot`, `Google-Extended`, and the other agents listed in `app/robots.ts`. `/api/` is disallowed.

After DNS is live, submit `https://vizonix.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools. Sample pages are `noindex` and are left out of the sitemap on purpose.

## Adding a section

Routes, nav, the home page, signup, the sitemap, sponsor checkout, and the email payoff line all read `segments` in `lib/segments.ts`. You do not add a route file. The first entry with `status: "active"` is the featured launch section.

### Launch a section that is already planned (warehousing)

Warehousing is already in the config as `status: "planned"`. To open it:

1. In `lib/segments.ts`, set the warehousing object to `status: "active"`. Leave it after aviation and legal if those should stay ahead of it in the nav. Move it to the top of the array only if it should become the featured section.
2. Create `content/warehousing/issues/` and `content/warehousing/tools/`.
3. Add at least one issue file, `content/warehousing/issues/YYYY-MM-DD.json`, and the tool files it links to, `content/warehousing/tools/{slug}.json`. Copy `content/drafts/example-aviation.json` and change `segment` to `warehousing`. Set `"sample": true` until the companies are real. Sample pages are `noindex` and stay out of the sitemap.
4. Use the warehousing payoff line already on the config object: `Why it can make the warehouse money`. The issue page, the tool page, and the email print that label. Do not hardcode it in a component.
5. In Resend, create a segment and set `RESEND_SEGMENT_ID_WAREHOUSING` (legacy alias `RESEND_AUDIENCE_ID_WAREHOUSING`).
6. In Stripe, create the placement Prices and set `STRIPE_PRICE_WAREHOUSING_PRIMARY` and the matching keys in `.env.example`. Optional Payment Links use `NEXT_PUBLIC_STRIPE_LINK_WAREHOUSING_*`.
7. Commit the JSON. The next deploy publishes `/warehousing`, its archive, and its directory. Signup and checkout already offer every slug in the config. Planned sections accept signups. Checkout only offers `status: "active"` sections.

### Add a brand-new slug

1. Add one object to the `segments` array. Fields:

   - `slug`: lowercase, hyphenated, used in the URL and the content folder. Example: `warehousing`.
   - `name`: the label in the nav.
   - `status`: `"planned"` until the first real issue, then `"active"`.
   - `audience`, `summary`, `promise`: the landing-page copy.
   - `payoffLabel`: the sentence in front of each "why this changes the money" line. No trailing period. Example: `Why it can make the warehouse money`.
   - `resendSegmentEnv`: `RESEND_SEGMENT_ID_` plus the slug in uppercase, with hyphens turned into underscores. `marketing-sales` becomes `RESEND_SEGMENT_ID_MARKETING_SALES`.
   - `resendAudienceEnv`: the same name with `AUDIENCE` instead of `SEGMENT`.

2. Array order is nav order and home-card order. The first `active` object is the featured section.
3. Add `content/{slug}/issues` and `content/{slug}/tools` as above.
4. Add the Resend and Stripe env vars. The Price key helper uppercases the slug and replaces hyphens with underscores, so a slug of `field-service` looks up `STRIPE_PRICE_FIELD_SERVICE_PRIMARY`.

No new page, no new API route, and no change to the email template.

## Tests

GitHub Actions runs `npm test`, `npm run build`, and `npm run smoke` on every push and pull request. The smoke test includes the internal link check.

## Manual steps still left

These are outside the repo:

1. Set the env vars in Vercel. The list Ty must set is the table above. Minimum for a public deploy of the sample site: `NEXT_PUBLIC_SITE_URL`. Minimum before collecting emails: `TOKEN_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, and `RESEND_SEGMENT_ID_AVIATION`. Set `RESEND_SEGMENT_ID_LEGAL` before the legal list can confirm. Minimum before charging a sponsor: the Stripe keys, the aviation Price ids, `STRIPE_WEBHOOK_SECRET`, and `GITHUB_TOKEN` plus `GITHUB_REPO` so bookings are saved. Add the legal Price ids before selling a legal week.
2. The Resend domain `vizonix.com` is already verified. Create the segments, starting with Aviation, then set `RESEND_API_KEY` and `EMAIL_FROM`.
3. Create the Stripe products, prices, the FOUNDING promotion code, and the webhook.
4. Point `vizonix.com` at Vercel.
5. Create `hello@`, `sponsors@`, and `privacy@` on the domain, or change the addresses in `lib/site.ts`.
6. Replace the aviation and legal sample issues and sample tools before announcing the lists.
7. Submit the sitemap to Google and Bing.
8. Have the terms page reviewed before you rely on it in a dispute.
