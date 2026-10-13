import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import LiveStats from "@/components/live-stats";
import ClassBanner from "@/components/class-banner";
import { getViewer, getAdminSettings } from "@/lib/viewer";
import { MaintenanceScreen, BanScreen, Overlays, LiveBan } from "@/components/owner-overlays";
import StudentChatBubble from "@/components/student-chat";
import PresencePing from "@/components/presence-ping";
import LiveShareClient from "@/components/live-share-client";
import TranslateButton from "@/components/translate-button";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "QuizKeen — Lär. Spela. Tävla.",
  description: "Live-flerspelar-quizar med XP, mynt och minispel.",
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, { user, profile }] = await Promise.all([getAdminSettings(), getViewer()]);

  const banned = !!(profile?.bannedUntil && profile.bannedUntil > new Date());

  return (
    <html lang="sv" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans antialiased selection:bg-indigo-500/30">
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <div
              aria-hidden
              className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-radial-brand"
            />
            <Navbar />
            <main className="flex-1">
              {settings?.shutdown ? (
                <MaintenanceScreen />
              ) : banned ? (
                <BanScreen until={profile!.bannedUntil!.toISOString()} message={profile!.banMessage} />
              ) : (
                children
              )}
            </main>
            <Footer />
          </div>
          <LiveStats initial={profile ? { xp: profile.xp, coins: profile.coins, level: profile.level } : null} />
          <ClassBanner />
          <LiveBan
            serverBanned={banned}
            until={profile?.bannedUntil ? profile.bannedUntil.toISOString() : null}
            message={profile?.banMessage ?? null}
          />
          {!banned && !settings?.shutdown && (
            <>
              <StudentChatBubble />
              <PresencePing />
              <LiveShareClient />
              <TranslateButton />
              <Overlays broadcast={settings?.broadcast ?? null} passwordNote={profile?.passwordNote ?? null} />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
