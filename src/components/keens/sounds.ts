/**
 * Pack-opening sounds, synthesised — no audio files to ship, and nothing plays
 * until the person has interacted with the page (browsers block it otherwise).
 *
 * Every sound is a couple of oscillators behind a gain envelope, and the whole
 * engine is silently inert if WebAudio is unavailable. Muting is remembered.
 */

import type { Rarity } from "@/lib/keens";

const MUTE_KEY = "qk_keen_muted";

let ctx: AudioContext | null = null;
let muted: boolean | null = null;

export function isMuted(): boolean {
  if (muted !== null) return muted;
  if (typeof window === "undefined") return true;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* private mode: the session still respects the toggle in memory */
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type ToneOptions = {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
};

function tone({ freq, dur = 0.18, type = "triangle", gain = 0.05, delay = 0, slideTo }: ToneOptions) {
  if (isMuted()) return;
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), start + dur);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Rising wind-up while the pack shakes. */
export function playWindUp() {
  tone({ freq: 180, slideTo: 520, dur: 0.55, type: "sawtooth", gain: 0.035 });
}

/** The reveal: a chord that gets richer the rarer the Keen. */
export function playReveal(rarity: Rarity) {
  const chords: Record<Rarity, number[]> = {
    VANLIG: [392],
    OVANLIG: [440, 554],
    SALLSYNT: [523, 659, 784],
    EPISK: [587, 740, 880, 1175],
    LEGENDARISK: [659, 831, 988, 1319, 1661],
    KROMA: [784, 988, 1175, 1568, 1976, 2349],
  };
  const notes = chords[rarity] ?? chords.VANLIG;
  notes.forEach((f, i) => tone({ freq: f, dur: 0.5 - i * 0.03, gain: 0.045, delay: i * 0.055, type: "triangle" }));
  if (rarity === "LEGENDARISK" || rarity === "KROMA") {
    tone({ freq: 140, slideTo: 60, dur: 0.7, type: "sine", gain: 0.09 });
  }
}

export function playCoin() {
  tone({ freq: 1180, dur: 0.07, type: "square", gain: 0.03 });
  tone({ freq: 1560, dur: 0.09, type: "square", gain: 0.025, delay: 0.06 });
}

export function playClick() {
  tone({ freq: 620, dur: 0.05, type: "sine", gain: 0.03 });
}

export function playError() {
  tone({ freq: 220, slideTo: 150, dur: 0.22, type: "sawtooth", gain: 0.03 });
}

export function playSell() {
  tone({ freq: 720, slideTo: 1180, dur: 0.16, type: "triangle", gain: 0.035 });
}
