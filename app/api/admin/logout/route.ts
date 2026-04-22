import { NextResponse } from "next/server";

const COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || "lexvinum_admin";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}