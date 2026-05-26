'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

import { Filter, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { getDistritos, getCiclos, getProdutos } from '@/src/app/actions';

const ESTRUTURAS = ['Distrito', 'Setor'];

// "202605" → "Ciclo 05"
function formatCiclo(ciclo: string): string {
  return `Ciclo ${ciclo.slice(-2)}`;
}

interface DashboardFiltersProps {
  availableSetores?: string[];
  showCiclo?: boolean;
  showProduto?: boolean;
}

export function DashboardFilters({
  availableSetores = [],
  showCiclo = false,
  showProduto = false,
}: DashboardFiltersProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [distritos, setDistritos] = useState<string[]>([]);
  const [ciclos,    setCiclos]    = useState<string[]>([]);
  const [produtos,  setProdutos]  = useState<string[]>([]);

  useEffect(() => {
    getDistritos().then(setDistritos);
    if (showCiclo)   getCiclos().then(setCiclos);
    if (showProduto) getProdutos().then(setProdutos);
  }, [showCiclo, showProduto]);

  const ultimoCiclo = useMemo(
    () => (ciclos.length ? ciclos[ciclos.length - 1] : ''),
    [ciclos],
  );

  const currentCiclo      = searchParams.get('ciclo')      || (showCiclo ? ultimoCiclo : 'Todos');
  const currentProduto    = searchParams.get('produto')    || 'Todos';
  const currentEstrutura  = searchParams.get('estrutura')  || 'Distrito';
  const currentDistritoRaw = searchParams.get('distrito')  || 'Todos';
  const currentSetor      = searchParams.get('setor')      || 'Todos';

  const isSetorMode = currentEstrutura === 'Setor';
  const distritoPadraoSetor = distritos[0] ?? 'Todos';
  const hasActiveFilters = currentEstrutura !== 'Distrito' || currentDistritoRaw !== 'Todos' || currentSetor !== 'Todos';

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

  const handleEstrutura = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('estrutura', value);
    params.delete('setor');
    if (value === 'Setor') {
      if (currentDistritoRaw === 'Todos' && distritoPadraoSetor !== 'Todos') {
        params.set('distrito', distritoPadraoSetor);
      }
    } else {
      params.delete('distrito');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const triggerBase = 'h-8 text-sm bg-white border-slate-200 shadow-sm transition-colors w-full flex items-center justify-between px-3 rounded-md border';
  // Em modo Setor, distrito vira obrigatório (sem opção "Todos").
  const distritoOptions = isSetorMode ? distritos : ['Todos', ...distritos];

  // Componente interno para evitar repetição dos controles
  const FilterFields = () => (
    <div className="flex flex-row items-center gap-3 w-full">
      {/* Ciclo (opcional) */}
      {showCiclo && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ciclo</label>
          <Select value={currentCiclo} onValueChange={(v) => updateParam('ciclo', v)} disabled={!ciclos.length}>
            <SelectTrigger className={`${triggerBase} hover:border-slate-300`}>
              <SelectValue placeholder={ciclos.length ? undefined : 'Carregando...'} />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
              {ciclos.map((c) => (
                <SelectItem key={c} value={c} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                  {formatCiclo(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Produto (opcional) */}
      {showProduto && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Produto</label>
          <Select value={currentProduto} onValueChange={(v) => updateParam('produto', v)} disabled={!produtos.length}>
            <SelectTrigger className={`${triggerBase} hover:border-slate-300`}>
              <SelectValue placeholder={produtos.length ? undefined : 'Carregando...'} />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
              <SelectItem value="Todos" className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                Todos
              </SelectItem>
              {produtos.map((p) => (
                <SelectItem key={p} value={p} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Estrutura */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estrutura</label>
        <Select value={currentEstrutura} onValueChange={handleEstrutura}>
          <SelectTrigger className={`${triggerBase} hover:border-slate-300`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
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
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Distrito{isSetorMode && <span className="ml-1 text-blue-500">*</span>}
        </label>
        <Select value={currentDistritoRaw} onValueChange={(v) => updateParam('distrito', v)}>
          <SelectTrigger className={`${triggerBase} ${isSetorMode ? 'border-blue-200 ring-1 ring-blue-100' : 'hover:border-slate-300'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
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
        <label className={`text-[10px] font-bold uppercase tracking-wider ${isSetorMode ? 'text-slate-500' : 'text-slate-300'}`}>
          Setor
        </label>
        <Select value={currentSetor} onValueChange={(v) => updateParam('setor', v)} disabled={!isSetorMode}>
          <SelectTrigger className={`${triggerBase} ${isSetorMode ? 'hover:border-slate-300' : 'opacity-40 cursor-not-allowed'}`}>
            <SelectValue placeholder={isSetorMode ? 'Todos' : '—'} />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
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

  // Removido lógica de scroll e botão flutuante para integrar ao Header
  
  // Container maior quando há filtros extras pra acomodar todos os campos
  const maxW = showCiclo || showProduto ? 'max-w-4xl' : 'max-w-2xl';

  return (
    <div className={`flex items-center gap-3 w-full ${maxW}`}>
      <FilterFields />
    </div>
  );
}

