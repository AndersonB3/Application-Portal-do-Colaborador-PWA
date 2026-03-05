import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { criarSessao } from "@/lib/session";
import { verificarRateLimit, aplicarRateLimitCookie, limparRateLimitCookie } from "@/lib/rate-limit";

const RL_CONFIG = { cookieName: "rl_login", maxRequests: 5, windowMs: 15 * 60 * 1000 };

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const rl = verificarRateLimit(request, RL_CONFIG);
    if (!rl.permitido) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { cpf, senha } = body;

    if (typeof cpf === "string" && cpf.length > 20)
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    if (typeof senha === "string" && senha.length > 128)
      return NextResponse.json({ error: "Senha muito longa." }, { status: 400 });

    const cpfLimpo = (cpf || "").replace(/\D/g, "");
    if (cpfLimpo.length !== 11)
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    if (!senha || typeof senha !== "string" || senha.length < 1)
      return NextResponse.json({ error: "Senha obrigatória." }, { status: 400 });

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("funcionarios")
      .select("id, nome, cpf, senha, primeiro_acesso")
      .eq("cpf", cpfLimpo)
      .single();

    if (error || !data)
      return NextResponse.json({ error: "CPF ou senha incorretos." }, { status: 401 });

    let senhaCorreta = false;
    if (data.senha.startsWith("$2a$") || data.senha.startsWith("$2b$")) {
      senhaCorreta = await bcrypt.compare(senha, data.senha);
    } else {
      await bcrypt.hash("dummy", 12);
      senhaCorreta = data.senha === senha;
      if (senhaCorreta) {
        const hash = await bcrypt.hash(senha, 12);
        await supabase.from("funcionarios").update({ senha: hash }).eq("id", data.id);
      }
    }

    if (!senhaCorreta) {
      const res = NextResponse.json({ error: "CPF ou senha incorretos." }, { status: 401 });
      aplicarRateLimitCookie(res, RL_CONFIG, rl);
      return res;
    }

    const sessionToken = await criarSessao(data.id, data.nome, data.cpf);

    const response = NextResponse.json({
      id: data.id,
      nome: data.nome,
      cpf: data.cpf,
      primeiro_acesso: data.primeiro_acesso,
    });

    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    limparRateLimitCookie(response, RL_CONFIG.cookieName);
    return response;
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
