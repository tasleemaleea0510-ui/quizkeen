import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { giveStudentXP, warnStudent, setClassMessage } from "../actions";

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">📊 Klass-analytics <span className="text-blue-500">— 🍎 Lärarläge</span></h1>
      {rooms.length === 0 && <p className="mt-6 text-slate-400">Inga klassrum ännu — skapa ett först!</p>}
      <div className="mt-8 space-y-8">
        {rooms.map((room) => {
          const assignmentIds = room.assignments.map((a) => a.id);
          return (
            <Card key={room.id} className="border-blue-500/30">
              <CardHeader>
                <CardTitle>🏫 {room.name} <span className="text-sm text-slate-400">· {room.enrollments.length} elever</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={setClassMessage} className="flex gap-2">
                  <input type="hidden" name="classroomId" value={room.id} />
                  <input name="message" defaultValue={room.message ?? ""} placeholder="📢 Klass-meddelande (syns LIVE för eleverna!)" className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500">📢 Sänd</Button>
                </form>
                <div className="space-y-2">
                  {room.enrollments.length === 0 && <p className="text-sm text-slate-500">Inga elever ännu.</p>}
                  {room.enrollments.map((e) => {
                    const done = e.student.completions.filter((c) => assignmentIds.includes(c.assignmentId)).length;
                    const slacking = room.assignments.length > 0 && done === 0;
                    return (
                      <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                        <div>
                          <p className="font-bold text-white">
                            {e.student.username}
                            {slacking && <span className="ml-2 text-xs font-bold text-amber-400">😴 slarvar!</span>}
                          </p>
                          <p className="text-xs text-slate-400">
                            Lv {e.student.level} · {e.student.xp} XP · 📝 {done}/{room.assignments.length} läxor · ⚠️ {e.student.warnings}/3
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <form action={giveStudentXP}>
                            <input type="hidden" name="studentId" value={e.studentId} />
                            <input type="hidden" name="classroomId" value={room.id} />
                            <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500">🎁 +5 XP</button>
                          </form>
                          <form action={warnStudent}>
                            <input type="hidden" name="studentId" value={e.studentId} />
                            <input type="hidden" name="classroomId" value={room.id} />
                            <button type="submit" className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-500">⚠️ Varna</button>
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