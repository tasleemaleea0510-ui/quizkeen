"use client";
import { useEffect, useState } from "react";
import { getMyClassMessages } from "@/app/classroom/actions";

export default function ClassBanner() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    getMyClassMessages().then(setMsg);
    const iv = setInterval(async () => setMsg(await getMyClassMessages()), 10000);
    return () => clearInterval(iv);
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed left-0 right-0 top-28 z-30 border-b border-blue-500/40 bg-blue-600/10 px-4 py-2 text-center text-sm font-bold text-blue-300 backdrop-blur">
      🍎 {msg}
    </div>
  );
}