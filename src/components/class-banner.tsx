"use client";
import { useEffect, useState } from "react";
import { getMyClassMessages } from "@/app/classroom/actions";
import { School } from "lucide-react";

export default function ClassBanner() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    getMyClassMessages().then(setMsg).catch(() => {});
    const iv = setInterval(async () => {
      try { setMsg(await getMyClassMessages()); } catch {}
    }, 10000);
    return () => clearInterval(iv);
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed left-0 right-0 top-16 z-30 border-b border-blue-500/40 bg-blue-600/10 px-4 py-2 text-center text-sm font-semibold text-blue-300 backdrop-blur flex items-center justify-center gap-2">
      <School className="h-4 w-4 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}