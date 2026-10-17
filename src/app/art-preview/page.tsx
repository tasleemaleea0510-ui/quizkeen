import KeenAvatar from "@/components/keens/keen-avatar";
import { KEENS, RARITY_META } from "@/lib/keens";

export const dynamic = "force-static";

const HEROES = ["frogula", "omeisaurus", "chickchicken", "chickenchick", "pumpkinking", "cookieghost"];

/**
 * Every Keen, at the sizes the app draws them.
 *
 * A dev surface for looking at the whole set at once — it is the only page that
 * shows all of them together, which is how you catch a drawing that is off-model
 * or a recipe that silently fell back to the default body.
 */
export default function ArtPreviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-extrabold text-white">Alla Keens</h1>
      <p className="mt-1 text-sm text-slate-400">{KEENS.length} teckningar, 96 px.</p>
      <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-5">
        {KEENS.map((keen) => (
          <div key={keen.id} className="flex flex-col items-center gap-2 text-center">
            <KeenAvatar keen={keen} size={96} />
            <span className="text-[11px] font-bold leading-tight text-white"><span data-no-translate>{keen.name}</span></span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              {RARITY_META[keen.rarity].label}
            </span>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-display text-2xl font-extrabold text-white">Handtecknade</h2>
      <div className="mt-5 flex flex-wrap gap-4">
        {KEENS.filter((k) => HEROES.includes(k.id)).map((keen) => (
          <div key={keen.id} className="flex flex-col items-center gap-2">
            <KeenAvatar keen={keen} size={168} />
            <span className="text-[11px] font-bold text-white"><span data-no-translate>{keen.name}</span></span>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-display text-2xl font-extrabold text-white">Storlekarna</h2>
      <div className="mt-5 flex flex-wrap items-end gap-6">
        {[20, 28, 44, 64, 128, 168].map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <KeenAvatar keen={KEENS[0]} size={size} />
            <span className="text-[10px] text-slate-500">{size}px</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-2">
          <KeenAvatar keen={KEENS[0]} size={96} locked />
          <span className="text-[10px] text-slate-500">låst</span>
        </div>
      </div>
    </div>
  );
}
