"use server";

/**
 * The moderation panel inside QuizKeen itself.
 *
 * QuizKeen Command has the full console, but it is a separate deployment with
 * its own 8-digit codes — needing a second site to answer "ban that kid" is
 * exactly the friction this file removes. Here the caller is already signed in,
 * so the session's Profile.role is the permission, and every action re-checks
 * it against lib/moderation.ts before touching a row.
 */

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { maskIp, flagFor, countryName } from "@/lib/geo";
import {
  ADMIN_COIN_DAILY_CAP,
  OWNER_COIN_MAX_PER_GRANT,
  WARNINGS_BEFORE_BAN,
  WARNING_BAN_MINUTES,
  canDecorate,
  canGiveCoins,
  canModerate,
  canUseOwnerSwitch,
  isStaffRole,
  maxBanMinutes,
  maxMuteMinutes,
  normalizeColor,
  type Actor,
  type StaffRole,
} from "@/lib/moderation";

const GENERIC = "Något gick fel. Försök igen.";
const ONLINE_MS = 90_000;

type Result = { ok: boolean; info: string };

async function staffSession(): Promise<Actor | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const p = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, username: true, role: true },
    });
    if (!p || !isStaffRole(p.role)) return null;
    return { id: p.id, username: p.username, role: p.role as StaffRole };
  } catch {
    return null;
  }
}

async function log(actor: Actor, action: string) {
  await prisma.activity.create({ data: { username: `[${actor.role}]`, action } }).catch(() => {});
}

async function loadTarget(id: string) {
  if (!id) return null;
  return prisma.profile
    .findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        warnings: true,
        bannedUntil: true,
        chatMutedUntil: true,
        coinsFrozen: true,
        shadowed: true,
        ghostMode: true,
        pinned: true,
        lastIp: true,
        ipCountry: true,
        ipCountryCode: true,
        ipCity: true,
        ipAt: true,
      },
    })
    .catch(() => null);
}

function locationFor(
  viewerRole: StaffRole,
  p: { lastIp: string | null; ipCountry: string | null; ipCountryCode: string | null; ipCity: string | null; ipAt: Date | null }
): string | null {
  // Security keeps the door; it does not get to know where anyone lives.
  if (viewerRole === "SECURITY") return null;
  if (!p.ipAt && !p.lastIp) return null;
  const country = p.ipCountryCode ? countryName(p.ipCountryCode, p.ipCountry) : p.ipCountry;
  const bits = [country, p.ipCity, p.lastIp ? maskIp(p.lastIp) : null].filter(Boolean);
  return bits.length ? `${flagFor(p.ipCountryCode)} ${bits.join(" · ")}` : null;
}

// ─── read model ──────────────────────────────────────────────────────────

export type StaffPlayer = {
  id: string;
  username: string;
  role: string;
  level: number;
  coins: number;
  warnings: number;
  bannedUntil: string | null;
  mutedUntil: string | null;
  accentColor: string | null;
  pinned: boolean;
  shadowed: boolean;
  coinsFrozen: boolean;
  ghostMode: boolean;
  online: boolean;
  lastSeenAt: string | null;
  location: string | null;
  coinsGivenToday: number;
};

export type ModerationData = {
  me: { id: string; username: string; role: StaffRole; accentColor: string | null };
  players: StaffPlayer[];
  stats: { total: number; online: number; banned: number };
  coinsBudget: number;
};

/**
 * Everything the panel draws, in one round trip.
 *
 * `coinsGivenToday` is per player and only counts grants made by the person
 * looking, because the 1000/day ceiling is per admin per target — an admin
 * cannot top somebody up by asking a colleague to gift the rest.
 */
export async function getModerationData(): Promise<ModerationData | null> {
  const me = await staffSession();
  if (!me) return null;

  try {
    const [meRow, rows, grants] = await Promise.all([
      prisma.profile.findUnique({ where: { id: me.id }, select: { accentColor: true } }),
      prisma.profile.findMany({
        orderBy: [{ pinned: "desc" }, { lastSeenAt: { sort: "desc", nulls: "last" } }],
        take: 300,
        select: {
          id: true,
          username: true,
          role: true,
          level: true,
          coins: true,
          warnings: true,
          bannedUntil: true,
          chatMutedUntil: true,
          accentColor: true,
          pinned: true,
          shadowed: true,
          coinsFrozen: true,
          ghostMode: true,
          lastSeenAt: true,
          lastIp: true,
          ipCountry: true,
          ipCountryCode: true,
          ipCity: true,
          ipAt: true,
        },
      }),
      prisma.coinGrant
        .groupBy({
          by: ["targetId"],
          where: { staffId: me.id, createdAt: { gte: startOfDay() } },
          _sum: { amount: true },
        })
        .catch(() => [] as { targetId: string; _sum: { amount: number | null } }[]),
    ]);

    const givenByTarget = new Map<string, number>();
    for (const g of grants) givenByTarget.set(g.targetId, g._sum.amount ?? 0);

    const now = Date.now();
    const players = rows.map((p) => ({
      id: p.id,
      username: p.username,
      role: p.role,
      level: p.level,
      coins: p.coins,
      warnings: p.warnings,
      bannedUntil: p.bannedUntil && p.bannedUntil.getTime() > now ? p.bannedUntil.toISOString() : null,
      mutedUntil: p.chatMutedUntil && p.chatMutedUntil.getTime() > now ? p.chatMutedUntil.toISOString() : null,
      accentColor: p.accentColor,
      pinned: p.pinned,
      shadowed: p.shadowed,
      coinsFrozen: p.coinsFrozen,
      ghostMode: p.ghostMode,
      online: !!p.lastSeenAt && now - p.lastSeenAt.getTime() < ONLINE_MS,
      lastSeenAt: p.lastSeenAt ? p.lastSeenAt.toISOString() : null,
      location: locationFor(me.role, p),
      coinsGivenToday: givenByTarget.get(p.id) ?? 0,
    }));

    return {
      me: { ...me, accentColor: meRow?.accentColor ?? null },
      players,
      stats: {
        total: players.length,
        online: players.filter((p) => p.online).length,
        banned: players.filter((p) => p.bannedUntil).length,
      },
      coinsBudget: ADMIN_COIN_DAILY_CAP,
    };
  } catch {
    return null;
  }
}

function startOfDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── bans ────────────────────────────────────────────────────────────────

export async function modBan(targetId: string, minutes: number, reason: string): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canModerate(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };

    const asked = Math.floor(Number(minutes));
    const minutesClean = Number.isFinite(asked) && asked > 0 ? asked : 0;
    const cap = maxBanMinutes(me.role);
    if (minutesClean === 0 && me.role !== "OWNER") {
      return { ok: false, info: "Bara ägaren kan banna för alltid." };
    }
    if (cap > 0 && minutesClean > cap) {
      return { ok: false, info: `Du kan banna i max ${cap} min. Be ägaren om längre.` };
    }

    const until = minutesClean === 0 ? new Date("2099-01-01T00:00:00Z") : new Date(Date.now() + minutesClean * 60_000);
    await prisma.profile.update({
      where: { id: target.id },
      data: { bannedUntil: until, banMessage: (reason || "").trim().slice(0, 200) || null },
    });
    await log(me, `bannade ${target.username} (${minutesClean === 0 ? "FÖR ALLTID" : minutesClean + " min"})${reason ? `: ${reason.trim().slice(0, 80)}` : ""}`);
    return {
      ok: true,
      info: minutesClean === 0 ? `${target.username} är bannad för alltid.` : `${target.username} är bannad i ${minutesClean} min.`,
    };
  } catch {
    return { ok: false, info: GENERIC };
  }
}

export async function modUnban(targetId: string): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canModerate(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };
    if (!target.bannedUntil) return { ok: false, info: `${target.username} är inte bannad.` };
    // Security may only undo short sanctions. Otherwise it could quietly lift a
    // day-long admin ban — or the owner's permanent one — and the person who
    // handed it out would never know.
    if (me.role === "SECURITY" && target.bannedUntil.getTime() - Date.now() > 60 * 60_000) {
      return { ok: false, info: "Bara admin eller ägaren kan häva den bannen." };
    }
    await prisma.profile.update({ where: { id: target.id }, data: { bannedUntil: null, banMessage: null } });
    await log(me, `unbannade ${target.username}`);
    return { ok: true, info: `${target.username} är fri igen.` };
  } catch {
    return { ok: false, info: GENERIC };
  }
}

export async function modWarn(targetId: string, reason: string): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canModerate(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };

    const next = (target.warnings || 0) + 1;
    const note = (reason || "").trim().slice(0, 200) || null;

    if (next >= WARNINGS_BEFORE_BAN) {
      const until = new Date(Date.now() + WARNING_BAN_MINUTES * 60_000);
      await prisma.profile.update({
        where: { id: target.id },
        data: {
          warnings: next,
          bannedUntil: until,
          banMessage: note || `${WARNINGS_BEFORE_BAN} varningar`,
        },
      });
      await log(me, `varnade ${target.username} (${next}/${WARNINGS_BEFORE_BAN} — bannad ${WARNING_BAN_MINUTES} min)`);
      return {
        ok: true,
        info: `${target.username} har ${next} varningar och bannas i ${WARNING_BAN_MINUTES / 60} tim.`,
      };
    }

    await prisma.profile.update({ where: { id: target.id }, data: { warnings: next } });
    await log(me, `varnade ${target.username} (${next}/${WARNINGS_BEFORE_BAN})${note ? `: ${note.slice(0, 80)}` : ""}`);
    return { ok: true, info: `${target.username} är varnad (${next}/${WARNINGS_BEFORE_BAN}).` };
  } catch {
    return { ok: false, info: GENERIC };
  }
}

/** Admins and the owner can wipe a warning history; security cannot hide its own. */
export async function modClearWarnings(targetId: string): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  if (me.role === "SECURITY") return { ok: false, info: "Bara admin och ägaren kan rensa varningar." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canModerate(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };
    await prisma.profile.update({ where: { id: target.id }, data: { warnings: 0 } });
    await log(me, `rensade varningar på ${target.username}`);
    return { ok: true, info: `${target.username}: varningarna är nollställda.` };
  } catch {
    return { ok: false, info: GENERIC };
  }
}

// ─── chat mute ───────────────────────────────────────────────────────────

export async function modMute(targetId: string, minutes: number): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canModerate(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };

    const asked = Math.floor(Number(minutes));
    const minutesClean = Number.isFinite(asked) && asked > 0 ? asked : 0;
    const cap = maxMuteMinutes(me.role);
    if (minutesClean === 0 && me.role !== "OWNER") {
      return { ok: false, info: "Bara ägaren kan tysta för alltid." };
    }
    if (cap > 0 && minutesClean > cap) {
      return { ok: false, info: `Du kan tysta i max ${cap} min.` };
    }

    const until = minutesClean === 0 ? new Date("2099-01-01T00:00:00Z") : new Date(Date.now() + minutesClean * 60_000);
    await prisma.profile.update({ where: { id: target.id }, data: { chatMutedUntil: until } });
    await log(me, `tystade chatten på ${target.username} (${minutesClean === 0 ? "FÖR ALLTID" : minutesClean + " min"})`);
    return {
      ok: true,
      info: `${target.username} kan inte chatta ${minutesClean === 0 ? "mer" : `på ${minutesClean} min`}.`,
    };
  } catch {
    return { ok: false, info: GENERIC };
  }
}

export async function modUnmute(targetId: string): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canModerate(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };
    await prisma.profile.update({ where: { id: target.id }, data: { chatMutedUntil: null } });
    await log(me, `öppnade chatten igen för ${target.username}`);
    return { ok: true, info: `${target.username} kan chatta igen.` };
  } catch {
    return { ok: false, info: GENERIC };
  }
}

// ─── coins ───────────────────────────────────────────────────────────────

/**
 * Hand out coins.
 *
 * An admin's ceiling is 1000 per person per day — including themselves — and it
 * is enforced from the CoinGrant ledger, so the same rule holds no matter which
 * button or device was used. The owner has no daily budget, but a single grant
 * is still capped at 100 000 so a typo cannot mint a billion.
 */
export async function modGiveCoins(targetId: string, amount: number): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canGiveCoins(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };

    const amt = Math.floor(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) return { ok: false, info: "Skriv ett antal mynt, minst 1." };

    if (me.role === "ADMIN") {
      const used = await prisma.coinGrant.aggregate({
        where: { staffId: me.id, targetId: target.id, createdAt: { gte: startOfDay() } },
        _sum: { amount: true },
      });
      const given = used._sum.amount ?? 0;
      const left = ADMIN_COIN_DAILY_CAP - given;
      if (left <= 0) {
        return { ok: false, info: `Du har redan gett ${target.username} ${ADMIN_COIN_DAILY_CAP} mynt idag.` };
      }
      if (amt > left) {
        return { ok: false, info: `Max ${ADMIN_COIN_DAILY_CAP} mynt per person och dag. ${left} kvar till ${target.username}.` };
      }
    } else if (amt > OWNER_COIN_MAX_PER_GRANT) {
      return { ok: false, info: `Max ${OWNER_COIN_MAX_PER_GRANT} mynt per gång.` };
    }

    await prisma.$transaction([
      prisma.profile.update({ where: { id: target.id }, data: { coins: { increment: amt } } }),
      prisma.coinGrant.create({
        data: {
          staffId: me.id,
          staffName: me.username,
          targetId: target.id,
          targetName: target.username,
          amount: amt,
        },
      }),
    ]);
    await log(me, `gav ${amt} mynt till ${target.username}`);

    if (me.role === "ADMIN") {
      // Read the ledger back rather than subtracting locally: the answer has to
      // include grants made on another device a minute ago.
      const used = await prisma.coinGrant.aggregate({
        where: { staffId: me.id, targetId: target.id, createdAt: { gte: startOfDay() } },
        _sum: { amount: true },
      });
      const remaining = ADMIN_COIN_DAILY_CAP - (used._sum.amount ?? 0);
      return { ok: true, info: `+${amt} mynt till ${target.username}. ${Math.max(0, remaining)} kvar idag.` };
    }
    return { ok: true, info: `+${amt} mynt till ${target.username}.` };
  } catch {
    return { ok: false, info: GENERIC };
  }
}

// ─── colours, pin ────────────────────────────────────────────────────────

export async function modSetColor(targetId: string, color: string | null): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canDecorate(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };

    const clean = color === null || color === "" ? null : normalizeColor(color);
    if (color !== null && color !== "" && !clean) return { ok: false, info: "Ogiltig färg." };

    await prisma.profile.update({ where: { id: target.id }, data: { accentColor: clean } });
    await log(me, clean ? `gav ${target.username} färgen ${clean}` : `tog bort färgen på ${target.username}`);
    return { ok: true, info: clean ? `${target.username} har nu färgen ${clean}.` : `${target.username} använder rollfärgen igen.` };
  } catch {
    return { ok: false, info: GENERIC };
  }
}

export async function modTogglePin(targetId: string): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canDecorate(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };
    const next = !target.pinned;
    await prisma.profile.update({ where: { id: target.id }, data: { pinned: next } });
    await log(me, next ? `fäste ${target.username}` : `avfäste ${target.username}`);
    return { ok: true, info: next ? `${target.username} ligger högst upp.` : `${target.username} är avfäst.` };
  } catch {
    return { ok: false, info: GENERIC };
  }
}

// ─── owner switches ──────────────────────────────────────────────────────

type Switch = "freeze" | "shadow" | "ghost" | "relogin";

const SWITCH_COPY: Record<"freeze" | "shadow" | "ghost", { field: "coinsFrozen" | "shadowed" | "ghostMode"; on: string; off: string }> = {
  freeze: { field: "coinsFrozen", on: "mynten är frysta", off: "mynten är upplåsta" },
  shadow: { field: "shadowed", on: "osynlig på topplistan", off: "synlig på topplistan igen" },
  ghost: { field: "ghostMode", on: "meddelanden dolda i gemensamma chattar", off: "synlig i chatten igen" },
};

export async function modToggle(targetId: string, which: Switch): Promise<Result> {
  const me = await staffSession();
  if (!me) return { ok: false, info: "Du är inte personal." };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, info: "Användaren finns inte längre." };
    const perm = canUseOwnerSwitch(me, target);
    if (!perm.ok) return { ok: false, info: perm.reason };

    if (which === "relogin") {
      await prisma.profile.update({ where: { id: target.id }, data: { forceRelogin: true } });
      await log(me, `tvingade ${target.username} att logga in igen`);
      return { ok: true, info: `${target.username} kastas ut och måste logga in igen.` };
    }

    const copy = SWITCH_COPY[which];
    const next = !target[copy.field];
    await prisma.profile.update({ where: { id: target.id }, data: { [copy.field]: next } });
    await log(me, `${next ? "PÅ" : "AV"} ${which} på ${target.username}`);
    return { ok: true, info: `${target.username}: ${next ? copy.on : copy.off}.` };
  } catch {
    return { ok: false, info: GENERIC };
  }
}
