"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createQuiz } from "./actions";

const COLORS = ["🔴", "🔵", "", "🟢"];

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
      <h1 className="text-3xl font-extrabold">➕ Build a Quiz</h1>
      <Input
        className="mt-6"
        placeholder="Quiz title (e.g. Math Battle #1)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="mt-8 space-y-6">
        {questions.map((q, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base">Question {i + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Type the question..." value={q.text} onChange={(e) => updateQuestion(i, e.target.value)} />
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrect(i, oi)}
                      title="Mark as the correct answer"
                      className={`h-9 w-9 shrink-0 rounded-full border-2 text-lg ${
                        q.correct === oi ? "border-white bg-slate-700" : "border-transparent bg-slate-800"
                      }`}
                    >
                      {COLORS[oi]}
                    </button>
                    <Input placeholder={`Answer ${oi + 1}`} value={opt} onChange={(e) => updateOption(i, oi, e.target.value)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">👆 Click the color dot of the CORRECT answer.</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <Button
          variant="outline"
          onClick={() => setQuestions((qs) => [...qs, { text: "", options: ["", "", "", ""], correct: 0 }])}
        >
          ➕ Add Question
        </Button>
        <Button onClick={save} disabled={saving || !title}>
          {saving ? "Saving..." : "💾 Save Quiz"}
        </Button>
      </div>
    </div>
  );
}