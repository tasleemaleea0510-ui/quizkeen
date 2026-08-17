import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClassroom, joinClassroom, addCoTeacher, createAssignment, setQuizPrivate } from "./actions";
import CopyButton from "@/components/copy-button";

export default async function ClassroomPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect("/register");
  const isTeacher = profile.role === "TEACHER";

  const myRooms = await prisma.classroom.findMany({
    where: { OR: [{ ownerId: user.id }, { coTeacherId: user.id }] },
    include: {
      enrollments: { include: { student: true } },
      owner: true,
      coTeacher: true,
      assignments: { include: { _count: { select: { completions: true } } }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const myQuizzes = isTeacher
    ? await prisma.quiz.findMany({ where: { creatorId: user.id }, orderBy: { createdAt: "desc" } })
    : [];

  const myClasses = !isTeacher
    ? await prisma.enrollment.findMany({
        where: { studentId: user.id },
        include: {
          classroom: {
            include: {
              owner: { include: { flashcardsCreated: true } },
              assignments: { include: { quiz: true, completions: { where: { studentId: user.id } } } },
            },
          },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">
        🏫 Klassrum {isTeacher && <span className="text-blue-500">— 🍎 Lärarläge</span>}
      </h1>

      {isTeacher ? (
        <>
                  {myRooms.length === 0 && (
            <Card className="mt-6 border-emerald-500/40 bg-emerald-500/5">
              <CardHeader><CardTitle className="text-emerald-400">🚀 Kom igång som lärare</CardTitle></CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  <li>🏫 <b>Skapa ett klassrum</b> nedan — du får en join-kod direkt.</li>
                  <li>🔑 <b>Dela koden</b> med eleverna — de går med via 🏫 Klassrum → "Gå med".</li>
                  <li>📝 <b>Ge ut läxor</b> — välj en quiz, sätt deadline + bonus-XP, eller ⏱️ prov-läge (1 försök + shuffle = anti-fusk!).</li>
                  <li>🔒 <b>Privata quizar</b> — lås en quiz till klassen så bara dina elever ser den.</li>
                  <li>📊 <b>Öppna 📊 Analys</b> i menyn — se vem som slarvar 😴, ge 🎁 +5 XP och ⚠️ varningar (3 st = ägaren meddelas!).</li>
                  <li>📢 <b>Klass-meddelande</b> — syns som blå banderoll LIVE för alla dina elever!</li>
                </ol>
              </CardContent>
            </Card>
          )}
          <Card className="mt-6 border-blue-500/40">
            <CardHeader><CardTitle className="text-blue-500">✨ Skapa nytt klassrum</CardTitle></CardHeader>
            <CardContent>
              <form action={createClassroom} className="flex flex-wrap gap-2">
                <Input name="name" placeholder="Klassens namn (t.ex. 7B)" required className="max-w-xs" />
                <Input name="description" placeholder="Beskrivning (valfritt)" className="max-w-xs" />
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500">🏫 Skapa</Button>
              </form>
              <p className="mt-2 text-xs text-slate-500">🔒 Endast lärare kan skapa klassrum — elever går med med en kod.</p>
            </CardContent>
          </Card>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {myRooms.map((room) => {
              const privateQuizzes = myQuizzes.filter((q) => q.isPrivate && q.classroomId === room.id);
              const publicQuizzes = myQuizzes.filter((q) => !q.isPrivate);
              return (
                <Card key={room.id} className="border-blue-500/30">
                  <CardHeader><CardTitle>🏫 {room.name}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {room.description && <p className="text-sm text-slate-400">{room.description}</p>}
                    <div className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2">
                      <span className="text-sm text-slate-300">Join-kod:</span>
                      <span className="text-xl font-extrabold tracking-widest text-blue-300">{room.joinCode}</span>
                      <CopyButton text={room.joinCode} />
                    </div>
                    <p className="text-sm font-bold text-slate-300">👥 Elever ({room.enrollments.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {room.enrollments.length === 0 && <p className="text-xs text-slate-500">Inga elever än — dela koden!</p>}
                      {room.enrollments.map((e) => (
                        <span key={e.id} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-300">{e.student.username}</span>
                      ))}
                    </div>

                    <div className="rounded-xl border border-slate-800 p-3">
                      <p className="text-sm font-bold text-blue-400">📝 Skapa läxa</p>
                      <form action={createAssignment} className="mt-2 space-y-2">
                        <input type="hidden" name="classroomId" value={room.id} />
                        <select name="quizId" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white">
                          {myQuizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
                        </select>
                        <div className="flex flex-wrap gap-2">
                          <input type="date" name="dueDate" className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                          <input type="number" name="bonusXP" defaultValue={20} placeholder="bonus-XP" className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                          <label className="flex items-center gap-1 text-xs text-slate-300">
                            <input type="checkbox" name="provlage" /> ⏱️ Prov-läge (1 försök, shuffle)
                          </label>
                        </div>
                        <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500">📝 Ge ut läxa</Button>
                      </form>
                      <div className="mt-3 space-y-1">
                        {room.assignments.map((a) => (
                          <p key={a.id} className="text-xs text-slate-400">
                            {a.title} {a.provlage && "⏱️"} · {a._count.completions}/{room.enrollments.length} klara
                            {a.dueDate && <span className="text-slate-500"> · senast {new Date(a.dueDate).toLocaleDateString("sv-SE")}</span>}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 p-3">
                      <p className="text-sm font-bold text-blue-400">🔒 Privata quizar (endast denna klass)</p>
                      <form action={setQuizPrivate} className="mt-2 flex gap-2">
                        <input type="hidden" name="classroomId" value={room.id} />
                        <input type="hidden" name="on" value="1" />
                        <select name="quizId" className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white">
                          {publicQuizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
                        </select>
                        <Button type="submit" size="sm" variant="outline">🔒</Button>
                      </form>
                      <div className="mt-2 space-y-1">
                        {privateQuizzes.map((q) => (
                          <form key={q.id} action={setQuizPrivate} className="flex items-center justify-between text-xs text-slate-400">
                            <input type="hidden" name="classroomId" value={room.id} />
                            <input type="hidden" name="on" value="0" />
                            <input type="hidden" name="quizId" value={q.id} />
                            <span>🔒 {q.title}</span>
                            <button type="submit" className="rounded bg-slate-800 px-2 py-0.5 font-bold text-slate-300">🔓 Gör offentlig</button>
                          </form>
                        ))}
                      </div>
                    </div>

                    {room.ownerId === user.id && (
                      <form action={addCoTeacher} className="flex gap-2">
                        <input type="hidden" name="roomId" value={room.id} />
                        <Input name="username" placeholder="Bjud in med-lärare (användarnamn)" className="max-w-xs" />
                        <Button type="submit" variant="outline">🧑‍ Bjud in</Button>
                      </form>
                    )}
                    {room.coTeacher && <p className="text-xs text-slate-400">🧑‍🏫 Med-lärare: <b className="text-blue-300">{room.coTeacher.username}</b></p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <Card className="mt-6">
            <CardHeader><CardTitle>🔑 Gå med i klassrum</CardTitle></CardHeader>
            <CardContent>
              <form action={joinClassroom} className="flex gap-2">
                <Input name="code" placeholder="Join-kod (6 tecken)" required className="max-w-xs" />
                <Button type="submit">🚀 Gå med</Button>
              </form>
            </CardContent>
          </Card>

          {myClasses.map((e) => (
            <div key={e.id} className="mt-8">
              <h2 className="text-xl font-extrabold">🏫 {e.classroom.name} <span className="text-sm font-normal text-slate-400">· 🍎 {e.classroom.owner.username}</span></h2>

              <h3 className="mt-4 font-bold text-blue-400">📬 Dina läxor</h3>
              <div className="mt-2 space-y-2">
                {e.classroom.assignments.length === 0 && <p className="text-sm text-slate-500">Inga läxor än — njut medan du kan 😏</p>}
                {e.classroom.assignments.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                    <div>
                      <p className="font-bold">{a.title} {a.provlage && <span className="text-xs text-amber-400">⏱️ PROV-LÄGE</span>}</p>
                      <p className="text-xs text-slate-500">
                        +{a.bonusXP} bonus-XP {a.dueDate && `· senast ${new Date(a.dueDate).toLocaleDateString("sv-SE")}`}
                      </p>
                    </div>
                    {a.completions.length > 0 ? (
                      <span className="rounded-full bg-emerald-600/20 px-3 py-1 text-sm font-bold text-emerald-400">✅ Klar · {a.completions[0].score}%</span>
                    ) : (
                      <Link href={`/lexa/${a.id}`}><Button size="sm">▶ Gör läxan</Button></Link>
                    )}
                  </div>
                ))}
              </div>

              <h3 className="mt-6 font-bold text-blue-400">🃏 Klass-bibliotek</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {e.classroom.owner.flashcardsCreated.map((c) => (
                  <Link key={c.id} href={`/flashcards/${c.id}`} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-bold text-slate-300 hover:border-blue-500/40">
                    🃏 {c.title}
                  </Link>
                ))}
                {e.classroom.owner.flashcardsCreated.length === 0 && <p className="text-sm text-slate-500">Läraren har inte delat något ännu.</p>}
              </div>
            </div>
          ))}
          {myClasses.length === 0 && (
            <p className="mt-8 text-slate-400">Du är inte med i något klassrum än — be din lärare om koden!</p>
          )}
        </>
      )}
    </div>
  );
}