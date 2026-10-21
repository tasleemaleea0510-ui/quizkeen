const assert = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; } else console.log("ok:", msg); };
const m = require("./.tmp-t/moderation.js");

const owner = { id: "o", username: "Owner", role: "OWNER" };
const admin = { id: "a", username: "Admin", role: "ADMIN" };
const sec = { id: "s", username: "Sec", role: "SECURITY" };
const teacher = { id: "t", username: "Teacher", role: "TEACHER" };
const student = { id: "u", username: "Student", role: "STUDENT" };

assert(m.canModerate(sec, student).ok, "security may warn/ban a student");
assert(!m.canModerate(sec, teacher).ok === false, "security may act on a teacher");
assert(!m.canModerate(sec, admin).ok, "security cannot touch an admin");
assert(!m.canModerate(sec, owner).ok, "security cannot touch the owner");
assert(!m.canModerate(admin, owner).ok, "admin cannot touch the owner");
assert(!m.canModerate(admin, admin).ok, "admin cannot touch another admin");
assert(!m.canModerate(admin, sec).ok, "admin cannot touch security");
assert(m.canModerate(owner, admin).ok, "owner may act on an admin");
assert(!m.canModerate(owner, owner).ok, "nobody may act on the owner");
assert(!m.canModerate(owner, { ...student, id: "o" }).ok, "self-actions are refused");

assert(m.maxBanMinutes("SECURITY") === 60, "security ban cap is 60");
assert(m.maxBanMinutes("ADMIN") === 1440, "admin ban cap is 1440");
assert(m.maxBanMinutes("OWNER") === 0, "owner has no ban cap");
assert(m.banPresets("SECURITY").every((b) => b.minutes > 0 && b.minutes <= 60), "security presets within an hour");
assert(m.banPresets("OWNER").some((b) => b.minutes === 0), "owner has a forever preset");

assert(!m.canGiveCoins(sec, student).ok, "security cannot give coins");
assert(m.canGiveCoins(admin, student).ok, "admin may give coins to a student");
assert(m.canGiveCoins(admin, { ...admin, id: "a" }).ok, "admin may give themselves coins");
assert(!m.canGiveCoins(admin, owner).ok, "admin cannot gift the owner");
assert(m.ADMIN_COIN_DAILY_CAP === 1000, "daily cap is 1000");

assert(m.normalizeColor("#ABC") === "#aabbcc", "short hex expands");
assert(m.normalizeColor(" #C0FFEE ") === "#c0ffee", "long hex is normalised");
assert(m.normalizeColor("red") === null && m.normalizeColor("javascript:1") === null, "junk is rejected");
assert(m.ACCENT_PALETTE.length === 16, "palette has 16 swatches");
assert(m.humanRemaining(90_000) === "2 min", "remaining time is humanised");
assert(m.humanRemaining(0) === "slut", "expired reads as slut");
assert(m.isStaffRole("OWNER") && m.isStaffRole("SECURITY") && !m.isStaffRole("STUDENT"), "staff role guard");

const g = require("./.tmp-t/geo.js");
assert(g.maskIp("95.123.45.67") === "95.123.x.x", "IPv4 is masked");
assert(g.maskIp("2a02:aa1:1234:5678:9abc::1") === "2a02:aa1:1234:5678:…", "IPv6 is masked");
assert(g.flagFor("SE") === "\u{1F1F8}\u{1F1EA}", "flag from country code");
assert(g.countryName("SE") === "Sverige", "Swedish country name");
assert(g.countryName("DE") === "Tyskland", "German name in Swedish");
assert(g.isPrivateIp("127.0.0.1") && g.isPrivateIp("192.168.1.4") && g.isPrivateIp("172.20.4.1"), "private ranges detected");
assert(!g.isPrivateIp("8.8.8.8"), "public IP passes");

const hdr = (entries) => new Headers(entries);
assert(g.clientIp(hdr({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })) === "203.0.113.9", "first hop wins");
assert(g.clientIp(hdr({ "x-forwarded-for": "::1" })) === null, "loopback ignored");

(async () => {
  const us = await g.resolveGeo(hdr({}), "8.8.8.8");
  console.log("geo 8.8.8.8 ->", JSON.stringify(us));
  assert(us && us.countryCode === "US", "live geo lookup resolves 8.8.8.8 to the US");
  const v = await g.resolveGeo(hdr({ "x-vercel-ip-country": "SE", "x-vercel-ip-city": "Stockholm" }), "95.1.2.3");
  assert(v.countryCode === "SE" && v.city === "Stockholm", "Vercel headers are used first");
  const line = g.describeLocation({ lastIp: "95.123.45.67", ipCountryCode: "SE", ipCity: "Stockholm" });
  console.log("location line:", line);
  assert(line.includes("Sverige") && line.includes("Stockholm") && line.includes("95.123.x.x"), "location line is complete");
})();
