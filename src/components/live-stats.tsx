"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getProfileStats } from "@/app/system/actions";

export default function LiveStats({ initial }: { initial: { xp: number; coins: number; level: number } | null }) {
  const router = useRouter();
  const last = useRef(initial ? `${initial.xp}|${initial.coins}|${initial.level}` : "");

  useEffect(() => {
    if (!initial) return;
    const iv = setInterval(async () => {
      const s = await getProfileStats();
      if (!s) return;
      const key = `${s.xp}|${s.coins}|${s.level}`;
      if (key !== last.current) {
        last.current = key;
        router.refresh();
      }
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  return null;
}