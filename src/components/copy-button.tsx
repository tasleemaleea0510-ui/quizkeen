"use client";

export default function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="ml-auto rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white"
    >
      📋 Kopiera
    </button>
  );
}