import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";

export const dynamic = "force-static";

const IDS = [
  // Halloween, sheet order
  "pumpkin",
  "chickenchick",
  "chickchicken",
  "frogula",
  "cookiepumpkin",
  "cookiemummy",
  "cookieghost",
  "pumpkinking",
  // Gamer chase cards and the Admin Keen
  "creeper",
  "pixelthorne",
  "omeisaurus",
];

/** Close-up of the hand-drawn Keens, for checking a drawing against its sheet. */
export default function HeroPreviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap gap-6">
        {IDS.map((id) => {
          const keen = KEEN_BY_ID[id];
          if (!keen) return null;
          return (
            <div key={id} className="flex flex-col items-center gap-2">
              <KeenAvatar keen={keen} size={168} />
              <span className="text-xs font-bold text-white"><span data-no-translate>{keen.name}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
