import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validarSessao } from "@/lib/session";
import { verificarRateLimit, aplicarRateLimitCookie } from "@/lib/rate-limit";

const RL_CONFIG = { cookieName: "rl_assinar", maxRequests: 20, windowMs: 15 * 60 * 1000 };

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;
    const sessao = sessionToken ? await validarSessao(sessionToken) : null;
    if (!sessao)
      return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });

    const rl = verificarRateLimit(request, RL_CONFIG);
    if (!rl.permitido)
      return NextResponse.json({ error: "Muitas requisições. Aguarde." }, { status: 429 });

    const body = await request.json();
    const { documento_id, titulo, descricao, assinatura_base64 } = body;
    const funcionario_id = sessao.funcionario_id;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!documento_id || !uuidRegex.test(documento_id))
      return NextResponse.json({ error: "ID do documento inválido." }, { status: 400 });
    if (!titulo || typeof titulo !== "string" || titulo.length > 500)
      return NextResponse.json({ error: "Título inválido." }, { status: 400 });
    if (!descricao || typeof descricao !== "string" || descricao.length > 2000)
      return NextResponse.json({ error: "Descrição inválida." }, { status: 400 });
    if (!assinatura_base64 || typeof assinatura_base64 !== "string")
      return NextResponse.json({ error: "Assinatura obrigatória." }, { status: 400 });
    if (!assinatura_base64.startsWith("data:image/png;base64,"))
      return NextResponse.json({ error: "Formato de assinatura inválido." }, { status: 400 });
    if (assinatura_base64.length > 500_000)
      return NextResponse.json({ error: "Assinatura muito grande." }, { status: 400 });

    const supabase = getSupabase();

    const { data: funcionario, error: funcErr } = await supabase
      .from("funcionarios").select("id").eq("id", funcionario_id).single();
    if (funcErr || !funcionario)
      return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });

    const { data: documento, error: docErr } = await supabase
      .from("documentos").select("id, funcionario_id")
      .eq("id", documento_id).eq("funcionario_id", funcionario_id).single();
    if (docErr || !documento)
      return NextResponse.json({ error: "Documento não encontrado ou não pertence ao funcionário." }, { status: 404 });

    const { data: reciboExistente } = await supabase
      .from("recibos").select("id").eq("documento_id", documento_id).eq("status", "Assinado").single();
    if (reciboExistente)
      return NextResponse.json({ error: "Este documento já foi assinado." }, { status: 409 });

    const base64Data = assinatura_base64.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const nomeArquivo = `${funcionario_id}/${documento_id}_${Date.now()}.png`;

    const { error: uploadErr } = await supabase.storage
      .from("assinaturas")
      .upload(nomeArquivo, buffer, { contentType: "image/png", upsert: false });

    if (uploadErr)
      return NextResponse.json({ error: "Erro ao salvar assinatura." }, { status: 500 });

    const { data: recibo, error: reciboErr } = await supabase
      .from("recibos")
      .insert({
        funcionario_id,
        documento_id,
        titulo,
        descricao,
        data_emissao: new Date().toISOString().split("T")[0],
        data_assinatura: new Date().toISOString(),
        status: "Assinado",
        assinatura_url: nomeArquivo,
      })
      .select("id")
      .single();

    if (reciboErr)
      return NextResponse.json({ error: "Erro ao salvar recibo." }, { status: 500 });

    return NextResponse.json({ success: true, recibo_id: recibo.id });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
