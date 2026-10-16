const base = process.env.MOBILE_HTTP_TEST_URL || "http://127.0.0.1:3000";
const checks = [
  ["/api/v1/health", {}, 200],
  ["/api/v1/users/me", {}, 401],
  ["/api/v1/villages", {}, 401],
  [
    "/api/v1/auth/send-otp",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
    422,
  ],
  [
    "/api/v1/auth/send-otp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://untrusted.example",
      },
      body: "{}",
    },
    403,
  ],
  [
    "/api/v1/auth/verify-otp",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
    422,
  ],
  [
    "/api/v1/auth/refresh",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
    422,
  ],
  [
    "/api/v1/auth/logout",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
    422,
  ],
  ["/api/v1/admin/villages", {}, 401],
];
for (const [path, options, expected] of checks) {
  const response = await fetch(base + path, {
    ...options,
    signal: AbortSignal.timeout(20000),
  });
  if (response.status !== expected)
    throw new Error(
      `${path}: expected ${expected}, received ${response.status}`,
    );
  if (!response.headers.get("cache-control")?.includes("no-store"))
    throw new Error(`${path}: missing no-store`);
  const payload = await response.json();
  if (typeof payload.success !== "boolean")
    throw new Error(`${path}: invalid envelope`);
  console.log(`PASS ${path}: ${expected}, JSON envelope, no-store`);
}
