"use client";

import { useRef, useState } from "react";
import NameColorPicker from "@/components/name-color-picker";
import { updateAccentColor } from "./actions";

/**
 * Picking a colour submits immediately; there is no separate save button to
 * forget. The hidden input is written before the submit so the posted value is
 * the one just clicked, not the previous render's.
 */
export default function ColorForm({ initial }: { initial: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [color, setColor] = useState<string | null>(initial);

  return (
    <div className="space-y-3">
      <form ref={formRef} action={updateAccentColor} className="hidden">
        <input ref={inputRef} type="hidden" name="color" defaultValue={initial ?? ""} />
      </form>
      <NameColorPicker
        value={color}
        onPick={(next) => {
          setColor(next);
          if (inputRef.current) inputRef.current.value = next ?? "";
          formRef.current?.requestSubmit();
        }}
      />
      <p className="text-xs text-slate-500">
        Färgen syns på ditt namn i menyn och i personalens listor. Rollfärgen används om du inte väljer någon.
      </p>
    </div>
  );
}
