"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/src/lib/supabase/client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona conforme a sessão: dashboard se logado, login caso contrário.
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? "/hub" : "/login");
    });
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
