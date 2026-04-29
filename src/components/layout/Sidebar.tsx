'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  PieChart, 
  BarChart3, 
  Target, 
  Settings, 
  Users,
  Search,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Input } from '@/src/components/ui/input';

const navItems = [
  { name: 'Cobertura e Medida de Visitação', path: '/visao-executiva', icon: LayoutDashboard },
  { name: 'Visitação x Segmentação', path: '/visitacao-x-segmentacao', icon: PieChart },
  { name: 'Entrega de Amostras', path: '/alocacao-de-recursos', icon: BarChart3 },
  { name: 'Médicos não Visitados', path: '/target-list', icon: Target },
];

const bottomNavItems = [
  { name: 'Configurações', path: '/settings', icon: Settings },
  { name: 'Equipe', path: '/team', icon: Users },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

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
        "w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed top-0 left-0 z-50 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* User Profile */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800">João Silva</span>
              <span className="text-xs text-slate-500">Gestor de Distrito</span>
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
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
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

          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-8">
            Sistema
          </div>
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
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
        </nav>
      </aside>
    </>
  );
}
