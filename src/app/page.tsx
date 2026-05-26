"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Acesso direto: enquanto autenticação estiver desativada, redireciona
    // o usuário direto para o dashboard.
    router.push("/visao-executiva");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        <p className="text-slate-500 text-sm animate-pulse">Verificando autenticação...</p>
      </div>
    </div>
  );
}
