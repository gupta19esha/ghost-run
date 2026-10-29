# Hosting

27 September 2026. Sections 1 to 5 are the report the product owner asked for before ruling on
hosting. Section 6 records the decision and exactly how it is set up. Cloudflare turned out to
offer new accounts only its Workers flow, not Pages, so the site is a Worker with static assets.
Sections 1 to 5 still say Pages where they were written that way; everything they say about
cost, commercial use, headers, Access and servers holds for Workers too. Provider terms were checked on their own documentation on this
date. Prices and limits change, so check them again before signing up.

---

## 1. What the game needs to be served

Measured from the repo, not assumed.

| Requirement | Why |
|---|---|
| HTTPS | Every host below gives it free. A later install to the home screen, or an offline mode, would need it |
| Serve `.js` as `text/javascript` | The game loads as ES modules (`<script type="module">`), and browsers refuse a module served with the wrong type. Every host below does this by default |
| Serve `game/`, `engine/` and `text/` side by side | `game/main.js` imports `../engine/index.js` and `../text/render.js`, and `text/render.js` imports `../engine/token-figures.js`. Serving `game/` alone breaks the game. About 1 MB, 40 files |
| Nothing else from the repo | Serving the repo root would also publish the sheets, the maths doc, HANDOFF and the Phase 0 harness. See section 4 |
| A way into the game at the site root | The game's page is `game/index.html`. The site root needs a redirect to `/game/`, or the published folder arranged so the game is at the root |
| Exact file name case | Hosts run on Linux, where `Main.js` and `main.js` differ, and this machine runs Windows, where they do not. Checked: all 73 relative references in the game, engine and text match their files exactly |
| Fonts served from the same site | Three `.woff` files in `game/fonts/`, about 560 KB, loaded by `game/tokens.css` with relative paths. Same origin, so no cross-origin headers are needed. The game makes no request to any other site: no Google Fonts, no CDN, no analytics |
| No build step | The game runs as written. A host needs only to publish files. The one step needed is copying the three folders into a publish folder, which is a copy, not a build |
| Control over caching | Files are not versioned by name. After an update, a phone could hold an old `engine/decisions.js` beside a new `game/main.js`. The save replays choices through the engine, and a save that no longer replays is dropped (`game/save.js`), so a mixed cache could cost a player their progress. The host must let us set cache headers, such as revalidate on every load |
| One fixed address, chosen before real players | The save lives in `localStorage` under one key, and `localStorage` belongs to one exact origin. Moving from a free `*.pages.dev` address to a bought domain later starts every player from nothing |
| Nothing server-side | No server code, no database, no forms, no uploads |

Two things the save imposes that no host can fix:

1. **Safari deletes an unvisited site's storage after 7 days.** WebKit clears storage that
   scripts wrote for a site the person has not opened in 7 days of using Safari, unless the
   site was added to the home screen. An iPhone player who stops for a week loses their save.
   This bears on the Day 7 and Day 30 retention targets. It is a reason to ask players to add
   the game to the home screen, and in time to move saves to accounts (Phase 1).
2. **A save is one browser on one phone.** Clearing site data, a private tab or a second phone
   starts again. This is the MVP's stated design until accounts at session 5.

---

## 2. The four options

For a static site of about 1 MB, with a private repo (`gupta19esha/game-finance` returns 404
to a visitor who is not logged in).

| | GitHub Pages | Netlify | Vercel | Cloudflare Pages |
|---|---|---|---|---|
| Cost at our scale | GitHub Free publishes only from **public** repos. From this private repo it needs GitHub Pro, about $4 a month | Free plan, 300 credits a month. Paid from $9 a month | Hobby is free, but **personal, non-commercial use only**. Pro is $20 per user a month | Free. Requests for static files are free and unlimited |
| Allowed for a product that will charge | **No.** GitHub's terms bar using Pages to run an online business or commercial SaaS | Not stated on the pricing page. Check the terms | Only on Pro | Yes, nothing bars it |
| Automatic deploy from this repo | Yes, with a GitHub Actions workflow in the repo | Yes, connects to the private repo | Yes, connects to the private repo | Yes, connects to the private repo. 500 builds a month free |
| Custom domain, with HTTPS | Yes | Yes | Yes | Yes, up to 100 a project |
| Cache headers we control | No. Fixed caching we cannot change (from memory, not checked on their docs) | Yes, `_headers` file | Yes, `vercel.json` | Yes, `_headers` file |
| A private link for Phase 0 testers | Only on GitHub Enterprise Cloud. On Pro the site is public even though the repo is private | Password protection is on paid plans (from memory, not checked on their docs) | Password protection is $20 a month on Pro. Free login-wall for your own team only | Free: Cloudflare Access protects up to 50 users on its free plan |
| Where the servers are | Content network worldwide. GitHub is a US company | Content network worldwide. US company | Content network worldwide. US company | Content network worldwide, including data centres in Indian cities. US company |
| Limits that could bite | 1 GB site, 100 GB a month soft, 10 builds an hour | Credits cover bandwidth and builds together; the conversion was not stated | 100 GB of transfer a month on Hobby | 20,000 files and 25 MiB per file |

**Where the data sits, under DPDP.** None of the four lets a free static site choose to keep
data in India. For this game that matters less than it sounds:

- The only personal data that reaches the host is its own access log: IP address, browser and
  the pages requested. The save never leaves the phone, and holds no personal data.
- As I understand the DPDP Act, section 16 does not require data to stay in India. It lets the
  government restrict transfers to named countries. No such list covering the US was in effect
  when last checked. **This is my reading, not legal advice.** It goes to the lawyer with the
  rest.

---

## 3. What is not needed yet

| Not needed | Why not |
|---|---|
| Accounts or login | Planned from session 5 (Phase 1). The save is on the device |
| A server or server code | The engine runs in the browser |
| A database | Nothing is stored anywhere but the phone |
| Analytics | None exists, and none is wanted yet |
| Payments | The paid tier is Phase 2 |
| An app store | The MVP is mobile web |

One flag on analytics. The MVP's pass criteria are Day 1, Day 7 and Day 30 return rates. They
cannot be measured without some analytics. So "not yet" means "not for Phase 0", not "not for
the MVP". Adding analytics later brings in DPDP notice and consent.

---

## 4. Where hosting touches the legal work (HANDOFF section 3)

| Legal item | How hosting touches it |
|---|---|
| DPDP notice | The site needs a privacy notice before it is public, even with no accounts. It must say what the host logs (IP addresses, browser), what stays on the phone (the save) and that nothing else is collected. The notice is a page the host serves. Its words are for the lawyer and the product owner |
| DPDP, the name field | Resolved 30 September 2026: the field is cut. The game asks for no personal data. The save holds only choices, dates and which bars have been explained |
| 18+ gate | A static host cannot check age. The gate has to be in the game: a screen before the landing where the player confirms they are 18 or over. It does not exist yet. **A public link before the gate exists would let anyone play**, so the first deployment should be private (Cloudflare Access, section 2) until the gate and the notice are built |
| SEBI education carve-out | Where the site is hosted does not change the carve-out. What is served does. The landing already says "Educational simulation. Not investment advice." But serving the whole repo would publish HANDOFF and the research, which name real companies such as Groww and Zerodha, on the product's own domain. That breaks "no real brand names anywhere" in spirit. Publish only `game/`, `engine/` and `text/` |
| Online Gaming Act 2025 | Not affected: no stake, no prize, nothing converts to money |
| Search engines | Until launch, the site should tell search engines not to index it, so Phase 0 builds do not appear in search results |

---

## 5. Recommendation

**Cloudflare Pages.** It is the only one of the four that is free for this private repo,
allowed for a product that will charge, lets us set cache headers, and can keep the first
deployment private for free while the 18+ gate and the DPDP notice do not exist yet. It has
data centres in India, which helps load times for Indian players. It does not change where
logs are processed.

GitHub Pages is out for two reasons: its terms bar commercial use, and this repo is private.
Vercel's free plan is non-commercial. Netlify would work, but it has no free private link and
its credit limits are harder to predict.

One thing to know: Cloudflare now also offers static sites on Workers, and points some new
projects there. Pages is still supported. Either can serve this game the same way. Which one
to use is a detail to settle at setup.

### What I would need from the product owner

1. **A Cloudflare account**, on an email you control. Free, no card needed for Pages.
2. **Permission for Cloudflare to read the GitHub repo.** You install Cloudflare's GitHub app on
   `gupta19esha/game-finance` from your GitHub account. I cannot log in for you.
3. **The address.** A free `*.pages.dev` name, or a bought domain. Because saves belong to one
   address (section 1), decide before any real player plays. A domain also waits on the Dry Run
   domain and trademark checks already on the to-do list. A `.in` or `.com` costs roughly
   ₹800 to ₹1,500 a year (not checked, varies by registrar).
4. **Private or public first.** I recommend private: a Cloudflare Access list of Phase 0
   testers' emails, up to 50, until the 18+ gate and the privacy notice exist.
5. **Confirm `main` deploys.** Every push to `main` would publish the game. Today the standing
   rule pushes every task to `main`, so a half-finished task would go live. A separate branch
   for what is live, or deploying only on a tag, avoids that. Your call.

Then the setup itself is small: a publish folder holding `game/`, `engine/` and `text/`, a
redirect from the root to `/game/`, a `_headers` file for caching and no-indexing, and the
Access rule.

---

## 6. Decided, and how it is set up

Ruled 27 September 2026 by the product owner.

| Question | Decision |
|---|---|
| Host | Cloudflare, as a **Worker with static assets**. Cloudflare no longer offers the Pages flow to new accounts: its create screen sets up a Worker. For this game the difference is only in setup. It is still a static site with no server code, served free |
| Address | The free `game-finance.<account subdomain>.workers.dev` for now, not `pages.dev`. The account subdomain is the name Cloudflare asks for once per account. The domain waits on the Dry Run trademark checks, and changing address later wipes every save (section 1), so choose the subdomain with care |
| Who can see it | Private: Cloudflare Access on all traffic, with an invite list, until the 18+ gate and the DPDP notice exist |
| What deploys | The `live` branch only, never `main`. The standing rule pushes partial work to `main` at the end of every task, and that must never go live |

### What is in the repo for it

| File | What it does |
|---|---|
| `wrangler.jsonc` | Cloudflare's configuration. An assets-only Worker named `game-finance` that serves `site/`. No server code. The name must match the project name on Cloudflare or the build fails. It does not set the branch: that is a dashboard setting, step 3 below |
| `scripts/build_site.sh` | Cloudflare's build command. Copies `game/`, `engine/*.js`, `text/*.js` and the three files in `hosting/` into `site/`. Only copies, no compiling. Fails the build if anything but code, styles, the favicon, fonts, font licences and the three hosting files would be published, or if the game or a font is missing |
| `hosting/_redirects` | `/ /game/ 302`: the site root opens the game |
| `hosting/_headers` | On every file: `Cache-Control: no-cache`, so a phone checks for a new version on every load and never mixes old and new engine files. `X-Robots-Tag: noindex, nofollow`, so nothing is indexed. `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer` |
| `hosting/robots.txt` | Tells every search engine to crawl nothing |
| `.gitignore` | Ignores `site/`, which is built, never committed, and `.wrangler/`, Wrangler's local cache |

**`_redirects` and `_headers` work on Workers unchanged.** Cloudflare's Workers static assets
documentation says both files are honoured when they sit in the assets folder, which is `site/`,
and that neither is served as a file. They do not apply to responses from Worker code, and this
Worker has none. No other mechanism is needed.

**What is published: 45 files, about 1 MB.** The game with its screens, three fonts and their
licences, the engine's and text's modules, and `robots.txt`. **Not published:** HANDOFF and every
other document, the research, the sheets, `data/`, the calibration reports, the tests, the
scripts, the design artboards and the Phase 0 harness.

**Checked on 27 September 2026 with Cloudflare's own tools** (Wrangler 4.86, locally).
`wrangler deploy --dry-run` accepts the configuration and reads `site/`. `wrangler dev` runs the
site in Cloudflare's runtime and reported "Parsed 1 valid redirect rule" and "Parsed 1 valid
header rule". Then:

| Request | Result |
|---|---|
| `/` | 302 to `/game/` |
| `/game` | 307 to `/game/` |
| `/game/` | 200, the game's page. Loaded in headless Chrome, it renders and plays through a month close, which uses the engine and text modules |
| `/game/main.js`, `/engine/index.js`, `/text/render.js` | 200, `text/javascript` |
| `/game/fonts/Mukta-Regular.woff` | 200, `font/woff` |
| `/robots.txt` | 200 |
| Every file's headers | `Cache-Control: no-cache`, `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` |
| `/_headers`, `/_redirects`, `/HANDOFF.md`, `/index.html` (the Phase 0 harness) | 404 |

The compatibility date in `wrangler.jsonc` is 2026-05-01. A newer date stopped the local
runtime from starting, and for a Worker with no code the date changes nothing.

### How a release works

`live` was created from `main` and holds everything above. Nothing reaches players until someone
updates `live` on purpose, from a finished state of `main`:

```
git push origin main:live
```

Only on the product owner's say-so. Once the Worker is connected to the repo, a push to `live`
rebuilds and redeploys the site within a few minutes.

**Not connected yet (checked 30 September 2026).** `wrangler deployments list` showed every deploy
was an upload, and the push of efefdfd to `live` built nothing. Until the connection is made
(Settings, Build, in the dashboard), a release is two steps: push to `live`, then deploy `live` by
hand, from a checkout of `live` so work on `main` can never slip in:

```
git worktree add --detach ../live-deploy origin/live && cd ../live-deploy && bash scripts/build_site.sh --test-tools && npx wrangler deploy --message "live <commit>"
```

`--test-tools` turns on the testing tools (Start again on How it works and from the corner control
on every screen, jump to a month, and the `/game/?restart` address; ruled 30 September 2026) in the
tester site only. The repo's `game/config.js` keeps them off, so a build without the
switch is the player build. **Before the site is opened to real players, deploy without it.**

Then `npx wrangler deployments list` confirms it, and `git worktree remove ../live-deploy` tidies
up. Wrangler must be logged in (`npx wrangler login`). The deploy warns that preview URLs are on by
default; on 30 September a preview address returned 404 (Cloudflare error 1042), so nothing was
reachable around Access. Setting `"preview_urls": false` in `wrangler.jsonc` would silence it.

### The Cloudflare screens, step by step

Written for the product owner, who sees the dashboard. The field names are the ones the product
owner reported from the create screen on 27 September 2026, and Cloudflare's Workers Builds
documentation for the later steps. Cloudflare changes its dashboard now and then.

**Step 1. The create screen** ("Configure your Worker project and deploy it to Cloudflare"):

| Field | Enter |
|---|---|
| Project name | `game-finance`. It must match the name in `wrangler.jsonc` |
| Build command | `bash scripts/build_site.sh --test-tools` while the site is for testers only. Drop `--test-tools` before any real player can reach it |
| Deploy command | `npx wrangler deploy`, as filled in |
| Preview command | Leave `npx wrangler preview` as filled in. It runs only for preview builds, which step 3 turns off |
| Enable Preview builds | **Untick it.** Otherwise every push to `main` builds a preview copy of work in progress |
| Protect with Cloudflare Access | On. Scope: **All traffic** |
| Authentication policy | A policy that allows only listed emails. If it offers to create one, create it: action **Allow**, include **Emails**, add every tester's email and your own. If Cloudflare first asks you to set up Zero Trust, choose a team name and the **Free** plan, which covers up to 50 people. It may ask for card details even on the free plan |
| Advanced settings | Leave Path empty, leave the API token as Cloudflare sets it, no environment variables |

Select **Deploy**. If Cloudflare asks you to choose a `workers.dev` subdomain for the account,
choose it with care: it becomes part of the address players keep their saves under.

**Step 2. Watch the build.** This first build comes from `main`, which today holds the same
files as `live`. The log should show the build step ending `Built site/: 45 files, 1030 KB`, then
the deploy step reading the assets directory and ending with the Worker deployed. If it fails,
copy the log and send it.

**Step 3. Point it at `live`.** In the Worker, open **Settings**, then **Build**, then **Branch
control**. Set the production branch dropdown to `live`. Check that **Enable Preview Builds** is
unticked. Save. From now on only pushes to `live` deploy.

**Step 4. Check the lock.** In Zero Trust, open **Access**, then **Applications**. There should be
an application for the `game-finance` Worker's address. Open it, then **Policies**, and check the
policy allows only your email list. Add anyone missing.

**Step 5. Test it.** The address is under the Worker's **Settings**, **Domains & Routes**, ending
`workers.dev`. Open it in a private browser window:

- You should see a Cloudflare page asking for an email. Enter an invited email, then the code
  that arrives. The game's landing screen should open at `/game/`.
- Add `/robots.txt` to the address: two lines, `User-agent: *` and `Disallow: /`.
- Add `/HANDOFF.md`: a "not found" page, not the document.
- In a second private window, try an email that is not on the list: it should be refused.

Send what you see, and the address.

**Adding or removing a tester later:** Zero Trust, **Access**, **Applications**, the game's
application, **Policies**, edit the email list. The free plan counts up to 50 people.

---

## Sources

- [Workers static assets: `_headers`](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Workers static assets: `_redirects`](https://developers.cloudflare.com/workers/static-assets/redirects/)
- [Workers static assets: configuration](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Workers static assets: HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
- [Workers Builds: configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers Builds: branch control and preview builds](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [workers.dev addresses](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [GitHub Pages limits, and the ban on commercial use](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitHub's plans: Pages from private repos needs Pro or above](https://docs.github.com/get-started/learning-about-github/githubs-products)
- [Vercel Hobby plan: non-commercial only, 100 GB transfer, Pro $20 per user](https://vercel.com/docs/plans/hobby)
- [Netlify pricing: Free 300 credits, Personal $9 a month](https://www.netlify.com/pricing/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare static assets: requests free and unlimited](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Cloudflare Zero Trust free plan, up to 50 users](https://blog.cloudflare.com/teams-plans/)
