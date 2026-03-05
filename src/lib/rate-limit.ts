import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  cookieName: string;
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  permitido: boolean;
  contador: number;
  resetAt: number;
}

export function verificarRateLimit(request: NextRequest, config: RateLimitConfig): RateLimitResult {
  const { cookieName, maxRequests, windowMs } = config;
  try {
    const raw = request.cookies.get(cookieName)?.value;
    if (!raw) return { permitido: true, contador: 1, resetAt: Date.now() + windowMs };
    const dados = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (Date.now() > dados.resetAt) return { permitido: true, contador: 1, resetAt: Date.now() + windowMs };
    const novoContador = dados.count + 1;
    return { permitido: novoContador <= maxRequests, contador: novoContador, resetAt: dados.resetAt };
  } catch {
    return { permitido: true, contador: 1, resetAt: Date.now() + windowMs };
  }
}

export function aplicarRateLimitCookie(response: NextResponse, config: RateLimitConfig, result: RateLimitResult): void {
  const payload = Buffer.from(JSON.stringify({ count: result.contador, resetAt: result.resetAt })).toString("base64url");
  response.cookies.set(config.cookieName, payload, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: Math.ceil((result.resetAt - Date.now()) / 1000),
  });
}

export function limparRateLimitCookie(response: NextResponse, cookieName: string): void {
  response.cookies.set(cookieName, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
}
