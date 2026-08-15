import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClassroom, joinClassroom, addCoTeacher } from "./actions";

export default async function ClassroomPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect("/register");
  const isTeacher = profile.role === "TEACHER";

  const myRooms = await prisma.classroom.findMany({
    where: { OR: [{ ownerId: user.id }, { coTeacherId: user.id }] },
    include: { enrollments: { include: { student: true } }, owner: true, coTeacher: true },
    orderBy: { createdAt: "desc" },
  });

  const myClasses = await prisma.enrollment.findMany({
    where: { studentId: user.id },
    include: { classroom: { include: { owner: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">
        🏫 Klassrum {isTeacher && <span className="text-blue-500">— 🍎 Lärarläge</span>}
      </h1>

      {isTeacher ? (
        <>
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
            {myRooms.map((room) => (
              <Card key={room.id} className="border-blue-500/30">
                <CardHeader>
                  <CardTitle>
                    🏫 {room.name}{" "}
                    {room.ownerId !== user.id && <span className="text-xs text-slate-400">(ägare: {room.owner.username})</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {room.description && <p className="text-sm text-slate-400">{room.description}</p>}
                  <div className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2">
                    <span className="text-sm text-slate-300">Join-kod:</span>
                    <span className="text-xl font-extrabold tracking-widest text-blue-300">{room.joinCode}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(room.joinCode)}
                      className="ml-auto rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white"
                    >
                      📋 Kopiera
                    </button>
                  </div>
                  <p className="text-sm font-bold text-slate-300">👥 Elever ({room.enrollments.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {room.enrollments.length === 0 && <p className="text-xs text-slate-500">Inga elever än — dela koden!</p>}
                    {room.enrollments.map((e) => (
                      <span key={e.id} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-300">
                        {e.student.username}
                      </span>
                    ))}
                  </div>
                  {room.ownerId === user.id && (
                    <form action={addCoTeacher} className="flex gap-2">
                      <input type="hidden" name="roomId" value={room.id} />
                      <Input name="username" placeholder="Bjud in med-lärare (användarnamn)" className="max-w-xs" />
                      <Button type="submit" variant="outline">🧑‍🏫 Bjud in</Button>
                    </form>
                  )}
                  {room.coTeacher && (
                    <p className="text-xs text-slate-400">🧑‍🏫 Med-lärare: <b className="text-blue-300">{room.coTeacher.username}</b></p>
                  )}
                </CardContent>
              </Card>
            ))}
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
          <h2 className="mt-8 text-xl font-extrabold">📚 Mina klassrum</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {myClasses.length === 0 && (
              <p className="text-slate-400">Du är inte med i något klassrum än — be din lärare om koden!</p>
            )}
            {myClasses.map((e) => (
              <Card key={e.id}>
                <CardContent className="pt-6">
                  <p className="font-extrabold">{e.classroom.name}</p>
                  <p className="text-sm text-slate-400">🍎 Lärare: {e.classroom.owner.username}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}