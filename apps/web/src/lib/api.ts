export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    if (response.status === 401 && path !== "/auth/login")
      window.location.assign("/login");
    throw new Error(
      payload.error?.message || "Unable to complete this request.",
    );
  }
  return payload.data as T;
}
