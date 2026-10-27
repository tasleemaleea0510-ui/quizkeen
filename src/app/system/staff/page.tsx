import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { isStaffRole } from "@/lib/moderation";
import StaffPanel from "@/components/staff-panel";
import PageHeader from "@/components/page-header";
import { ShieldCheck, Shield, Crown } from "lucide-react";
import { ROLE_THEME } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * Personalpanelen, as a page.
 *
 * The same panel that hangs off the corner of every screen, opened full-size for
 * when somebody is actually working through a class rather than answering one
 * question in the middle of a lesson. Both surfaces call the identical server
 * actions, and those re-check the caller's role against `lib/moderation` on
 * every single request — the page's own gate is only there to keep the door
 * shut, not to be the lock.
 */
export default async function StaffPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile || !isStaffRole(profile.role)) redirect("/dashboard");

  const theme = ROLE_THEME[profile.role];
  const Icon = profile.role === "OWNER" ? Crown : ShieldCheck;

  return (
    <div data-accent="sky" className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        accent="sky"
        eyebrow="Personalpanel"
        icon={Shield}
        title={
          <>
            Moderering, <span className={theme.color}>{profile.username}</span>
          </>
        }
        lead="Varningar, tystnader, mynt och anteckningar — inne i appen, utan att lämna fliken. Allt du gör loggas med tid och roll, och varje åtgärd kontrolleras på servern en gång till."
        chips={
          <>
            <span className="chip">
              <Icon className="h-3.5 w-3.5" /> {theme.label}
            </span>
            <span className="chip">Din roll avgör vilka knappar du får se</span>
          </>
        }
      />

      <div className="mt-6 surface p-6">
        <h2 className="section-title">Panelen är öppen</h2>
        <p className="mt-2 text-sm text-slate-400">
          Listan till höger visar elever, lärare och anslutningar. Välj en person för att se vad du får göra —
          knapparna ändras med din roll, och ägarens konto är alltid skyddat.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <li className="surface-flat p-3">Varna (3 = automatisk ban i 24 timmar)</li>
          <li className="surface-flat p-3">Tysta chatten i 5–60 minuter</li>
          <li className="surface-flat p-3">Ge mynt inom din dagliga budget</li>
          <li className="surface-flat p-3">Hemlig anteckning som bara personal ser</li>
        </ul>
      </div>

      <StaffPanel role={profile.role} autoOpen />
    </div>
  );
}
