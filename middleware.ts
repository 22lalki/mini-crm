import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Пути, доступные без логина. */
const PUBLIC_PREFIXES = ["/login", "/api/telegram"];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (secret && (await verifySessionToken(token, secret))) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  // Чтобы после входа вернуться туда, куда шли.
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Исключаем всю внутреннюю кухню Next (включая HMR в dev) и статику.
  matcher: ["/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|txt|webmanifest)$).*)"],
};
