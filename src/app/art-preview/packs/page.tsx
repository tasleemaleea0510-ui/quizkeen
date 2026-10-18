import PackArt from "@/components/keens/pack-art";
import { PACKS } from "@/lib/keens";

export const dynamic = "force-static";

/**
 * Every pack bag, at the three sizes the app draws one.
 *
 * The shelf, the pack opener and the home carousel all frame the same drawing
 * differently — 88 px square, 96 px wide, and a 144×176 hero — so the dev surface
 * shows all three side by side. That is how you catch a bag whose artwork only
 * reads big.
 */
export default function PackPreviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-extrabold text-white">Paketpåsar</h1>
      <p className="mt-1 text-sm text-slate-400">{PACKS.length} påsar, i tre storlekar.</p>

      <div className="mt-8 flex flex-wrap items-start gap-8">
        {PACKS.map((pack) => (
          <div key={pack.id} className="flex flex-col items-center gap-3">
            <span className="text-[11px] font-bold text-white">
              <span data-no-translate>{pack.name}</span>
            </span>
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <PackArt pack={pack} className="h-[5.5rem] w-[5.5rem] rounded-2xl" />
                <span className="text-[10px] text-slate-500">5.5rem</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <PackArt pack={pack} className="h-44 w-36 rounded-3xl" variant="hero" />
                <span className="text-[10px] text-slate-500">hero</span>
              </div>
            </div>
            <PackArt pack={pack} className="h-24 w-40 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
