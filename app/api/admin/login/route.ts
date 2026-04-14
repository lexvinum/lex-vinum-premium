import { NextResponse } from "next/server";
import { createAdminToken, isValidAdminPassword } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const body = await req.json();
  const password = String(body?.password || "");

  const ok = await isValidAdminPassword(password);

  if (!ok) {
    return NextResponse.json(
      { error: "Mot de passe invalide" },
      { status: 401 }
    );
  }

  const token = await createAdminToken();

  const response = NextResponse.json({ success: true });

  response.cookies.set("lv_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}