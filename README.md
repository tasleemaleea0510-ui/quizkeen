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
