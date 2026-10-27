import type { z } from "zod";
import type { MobileSession } from "@gaavli/types";
import {
  mobileSessionSchema,
  mobileUserSchema,
  logoutResultSchema,
} from "@gaavli/validation";
import { api } from "./api";
import { ApiError } from "./api/client";
import { credentials } from "./storage/credentials";
import { useAppStore } from "./store";
import { clearSessionForGuest, persistSession } from "./storage/session";
import { preferenceStorage } from "./storage/sqlite";
import { clearBrowsingVillage } from "./storage/browsingVillage";

export async function saveSession(session: MobileSession) {
  if (!useAppStore.getState().hasAuthenticated) {
    await preferenceStorage.writeHasAuthenticated();
    useAppStore.setState({ hasAuthenticated: true });
  }
  await persistSession(credentials, session, useAppStore.getState().setSession);
}
let renewing: Promise<MobileSession> | undefined;
let signingOut = false;
async function renew() {
  if (!renewing) {
    renewing = (async () => {
      const current = useAppStore.getState().session;
      if (!current) throw new ApiError("AUTH_REQUIRED", 401);
      const next = await api("/auth/refresh", mobileSessionSchema, {
        method: "POST",
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (useAppStore.getState().session?.refreshToken !== current.refreshToken)
        throw new ApiError("AUTH_REQUIRED", 401);
      await saveSession(next);
      return next;
    })()
      .catch(async (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          await credentials.clear();
          useAppStore.getState().setSession(null);
        }
        throw error;
      })
      .finally(() => {
        renewing = undefined;
      });
  }
  return renewing;
}
export async function authenticatedApi<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
  timeoutMs?: number,
): Promise<T> {
  if (signingOut) throw new ApiError("AUTH_REQUIRED", 401);
  let session = useAppStore.getState().session;
  if (!session) throw new ApiError("AUTH_REQUIRED", 401);
  if (Date.parse(session.accessExpiresAt) <= Date.now() + 5000)
    session = await renew();
  const run = (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return api(path, schema, { ...init, headers }, timeoutMs);
  };
  try {
    return await run(session.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const current = useAppStore.getState().session;
    if (current && current.accessToken !== session.accessToken)
      return run(current.accessToken);
    return run((await renew()).accessToken);
  }
}
export async function restoreSession() {
  const saved = await credentials.read();
  useAppStore.getState().setSession(saved);
  if (!saved) return;
  // Migrate existing sessions on devices predating the local flag.
  await preferenceStorage.writeHasAuthenticated();
  useAppStore.setState({ hasAuthenticated: true });
  try {
    const user = await authenticatedApi("/users/me", mobileUserSchema);
    const current = useAppStore.getState().session;
    if (current) await saveSession({ ...current, user });
  } catch (error) {
    // An outage retains the secure local session; protected writes require the server.
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 401) return;
  }
}
export async function activateSeller() {
  const original = useAppStore.getState().session;
  if (!original || signingOut) throw new ApiError("AUTH_REQUIRED", 401);
  const user = await authenticatedApi("/users/me/seller", mobileUserSchema, {
    method: "POST",
    body: JSON.stringify({}),
  });
  const current = useAppStore.getState().session;
  if (signingOut || !current || current.user.id !== original.user.id)
    throw new ApiError("AUTH_REQUIRED", 401);
  await saveSession({ ...current, user });
}
export async function logout() {
  if (signingOut) return;
  signingOut = true;
  try {
    if (renewing) await renewing.catch(() => undefined);
    const session = useAppStore.getState().session;
    if (session)
      await api("/auth/logout", logoutResultSchema, {
        method: "POST",
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
    await clearSessionForGuest(
      credentials,
      () => clearBrowsingVillage(preferenceStorage),
      useAppStore.getState().clearAuthenticatedState,
    );
  } finally {
    signingOut = false;
  }
}
