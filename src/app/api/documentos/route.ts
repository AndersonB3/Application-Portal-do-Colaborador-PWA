import { NextRequest, NextResponse } from "next/server";
import { validarSessao } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { verificarRateLimit, aplicarRateLimitCookie } from "@/lib/rate-limit";

const RL_CONFIG = { cookieName: "rl_documentos", maxRequests: 30, windowMs: 60_000 };

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

    const { data: docs, error: docsErr } = await supabase
      .from("documentos")
      .select("id, mes_referencia, ano_referencia, arquivo_nome, descricao, created_at, tipo")
      .eq("funcionario_id", sessao.funcionario_id)
      .order("ano_referencia", { ascending: false })
      .order("mes_referencia", { ascending: false });

    if (docsErr)
      return NextResponse.json({ error: "Erro ao buscar documentos." }, { status: 500 });

    if (!docs || docs.length === 0)
      return NextResponse.json({ documentos: [] });

    const docIds = docs.map((d) => d.id);
    const reciboMap: Record<string, unknown> = {};

    const { data: recibos } = await supabase
      .from("recibos")
      .select("id, status, assinatura_url, data_assinatura, documento_id")
      .eq("status", "Assinado")
      .eq("funcionario_id", sessao.funcionario_id)
      .in("documento_id", docIds);

    (recibos ?? []).forEach((r: { documento_id: string; id: string; status: string; assinatura_url: string | null; data_assinatura: string | null }) => {
      if (r.documento_id) {
        reciboMap[r.documento_id] = {
          id: r.id,
          status: "Assinado",
          assinatura_url: r.assinatura_url,
          data_assinatura: r.data_assinatura,
        };
      }
    });

    const documentos = docs.map((d) => ({ ...d, recibo: reciboMap[d.id] ?? null }));
    return NextResponse.json({ documentos });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
