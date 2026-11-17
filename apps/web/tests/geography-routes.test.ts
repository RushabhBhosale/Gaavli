import { test, mock } from "node:test";
import assert from "node:assert/strict";

test("geography routes require an admin", async () => {
  mock.module("next/headers", {
    namedExports: {
      cookies: async () => ({
        get() {
          return undefined;
        },
      }),
    },
  });
  const districts = await import(
    "../src/app/api/v1/admin/geography/districts/route"
  );
  const talukas = await import(
    "../src/app/api/v1/admin/geography/talukas/route"
  );
  const villages = await import(
    "../src/app/api/v1/admin/geography/villages/route"
  );
  for (const [handler, url] of [
    [districts.GET, "http://localhost/api/v1/admin/geography/districts"],
    [talukas.GET, "http://localhost/api/v1/admin/geography/talukas"],
    [villages.GET, "http://localhost/api/v1/admin/geography/villages"],
  ] as const) {
    const response = await handler(new Request(url));
    assert.equal(response.status, 401);
  }
});
