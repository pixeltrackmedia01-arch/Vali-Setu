"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { loginSchema } from "@/lib/validation/schemas";

export function LoginForm({ expired, next }: { expired?: boolean; next?: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      const f: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) f[issue.path[0] as "email" | "password"] = issue.path[0] === "email" ? t("login.email") + ": " + t("errors.codes.VALIDATION") : t("login.password") + ": " + t("common.required");
      setFieldErrors(f);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await api<{ redirectTo: string }>("/api/auth/login", { body: parsed.data });
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      window.location.href = safeNext ?? res.redirectTo;
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError && err.code === "RATE_LIMITED") setError(t("errors.codes.RATE_LIMITED"));
      else if (err instanceof ApiError && err.code === "NETWORK") setError(t("common.networkError"));
      else setError(t("login.invalid"));
    }
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
      {expired && !error && <Alert tone="warn">{t("login.expired")}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label={t("login.email")} htmlFor="email" error={fieldErrors.email} required>
        <Input id="email" name="email" type="email" autoComplete="username" inputMode="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined} />
      </Field>
      <Field label={t("login.password")} htmlFor="password" error={fieldErrors.password} required>
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" className="pr-12" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "password-error" : undefined} />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-ink-muted hover:text-navy-700"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? t("login.hide") : t("login.show")}
            aria-pressed={show}
          >
            {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        {loading ? t("login.submitting") : t("login.submit")}
      </Button>
    </form>
  );
}
