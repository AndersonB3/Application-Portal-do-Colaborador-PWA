import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--login-bg)" }}>
      <div className="text-center px-6 animate-fadeInUp">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 bg-white/10">
          <WifiOff className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "var(--font-heading)" }}>
          Sem conexão
        </h1>
        <p className="text-teal-200 text-sm mb-8 max-w-xs mx-auto">
          Você está offline. Verifique sua conexão com a internet e tente novamente.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-800 font-bold rounded-xl text-sm hover:bg-teal-50 transition-colors"
        >
          Tentar novamente
        </Link>
      </div>
    </div>
  );
}
