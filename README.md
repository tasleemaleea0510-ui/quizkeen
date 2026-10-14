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
3. Keep the detected framework preset (Next.js). Vercel finds `npm run
   vercel-build` — `prisma generate && next build` — and uses it in place of
   `build`, so the Prisma client exists before the build without breaking local
   builds (see the note below).
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

### Build status

`npm run build` succeeds and every route is listed as `ƒ (Dynamic)` — rendered
on demand rather than pre-rendered — which is what the serverless host needs.

Keep `prisma generate` out of the plain `build` script: while `next dev` is
running it holds Prisma's engine DLL, so regeneration fails with
`EPERM ... query_engine-windows.dll.node`. `postinstall` and `vercel-build`
cover the build host instead, where no dev server is holding the file.
