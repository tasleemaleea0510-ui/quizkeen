import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader, { HeaderStat } from "@/components/page-header";
import Progress from "@/components/ui/progress";
import { giveStudentXP, warnStudent, setClassMessage } from "../actions";
import { 
  BarChart3, 
  GraduationCap, 
  School, 
  Send, 
  FileText, 
  AlertTriangle, 
  Award,
  Clock,
  Users,
  Target
} from "lucide-react";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.role !== "TEACHER") redirect("/classroom");

  const rooms = await prisma.classroom.findMany({
    where: { OR: [{ ownerId: user.id }, { coTeacherId: user.id }] },
    include: {
      enrollments: { include: { student: { include: { completions: true } } } },
      assignments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const students = rooms.reduce((n, r) => n + r.enrollments.length, 0);
  const assignments = rooms.reduce((n, r) => n + r.assignments.length, 0);
  const handedIn = rooms.reduce(
    (n, r) => n + r.enrollments.reduce((m, e) => m + e.student.completions.length, 0),
    0
  );
  const expected = students * assignments;
  const handInRate = expected ? Math.round((handedIn / expected) * 100) : 0;
  const needHelp = rooms.reduce(
    (n, r) =>
      n +
      r.enrollments.filter(
        (e) => r.assignments.length > 0 && e.student.completions.filter((c) => r.assignments.some((a) => a.id === c.assignmentId)).length === 0
      ).length,
    0
  );

  return (
    <div data-accent="sky" className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        accent="sky"
        eyebrow="Analys · lärarläge"
        icon={BarChart3}
        title={
          <>
            Hur går det för <span className="text-shine">klassen</span>?
          </>
        }
        lead="Realtidssiffror per klass: hur många som lämnat in, vem som ligger efter och vilka som behöver en knuff. Sänd ett klassmeddelande direkt härifrån — eleverna ser det live."
        chips={
          <>
            <HeaderStat icon={School} label="klasser" value={rooms.length} />
            <HeaderStat icon={Users} label="elever" value={students} tone="violet" />
            <HeaderStat icon={FileText} label="läxor" value={assignments} tone="sky" />
            <HeaderStat icon={Target} label="inlämnat" value={`${handInRate}%`} tone="emerald" />
            <HeaderStat icon={Clock} label="ligger efter" value={needHelp} tone="amber" />
          </>
        }
      />

      {rooms.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
          Inga klassrum ännu — skapa ett först!
        </p>
      )}
      
      <div className="mt-8 space-y-8">
        {rooms.map((room) => {
          const assignmentIds = room.assignments.map((a) => a.id);
          return (
            <Card key={room.id} className="border-blue-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5 text-blue-400" />
                  <span>{room.name}</span>
                  <span className="text-sm font-normal text-slate-400">· {room.enrollments.length} elever</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={setClassMessage} className="flex gap-2">
                  <input type="hidden" name="classroomId" value={room.id} />
                  <input 
                    name="message" 
                    defaultValue={room.message ?? ""} 
                    placeholder="Klass-meddelande (syns live för eleverna)" 
                    className="flex-1 rounded-xl border border-white/12 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500" 
                  />
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 gap-1.5 font-semibold">
                    <Send className="h-3.5 w-3.5" />
                    <span>Sänd</span>
                  </Button>
                </form>

                <div className="space-y-2">
                  {room.enrollments.length === 0 && <p className="text-sm text-slate-500">Inga elever ännu.</p>}
                  {room.enrollments.map((e) => {
                    const done = e.student.completions.filter((c) => assignmentIds.includes(c.assignmentId)).length;
                    const slacking = room.assignments.length > 0 && done === 0;
                    return (
                      <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white flex items-center gap-2">
                            <span>{e.student.username}</span>
                            {slacking && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-400">
                                <Clock className="h-3 w-3" /> eftersläpning
                              </span>
                            )}
                          </p>
                          {/* The level bar is computed from XP, so a staff reset in
                              the console shows up here as level 1 immediately. */}
                          <div className="mt-2 max-w-xs">
                            <Progress xp={e.student.xp} />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span data-no-translate>{e.student.xp} XP</span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-slate-500" />
                              {done}/{room.assignments.length} läxor
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              {e.student.warnings}/3 varningar
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <form action={giveStudentXP}>
                            <input type="hidden" name="studentId" value={e.studentId} />
                            <input type="hidden" name="classroomId" value={room.id} />
                            <button 
                              type="submit" 
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                            >
                              <Award className="h-3 w-3" />
                              <span>+5 XP</span>
                            </button>
                          </form>
                          <form action={warnStudent}>
                            <input type="hidden" name="studentId" value={e.studentId} />
                            <input type="hidden" name="classroomId" value={room.id} />
                            <button 
                              type="submit" 
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              <span>Varna</span>
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}