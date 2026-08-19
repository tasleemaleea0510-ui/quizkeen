import { PrismaClient } from "@prisma/client";

const raw = new PrismaClient();

export const prisma = raw.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }: any) {
        const result = await query(args);
        try {
          const d: any = args?.data ?? {};
          let uid: string | null = null;
          let text: string | null = null;
          if (model === "Quiz") { uid = d.creatorId; text = `🎯 skapade quizzen ${d.title}`; }
          else if (model === "FlashcardCollection") { uid = d.creatorId; text = `🃏 skapade gloskortleken ${d.title}`; }
          else if (model === "GameSession") { uid = d.hostId; text = `🎮 startade ett live-spel (PIN ${d.pin})`; }
          else if (model === "Participant") { uid = d.studentId; text = "🏃 hoppade in i ett live-spel"; }
          else if (model === "Enrollment") { uid = d.studentId; text = "🔑 gick med i ett klassrum"; }
          else if (model === "Classroom") { uid = d.ownerId; text = `🏫 skapade klassrummet ${d.name}`; }
          if (uid && text) {
            const p = await raw.profile.findUnique({ where: { id: uid }, select: { username: true } });
            if (p) await raw.activity.create({ data: { username: p.username, action: text } });
          }
        } catch {}
        return result;
      },
      async update({ model, args, query }: any) {
        const result = await query(args);
        try {
          if (model === "GameSession" && (args?.data as any)?.status) {
            const g = await raw.gameSession.findUnique({
              where: { id: (args.where as any)?.id },
              include: { host: { select: { username: true } } },
            });
            if (g) await raw.activity.create({ data: { username: g.host.username, action: `🎮 spelstatus → ${(args.data as any).status}` } });
          }
        } catch {}
        return result;
      },
    },
  },
});