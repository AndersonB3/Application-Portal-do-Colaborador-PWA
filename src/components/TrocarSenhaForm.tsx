"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function TrocarSenhaForm() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (!/[a-zA-Z]/.test(novaSenha) || !/[0-9]/.test(novaSenha)) {
      setErro("A senha deve conter pelo menos uma letra e um número.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/trocar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha_atual: senhaAtual || undefined, nova_senha: novaSenha }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao trocar senha.");
        return;
      }

      setSucesso(true);
      setTimeout(() => router.push("/painel"), 2000);
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "var(--login-bg)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4 animate-fadeInUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(200,85%,45%), hsl(150,60%,45%))" }}>
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Criar Nova Senha
          </h1>
          <p className="text-teal-200 text-sm">Defina uma senha segura para sua conta</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sucesso ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-green-700 font-semibold">Senha alterada com sucesso!</p>
              <p className="text-gray-400 text-sm">Redirecionando para o painel...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {erro && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="text-sm">{erro}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Senha Atual <span className="text-gray-400 font-normal">(deixe em branco se for primeiro acesso)</span>
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Senha atual (opcional no 1º acesso)"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 bg-white transition-all"
                  />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nova Senha</label>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres (letras + números)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar Nova Senha</label>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 bg-white transition-all"
                />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 text-sm cursor-pointer disabled:cursor-not-allowed">
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</>
                ) : (
                  <><KeyRound className="w-5 h-5" /> Salvar nova senha</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
