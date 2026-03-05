import { NextRequest, NextResponse } from "next/server";
import { validarSessao } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { verificarRateLimit, aplicarRateLimitCookie } from "@/lib/rate-limit";

const RL_CONFIG = { cookieName: "rl_download", maxRequests: 30, windowMs: 60_000 };

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { documento_id } = body;

    if (
      !documento_id ||
      typeof documento_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documento_id)
    )
      return NextResponse.json({ error: "ID do documento inválido." }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: doc, error: docErr } = await supabase
      .from("documentos")
      .select("id, arquivo_url, arquivo_path, arquivo_nome, funcionario_id")
      .eq("id", documento_id)
      .eq("funcionario_id", sessao.funcionario_id)
      .single();

    if (docErr || !doc)
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

    const { data: recibo } = await supabase
      .from("recibos")
      .select("id")
      .eq("documento_id", documento_id)
      .eq("funcionario_id", sessao.funcionario_id)
      .eq("status", "Assinado")
      .single();

    if (!recibo)
      return NextResponse.json(
        { error: "Você precisa assinar o recibo antes de baixar o documento." },
        { status: 403 }
      );

    if (!doc.arquivo_path)
      return NextResponse.json({ error: "Caminho do arquivo não encontrado." }, { status: 500 });

    const { data: signedData, error: signErr } = await supabase.storage
      .from("documentos")
      .createSignedUrl(doc.arquivo_path, 5 * 60);

    if (signErr || !signedData?.signedUrl)
      return NextResponse.json({ error: "Erro ao gerar link de download." }, { status: 500 });

    const res = NextResponse.json({ url: signedData.signedUrl, nome: doc.arquivo_nome });
    aplicarRateLimitCookie(res, RL_CONFIG, rl);
    return res;
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
