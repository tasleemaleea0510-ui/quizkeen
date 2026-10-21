const g = require("./.tmp-t/geo.js");
const hdr = (e) => new Headers(e);
const cases = [
  ["203.0.113.9, 10.0.0.1", "203.0.113.9"],
  ["95.1.2.3:443", "95.1.2.3"],
  ["[2a02:aa1::1]:443", "2a02:aa1::1"],
  ["2a02:aa1::1", "2a02:aa1::1"],
  ["::1", null],
  ["127.0.0.1", null],
  ["", null],
];
let bad = 0;
for (const [input, want] of cases) {
  const got = g.clientIp(hdr({ "x-forwarded-for": input }));
  const ok = got === want;
  if (!ok) bad++;
  console.log(ok ? "ok" : "FAIL", JSON.stringify(input), "->", JSON.stringify(got), "want", JSON.stringify(want));
}
process.exitCode = bad ? 1 : 0;
