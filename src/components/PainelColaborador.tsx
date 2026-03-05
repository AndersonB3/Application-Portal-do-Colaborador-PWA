"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AssinaturaCanvas from "@/components/AssinaturaCanvas";
import {
  LogOut, FileText, Download, Calendar, User,
  ChevronDown, ChevronUp, Loader2, AlertCircle,
  Receipt, Lock, CheckCircle2, PenLine, X,
} from "lucide-react";

interface Colaborador { id: string; nome: string; cpf: string; }

interface Documento {
  id: string;
  mes_referencia: string | null;
  ano_referencia: number;
  arquivo_nome: string;
  descricao: string | null;
  created_at: string;
  tipo: string;
  recibo: {
    id: string;
    status: "Assinado";
    assinatura_url: string | null;
    data_assinatura: string | null;
  } | null;
}

const MESES: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março",    "04": "Abril",
  "05": "Maio",    "06": "Junho",     "07": "Julho",    "08": "Agosto",
  "09": "Setembro","10": "Outubro",   "11": "Novembro", "12": "Dezembro",
};

export default function PainelColaborador() {
  const router = useRouter();
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [expandido, setExpandido] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<"Todos" | "Contracheque" | "Informe de IR">("Todos");
  const [docAssinar, setDocAssinar] = useState<Documento | null>(null);
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    if (docAssinar) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [docAssinar]);

  const deslogar = useCallback(async () => {
    sessionStorage.removeItem("colaborador");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
  }, [router]);

  const carregarDocumentos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documentos");
      if (!res.ok) { if (res.status === 401) { deslogar(); return; } return; }
      const { documentos: docs } = await res.json();
      setDocumentos(docs ?? []);
    } catch {
      console.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const dados = sessionStorage.getItem("colaborador");
    if (!dados) { deslogar(); return; }
    let col: Colaborador;
    try {
      col = JSON.parse(dados);
      if (!col?.id || !col?.nome || !col?.cpf) throw new Error();
    } catch { deslogar(); return; }

    fetch("/api/auth/sessao")
      .then((res) => { if (!res.ok) { deslogar(); return null; } return res.json(); })
      .then((data) => {
        if (!data) return;
        if (data.primeiro_acesso) { router.push("/trocar-senha"); return; }
        setColaborador({ id: data.id, nome: data.nome, cpf: data.cpf });
        carregarDocumentos();
      })
      .catch(() => deslogar());
  }, [router, deslogar]);

  const handleAssinar = async (assinaturaBase64: string) => {
    if (!docAssinar || !colaborador) return;
    setSalvandoAssinatura(true);
    try {
      const mesTxt = docAssinar.mes_referencia
        ? ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][
            parseInt(docAssinar.mes_referencia) - 1
          ] + "/"
        : "";

      const res = await fetch("/api/recibos/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documento_id:      docAssinar.id,
          titulo:            `Recibo de Entrega — ${docAssinar.tipo} ${mesTxt}${docAssinar.ano_referencia}`,
          descricao:         `Declaro que recebi o documento "${docAssinar.tipo}" referente a ${mesTxt}${docAssinar.ano_referencia}${docAssinar.descricao ? ` — ${docAssinar.descricao}` : ""}.`,
          assinatura_base64: assinaturaBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao assinar");

      setDocAssinar(null);
      setSucesso("Recibo assinado com sucesso! O documento está liberado para download.");
      setTimeout(() => setSucesso(""), 5000);
      carregarDocumentos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar assinatura.";
      alert(msg);
    } finally {
      setSalvandoAssinatura(false);
    }
  };

  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const handleDownload = async (documentoId: string, mes: string | null, ano: number, nome: string, tipo: string) => {
    const janelaIOS = isIOS() ? window.open("", "_blank") : null;
    try {
      const res = await fetch("/api/documentos/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento_id: documentoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        janelaIOS?.close();
        alert(data.error || "Erro ao gerar link de download.");
        return;
      }
      if (janelaIOS) {
        janelaIOS.location.href = data.url;
      } else {
        const link = document.createElement("a");
        link.href = data.url;
        link.download = mes ? `${tipo.replace(/\s+/g, "_").toLowerCase()}_${MESES[mes]}_${ano}.pdf` : nome;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      janelaIOS?.close();
      alert("Erro ao baixar documento. Tente novamente.");
    }
  };

  const anos = [...new Set(documentos.map((d) => d.ano_referencia))].sort((a, b) => b - a);
  const docsDoAno = documentos.filter((d) => {
    if (d.ano_referencia !== anoSelecionado) return false;
    if (tipoFiltro === "Todos") return true;
    return d.tipo === tipoFiltro;
  });

  const liberado = (doc: Documento) => doc.recibo?.status === "Assinado";

  if (!colaborador) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(200,85%,45%), hsl(150,60%,45%))" }}>
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>
                Portal do Colaborador
              </h1>
              <p className="text-xs text-gray-400">ISIBA</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4 text-teal-600" />
              <span className="font-medium">{colaborador.nome}</span>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                sessionStorage.removeItem("colaborador");
                router.push("/");
              }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 animate-fadeInUp">
          <h2 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            Olá, {colaborador.nome.split(" ")[0]}! 👋
          </h2>
          <p className="text-gray-500 text-sm">
            Assine o recibo de recebimento para liberar o download dos seus documentos.
          </p>
        </div>

        {sucesso && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{sucesso}</p>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--gradient)", boxShadow: "0 4px 12px hsla(200,85%,45%,0.25)" }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>Documentos</h3>
                  <p className="text-xs text-gray-400">
                    {documentos.length} documento{documentos.length !== 1 ? "s" : ""} disponível{documentos.length !== 1 ? "is" : ""}
                  </p>
                </div>
              </div>
              {anos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    {(["Todos", "Contracheque", "Informe de IR"] as const).map((tipo) => (
                      <button key={tipo} onClick={() => { setTipoFiltro(tipo); setExpandido(true); }}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                          tipoFiltro === tipo ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}>
                        {tipo === "Informe de IR" ? "Inf. IR" : tipo}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                      className="text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 bg-white cursor-pointer">
                      {anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">Carregando documentos...</p>
              </div>
            ) : docsDoAno.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <AlertCircle className="w-8 h-8 mb-3" />
                <p className="text-sm font-medium">Nenhum documento encontrado</p>
                <p className="text-xs mt-1">Não há documentos para {anoSelecionado}.</p>
              </div>
            ) : (
              <>
                <button onClick={() => setExpandido(!expandido)}
                  className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
                  <span>{anoSelecionado} — {docsDoAno.length} documento{docsDoAno.length !== 1 ? "s" : ""}</span>
                  {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandido && docsDoAno.map((doc, index) => {
                  const docLiberado = liberado(doc);
                  return (
                    <div key={doc.id}
                      className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group animate-fadeIn"
                      style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        docLiberado ? "bg-teal-50" : "bg-amber-50"
                      }`}>
                        {docLiberado
                          ? <FileText className="w-5 h-5 text-teal-600" />
                          : <Lock className="w-5 h-5 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {doc.mes_referencia
                            ? `${MESES[doc.mes_referencia]} de ${doc.ano_referencia}`
                            : `${doc.tipo} ${doc.ano_referencia}`}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {docLiberado
                            ? `✓ Assinado em ${new Date(doc.recibo!.data_assinatura!).toLocaleDateString("pt-BR")}`
                            : "🔒 Assine para liberar o download"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!docLiberado && (
                          <button onClick={() => setDocAssinar(doc)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all cursor-pointer">
                            <PenLine className="w-3.5 h-3.5" />
                            Assinar
                          </button>
                        )}
                        {docLiberado && (
                          <button onClick={() => handleDownload(doc.id, doc.mes_referencia, doc.ano_referencia, doc.arquivo_nome, doc.tipo)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all cursor-pointer">
                            <Download className="w-3.5 h-3.5" />
                            Baixar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-5 p-4 bg-teal-50 border border-teal-100 rounded-xl flex items-start gap-3 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <AlertCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <p className="text-xs text-teal-700">
            Documentos com <strong>🔒 cadeado</strong> precisam de assinatura antes do download.
          </p>
        </div>
      </main>

      <footer className="mt-10 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} ISIBA. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Modal de Assinatura */}
      {docAssinar && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-sm animate-fadeIn"
          style={{ WebkitOverflowScrolling: "touch" }}
          onClick={(e) => { if (e.target === e.currentTarget && !salvandoAssinatura) setDocAssinar(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fadeInUp my-4 mx-4 shrink-0">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <PenLine className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>
                    Assinar Recibo de Entrega
                  </h3>
                  <p className="text-xs text-gray-400">
                    {docAssinar.mes_referencia
                      ? `${MESES[docAssinar.mes_referencia]} de ${docAssinar.ano_referencia}`
                      : `${docAssinar.tipo} ${docAssinar.ano_referencia}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setDocAssinar(null)} disabled={salvandoAssinatura}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                <p className="font-semibold mb-1">Declaração de recebimento</p>
                <p className="text-xs leading-relaxed">
                  Eu, <strong>{colaborador.nome}</strong>, declaro que recebi o documento{" "}
                  <strong>
                    {docAssinar.mes_referencia
                      ? `${docAssinar.tipo} de ${MESES[docAssinar.mes_referencia]}/${docAssinar.ano_referencia}`
                      : `${docAssinar.tipo} ${docAssinar.ano_referencia}`}
                  </strong>{" "}
                  e estou ciente do seu conteúdo.
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  Data: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <AssinaturaCanvas
                onConfirm={handleAssinar}
                onCancel={() => setDocAssinar(null)}
                salvando={salvandoAssinatura}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
