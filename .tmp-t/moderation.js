"use strict";
/**
 * What each staff role is allowed to do to another account.
 *
 * This file is deliberately free of React, Prisma and session code: the panel
 * uses it to decide which buttons to draw, and the server actions use it again
 * before writing anything. A UI-only check would be a suggestion, not a rule —
 * anyone can call a server action directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCENT_PALETTE = exports.WARNING_BAN_MINUTES = exports.WARNINGS_BEFORE_BAN = exports.OWNER_COIN_MAX_PER_GRANT = exports.ADMIN_COIN_DAILY_CAP = exports.STAFF_ROLES = void 0;
exports.isStaffRole = isStaffRole;
exports.maxBanMinutes = maxBanMinutes;
exports.maxMuteMinutes = maxMuteMinutes;
exports.canModerate = canModerate;
exports.canDecorate = canDecorate;
exports.canGiveCoins = canGiveCoins;
exports.canUseOwnerSwitch = canUseOwnerSwitch;
exports.canWarn = canWarn;
exports.banPresets = banPresets;
exports.mutePresets = mutePresets;
exports.normalizeColor = normalizeColor;
exports.humanRemaining = humanRemaining;
exports.STAFF_ROLES = ["OWNER", "ADMIN", "SECURITY"];
/** How high up the ladder a role sits. Only DOWNWARD actions are allowed. */
const RANK = {
    STUDENT: 1,
    TEACHER: 2,
    SECURITY: 3,
    ADMIN: 4,
    OWNER: 5,
};
function isStaffRole(role) {
    return role === "OWNER" || role === "ADMIN" || role === "SECURITY";
}
/** Minutes a ban may run. `0` is the "för alltid" sentinel and owner-only. */
function maxBanMinutes(role) {
    if (role === "OWNER")
        return 0; // 0 = no limit
    if (role === "ADMIN")
        return 1440; // one day
    return 60; // security
}
/** Minutes a chat mute may run. Same ladder as bans. */
function maxMuteMinutes(role) {
    if (role === "OWNER")
        return 0;
    if (role === "ADMIN")
        return 1440;
    return 60;
}
/** Admins may hand out at most this much per person per day, themselves included. */
exports.ADMIN_COIN_DAILY_CAP = 1000;
/** The owner is not on a daily budget, but a single click is still bounded. */
exports.OWNER_COIN_MAX_PER_GRANT = 100000;
exports.WARNINGS_BEFORE_BAN = 3;
/** How long a third warning shuts an account: a day, not the rest of its life. */
exports.WARNING_BAN_MINUTES = 1440;
function deny(reason) {
    return { ok: false, reason };
}
/**
 * Can `actor` take a punitive action (ban, mute, warning) on `target`?
 *
 * - never yourself;
 * - never an owner, not even by another owner (there is one account, and
 *   locking it out would need a database console to undo);
 * - admin and security only reach students and teachers. Staff do not
 *   discipline each other; that is the owner's job.
 */
function canModerate(actor, target) {
    if (!isStaffRole(actor.role))
        return deny("Du är inte personal.");
    if (actor.id === target.id)
        return deny("Du kan inte göra det mot dig själv.");
    if (target.role === "OWNER")
        return deny("Ägaren kan inte bannas eller tystas.");
    if (actor.role === "OWNER")
        return { ok: true };
    if (target.role === "ADMIN" || target.role === "SECURITY") {
        return deny("Bara ägaren kan göra det mot personal.");
    }
    return { ok: true };
}
/** Can `actor` attach a personal touch (pin, name colour) to `target`? */
function canDecorate(actor, target) {
    if (!isStaffRole(actor.role))
        return deny("Du är inte personal.");
    if (actor.id === target.id)
        return { ok: true };
    if (target.role === "OWNER")
        return deny("Ägarens konto är skyddat.");
    if (actor.role === "OWNER")
        return { ok: true };
    if (target.role === "ADMIN" || target.role === "SECURITY") {
        return deny("Bara ägaren kan ändra personal.");
    }
    return { ok: true };
}
/** Coins are a gift, so the ladder is looser: admins may also gift staff. */
function canGiveCoins(actor, target) {
    if (!isStaffRole(actor.role))
        return deny("Du är inte personal.");
    if (target.role === "OWNER" && actor.id !== target.id)
        return deny("Ägarens saldo är skyddat.");
    if (actor.role === "SECURITY")
        return deny("Säkerhet delar inte ut mynt.");
    return { ok: true };
}
/** Owner-only switches: freeze, shadow, ghost, force sign-out. */
function canUseOwnerSwitch(actor, target) {
    if (actor.role !== "OWNER")
        return deny("Bara ägaren har den knappen.");
    if (target.role === "OWNER" && actor.id !== target.id)
        return deny("Ägarens konto är skyddat.");
    return { ok: true };
}
function canWarn(actor, target) {
    return canModerate(actor, target);
}
/** Ban buttons offered in the panel, per role. `0` means forever. */
function banPresets(role) {
    if (role === "OWNER") {
        return [
            { label: "10 min", minutes: 10 },
            { label: "1 tim", minutes: 60 },
            { label: "1 dygn", minutes: 1440 },
            { label: "7 dygn", minutes: 10080 },
            { label: "För alltid", minutes: 0 },
        ];
    }
    if (role === "ADMIN") {
        return [
            { label: "10 min", minutes: 10 },
            { label: "1 tim", minutes: 60 },
            { label: "1 dygn", minutes: 1440 },
        ];
    }
    return [
        { label: "10 min", minutes: 10 },
        { label: "30 min", minutes: 30 },
        { label: "1 tim", minutes: 60 },
    ];
}
function mutePresets(role) {
    if (role === "OWNER") {
        return [
            { label: "10 min", minutes: 10 },
            { label: "1 tim", minutes: 60 },
            { label: "1 dygn", minutes: 1440 },
            { label: "För alltid", minutes: 0 },
        ];
    }
    if (role === "ADMIN") {
        return [
            { label: "10 min", minutes: 10 },
            { label: "1 tim", minutes: 60 },
            { label: "1 dygn", minutes: 1440 },
        ];
    }
    return [
        { label: "10 min", minutes: 10 },
        { label: "30 min", minutes: 30 },
        { label: "1 tim", minutes: 60 },
    ];
}
/** Sixteen names colours that all stay readable on the dark shell. */
exports.ACCENT_PALETTE = [
    "#f87171",
    "#fb923c",
    "#fbbf24",
    "#facc15",
    "#a3e635",
    "#4ade80",
    "#34d399",
    "#2dd4bf",
    "#22d3ee",
    "#38bdf8",
    "#60a5fa",
    "#818cf8",
    "#a78bfa",
    "#e879f9",
    "#f472b6",
    "#fb7185",
];
/**
 * "#abc" / "#AABBCC" → "#aabbcc"; anything else → null.
 * Only hex reaches the database, so a stored colour can always be placed in a
 * `style={{ color }}` without escaping.
 */
function normalizeColor(input) {
    const raw = (input || "").trim();
    const short = /^#([0-9a-f]{3})$/i.exec(raw);
    if (short) {
        const hex = short[1];
        const r = hex[0];
        const g = hex[1];
        const b = hex[2];
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    if (/^#[0-9a-f]{6}$/i.test(raw))
        return raw.toLowerCase();
    return null;
}
/** "2 tim 5 min", "12 sek", "slut". Shared by the panel and the player screens. */
function humanRemaining(ms) {
    if (!Number.isFinite(ms) || ms <= 0)
        return "slut";
    const totalMin = Math.ceil(ms / 60000);
    if (totalMin < 60)
        return `${totalMin} min`;
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    if (days > 0)
        return `${days} d${hours ? ` ${hours} tim` : ""}`;
    return `${hours} tim${mins ? ` ${mins} min` : ""}`;
}
