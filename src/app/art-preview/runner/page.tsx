import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import { keenRunnerDataUri } from "@/lib/keen-art";

export const dynamic = "force-static";

const IDS = ["invader", "crewmate", "chubbypig", "creeper", "pixelthorne", "omeisaurus", "frogula"];

/**
 * The Gamer pack and the Admin Keen at card size, plus the round runner token
 * the minigame draws them as — 60 px is the size that actually matters in a
 * scrolling lobby, so it is shown at 1:1 next to the large one.
 */
export default function RunnerPreviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-extrabold text-white">Runner-tokens</h1>
      <div className="mt-8 flex flex-wrap gap-8">
        {IDS.map((id) => {
          const keen = KEEN_BY_ID[id];
          if (!keen) return null;
          return (
            <div key={id} className="flex flex-col items-center gap-3">
              <KeenAvatar keen={keen} size={168} />
              <div className="flex items-end gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={keenRunnerDataUri(keen, 128)} width={60} height={60} alt="" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={keenRunnerDataUri(keen, 128)} width={32} height={32} alt="" />
              </div>
              <span className="text-[11px] font-bold text-white"><span data-no-translate>{keen.name}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
