import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
        <h1 className="text-3xl font-extrabold">🎯 My Quizzes</h1>
        <Link href="/dashboard/quizzes/new"><Button>➕ New Quiz</Button></Link>
      </div>
      <div className="mt-8 space-y-4">
        {quizzes.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-slate-400">
              No quizzes yet. Create your first one! 👆
            </CardContent>
          </Card>
        )}
        {quizzes.map((q) => (
          <Card key={q.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-bold">{q.title}</p>
                <p className="text-sm text-slate-400">{q._count.questions} questions</p>
              </div>
              <Link href={`/host/${q.id}`}><Button size="sm">▶ Host Live</Button></Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}