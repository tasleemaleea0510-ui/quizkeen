import type { Metadata } from "next";
import "./globals.css";
import TranslateButton from "../components/translate-button";
import { CommandAurora } from "../components/motion";

export const metadata: Metadata = {
  title: "QuizKeen Command",
  description: "Endast för betrodda. Alla öppningar loggas.",
  // Declared explicitly instead of `app/icon.png`, which is bundled by the
  // build and can be served stale from Next's build cache.
  icons: {
    icon: [
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function CommandLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <CommandAurora />
        <TranslateButton />
        {children}
      </body>
    </html>
  );
}