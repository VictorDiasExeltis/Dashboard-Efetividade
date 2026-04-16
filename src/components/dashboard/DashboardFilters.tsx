'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/src/components/ui/dropdown-menu';

const ALL_CICLOS       = ['CICLO 01', 'CICLO 02', 'CICLO 03'];
const ESTRUTURAS       = ['Distrito', 'Setor'];
const DISTRITOS_ALL    = ['Todos', 'MG/CO', 'SP/PR', 'NORDESTE', 'RS/SC', 'RJ/ES', 'NORTE', 'SP/MT/MS', 'SPI'];
const DISTRITOS_SETOR  = ['MG/CO', 'SP/PR', 'NORDESTE', 'RS/SC', 'RJ/ES', 'NORTE', 'SP/MT/MS', 'SPI']; // sem "Todos" no modo Setor

interface DashboardFiltersProps {
  availableSetores?: string[];
}

export function DashboardFilters({ availableSetores = [] }: DashboardFiltersProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const cicloParam        = searchParams.get('ciclo') || 'Todos';
  const currentEstrutura  = searchParams.get('estrutura')  || 'Distrito';
  const currentDistritoRaw = searchParams.get('distrito')  || 'Todos';
  const currentSetor      = searchParams.get('setor')      || 'Todos';

  const isSetorMode = currentEstrutura === 'Setor';

  // Parser para ciclos selecionados - Padrão é todos se nenhum parâmetro ou se 'Todos'
  const selectedCycles = (!cicloParam || cicloParam === 'Todos') 
    ? [...ALL_CICLOS] 
    : cicloParam.split(',').filter(Boolean);

  // Atualiza um único parâmetro na URL
  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'Todos' || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const toggleCiclo = (ciclo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    let newSelection: string[];

    if (selectedCycles.includes(ciclo)) {
      // Não permite desmarcar se for o único selecionado (opcional, mas evita estado vazio estranho)
      if (selectedCycles.length === 1) return;
      newSelection = selectedCycles.filter(c => c !== ciclo);
    } else {
      newSelection = [...selectedCycles, ciclo];
    }

    // Ordena os ciclos de acordo com a ordem original ALL_CICLOS
    newSelection.sort((a, b) => ALL_CICLOS.indexOf(a) - ALL_CICLOS.indexOf(b));

    if (newSelection.length === ALL_CICLOS.length) {
      params.delete('ciclo');
    } else {
      params.set('ciclo', newSelection.join(','));
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const selectAllCiclos = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('ciclo');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleEstrutura = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('estrutura', value);
    params.delete('setor');
    if (value === 'Setor' && currentDistritoRaw === 'Todos') {
      params.set('distrito', 'MG/CO');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const triggerBase = 'h-8 text-sm bg-white border-slate-200 shadow-sm transition-colors w-full flex items-center justify-between px-3 rounded-md border';
  const distritoOptions = isSetorMode ? DISTRITOS_SETOR : DISTRITOS_ALL;

  return (
    <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-white border border-slate-200 rounded-xl shadow-sm w-[55%] min-w-[520px]">

      {/* Ciclo Multi-Select */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ciclo</label>
        <DropdownMenu>
          <DropdownMenuTrigger className={`${triggerBase} hover:border-slate-300 outline-none focus:ring-1 focus:ring-blue-100`}>
            <span className="truncate mr-1">
              {selectedCycles.length === ALL_CICLOS.length ? 'Todos os Ciclos' : selectedCycles.length === 1 ? selectedCycles[0] : `${selectedCycles.length} Selecionados`}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white border border-slate-200 shadow-lg rounded-lg min-w-[160px] p-1" align="start">
            {ALL_CICLOS.map((c) => (
              <DropdownMenuCheckboxItem
                key={c}
                checked={selectedCycles.includes(c)}
                onCheckedChange={() => toggleCiclo(c)}
                onSelect={(e) => e.preventDefault()}
                className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700 font-medium"
              >
                {c}
              </DropdownMenuCheckboxItem>
            ))}
            {selectedCycles.length < ALL_CICLOS.length && (
              <>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <button
                  onClick={selectAllCiclos}
                  className="w-full text-left px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-md font-semibold transition-colors"
                >
                  Selecionar Todos
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Estrutura */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Estrutura</label>
        <Select value={currentEstrutura} onValueChange={handleEstrutura}>
          <SelectTrigger className={`${triggerBase} hover:border-slate-300`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg">
            {ESTRUTURAS.map((e) => (
              <SelectItem key={e} value={e} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Distrito */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          Distrito{isSetorMode && <span className="ml-1 text-blue-500">*</span>}
        </label>
        <Select value={currentDistritoRaw} onValueChange={(v) => updateParam('distrito', v)}>
          <SelectTrigger className={`${triggerBase} ${isSetorMode ? 'border-blue-200 ring-1 ring-blue-100' : 'hover:border-slate-300'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg">
            {distritoOptions.map((d) => (
              <SelectItem key={d} value={d} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Setor */}
      <div className="flex flex-col gap-1">
        <label className={`text-[10px] font-semibold uppercase tracking-wide ${isSetorMode ? 'text-slate-500' : 'text-slate-300'}`}>
          Setor
        </label>
        <Select value={currentSetor} onValueChange={(v) => updateParam('setor', v)} disabled={!isSetorMode}>
          <SelectTrigger className={`${triggerBase} ${isSetorMode ? 'hover:border-slate-300' : 'opacity-40 cursor-not-allowed'}`}>
            <SelectValue placeholder={isSetorMode ? 'Todos' : '—'} />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg">
            <SelectItem value="Todos" className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
              Todos
            </SelectItem>
            {availableSetores.map((s) => (
              <SelectItem
                key={String(s)}
                value={String(s)}
                className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700"
              >
                {String(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    </div>
  );
}
