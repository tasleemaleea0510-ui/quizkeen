/**
 * Spaced repetition for the flashcard decks.
 *
 * A Leitner box system, which is the honest version of "study smarter": every
 * card sits in one of five boxes, a card you know moves up a box and comes back
 * later, and a card you miss drops all the way back to the first one. The
 * intervals are the classic 0 / 1 / 3 / 7 / 16 days.
 *
 * **Where the state lives.** In `localStorage`, keyed by card id — deliberately
 * not in the database. The schedule is per device and per browser, which is the
 * right trade for a school app: it needs no migration on a schema that can only
 * be changed by hand against Supabase (`prisma db push` hangs on the pooler,
 * see README), it works with the network down, and the XP a session earns is
 * still claimed on the server, so nobody can fake their total by editing a box.
 *
 * Everything here is pure except the two storage helpers, so the maths can be
 * reasoned about — and tested — on its own.
 */

export type Box = 0 | 1 | 2 | 3 | 4;

export type CardState = {
  /** Leitner box: 0 is "new or just missed", 4 is "known". */
  box: Box;
  /** Epoch ms when this card should be shown again. */
  due: number;
  /** How many times the card has been answered. */
  seen: number;
  /** How many of those were right. */
  right: number;
};

export const MAX_BOX: Box = 4;

/** Days a card waits before its next appearance, by box. */
export const BOX_DAYS = [0, 1, 3, 7, 16];

const DAY_MS = 86_400_000;
const STORAGE_PREFIX = "qk_srs_v1:";

export function emptyState(now = Date.now()): CardState {
  return { box: 0, due: now, seen: 0, right: 0 };
}

/** Apply one answer to one card and return the new state. */
export function review(state: CardState | undefined, correct: boolean, now = Date.now()): CardState {
  const base = state ?? emptyState(now);
  const box: Box = correct ? (Math.min(MAX_BOX, base.box + 1) as Box) : 0;
  return {
    box,
    due: now + BOX_DAYS[box] * DAY_MS,
    seen: base.seen + 1,
    right: base.right + (correct ? 1 : 0),
  };
}

/** 0–1, how well this card is known — used for the little bar on the card. */
export function mastery(state: CardState | undefined): number {
  if (!state) return 0;
  return state.box / MAX_BOX;
}

export type Deck = Record<string, CardState>;

export type DeckPlan = {
  /** Cards that are due now, hardest first (lowest box), then by due date. */
  due: string[];
  /** Cards never seen before. */
  fresh: string[];
  /** Everything that should be shown in this session, in order. */
  queue: string[];
  /** Cards waiting for another day. */
  waiting: number;
  /** Mastered: box 4, answered right at least twice. */
  mastered: number;
};

/**
 * What to study right now.
 *
 * Cards you got wrong come first, then unseen cards, then whatever else is due.
 * A deck the student has never opened shows the whole deck (nothing is "due"
 * yet — every card is new), which is what "just give me the cards" means when
 * you sit down with a fresh set.
 */
export function planDeck(cardIds: string[], deck: Deck, now = Date.now()): DeckPlan {
  const due: string[] = [];
  const fresh: string[] = [];
  let waiting = 0;
  let mastered = 0;

  for (const id of cardIds) {
    const state = deck[id];
    if (!state || state.seen === 0) {
      fresh.push(id);
      continue;
    }
    if (state.box >= MAX_BOX && state.right >= 2) mastered++;
    if (state.due <= now) due.push(id);
    else waiting++;
  }

  due.sort((a, b) => {
    const sa = deck[a];
    const sb = deck[b];
    if (sa.box !== sb.box) return sa.box - sb.box;
    return sa.due - sb.due;
  });

  return {
    due,
    fresh,
    queue: [...due, ...fresh],
    waiting,
    mastered,
  };
}

export type DeckStats = {
  total: number;
  fresh: number;
  learning: number;
  mastered: number;
  /** Cards to review today, including ones never seen. */
  dueNow: number;
};

export function deckStats(cardIds: string[], deck: Deck, now = Date.now()): DeckStats {
  const plan = planDeck(cardIds, deck, now);
  const fresh = plan.fresh.length;
  const total = cardIds.length;
  return {
    total,
    fresh,
    learning: total - fresh - plan.mastered,
    mastered: plan.mastered,
    dueNow: plan.due.length + fresh,
  };
}

/** The stored schedule for one collection. Never throws: private mode is fine. */
export function loadDeck(collectionId: string): Deck {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + collectionId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Deck;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDeck(collectionId: string, deck: Deck): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + collectionId, JSON.stringify(deck));
  } catch {
    /* storage full or blocked — the session still works, it just won't remember */
  }
}

/**
 * Totals across every deck on this device.
 *
 * The dashboard and the progress page show "cards to review today" from here,
 * because only the browser knows the schedule. It reads every `qk_srs_v1:` key,
 * which is a handful of small JSON blobs.
 */
export function allDueNow(now = Date.now()): { due: number; mastered: number; cards: number } {
  if (typeof window === "undefined") return { due: 0, mastered: 0, cards: 0 };
  let due = 0;
  let mastered = 0;
  let cards = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const deck = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Deck;
      for (const state of Object.values(deck)) {
        if (!state) continue;
        cards++;
        if (state.box >= MAX_BOX && state.right >= 2) mastered++;
        else if (state.due <= now) due++;
      }
    }
  } catch {
    /* unreadable storage: report nothing rather than something wrong */
  }
  return { due, mastered, cards };
}

/** When the next card comes back, as a short Swedish phrase. */
export function dueLabel(state: CardState | undefined, now = Date.now()): string {
  if (!state || state.seen === 0) return "Nytt kort";
  const days = Math.max(0, Math.ceil((state.due - now) / DAY_MS));
  if (days === 0) return "Dags nu";
  if (days === 1) return "Imorgon";
  return `Om ${days} dagar`;
}
