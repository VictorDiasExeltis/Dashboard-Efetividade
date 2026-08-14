'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PieChart,
  BarChart3,
  Target,
  CalendarCheck,
  Lightbulb,
  Search,
  UploadCloud,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '@/src/lib/supabase/client';
import { podeCarregar } from '@/src/lib/cargas/config';

// Liga/desliga o link da Central de Cargas no menu. false = oculto (a rota
// continua existindo por URL; a trava de escrita segue nas server actions).
const MOSTRAR_CENTRAL_CARGAS = false;

const navItems = [
  { name: 'Cobertura e MDV', path: '/visao-executiva', icon: LayoutDashboard },
  { name: 'Visitação x Segmentação', path: '/visitacao-x-segmentacao', icon: PieChart },
  { name: 'Entrega de Amostras', path: '/alocacao-de-recursos', icon: BarChart3 },
  { name: 'Médicos não Visitados', path: '/target-list', icon: Target },
  { name: 'Análise de Ciclo', path: '/analise-diaria', icon: CalendarCheck },
  { name: 'Insights', path: '/insights', icon: Lightbulb },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Deriva um nome de exibição a partir do e-mail: pega a parte antes do "@",
// separa por "." "_" "-", e capitaliza cada palavra.
// Ex.: "victor.eugenio@exeltis.com" -> "Victor Eugenio".
function nomeFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

// Iniciais para o avatar: primeira letra do primeiro e do último nome.
// Ex.: "Victor Eugenio" -> "VE"; "Victor" -> "V".
function iniciaisFromNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    getSupabaseClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        const mail = user?.email ?? '';
        setEmail(mail);
        if (mail) setNome(nomeFromEmail(mail));
      });
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-56 bg-white border-r border-slate-200 flex flex-col h-screen fixed top-0 left-0 z-50 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* User Profile */}
        <div className="h-[102px] px-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm font-bold shrink-0 select-none">
              {iniciaisFromNome(nome)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-slate-800 truncate">
                {nome || 'Carregando...'}
              </span>
              <span className="text-xs text-slate-500 truncate" title={email}>
                {email}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 md:hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              type="search" 
              placeholder="Buscar..." 
              className="pl-9 bg-slate-100 border-transparent focus-visible:ring-1 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-4">
            SFE Dashboard
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}

          {/* Central de Cargas — OCULTA temporariamente (a pedido). Para reexibir,
              troque `MOSTRAR_CENTRAL_CARGAS` para true no topo deste arquivo.
              A rota /central-de-cargas continua existindo; isto só esconde o link.
              A trava real de escrita segue nas server actions (podeCarregar). */}
          {MOSTRAR_CENTRAL_CARGAS && podeCarregar(email) && (
            <Link
              href="/central-de-cargas"
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === '/central-de-cargas'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <UploadCloud className="h-4 w-4" />
              Central de Cargas
            </Link>
          )}

          <div className="mt-8">
            <button
              onClick={async () => {
                await getSupabaseClient().auth.signOut();
                window.location.href = '/login';
              }}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Sair da Conta
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
