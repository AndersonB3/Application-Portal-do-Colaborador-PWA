import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware do Portal do Colaborador PWA
 * - Protege rotas /painel e /trocar-senha (exige cookie de sessão)
 * - Adiciona headers de segurança em todas as respostas
 * - Content Security Policy contra XSS e injeção de scripts
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Proteção de rotas autenticadas ───────────────────────────
  const rotasProtegidas = ["/painel", "/trocar-senha"];
  const ehRotaProtegida = rotasProtegidas.some((rota) => pathname.startsWith(rota));

  if (ehRotaProtegida) {
    const sessionToken = request.cookies.get("session_token")?.value;
    // Se não tem cookie de sessão, redireciona para login
    if (!sessionToken) {
      const loginUrl = new URL("/", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Se já logou (tem cookie) e tenta acessar a raiz, redireciona para /painel
  if (pathname === "/") {
    const sessionToken = request.cookies.get("session_token")?.value;
    if (sessionToken) {
      const painelUrl = new URL("/painel", request.url);
      return NextResponse.redirect(painelUrl);
    }
  }

  const response = NextResponse.next();

  // ── Headers de segurança ─────────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  const isDev = process.env.NODE_ENV === "development";

  // CSP: bloqueia scripts inline não autorizados, frames externos, etc.
  // unsafe-eval apenas em dev (Next.js precisa para debug/HMR)
  // unsafe-inline necessário para Tailwind CSS (estilos inline)
  // worker-src self: necessário para o Service Worker do PWA
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self'${isDev ? " 'unsafe-eval'" : ""} 'unsafe-inline'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "object-src 'none'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "worker-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ")
  );

  return response;
}

export const config = {
  matcher: [
    // Aplica em todas as rotas, exceto assets estáticos e favicon
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js).*)",
  ],
};
