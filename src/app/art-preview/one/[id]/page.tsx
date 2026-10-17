import KeenAvatar from "@/components/keens/keen-avatar";
import { KEENS, KEEN_BY_ID } from "@/lib/keens";
import { keenRunnerDataUri } from "@/lib/keen-art";
import { notFound } from "next/navigation";

export const dynamic = "force-static";

export function generateStaticParams() {
  return KEENS.map((k) => ({ id: k.id }));
}

/**
 * One Keen, big, on a plain background — a dev surface for checking a drawing
 * without the page furniture around it.
 */
export default function OneKeenPage({ params }: { params: { id: string } }) {
  const keen = KEEN_BY_ID[params.id];
  if (!keen) notFound();

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-[#0b1120]">
      <style>{`header, footer, nav, aside { display: none !important }`}</style>
      <div className="flex items-end gap-10">
        <KeenAvatar keen={keen} size={380} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={keenRunnerDataUri(keen, 512)} width={120} height={120} alt="" />
      </div>
    </div>
  );
}
