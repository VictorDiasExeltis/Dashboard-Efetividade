"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from "@/src/components/layout/Layout";
import { LayoutProvider } from '@/src/context/LayoutContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
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
  return (
    <LayoutProvider>
      <Layout>{children}</Layout>
    </LayoutProvider>
  );
}
