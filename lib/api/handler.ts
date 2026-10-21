import "server-only";
import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import type { Role } from "@/lib/domain/constants";
import { AppError } from "@/services/errors";

export const CSRF_HEADER = "x-vs-csrf";

type Ctx = { params: Promise<Record<string, string>> };

interface Options<B> {
  /** Roles allowed; omit to allow any signed-in user; false for public endpoints. */
  roles?: Role[] | false;
  body?: ZodType<B, ZodTypeDef, unknown>;
}

/**
 * Wraps a route handler with authentication, role checks, CSRF protection,
 * schema validation and safe error responses. Business rules and record-level
 * authorization stay in the service layer.
 */
export function apiRoute<B = undefined>(
  options: Options<B>,
  handler: (args: { req: NextRequest; user: SessionUser; body: B; params: Record<string, string> }) => Promise<unknown>,
) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      if (mutating) assertSameOrigin(req);

      const current = options.roles === false ? null : await getCurrentUser();
      if (options.roles !== false) {
        if (!current) return json({ error: { code: "UNAUTHENTICATED", message: "Your session has ended. Please sign in again." } }, 401);
        if (options.roles && !options.roles.includes(current.role)) {
          return json({ error: { code: "FORBIDDEN", message: "You do not have permission to do this." } }, 403);
        }
      }

      let body = undefined as B;
      if (options.body) {
        const raw = await req.json().catch(() => {
          throw new AppError("BAD_JSON", "The request could not be read.", 400);
        });
        body = options.body.parse(raw);
      }
      const params = ctx?.params ? await ctx.params : {};
      // Public routes (roles: false) must not read `user`.
      const user = current as SessionUser;
      const result = await handler({ req, user, body, params });
      if (result instanceof Response) return result;
      return json(result ?? { ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

function assertSameOrigin(req: NextRequest) {
  // A custom header cannot be sent cross-site without a CORS preflight, which we never allow.
  if (req.headers.get(CSRF_HEADER) !== "1") throw new AppError("CSRF", "Request blocked for security reasons. Reload the page and try again.", 403);
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (new URL(origin).host !== host) throw new AppError("CSRF", "Request blocked for security reasons.", 403);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
  }
  if (error instanceof ZodError) {
    return json(
      {
        error: {
          code: "VALIDATION",
          message: error.issues[0]?.message ?? "Some fields are not valid.",
          fields: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      400,
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return json({ error: { code: "NOT_FOUND", message: "Record not found." } }, 404);
  }
  // Unknown errors: log type only, never request bodies.
  console.error("Unhandled API error", error instanceof Error ? `${error.name}: ${error.message}` : typeof error);
  return json({ error: { code: "INTERNAL", message: "Something went wrong on our side. Your saved work is safe. Please try again." } }, 500);
}

export function searchParams(req: NextRequest) {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}
