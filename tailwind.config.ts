import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        glow: "0 0 48px -12px rgba(99,102,241,0.6)",
        "glow-sm": "0 0 24px -8px rgba(99,102,241,0.55)",
        "glow-violet": "0 0 48px -12px rgba(139,92,246,0.6)",
        card: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 24px 48px -32px rgba(0,0,0,0.9)",
        raise: "0 16px 40px -20px rgba(0,0,0,0.85)",
      },
      backgroundImage: {
        "radial-brand": "radial-gradient(60% 60% at 50% 0%, rgba(99,102,241,0.28), transparent 70%)",
        "grid-faint":
          "linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "44px 44px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        pop: {
          "0%": { transform: "scale(0.94)", opacity: "0" },
          "60%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        // The LIVE banner's track holds two identical groups of repeats, so
        // shifting by exactly half the content width lands on the second group
        // and the loop looks seamless no matter how wide the bar is.
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // ── Keens: the pack-opening choreography ──────────────────────────
        // A number that just changed, counting to its new value.
        "keen-tick": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.16)" },
          "100%": { transform: "scale(1)" },
        },
        // The "+25" / "−100" that floats off the wallet.
        "keen-float-up": {
          "0%": { opacity: "0", transform: "translate(-50%, 8px) scale(0.9)" },
          "18%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translate(-50%, -30px) scale(1.05)" },
        },
        // Cards arriving in a grid.
        "keen-rise": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "keen-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // The rarity-coloured screen flash at the moment of the reveal.
        "keen-flash": {
          "0%": { opacity: "0" },
          "12%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        // The pack winding up in your hands.
        "keen-shake": {
          "0%,100%": { transform: "rotate(0deg) translateY(0)" },
          "10%": { transform: "rotate(-5deg) translateY(-2px)" },
          "20%": { transform: "rotate(5deg) translateY(1px)" },
          "30%": { transform: "rotate(-7deg) translateY(-3px)" },
          "40%": { transform: "rotate(7deg)" },
          "50%": { transform: "rotate(-9deg) translateY(-4px)" },
          "60%": { transform: "rotate(9deg) translateY(-2px)" },
          "70%": { transform: "rotate(-11deg)" },
          "80%": { transform: "rotate(11deg) translateY(-3px)" },
          "90%": { transform: "rotate(-6deg)" },
        },
        // The whole screen giving a nudge for a legendary or a Kroma.
        "keen-screenshake": {
          "0%,100%": { transform: "translate3d(0,0,0)" },
          "20%": { transform: "translate3d(-5px,3px,0)" },
          "40%": { transform: "translate3d(5px,-3px,0)" },
          "60%": { transform: "translate3d(-3px,-2px,0)" },
          "80%": { transform: "translate3d(3px,2px,0)" },
        },
        "keen-pulse": {
          "0%,100%": { opacity: "0.55", transform: "scale(0.97)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        "keen-spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        // The Keen landing: yaw in from the side and settle.
        "keen-flip": {
          "0%": { opacity: "0.2", transform: "perspective(900px) rotateY(72deg) scale(0.82)" },
          "70%": { opacity: "1", transform: "perspective(900px) rotateY(-6deg) scale(1.02)" },
          "100%": { opacity: "1", transform: "perspective(900px) rotateY(0deg) scale(1)" },
        },
        "keen-pop": {
          "0%": { opacity: "0", transform: "scale(0.62)" },
          "62%": { opacity: "1", transform: "scale(1.07)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Light travelling across the revealed card.
        "keen-sheen": {
          "0%": { transform: "translateX(0) rotate(12deg)" },
          "100%": { transform: "translateX(430%) rotate(12deg)" },
        },
        "keen-wiggle": {
          "0%,100%": { transform: "rotate(-2.5deg) scale(1)" },
          "50%": { transform: "rotate(2.5deg) scale(1.05)" },
        },
        // Kroma text: the gradient slides through the letters.
        "keen-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        // Pack cards breathing on the shelf.
        "keen-bob": {
          "0%,100%": { transform: "translateY(0) rotate(-0.4deg)" },
          "50%": { transform: "translateY(-7px) rotate(0.4deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.4s ease both",
        float: "float 6s ease-in-out infinite",
        "gradient-pan": "gradient-pan 8s ease infinite",
        pop: "pop 0.25s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.6s infinite",
        marquee: "marquee 22s linear infinite",
        "keen-tick": "keen-tick 0.45s cubic-bezier(0.22,1,0.36,1)",
        "keen-float-up": "keen-float-up 1.3s ease-out forwards",
        "keen-rise": "keen-rise 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "keen-fade": "keen-fade 0.3s ease both",
        "keen-flash": "keen-flash 0.6s ease-out both",
        "keen-shake": "keen-shake 0.5s ease-in-out infinite",
        "keen-screenshake": "keen-screenshake 0.6s ease-in-out both",
        "keen-pulse": "keen-pulse 1.6s ease-in-out infinite",
        "keen-spin-slow": "keen-spin-slow 9s linear infinite",
        "keen-flip": "keen-flip 0.7s cubic-bezier(0.22,1,0.36,1) both",
        "keen-pop": "keen-pop 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "keen-sheen": "keen-sheen 1.5s ease-in-out infinite",
        "keen-wiggle": "keen-wiggle 1.1s ease-in-out 2",
        "keen-pan": "keen-pan 5s linear infinite",
        "keen-bob": "keen-bob 5.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
