import { NextRequest, NextResponse } from "next/server";
import { invalidarSessao } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (token) invalidarSessao(token);

  const response = NextResponse.json({ success: true });
  response.cookies.set("session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
