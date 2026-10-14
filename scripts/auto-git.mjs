#!/usr/bin/env node
/**
 * QuizKeen auto-commit / auto-push watcher.
 *
 * Keeps the GitHub repo in sync with this working copy without you pressing
 * anything: it watches for changes, waits until you (or an agent, or your
 * editor) stop editing for a quiet period, then commits and pushes.
 *
 * Usage:
 *   npm run autocommit              # watch forever
 *   node scripts/auto-git.mjs --once  # sync right now, then exit
 *
 * Tuning (all optional environment variables):
 *   QK_QUIET_MS  idle time before committing   (default 25000)
 *   QK_POLL_MS   how often to check for changes (default 4000)
 *   QK_PUSH=0    commit locally but never push
 *   QK_BRANCH    branch to push to              (default main)
 *   QK_REMOTE    remote to push to              (default origin)
 *
 * Safety: `.env`, `.env.local` and similar are already gitignored, so they can
 * never be picked up. As a second line of defence this script refuses to commit
 * at all if a key-like file (`.env`, `*.pem`, `id_rsa`, ...) shows up as
 * committable, rather than risking a one-way push of a live credential.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(process.env.QK_ROOT ?? process.cwd());
const QUIET_MS = Number(process.env.QK_QUIET_MS ?? 25_000);
const POLL_MS = Number(process.env.QK_POLL_MS ?? 4_000);
const PUSH = process.env.QK_PUSH !== '0';
const BRANCH = process.env.QK_BRANCH ?? 'main';
const REMOTE = process.env.QK_REMOTE ?? 'origin';
const ONCE = process.argv.includes('--once');

// Deliberately OUTSIDE the repo, so writing the log can never itself look like
// a change and make the watcher commit in a loop.
const LOG = process.env.QK_LOG ?? path.join(os.tmpdir(), 'quizkeen-autogit.log');

const DENY = [
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(local|development|production|test)$/,
  /\.pem$/i,
  /\.p12$/i,
  /\.keystore$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
];

function log(line) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const entry = `[${stamp}] ${line}\n`;
  process.stdout.write(entry);
  try {
    appendFileSync(LOG, entry);
  } catch {
    /* logging must never crash the watcher */
  }
}

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function gitDir() {
  const reported = git(['rev-parse', '--git-dir']);
  return path.isAbsolute(reported) ? reported : path.resolve(ROOT, reported);
}

/** True while a merge/rebase/cherry-pick is half-done — never commit into that. */
function operationInProgress() {
  const dir = gitDir();
  return ['rebase-merge', 'rebase-apply', 'MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD'].some(
    (marker) => existsSync(path.join(dir, marker)),
  );
}

function hasConflicts() {
  return git(['diff', '--name-only', '--diff-filter=U']) !== '';
}

/** Committable changes, honouring .gitignore. Empty array means "nothing to do". */
function pendingChanges() {
  const out = git(['status', '--porcelain=v1', '--untracked-files=all']);
  return out ? out.split('\n').filter((line) => line.trim() !== '') : [];
}

function pathsOf(lines) {
  return lines.map((line) => {
    const raw = line.slice(3);
    const arrow = raw.indexOf(' -> ');
    const target = arrow === -1 ? raw : raw.slice(arrow + 4);
    return target.replace(/^"(.*)"$/, '$1');
  });
}

function deniedPaths(paths) {
  return paths.filter((p) => path !== '.env.example' && DENY.some((re) => re.test(p)));
}

function buildMessage(paths) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const subject = `chore: auto-sync ${paths.length} file${paths.length === 1 ? '' : 's'}`;
  const shown = paths.slice(0, 40).map((p) => `- ${p}`).join('\n');
  const extra = paths.length > 40 ? `\n- …and ${paths.length - 40} more` : '';
  return `${subject}\n\nAutomatic commit from the auto-git watcher at ${stamp} UTC.\n\n${shown}${extra}\n\nCo-Authored-By: Codebuff <noreply@codebuff.com>`;
}

function commitAndPush(paths) {
  git(['add', '--all']);

  // Re-read what is actually staged: `git add -A` can stage something the
  // porcelain snapshot did not show, and this is the last check before a push.
  const staged = git(['diff', '--cached', '--name-only']);
  const stagedPaths = staged ? staged.split('\n').filter(Boolean) : [];
  const denied = deniedPaths(stagedPaths);
  if (denied.length > 0) {
    git(['reset']);
    log(`REFUSED to commit: key-like file(s) present -> ${denied.join(', ')}`);
    log('Nothing was committed or pushed. Move them out of the repo or add them to .gitignore.');
    return false;
  }

  if (stagedPaths.length === 0) {
    log('Nothing staged after add — skipping.');
    return false;
  }

  git(['-c', 'commit.gpgsign=false', 'commit', '-m', buildMessage(stagedPaths)]);
  const sha = git(['rev-parse', '--short', 'HEAD']);
  log(`committed ${sha}: ${stagedPaths.length} file(s)`);

  if (!PUSH) {
    log('QK_PUSH=0 — committed locally only.');
    return true;
  }

  try {
    git(['push', REMOTE, `HEAD:${BRANCH}`]);
    log(`pushed ${sha} -> ${REMOTE}/${BRANCH}`);
    return true;
  } catch (err) {
    const detail = (err.stderr || err.stdout || err.message || '').toString().trim();
    log(`push rejected, trying to rebase onto ${REMOTE}/${BRANCH}: ${detail.split('\n')[0]}`);
  }

  // Someone else (or another machine) pushed first: replay our commit on top and retry once.
  try {
    git(['fetch', REMOTE]);
    git(['rebase', `${REMOTE}/${BRANCH}`]);
  } catch (err) {
    try {
      git(['rebase', '--abort']);
    } catch {
      /* nothing to abort */
    }
    log(`rebase conflict — left the repo clean, needs a human: ${(err.stderr || err.message).toString().split('\n')[0]}`);
    return false;
  }

  try {
    git(['push', REMOTE, `HEAD:${BRANCH}`]);
    log(`pushed after rebase -> ${REMOTE}/${BRANCH}`);
    return true;
  } catch (err) {
    log(`push still failing: ${(err.stderr || err.message).toString().split('\n')[0]}`);
    return false;
  }
}

function annotate(lines) {
  const denied = deniedPaths(pathsOf(lines));
  if (denied.length > 0) {
    log(`waiting — key-like file(s) in the tree, will not commit: ${denied.join(', ')}`);
  }
}

function cycle(state) {
  if (operationInProgress() || hasConflicts()) {
    if (!state.warnedBusy) {
      log('a merge/rebase is in progress — pausing until it is finished');
      state.warnedBusy = true;
    }
    return;
  }
  state.warnedBusy = false;

  const lines = pendingChanges();
  const key = lines.join('\n');

  if (lines.length === 0) {
    if (state.lastKey !== '') log('working tree clean — nothing to sync');
    state.lastKey = '';
    state.stableSince = null;
    return;
  }

  if (key !== state.lastKey) {
    state.lastKey = key;
    state.stableSince = Date.now();
    if (ONCE) return;
    log(`${lines.length} file(s) changed — waiting ${Math.round(QUIET_MS / 1000)}s of quiet before committing`);
    annotate(lines);
    return;
  }

  const quietFor = Date.now() - (state.stableSince ?? Date.now());
  if (!ONCE && quietFor < QUIET_MS) return;

  commitAndPush(pathsOf(lines));
  state.lastKey = '';
  state.stableSince = null;
}

const state = { lastKey: '', stableSince: null, warnedBusy: false };

log(
  `auto-git watching ${ROOT} (quiet ${QUIET_MS}ms, poll ${POLL_MS}ms, ` +
    `${PUSH ? `push to ${REMOTE}/${BRANCH}` : 'local commits only'})`,
);

if (ONCE) {
  cycle(state);
  // A first pass may only record the change set; run again so --once always acts.
  if (state.lastKey !== '') cycle({ ...state, stableSince: 0 });
  process.exit(0);
}

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    if (shuttingDown) process.exit(0);
    shuttingDown = true;
    log(`received ${signal} — syncing once more before exit`);
    try {
      cycle({ ...state, stableSince: 0 });
    } catch (err) {
      log(`final sync failed: ${err.message}`);
    }
    process.exit(0);
  });
}

setInterval(() => {
  try {
    cycle(state);
  } catch (err) {
    log(`cycle error (will retry): ${(err.stderr || err.message || err).toString().split('\n')[0]}`);
  }
}, POLL_MS);
