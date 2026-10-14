# QuizKeen

Multiplayer live quiz platform with PIN lobbies, flashcard battles, and classroom management.

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
(`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`) launches
`scripts/autocommit.cmd` when you log in. **Delete that file to stop syncing at
logon**, or delete it and run `npm run autocommit` by hand instead.

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

### Custom domain (quizkeen.om.to)

This is a free subdomain from the Intent Panel (`panel.int.yt`), which is also
where its DNS lives. Because the delegated zone *is* `quizkeen.om.to`, that name
is the zone **apex**, while Vercel displays record names relative to `om.to` — so
Vercel's "quizkeen" label means `@` here. A CNAME cannot be used at an apex; use
an A record.

As of writing the domain still answers from GitHub Pages: four A records pointing
at `185.199.108.153`, `.109`, `.110` and `.111`, which return "File not found"
because this app has no static `index.html` for Pages to serve. To move it:

1. Vercel → project → Settings → Domains → add `quizkeen.om.to`. If it reports
   that the domain is linked to another Vercel account, create the TXT record it
   lists — the name is `_vercel.quizkeen.om.to` (Vercel's prose may call it
   `_vercel.om.to`, which is a different name) — then press Refresh.
2. In the Intent panel, add one record at `@`. Prefer **ALIAS** — the panel
   advertises apex ALIAS support, which flattens a CNAME at the root — pointing
   at `bcc1a966b6af1974.vercel-dns-017.com` (Vercel's own target, so it follows
   their addresses automatically). If ALIAS is refused, use **A** `@` →
   `76.76.21.21`, which Vercel keeps working; that target currently flattens to
   `216.198.79.1` and `64.29.17.1`. A CNAME cannot go at the apex because the NS
   records live there — that is the error the panel shows if you try. Also delete
   any record named `quizkeen`, which only creates the useless
   `quizkeen.quizkeen.om.to`.

   Beware the 3600s TTL: after a change, resolvers may keep serving the old
   answers for up to an hour, so a domain that still looks broken is often just
   cached. Ask the authoritative server (`dns1.int.yt`) to see the truth.
3. Repoint the `www` CNAME at the Vercel target, and add `www.quizkeen.om.to` in
   Vercel, if `www` should work too.
4. GitHub → repository → Settings → Pages → clear the custom domain, so GitHub
   releases the name.

Vercel issues the HTTPS certificate automatically once DNS resolves to it, and
`/api/health` is the quickest way to confirm the domain serves this app. Note
that `quizkeen.com.to` does not exist at all — only `om.to` — and its TTL is
3600s, so allow up to an hour for a change to be visible everywhere.
