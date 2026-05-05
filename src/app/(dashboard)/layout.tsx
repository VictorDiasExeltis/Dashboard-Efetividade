"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from "@/src/components/layout/Layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // DESATIVADO TEMPORARIAMENTE A PEDIDO DO USUÁRIO PARA ACESSO DIRETO
    /*
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setAuthenticated(true);
        setLoading(false);
      }
    };
    
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.push("/login");
        } else {
          setAuthenticated(true);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
    */
    
    // Forçando a autenticação para liberar o acesso ao dashboard
    setAuthenticated(true);
    setLoading(false);
  }, [router]);

  // Enquanto verifica o estado da autenticação, mostra um loader
  if (loading || !authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex space-x-4">
          <div className="h-3 w-3 bg-slate-400 rounded-full"></div>
          <div className="h-3 w-3 bg-slate-400 rounded-full"></div>
          <div className="h-3 w-3 bg-slate-400 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Se autenticado, renderiza o Layout (com Header e Sidebar) e o conteúdo da página
  return <Layout>{children}</Layout>;
}
