"use client";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
    public fields?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

/** fetch wrapper for same-origin JSON APIs. Adds the CSRF header and normalises errors. */
export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? (options.body || options.form ? "POST" : "GET"),
      headers: { "x-vs-csrf": "1", ...(options.body !== undefined ? { "content-type": "application/json" } : {}) },
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("NETWORK", "Network error", 0);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: { code: string; message: string; details?: unknown; fields?: { path: string; message: string }[] } };
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/login")) {
      window.location.href = `/login?expired=1&next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError(data.error?.code ?? "INTERNAL", data.error?.message ?? "Error", res.status, data.error?.details, data.error?.fields);
  }
  return data as T;
}

export function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Localised text for an API failure; falls back to the server's own safe message. */
export function errorText(err: unknown, t: (key: never) => string): string {
  if (!(err instanceof ApiError)) return t("common.error" as never);
  if (err.code === "NETWORK") return t("common.networkError" as never);
  if (err.code === "INTERNAL") return t("common.error" as never);
  const key = `errors.codes.${err.code}`;
  const text = t(key as never);
  return text === key ? err.message : text;
}
