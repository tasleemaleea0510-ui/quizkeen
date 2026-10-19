# QuizKeen

Multiplayer live quiz platform with PIN lobbies, flashcard battles, and classroom management.

## Keens (collectibles)

Keens are collectible characters bought with the coins you earn answering
questions: open packs, get a rarity roll, and complete the set of 48.

- `/keens` — your collection with filters, search and a detail card per Keen.
- `/keens/packs` — the free daily pack plus six themed packs (1/3/5 at a time).
- `/keens/market` — buy any Keen outright, sell duplicates, three daily −30 % deals.

Economics live in `src/lib/keens-store.ts` and are deliberately plain functions
of a profile id, so they can be driven directly against the database: coins are
only ever spent by a guarded `updateMany` (balance must still cover the price and
the wallet must be unfrozen), the price comes from the server's copy of the
catalogue, and granting a Keen plus taking the coins happen in one transaction.
Contents of the catalogue (rarities, prices, pack odds, every Keen) are in
`src/lib/keens.ts` and shared by server and browser, so the pack the server
rolls and the animation the browser plays can never disagree.

Schema: `Profile.lastFreePackAt`, `ProfileKeen` and `KeenOpen`. `prisma db push`
hangs against Supabase's pooled connection (pgBouncer, port 6543), so schema
changes have to be applied as SQL against the same `DATABASE_URL` — the deployed
build only runs `prisma generate && next build`, it never migrates.

### The two Keens that no pack contains

`ADMIN_PACK` (`"admin"`) is a shelf that exists only so a given-away Keen has a
home in the data model. It is deliberately absent from `PACKS`, and because it
has no odds, `rollKeen` can never reach it either.

- **The Admin Keen** — `omeisaurus`, rarity `MYSTISK` — is handed out one person
  at a time from QuizKeen Command → **Admin-Keen**. Its `RarityMeta.tradeable` is
  `false`, which is what makes `buyKeen`, `sellKeen`, `sellAllDuplicates` and the
  daily deals skip it; the market renders from `MARKET_KEENS`/`MARKET_RARITIES`,
  so it can never be listed with a price. Clicking the button twice is safe: the
  insert is `ON CONFLICT DO NOTHING` and the console says "already has it".
  Because the two apps are separate deployments sharing one database, and
  Command's Prisma schema has no Keen models, the row is written with
  parameterised SQL from `command/src/lib/keen-grant.ts`. The Keen **id lives in
  both repositories** — `ADMIN_KEEN_ID` there and `P(...)` in `src/lib/keens.ts`
  here — so rename it in both or the gift lands on an id the app ignores.
- **`HEMLIG`** ("Hemlig", Secret) is the Gamer pack's 0,02 % chase: pink, above
  Legendary, below Kroma. It is tradeable, just very unlikely to drop.

The Gamer pack's odds are the design document's own — `57,3 / 37 / 5,01 / 0,67 /
0,02` — and its artwork is drawn in code: `src/lib/keen-art.ts` holds one recipe
per Keen, the pixel-led ones on a fixed rectangle grid and the rest as curves, so
there is still no image file to ship, host or lose. The same drawing is both the
card in the collection and the round runner in the minigame.

## Automatic sync (auto-commit + auto-push)

This repo ships a watcher that keeps GitHub in sync without any manual git
commands: it notices changes, waits for a quiet period, then commits and pushes.
Combined with the host's Git integration, pushing is what triggers a deploy, so
the chain is: **edit → commit → push → deploy**, with no clicking.

```bash
npm run autocommit          # watch until you stop it (Ctrl+C)
node scripts/auto-git.mjs --once   # sync right now and exit
```

Logs: `%TEMP%\quizkeen-autogit.log`. Nothing is written inside the repo, so the
log itself can never look like a change and cause a commit loop.

| Setting | Default | Meaning |
| --- | --- | --- |
| `QK_QUIET_MS` | `25000` | Wait this long after the last edit before committing |
| `QK_POLL_MS` | `4000` | How often to check for changes |
| `QK_PUSH` | `1` | Set to `0` to commit locally but never push |
| `QK_BRANCH` | `main` | Branch to push to |
| `QK_REMOTE` | `origin` | Remote to push to |

To use a different pace:

```bash
QK_QUIET_MS=10000 npm run autocommit
```

### Starting at logon (Windows)

`QuizKeen-AutoGit.cmd` in your Startup folder
(`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`) used to launch
`scripts/autocommit.cmd` when you log in. **That launcher is now a no-op** (it was
turned off on 2026-10-16, because it kept opening a console window): the file is
still there but starts nothing, and it is safe to delete. To sync by hand, run
`npm run autocommit`; to bring the logon behaviour back, replace the launcher's
contents with the `start "QuizKeen AutoGit" /min "…\scripts\autocommit.cmd"`
line it used to hold.

### Only one watcher at a time

Two watchers would race each other's commits, so the script holds a lock
(`%TEMP%\quizkeen-autogit.lock`). A second instance logs why it exited and
stops. If a watcher is killed without cleaning up, the next one clears the
stale lock automatically.

### Safety

`.env`, `.env.local` and friends are gitignored, so they are never picked up.
On top of that the watcher **refuses to commit at all** if a key-like file
(`.env`, `*.pem`, `id_rsa`, `*.p12`, `*.keystore`) is staged, printing what it
found rather than risking a one-way push of a live credential. It also pauses
while a merge or rebase is in progress, and if a push is rejected because
someone else pushed first it replays the commit on top and retries once.

Because commits happen automatically, `git add --all` semantics apply: new,
modified and deleted files all go in. Keep experiments out of the repo, or
start the watcher with `QK_PUSH=0` while you work on something risky.

## Publishing

Commits and pushes are already automatic; making the site public is a one-time
connection on the host side. After that **every push deploys itself**, including
the ones the watcher makes, so the whole chain is hands-off.

1. Go to https://vercel.com/new and choose **Continue with GitHub**.
2. Import the repository `tasleemaleea0510-ui/quizkeen`. (The local remote used to
   point at the old name `quizkeenGOOGLE`, which GitHub only still resolves by
   redirect; it has been updated to the canonical URL.)
3. Keep the detected framework preset (Next.js); there are no build settings to
   change. Vercel runs the install step first, and its `postinstall` hook
   generates the Prisma client, then it runs the `build` script. `vercel.json`
   additionally pins the build command to `npm run vercel-build`
   (`prisma generate && next build`) so that generation is guaranteed by an
   explicit setting rather than only implied by the install step.
4. Add the four environment variables the code actually reads. The values live
   in `.env.local`, which is gitignored and must never be committed or pasted
   anywhere else:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`

   `.env.example` also lists `SUPABASE_JWKS_URL`, but nothing in `src/` reads it,
   so it is safe to skip. Pasting the values into the host's dashboard is the
   only time they leave `.env.local`.
5. Deploy. Pushes to `main` redeploy from then on.

### Where it deploys from

The Vercel project is named `quizkeen` (team `quizkeenog`) and is connected to
*this* repository, so every push to `main` deploys production. That was verified
by pushing a change and watching `/api/health` start reporting the new short
commit within about twenty seconds. It previously built from the older
`quizkeenOG` repository; if pushes ever stop deploying again, check that link
first.

### Render (`quizkeen.om.to`)

`render.yaml` is the blueprint for a second, independent deployment of the
student app on Render's free plan. The command console stays on Vercel.

Setup, in this order — the DNS step cannot come first, because the record's
target is the service's own hostname, which does not exist until the service does:

1. On Render: **New → Blueprint**, pick this repository, apply. Render prompts
   for the `sync: false` values from `.env.local`.
2. Let the first build finish, open the service's `*.onrender.com` URL, and check
   `/api/health` reports the commit with `environment: "render"`. If it does,
   the app and Prisma are running on Render before any DNS is touched.
3. Service → **Settings → Custom Domains → Add Custom Domain**: `quizkeen.om.to`.
   Copy the target hostname Render shows (`quizkeen-abcd.onrender.com` or
   similar) — that exact value is the DNS target, not a generic Render hostname.
4. In Intent-DNS, open the `quizkeen.om.to` zone and add one record:

   | Type | Name | Content | TTL |
   | --- | --- | --- | --- |
   | `ALIAS` | `@` | `quizkeen-abcd.onrender.com` | 3600 |

   An apex domain cannot take a plain CNAME; the ALIAS record is what flattens
   it, and this panel supports it. Do not add an `AAAA` record — Render serves
   IPv4 only, and a stray AAAA makes the name resolve to nothing.
5. Back in Render, press **Verify**. The certificate is issued only once the
   record resolves, so a failed first attempt usually just means DNS has not
   propagated. TTL is an hour, so budget that much.
6. Before anyone signs in on the new origin, add it to Supabase → Authentication
   → URL Configuration. Otherwise magic links and OAuth callbacks keep landing
   on the Vercel deployment.

Free instances sleep after 15 minutes without traffic and take about a minute to
wake — the wrong trade for a quiz that starts on a bell. If this becomes the
primary host, keep it warm with a five-minute ping: the 750 monthly free
instance-hours cover exactly one always-on service (730), and nothing else.

### Build status

`npm run build` succeeds and every route is listed as `ƒ (Dynamic)` — rendered
on demand rather than pre-rendered — which is what the serverless host needs.

Keep `prisma generate` out of the plain `build` script: while `next dev` is
running it holds Prisma's engine DLL, so regeneration fails with
`EPERM ... query_engine-windows.dll.node`. `postinstall` and `vercel-build`
cover the build host instead, where no dev server is holding the file.

### Is production up to date?

Open `/api/health` on the live site. It answers with the short commit hash, the
environment and a timestamp, so you can compare it against `git rev-parse HEAD`
and see whether a push actually reached production rather than guessing from a
"Ready" badge.

### Live deployments

| App | URL |
| --- | --- |
| Student app (Vercel) | https://quizkeen.vercel.app |
| Student app (Render) | https://quizkeen.om.to — until the custom domain verifies, use the service's `*.onrender.com` URL |
| Command console | https://quizkeencommand.vercel.app |

Both Vercel projects build from this repository on every push to `main`.
`quizkeen.om.to` is being moved onto the Render deployment described above; until
that custom domain verifies, nothing should depend on it.

Open `/api/health` on the student app to see the short commit hash, the
environment and a timestamp for the running production build. Compare it with
`git rev-parse HEAD` to tell whether a push actually reached production, rather
than trusting a "Ready" badge.
