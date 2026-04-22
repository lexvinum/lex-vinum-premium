import { NextResponse } from "next/server";

const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE;
const COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || "lexvinum_admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body?.code || "");

    if (!ADMIN_ACCESS_CODE) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_ACCESS_CODE manquant dans .env.local" },
        { status: 500 }
      );
    }

    if (code !== ADMIN_ACCESS_CODE) {
      return NextResponse.json(
        { ok: false, error: "Code invalide" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: COOKIE_NAME,
      value: "granted",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requête invalide" },
      { status: 400 }
    );
  }
}