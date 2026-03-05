import { NextRequest, NextResponse } from "next/server";
import { validarSessao } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { verificarRateLimit, aplicarRateLimitCookie } from "@/lib/rate-limit";

const RL_CONFIG = { cookieName: "rl_sessao", maxRequests: 30, windowMs: 60_000 };

export async function GET(request: NextRequest) {
  try {
    const rl = verificarRateLimit(request, RL_CONFIG);
    if (!rl.permitido) {
      const res = NextResponse.json({ error: "Muitas requisições. Aguarde." }, { status: 429 });
      aplicarRateLimitCookie(res, RL_CONFIG, rl);
      return res;
    }

    const sessionToken = request.cookies.get("session_token")?.value;
    const sessao = sessionToken ? await validarSessao(sessionToken) : null;

    if (!sessao)
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("funcionarios")
      .select("primeiro_acesso")
      .eq("id", sessao.funcionario_id)
      .single();

    if (error || !data)
      return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });

    return NextResponse.json({
      id: sessao.funcionario_id,
      nome: sessao.nome,
      cpf: sessao.cpf,
      primeiro_acesso: data.primeiro_acesso,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
