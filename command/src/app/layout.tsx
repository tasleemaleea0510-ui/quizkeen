import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizKeen Command 🏰",
  description: "Ägar- och admin-kontroller för QuizKeen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}