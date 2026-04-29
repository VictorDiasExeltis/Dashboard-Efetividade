"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // O getSession() é responsável por extrair o token da URL 
      // (hash fragment) e estabelecer a sessão no navegador.
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.push("/visao-executiva");
      } else {
        router.push("/login");
      }
    };
    
    checkAuth();
  }, [router]);

  // Enquanto decide para onde redirecionar (Dashboard ou Login),
  // mostra um estado de carregamento neutro.
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        <p className="text-slate-500 text-sm animate-pulse">Verificando autenticação...</p>
      </div>
    </div>
  );
}
