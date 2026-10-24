/**
 * The rules a quiz draft has to satisfy.
 *
 * Shared by the builder (which shows them live) and by the server action that
 * saves it, so the form can never be more permissive than the database write.
 */

export type DraftOption = { text: string; correct: boolean };
export type DraftQuestion = { text: string; options: DraftOption[] };
export type Draft = { title: string; questions: DraftQuestion[] };
export type CreateQuizResult = { ok: true; id: string } | { ok: false; error: string };

export const MAX_QUESTIONS = 40;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 4;
export const MAX_TITLE = 120;
export const MAX_QUESTION = 300;
export const MAX_OPTION = 120;

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

/**
 * True when the picks are exactly the right answers — all of them, and nothing
 * else. A multi-answer question gives no credit for a partial set.
 */
export function isExactAnswer(picked: number[], correct: number[]): boolean {
  if (picked.length !== correct.length) return false;
  const wanted = new Set(correct);
  return picked.every((i) => wanted.has(i));
}

/** What is wrong with one question, without the "Fråga 3:" prefix. */
export function questionProblem(q: DraftQuestion): string | null {
  const text = clean(q?.text);
  if (!text) return "Frågan saknar text.";
  if (text.length > MAX_QUESTION) return `Frågan är för lång (max ${MAX_QUESTION} tecken).`;

  const options = Array.isArray(q?.options) ? q.options : [];
  if (options.length < MIN_OPTIONS) return `Frågan behöver minst ${MIN_OPTIONS} svarsalternativ.`;
  if (options.length > MAX_OPTIONS) return `Frågan får ha högst ${MAX_OPTIONS} svarsalternativ.`;

  const seen = new Set<string>();
  for (const o of options) {
    const t = clean(o?.text);
    if (!t) return "Ett svarsalternativ är tomt.";
    if (t.length > MAX_OPTION) return `Ett svarsalternativ är för långt (max ${MAX_OPTION} tecken).`;
    const key = t.toLocaleLowerCase("sv-SE");
    if (seen.has(key)) return "Två svarsalternativ är likadana.";
    seen.add(key);
  }

  if (!options.some((o) => o?.correct)) return "Markera minst ett rätt svar.";
  return null;
}

/** The first thing wrong with the draft, in the order the builder shows it. */
export function draftProblem(draft: Draft): string | null {
  if (!draft || !Array.isArray(draft.questions)) return "Quizzen kunde inte läsas av. Ladda om sidan och försök igen.";
  if (!clean(draft.title)) return "Ge quizzen en titel innan du sparar.";
  if (clean(draft.title).length > MAX_TITLE) return `Titeln får vara högst ${MAX_TITLE} tecken.`;
  if (draft.questions.length === 0) return "Lägg till minst en fråga.";
  if (draft.questions.length > MAX_QUESTIONS) return `En quiz får ha högst ${MAX_QUESTIONS} frågor.`;

  for (let i = 0; i < draft.questions.length; i++) {
    const problem = questionProblem(draft.questions[i]);
    if (problem) return `Fråga ${i + 1}: ${problem}`;
  }

  return null;
}
