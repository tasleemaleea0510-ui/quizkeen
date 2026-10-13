"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createQuiz } from "./actions";
import { Plus, Save, Check, CheckCircle2 } from "lucide-react";

const OPTION_COLORS = ["bg-rose-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500"];

type QuestionDraft = { text: string; options: string[]; correct: number };

export default function NewQuizPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { text: "", options: ["", "", "", ""], correct: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  function updateQuestion(i: number, text: string) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, text } : q)));
  }
  function updateOption(i: number, oi: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, idx) =>
        idx === i ? { ...q, options: q.options.map((o, x) => (x === oi ? value : o)) } : q
      )
    );
  }
  function setCorrect(i: number, oi: number) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, correct: oi } : q)));
  }

  async function save() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await createQuiz(user.id, title, questions);
    router.push("/dashboard/quizzes");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-3xl font-extrabold text-white">Skapa en quiz</h1>
      </div>
      <Input
        placeholder="Quiztitel (t.ex. Matematik kap. 2)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-base"
      />
      <div className="mt-8 space-y-6">
        {questions.map((q, i) => (
          <Card key={i} className="border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800/80">
              <CardTitle className="text-sm font-semibold text-slate-300">Fråga {i + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Input placeholder="Skriv din fråga här..." value={q.text} onChange={(e) => updateQuestion(i, e.target.value)} />
              <div className="grid gap-2.5 sm:grid-cols-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrect(i, oi)}
                      title="Klicka för att markera som rätt svar"
                      className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        OPTION_COLORS[oi]
                      } ${
                        q.correct === oi ? "ring-4 ring-white scale-105 text-white" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      {q.correct === oi ? <Check className="h-4 w-4" /> : oi + 1}
                    </button>
                    <Input placeholder={`Alternativ ${oi + 1}`} value={opt} onChange={(e) => updateOption(i, oi, e.target.value)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">Markera knappen för det alternativ som är det korrekta svaret.</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <Button
          variant="outline"
          onClick={() => setQuestions((qs) => [...qs, { text: "", options: ["", "", "", ""], correct: 0 }])}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Lägg till fråga</span>
        </Button>
        <Button onClick={save} disabled={saving || !title} className="gap-1.5 bg-indigo-600 hover:bg-indigo-500">
          <Save className="h-4 w-4" />
          <span>{saving ? "Sparar..." : "Spara quiz"}</span>
        </Button>
      </div>
    </div>
  );
}