import assert from "node:assert/strict";
const base = process.env.SMOKE_URL || "http://localhost:3001";
const page = await fetch(`${base}/login`);
assert.equal(page.status, 200);
const html = await page.text();
for (const label of [
  "Welcome Back",
  "Email or Mobile Number",
  "Remember me",
  "Sign in with OTP",
])
  assert.ok(html.includes(label), `Missing ${label}`);
for (const path of ["/", "/users"]) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.ok(response.headers.get("location").endsWith("/login"));
}
for (const path of [
  "/auth/me",
  "/users",
  "/users/counts",
  "/villages",
  "/dashboard/stats",
  "/dashboard/user-growth",
]) {
  const response = await fetch(`${base}/api${path}`);
  assert.equal(response.status, 401, path);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json();
  assert.equal(payload.error.code, "AUTH_REQUIRED");
}
for (const path of ["/auth/login", "/auth/logout", "/users"]) {
  const response = await fetch(`${base}/api${path}`, {
    method: "POST",
    headers: {
      Origin: "https://foreign.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(response.status, 403, path);
}
const malformed = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/json" },
  body: "{}",
});
assert.equal(malformed.status, 422);
const forged = await fetch(`${base}/api/auth/me`, {
  headers: { Cookie: "gaavli_admin=forged" },
});
assert.equal(forged.status, 401);
console.log(
  "PASS: login HTML, page redirects, six protected APIs, mutation CSRF checks, validation and forged-cookie rejection.",
);
