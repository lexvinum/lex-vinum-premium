import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || "lexvinum_admin";

const PUBLIC_PATHS = ["/disponible-bientot", "/admin-acces"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Autoriser pages publiques
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Autoriser assets + API admin
  const isAllowedPath =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/admin");

  if (isPublicPath || isAllowedPath) {
    return NextResponse.next();
  }

  // Vérifier cookie admin
  const adminCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (adminCookie === "granted") {
    return NextResponse.next();
  }

  // Sinon → redirection vers landing publique
  const url = request.nextUrl.clone();
  url.pathname = "/disponible-bientot";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};