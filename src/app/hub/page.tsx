'use client';

// ─── HUB TEMPORÁRIO ──────────────────────────────────────────────────────────
// Tela de escolha logo após o login: 2 relatórios lado a lado.
// GAMBIARRA temporária: o relatório da colega é um HTML estático servido de
// public/relatorio-colega/. Trocar depois pela integração de verdade.
// Para ajustar o relatório externo, mude só as 3 constantes abaixo.
const REL_EXTERNO = {
  nome: 'Relatório da Equipe',                 // TODO: nome real do relatório da colega
  descricao: 'Relatórios em Excel — visão complementar.',
  url: '/relatorio-colega/index.html',         // arquivos ficam em public/relatorio-colega/
};

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BarChart3, Table2, ExternalLink, LogOut, ArrowRight } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase/client';

export default function HubPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Guard: só entra logado (mesmo padrão do (dashboard)/layout).
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setChecking(false);
      else router.replace('/login');
    });
  }, [router]);

  const sair = async () => {
    await getSupabaseClient().auth.signOut();
    router.replace('/login');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Topo */}
      <header className="flex items-center justify-between px-6 py-4">
        <Image src="/logo_exeltis.png" alt="Exeltis" width={116} height={32} priority className="h-8 w-auto object-contain" />
        <button
          onClick={sair}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-900">Central de Relatórios</h1>
          <p className="text-slate-500 mt-2 text-sm">Selecione qual relatório deseja acessar.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-3xl">
          {/* Meu relatório — interno */}
          <button
            onClick={() => router.push('/visao-executiva')}
            className="group text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-50"><BarChart3 className="h-6 w-6 text-blue-700" /></div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h2 className="font-semibold text-slate-900">Dashboard de Efetividade</h2>
            <p className="text-sm text-slate-500 mt-1">Cobertura, MDV, amostras e insights por setor e distrito.</p>
          </button>

          {/* Relatório externo — abre em nova aba */}
          <a
            href={REL_EXTERNO.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-teal-300 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-teal-50"><Table2 className="h-6 w-6 text-teal-700" /></div>
              <ExternalLink className="h-5 w-5 text-slate-300 group-hover:text-teal-600 transition-colors" />
            </div>
            <h2 className="font-semibold text-slate-900">{REL_EXTERNO.nome}</h2>
            <p className="text-sm text-slate-500 mt-1">{REL_EXTERNO.descricao}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5 mt-3">
              Abre em nova aba
            </span>
          </a>
        </div>
      </main>
    </div>
  );
}
