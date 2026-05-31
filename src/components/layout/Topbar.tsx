'use client';

import React from 'react';
import { Search, Activity, Menu } from 'lucide-react';
import { Input } from '@/src/components/ui/input';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
  filters?: React.ReactNode;
}

export function Topbar({ onMenuClick, title, subtitle, filters }: TopbarProps) {
  return (
    <header className="h-[102px] bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center flex-1 gap-4 h-full">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-row items-center justify-between flex-1 h-full py-2">
          {title && (
            <div className="flex flex-col min-w-fit">
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{subtitle}</p>}
            </div>
          )}

          {filters && (
            <div className="flex items-center justify-end pr-8">
              {filters}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">

        <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-slate-200">
          <img
            src="/logo_exeltis.png"
            alt="Logo Exeltis"
            className="h-10 w-auto object-contain"
          />
        </div>
      </div>
    </header>
  );
}
