import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import LiveStats from "@/components/live-stats";
import ClassBanner from "@/components/class-banner";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MaintenanceScreen, BanScreen, Overlays, LiveBan } from "@/components/owner-overlays";
import StudentChatBubble from "@/components/student-chat";
import PresencePing from "@/components/presence-ping";
import LiveShareClient from "@/components/live-share-client";
import TranslateButton from "@/components/translate-button";

export const metadata: Metadata = {
  title: "QuizKeen 🎮 Lär. Spela. Tävla.",
  description: "Live-flerspelar-quizar med XP, mynt och minispel.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.adminSettings.findUnique({ where: { id: 1 } }).catch(() => null);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user
    ? await prisma.profile.findUnique({ where: { id: user.id } }).catch(() => null)
    : null;

  const banned = !!(profile?.bannedUntil && profile.bannedUntil > new Date());

  return (
    <html lang="sv">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
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