import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import LiveStats from "@/components/live-stats";
import ClassBanner from "@/components/class-banner";
import { getViewer, getAdminSettings } from "@/lib/viewer";
import { isBroadcastLive } from "@/lib/broadcast";
import { MaintenanceScreen, BanScreen, Overlays, LiveBan } from "@/components/owner-overlays";
import IpBlockedScreen from "@/components/ip-blocked";
import { blockedVisitor, blockReasonText, blockUntilText } from "@/lib/ip-block";
import StudentChatBubble from "@/components/student-chat";
import PresencePing from "@/components/presence-ping";
import StaffPanel from "@/components/staff-panel";
import { isStaffRole } from "@/lib/moderation";
import LiveShareClient from "@/components/live-share-client";
import TranslateButton from "@/components/translate-button";
import Aurora from "@/components/motion/aurora";

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
  // Declared explicitly instead of relying on `app/icon.png`, whose compiled
  // route survived a build-cache hit and kept serving the old artwork.
  icons: {
    icon: [
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // All three lookups are independent, so they go out together. Awaiting the
  // IP check after the other two used to add a whole round trip to every page,
  // and on a cross-region database that was the most expensive one to serialise.
  const [settings, { user, profile }, block] = await Promise.all([
    getAdminSettings(),
    getViewer(),
    blockedVisitor(),
  ]);

  // A blocked address is refused before anything else renders: not the app, not
  // the login form, not the register page. A signed-in owner is exempt — the
  // console refuses to block an address any owner has used, and an owner who
  // shares a network with a blocked student must still be able to administer.
  const ipBlock = profile?.role === "OWNER" ? null : block;
  if (ipBlock) {
    return (
      <html lang="sv" className={`${sans.variable} ${display.variable}`}>
        <body className="min-h-screen font-sans antialiased">
          <Aurora />
          <IpBlockedScreen
            reason={blockReasonText(ipBlock)}
            until={blockUntilText(ipBlock)}
            ip={ipBlock.ip}
          />
          <TranslateButton />
        </body>
      </html>
    );
  }

  const banned = !!(profile?.bannedUntil && profile.bannedUntil > new Date());

  // Resolved on the server so a notice that has already run out is never part
  // of the first paint, and signed-out visitors get it in the HTML itself.
  const notice = isBroadcastLive(settings?.broadcast, settings?.broadcastUntil)
    ? {
        text: settings!.broadcast!.trim(),
        until: settings?.broadcastUntil ? settings.broadcastUntil.toISOString() : null,
      }
    : null;

  return (
    <html lang="sv" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans antialiased selection:bg-indigo-500/30">
        {/* Without JavaScript nothing can reveal these blocks, so they start shown. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Aurora />
            <div
              aria-hidden
              className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-radial-brand"
            />
            <Navbar
              me={
                profile
                  ? {
                      username: profile.username,
                      role: profile.role,
                      accentColor: profile.accentColor,
                      xp: profile.xp,
                      coins: profile.coins,
                    }
                  : null
              }
            />
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
          <TranslateButton />
          {!banned && !settings?.shutdown && (
            <>
              <StudentChatBubble />
              <PresencePing />
              {/* The moderation button lives in the student app itself, not only
                  in the separate command console. */}
              {profile && isStaffRole(profile.role) && <StaffPanel role={profile.role} />}
              <LiveShareClient />
              <Overlays
                broadcast={notice?.text ?? null}
                broadcastUntil={notice?.until ?? null}
                passwordNote={profile?.passwordNote ?? null}
                signedIn={!!user}
              />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
