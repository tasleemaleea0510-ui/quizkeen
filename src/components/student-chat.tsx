"use client";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

export default function StudentChatBubble() {
  const router = useRouter();
  return (
    <button 
      onClick={() => router.push("/chat")}
      aria-label="Öppna chatt"
      className="fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 hover:scale-110 hover:bg-indigo-500 transition-transform"
    >
      <MessageSquare className="h-6 w-6" />
    </button>
  );
}