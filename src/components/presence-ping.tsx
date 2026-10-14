"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pingPresence } from "@/app/system/actions";

export default function PresencePing() {
  const path = usePathname();
  useEffect(() => {
    // Best-effort ping: the next tick retries, so a failed fetch is swallowed.
    async function ping() { await pingPresence(path).catch(() => {}); }
    ping();
    const iv = setInterval(ping, 15000);
    return () => clearInterval(iv);
  }, [path]);
  return null;
}