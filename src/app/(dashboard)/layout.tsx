"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from "@/src/components/layout/Layout";
import { LayoutProvider } from '@/src/context/LayoutContext';
import { getSupabaseClient } from '@/src/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Verifica se há uma sessão ativa; se não houver, redireciona para o login
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAuthenticated(true);
        setLoading(false);
      } else {
        router.replace("/login");
      }
    };

    checkSession();

    // Mantém o guard reativo: se o usuário deslogar, volta para o login
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setAuthenticated(true);
          setLoading(false);
        } else {
          setAuthenticated(false);
          router.replace("/login");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
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
  return (
    <LayoutProvider>
      <Layout>{children}</Layout>
    </LayoutProvider>
  );
}
