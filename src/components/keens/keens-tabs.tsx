"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, LayoutGrid, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/keens", label: "Min samling", icon: LayoutGrid },
  { href: "/keens/packs", label: "Paket", icon: Coins },
  { href: "/keens/market", label: "Marknad", icon: Store },
];

export default function KeensTabs({ freeReady, dupes }: { freeReady: boolean; dupes: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-1.5 backdrop-blur-xl">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        const showFreeDot = tab.href === "/keens/packs" && freeReady;
        const showDupes = tab.href === "/keens/market" && dupes > 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
              active
                ? "bg-gradient-to-b from-indigo-500/25 to-indigo-600/15 text-white shadow-glow-sm ring-1 ring-inset ring-indigo-400/30"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {showFreeDot && (
              <span
                data-no-translate
                className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-keen-pulse"
                title="Gratispaket tillgängligt"
              />
            )}
            {showDupes && (
              <span
                data-no-translate
                className="ml-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-1.5 py-px text-[10px] font-extrabold text-amber-200"
              >
                {dupes}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
