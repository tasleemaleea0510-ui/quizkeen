import type { Metadata } from "next";
import "./globals.css";
import TranslateButton from "../components/translate-button";

export const metadata: Metadata = {
  title: "QuizKeen Command",
  description: "Endast för betrodda. Alla öppningar loggas.",
};

export default function CommandLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <TranslateButton />
        {children}
      </body>
    </html>
  );
}