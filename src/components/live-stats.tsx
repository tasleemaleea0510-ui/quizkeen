"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfileStats } from "@/app/system/actions";
import { levelFor } from "@/lib/levels";
import { playLevelUp } from "@/components/keens/sounds";
import Confetti from "@/components/keens/confetti";
import SparkBurst from "@/components/motion/spark-burst";

/**
 * Watches the wallet, and celebrates when a level lands.
 *
 * Two jobs, and they share one poll:
 *
 * 1. **Refresh.** XP is earned on other screens — a finished game, a study run,
 *    a quest claimed on the server — so the page a student is looking at has to
 *    notice. One call every 8 s, and only when a number actually moved does the
 *    router re-render. A failed fetch is dropped: a hiccup must never look like
 *    "nothing happened".
 * 2. **Level-up.** The level is derived from XP right here, not read from the
 *    row, so the banner can never fire on a level the XP does not justify. When
 *    it rises, a band drops in with confetti and a chime — once per level,
 *    remembered in sessionStorage so a reload does not replay the party.
 *
 * It used to return null. It is now the app's way of saying "that counted".
 */
export default function LiveStats({
  initial,
}: {
  initial: { xp: number; coins: number; level: number } | null;
}) {
  const router = useRouter();
  const last = useRef(initial ? `${initial.xp}|${initial.coins}` : "");
  const [celebrate, setCelebrate] = useState<{ level: number; fire: number } | null>(null);
  const [burst, setBurst] = useState(0);
  const [gain, setGain] = useState<{ xp: number; coins: number } | null>(null);
  const previous = useRef(initial ? { xp: initial.xp, coins: initial.coins } : null);

  // A level announced before hydration (or in another tab) is not replayed.
  const announced = useCallback((level: number) => {
    try {
      const key = `qk_level_seen_${level}`;
      if (sessionStorage.getItem(key) === "1") return false;
      sessionStorage.setItem(key, "1");
      return true;
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    if (!initial) return;
    let alive = true;
    const iv = setInterval(async () => {
      const s = await getProfileStats().catch(() => null);
      if (!s || !alive) return;
      const key = `${s.xp}|${s.coins}`;
      if (key === last.current) return;

      const wasLevel = previous.current ? levelFor(previous.current.xp) : s.level;
      const nowLevel = levelFor(s.xp);
      const delta = previous.current
        ? { xp: s.xp - previous.current.xp, coins: s.coins - previous.current.coins }
        : null;
      last.current = key;
      previous.current = { xp: s.xp, coins: s.coins };

      // The "+25 XP" that floats past the corner, for a gain worth noticing.
      if (delta && (delta.xp > 0 || delta.coins > 0)) {
        setGain(delta);
        setTimeout(() => setGain(null), 3200);
      }

      if (nowLevel > wasLevel && announced(nowLevel)) {
        playLevelUp();
        setCelebrate({ level: nowLevel, fire: Date.now() });
        setBurst((n) => n + 1);
        setTimeout(() => setCelebrate(null), 5200);
      }

      router.refresh();
    }, 8000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [initial, router, announced]);

  return (
    <>
      <Confetti fire={burst} colors={["#818cf8", "#c084fc", "#38bdf8", "#fbbf24", "#34d399"]} count={110} />

      {gain && (gain.xp > 0 || gain.coins > 0) && (
        <div className="pointer-events-none fixed bottom-24 right-5 z-[80] flex flex-col items-end gap-1.5">
          {gain.xp > 0 && (
            <span className="animate-keen-float-up rounded-full border border-indigo-400/40 bg-indigo-600/90 px-3.5 py-1.5 text-sm font-extrabold text-white shadow-lg">
              +{gain.xp} XP
            </span>
          )}
          {gain.coins > 0 && (
            <span className="animate-keen-float-up rounded-full border border-amber-400/40 bg-amber-500/90 px-3.5 py-1.5 text-sm font-extrabold text-slate-950 shadow-lg">
              +{gain.coins} mynt
            </span>
          )}
        </div>
      )}

      {celebrate && (
        <div
          className="level-up pointer-events-none fixed inset-x-0 top-20 z-[90] flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-500/25 via-amber-400/15 to-transparent px-6 py-4 shadow-glow-amber backdrop-blur-xl">
            <SparkBurst fire={celebrate.fire} count={22} colors={["#fbbf24", "#fde68a", "#fff", "#a78bfa"]} />
            <p className="relative flex items-center gap-3">
              <span className="animate-keen-wiggle text-2xl">🏆</span>
              <span>
                <span className="block font-display text-lg font-extrabold text-white" data-no-translate>
                  Nivå {celebrate.level}!
                </span>
                <span className="block text-xs font-semibold text-amber-100/90">
                  Snyggt — fortsätt samla XP, nästa nivå kommer snabbare än du tror.
                </span>
              </span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
