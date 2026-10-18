import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        "cmd-glow": "0 0 40px -12px rgba(99,102,241,0.55)",
        "cmd-glow-red": "0 0 36px -10px rgba(220,38,38,0.55)",
      },
      keyframes: {
        // A panel arriving: rise, settle, no bounce.
        "cmd-fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px) scale(0.994)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "cmd-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // A status bar sliding in from the left edge.
        "cmd-slide-right": {
          "0%": { opacity: "0", transform: "translateX(-14px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "cmd-slide-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Modals: a small overshoot, then flat.
        "cmd-pop": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "60%": { opacity: "1", transform: "scale(1.015)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // A rejected code.
        "cmd-shake": {
          "0%,100%": { transform: "translateX(0)" },
          "18%": { transform: "translateX(-7px)" },
          "36%": { transform: "translateX(7px)" },
          "54%": { transform: "translateX(-5px)" },
          "72%": { transform: "translateX(5px)" },
          "88%": { transform: "translateX(-2px)" },
        },
        // A live dot with a halo that keeps spreading.
        "cmd-pulse-ring": {
          "0%": { opacity: "0.7", transform: "scale(0.9)" },
          "70%": { opacity: "0.15", transform: "scale(1.9)" },
          "100%": { opacity: "0", transform: "scale(2.2)" },
        },
        // Light crossing a locked card.
        "cmd-sweep": {
          "0%": { transform: "translateX(-120%) skewX(-16deg)" },
          "100%": { transform: "translateX(220%) skewX(-16deg)" },
        },
        // Rows stacking into a table.
        "cmd-row": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // The one-shot stamp for a successful unlock.
        "cmd-stamp": {
          "0%": { opacity: "0", transform: "scale(1.6)" },
          "60%": { opacity: "1", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Background fields, drifting behind the console.
        "cmd-drift": {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(6vw,4vh,0) scale(1.16)" },
        },
        "cmd-drift-rev": {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1.1)" },
          "50%": { transform: "translate3d(-6vw,5vh,0) scale(0.94)" },
        },
        // Slow breathing for a locked icon.
        "cmd-breathe": {
          "0%,100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
        "cmd-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "cmd-fade-up": "cmd-fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "cmd-fade": "cmd-fade 0.35s ease both",
        "cmd-slide-right": "cmd-slide-right 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "cmd-slide-down": "cmd-slide-down 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "cmd-pop": "cmd-pop 0.3s cubic-bezier(0.22,1,0.36,1) both",
        "cmd-shake": "cmd-shake 0.45s ease-in-out both",
        "cmd-pulse-ring": "cmd-pulse-ring 1.8s ease-out infinite",
        "cmd-sweep": "cmd-sweep 2.6s ease-in-out infinite",
        "cmd-row": "cmd-row 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "cmd-stamp": "cmd-stamp 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "cmd-drift": "cmd-drift 26s ease-in-out infinite",
        "cmd-drift-rev": "cmd-drift-rev 34s ease-in-out infinite",
        "cmd-breathe": "cmd-breathe 2.6s ease-in-out infinite",
        "cmd-pan": "cmd-pan 6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
