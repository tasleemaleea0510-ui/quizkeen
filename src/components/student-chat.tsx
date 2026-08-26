"use client";
import { useRouter } from "next/navigation";

export default function StudentChatBubble() {
  const router = useRouter();
  return (
    <button onClick={() => router.push("/chat")}
      className="fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl shadow-2xl shadow-indigo-500/40 hover:scale-110 hover:bg-indigo-500">
      💬
    </button>
  );
}