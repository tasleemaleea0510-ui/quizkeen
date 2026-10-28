import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import CopyButton from "@/components/copy-button";
import ActionForm from "@/components/action-form";
import PageHeader, { HeaderStat } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { createClassroom, joinClassroom, addCoTeacher, createAssignment, setQuizPrivate, deleteAssignment, clearAssignments } from "./actions";
import { 
  School, 
  GraduationCap, 
  Plus, 
  Users, 
  BookOpen, 
  Lock, 
  Unlock, 
  Trash2, 
  KeyRound, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Target,
  HelpCircle
} from "lucide-react";

export default async function ClassroomPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");
  const isTeacher = profile.role === "TEACHER";

  // the room list and the teacher's own quizzes are independent queries
  const [myRooms, myQuizzes] = await Promise.all([
    prisma.classroom.findMany({
      where: { OR: [{ ownerId: user.id }, { coTeacherId: user.id }] },
      include: {
        enrollments: { include: { student: true } },
        owner: true,
        coTeacher: true,
        assignments: { include: { _count: { select: { completions: true } }, targetStudent: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    isTeacher
      ? prisma.quiz.findMany({ where: { creatorId: user.id }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);

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

  // The two header numbers a student actually cares about: how many homework
  // tasks are open, and how many of them are already handed in.
  const allAssignments = myClasses.flatMap((c) => c.classroom.assignments);
  const openAssignments = allAssignments.filter((a) => a.completions.length === 0).length;
  const doneAssignments = allAssignments.length - openAssignments;

  return (
    <div data-accent="sky" className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        accent="sky"
        eyebrow={isTeacher ? "Lärarläge" : "Dina klasser"}
        icon={School}
        title={
          <>
            Klass<span className="text-shine">rum</span>
          </>
        }
        lead={
          isTeacher
            ? "Skapa rum, dela join-koden, lägg ut läxor och följ upp varje elev — allt på ett ställe."
            : "Dina klasser, läxorna som väntar och resultaten. Lämna in i tid så får du bonus-XP."
        }
        chips={
          isTeacher ? (
            <>
              <HeaderStat icon={School} label="klassrum" value={myRooms.length} />
              <HeaderStat
                icon={Users}
                label="elever"
                value={myRooms.reduce((n, r) => n + r.enrollments.length, 0)}
                tone="violet"
              />
              <HeaderStat icon={BookOpen} label="quizar" value={myQuizzes.length} tone="emerald" />
              <Badge tone="sky" icon={GraduationCap}>
                Lärarläge
              </Badge>
            </>
          ) : (
            <>
              <HeaderStat icon={School} label="klasser" value={myClasses.length} />
              <HeaderStat icon={BookOpen} label="öppna läxor" value={openAssignments} tone="amber" />
              <HeaderStat icon={CheckCircle2} label="inlämnade" value={doneAssignments} tone="emerald" />
            </>
          )
        }
      />

      {isTeacher ? (
        <>
          {myRooms.length === 0 && (
            <Card className="mt-6 border-emerald-500/40 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="text-emerald-400 text-base flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>Kom igång som lärare</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  <li><b>Skapa ett klassrum</b> nedan — du får en join-kod direkt.</li>
                  <li><b>Dela koden</b> med eleverna — de ansluter via Klassrum &rarr; Gå med.</li>
                  <li><b>Ge ut läxor</b> — till hela klassen eller en specifik elev, med deadline och prov-läge.</li>
                  <li><b>Lås quizar</b> — gör frågesporter exklusiva för dina elever.</li>
                  <li><b>Följ upp i Analys</b> — få realtidsöversikt över resultat och deltagande.</li>
                </ol>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-400 text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Skapa nytt klassrum</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={createClassroom} className="flex flex-wrap gap-2.5" pendingLabel="Skapar klassrum…">
                <Input name="name" placeholder="Klassens namn (t.ex. 8A Biologi)" required className="max-w-xs" />
                <Input name="description" placeholder="Beskrivning (valfritt)" className="max-w-xs" />
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>Skapa klassrum</span>
                </Button>
              </ActionForm>
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Endast lärare kan skapa klassrum — elever ansluter via join-kod.</span>
              </p>
            </CardContent>
          </Card>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
            {myRooms.map((room) => {
              const privateQuizzes = myQuizzes.filter((q) => q.isPrivate && q.classroomId === room.id);
              const publicQuizzes = myQuizzes.filter((q) => !q.isPrivate);
              return (
                <Card key={room.id} className="border-white/10">
                  <CardHeader className="pb-3 border-b border-white/10">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <School className="h-4 w-4 text-blue-400" />
                        <span>{room.name}</span>
                      </span>
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{room.enrollments.length} elever</span>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {room.description && <p className="text-xs text-slate-400">{room.description}</p>}

                    <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5">
                      <span className="text-xs text-slate-300 font-medium">Join-kod för elever:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono font-bold tracking-widest text-blue-300">{room.joinCode}</span>
                        <CopyButton text={room.joinCode} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {room.enrollments.length === 0 && <p className="text-xs text-slate-500">Inga elever anslutna än — dela koden ovan.</p>}
                      {room.enrollments.map((e) => (
                        <span key={e.id} className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300" data-no-translate>
                          {e.student.username}
                        </span>
                      ))}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Skapa läxa</span>
                      </p>
                      <form action={createAssignment} className="space-y-2.5">
                        <input type="hidden" name="classroomId" value={room.id} />
                        <select name="quizId" className="w-full rounded-lg border border-white/12 bg-slate-950 px-3 py-1.5 text-xs text-white">
                          {myQuizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
                        </select>
                        <div className="flex flex-wrap items-center gap-2">
                          <select name="studentId" className="rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1 text-xs text-white">
                            <option value="">Hela klassen</option>
                            {room.enrollments.map((e) => (
                              <option key={e.id} value={e.studentId}>{e.student.username}</option>
                            ))}
                          </select>
                          <input type="date" name="dueDate" className="rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1 text-xs text-white" />
                          <input type="number" name="bonusXP" defaultValue={20} placeholder="XP" className="w-20 rounded-lg border border-white/12 bg-slate-950 px-2 py-1 text-xs text-white" />
                          <label className="flex items-center gap-1 text-xs text-slate-300">
                            <input type="checkbox" name="provlage" />
                            <span>Prov-läge</span>
                          </label>
                        </div>
                        <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 text-xs">
                          Tilldela läxa
                        </Button>
                      </form>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Tilldelade läxor ({room.assignments.length})</span>
                        </p>
                        {room.assignments.length > 0 && (
                          <form action={clearAssignments}>
                            <input type="hidden" name="classroomId" value={room.id} />
                            <button type="submit" className="flex items-center gap-1 rounded bg-red-600/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-600 hover:text-white transition-colors">
                              <Trash2 className="h-2.5 w-2.5" />
                              <span>Rensa</span>
                            </button>
                          </form>
                        )}
                      </div>
                      <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                        {room.assignments.length === 0 && <p className="text-xs text-slate-500">Inga läxor tilldelade ännu.</p>}
                        {room.assignments.map((a) => (
                          <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300 border border-white/10">
                            <div className="flex items-center gap-2">
                              <span>{a.title}</span>
                              {a.provlage && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">PROV</span>}
                              {a.targetStudent && (
                                <span className="text-[10px] text-indigo-300" data-no-translate>
                                  ({a.targetStudent.username})
                                </span>
                              )}
                              <span className="text-slate-500 text-[11px]">• {a._count.completions}/{room.enrollments.length} klara</span>
                            </div>
                            <form action={deleteAssignment}>
                              <input type="hidden" name="assignmentId" value={a.id} />
                              <button type="submit" title="Radera läxa" className="text-slate-500 hover:text-red-400 transition-colors p-1">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    </div>

                    <details className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Klass-låsta quizar ({privateQuizzes.length})</span>
                      </summary>
                      <form action={setQuizPrivate} className="mt-2.5 flex gap-2">
                        <input type="hidden" name="classroomId" value={room.id} />
                        <input type="hidden" name="on" value="1" />
                        <select name="quizId" className="flex-1 rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1 text-xs text-white">
                          {publicQuizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
                        </select>
                        <Button type="submit" size="sm" variant="outline" className="text-xs">Lås</Button>
                      </form>
                      <div className="mt-2 space-y-1">
                        {privateQuizzes.map((q) => (
                          <form key={q.id} action={setQuizPrivate} className="flex items-center justify-between text-xs text-slate-400">
                            <input type="hidden" name="classroomId" value={room.id} />
                            <input type="hidden" name="on" value="0" />
                            <input type="hidden" name="quizId" value={q.id} />
                            <span>{q.title}</span>
                            <button type="submit" className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:bg-slate-700">Gör offentlig</button>
                          </form>
                        ))}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <Card className="mt-6 border-white/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-400" />
                <span>Gå med i ett klassrum</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={joinClassroom} className="flex flex-wrap gap-2.5" pendingLabel="Går med…">
                <Input name="code" placeholder="Join-kod (6 tecken)" required className="max-w-xs font-mono uppercase" />
                <Button type="submit" className="gap-1.5">
                  <span>Gå med</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </ActionForm>
            </CardContent>
          </Card>

          {myClasses.map((e) => (
            <div key={e.id} className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <School className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-xl font-bold text-white">{e.classroom.name}</h2>
                </div>
                <span className="text-xs text-slate-400">
                  Lärare: <span data-no-translate>{e.classroom.owner.username}</span>
                </span>
              </div>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <span>Dina läxor</span>
              </h3>
              <div className="mt-3 space-y-2">
                {e.classroom.assignments.filter((a) => !a.targetStudentId || a.targetStudentId === user.id).length === 0 && (
                  <p className="text-xs text-slate-500 py-3">Inga aktiva läxor för tillfället.</p>
                )}
                {e.classroom.assignments.filter((a) => !a.targetStudentId || a.targetStudentId === user.id).map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{a.title}</p>
                        {a.provlage && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">PROV</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        +{a.bonusXP} bonus-XP {a.dueDate && `• Senast ${new Date(a.dueDate).toLocaleDateString("sv-SE")}`}
                      </p>
                    </div>
                    {a.completions.length > 0 ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-600/20 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Klar ({a.completions[0].score}%)</span>
                      </span>
                    ) : (
                      <Link href={`/lexa/${a.id}`}>
                        <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs">
                          <Play className="h-3 w-3 fill-current" />
                          <span>Gör läxan</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>Klass-bibliotek</span>
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.classroom.owner.flashcardsCreated.map((c) => (
                  <Link key={c.id} href={`/flashcards/${c.id}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-indigo-500/40 transition-colors flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{c.title}</span>
                  </Link>
                ))}
                {e.classroom.owner.flashcardsCreated.length === 0 && <p className="text-xs text-slate-500">Inga samlingar delade ännu.</p>}
              </div>
            </div>
          ))}
          {myClasses.length === 0 && (
            <div className="mt-8 py-12 text-center text-sm text-slate-500 rounded-2xl border border-dashed border-white/10">
              Du är inte med i något klassrum än. Be din lärare om en join-kod!
            </div>
          )}
        </>
      )}
    </div>
  );
}