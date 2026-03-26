'use client';

import React from 'react';
import { Search, Activity, Menu } from 'lucide-react';
import { Input } from '@/src/components/ui/input';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center flex-1 gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1 max-w-xl hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              type="search" 
              placeholder="Pesquisar médicos, setores ou distritos..." 
              className="pl-10 bg-slate-100 border-transparent focus-visible:ring-1 focus-visible:ring-blue-500 w-full max-w-md"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button className="sm:hidden relative p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100">
          <Search className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Activity className="h-4 w-4" />
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-sm font-bold text-slate-800">Exeltis</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Enterprise</span>
          </div>
        </div>
      </div>
    </header>
  );
}
