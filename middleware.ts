import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/teacher", "/school", "/notices", "/crc-brc", "/district", "/parent"];

/**
 * Fast redirect for signed-out visitors. It only checks that a session cookie
 * exists; the real session and role checks run on the server for every page
 * and API request.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !req.cookies.get("vs_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|favicon.ico|icon.svg).*)"] };
