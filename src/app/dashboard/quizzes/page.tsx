import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Play, Gamepad2 } from "lucide-react";

export default async function QuizzesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const quizzes = await prisma.quiz.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-white">Mina quizar</h1>
        <Link href="/dashboard/quizzes/new">
          <Button className="gap-1.5 bg-indigo-600 hover:bg-indigo-500">
            <Plus className="h-4 w-4" />
            <span>Ny quiz</span>
          </Button>
        </Link>
      </div>
      <div className="mt-8 space-y-3">
        {quizzes.length === 0 && (
          <Card className="border-slate-800">
            <CardContent className="py-12 text-center text-sm text-slate-400">
              Du har inte skapat några quizar än. Skapa din första med knappen ovan!
            </CardContent>
          </Card>
        )}
        {quizzes.map((q) => (
          <Card key={q.id} className="border-slate-800 hover:border-slate-700 transition-colors">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-white">{q.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{q._count.questions} frågor</p>
              </div>
              <Link href={`/host/${q.id}`}>
                <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-500">
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Starta</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}