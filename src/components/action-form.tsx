"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

/**
 * What a classroom action reports back.
 *
 * The actions used to return `void`, which meant a wrong join code and a
 * successful join looked exactly the same to the browser: nothing. They now
 * answer with a result so the form can say what happened.
 */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/**
 * A form whose action also refreshes the page it is on.
 *
 * `revalidatePath` in a server action marks the route stale for the *next*
 * request; this makes the browser ask for that request straight away, so the
 * thing you just created or joined is on screen without a manual reload.
 */
export default function ActionForm({
  action,
  children,
  className,
  pendingLabel = "Sparar…",
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setResult(null);

    startTransition(async () => {
      let next: ActionResult;
      try {
        next = await action(data);
      } catch {
        next = { ok: false, error: "Kunde inte nå servern — försök igen." };
      }
      setResult(next);
      if (next.ok) {
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={className} aria-busy={pending}>
      {children}
      <p
        aria-live="polite"
        className={
          result || pending
            ? "mt-2.5 flex w-full items-center gap-1.5 text-xs font-medium"
            : "sr-only"
        }
      >
        {pending ? (
          <span className="flex items-center gap-1.5 text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{pendingLabel}</span>
          </span>
        ) : result?.ok ? (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{result.message ?? "Klart!"}</span>
          </span>
        ) : result ? (
          <span className="flex items-center gap-1.5 text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{result.error}</span>
          </span>
        ) : null}
      </p>
    </form>
  );
}
