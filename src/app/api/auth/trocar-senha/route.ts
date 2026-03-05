import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { validarSessao } from "@/lib/session";
import { verificarRateLimit, aplicarRateLimitCookie, limparRateLimitCookie } from "@/lib/rate-limit";

const RL_CONFIG = { cookieName: "rl_trocar_senha", maxRequests: 5, windowMs: 15 * 60 * 1000 };

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
      return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });

    const body = await request.json();
    const { senha_atual, nova_senha } = body;
    const funcionario_id = sessao.funcionario_id;

    if (!nova_senha || typeof nova_senha !== "string" || nova_senha.length < 6)
      return NextResponse.json({ error: "A nova senha deve ter no mínimo 6 caracteres." }, { status: 400 });
    if (nova_senha.length > 128)
      return NextResponse.json({ error: "Senha muito longa." }, { status: 400 });
    if (!/[a-zA-Z]/.test(nova_senha) || !/[0-9]/.test(nova_senha))
      return NextResponse.json({ error: "A senha deve conter pelo menos uma letra e um número." }, { status: 400 });
    if (nova_senha === "123456")
      return NextResponse.json({ error: "A nova senha não pode ser a senha padrão." }, { status: 400 });

    const supabase = getSupabase();

    const { data: funcionario, error: fetchErr } = await supabase
      .from("funcionarios")
      .select("id, senha, primeiro_acesso")
      .eq("id", funcionario_id)
      .single();

    if (fetchErr || !funcionario)
      return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });

    if (!funcionario.primeiro_acesso) {
      if (!senha_atual || typeof senha_atual !== "string")
        return NextResponse.json({ error: "Senha atual obrigatória." }, { status: 400 });

      let senhaAtualCorreta = false;
      if (funcionario.senha.startsWith("$2a$") || funcionario.senha.startsWith("$2b$")) {
        senhaAtualCorreta = await bcrypt.compare(senha_atual, funcionario.senha);
      } else {
        senhaAtualCorreta = funcionario.senha === senha_atual;
      }
      if (!senhaAtualCorreta) {
        const res = NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
        aplicarRateLimitCookie(res, RL_CONFIG, rl);
        return res;
      }
    }

    const novoHash = await bcrypt.hash(nova_senha, 12);
    const { error: updateErr } = await supabase
      .from("funcionarios")
      .update({ senha: novoHash, primeiro_acesso: false })
      .eq("id", funcionario_id);

    if (updateErr)
      return NextResponse.json({ error: "Erro ao atualizar senha." }, { status: 500 });

    const response = NextResponse.json({ success: true });
    limparRateLimitCookie(response, RL_CONFIG.cookieName);
    return response;
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
