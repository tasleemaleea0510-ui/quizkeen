import type { Metadata } from "next";
import "./globals.css";
import TranslateButton from "../components/translate-button";
import { CommandAurora } from "../components/motion";

export const metadata: Metadata = {
  title: "QuizKeen Command",
  description: "Endast för betrodda. Alla öppningar loggas.",
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