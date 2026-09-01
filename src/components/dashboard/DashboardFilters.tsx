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
import { CustomDropdown } from './CustomDropdown';

import { Filter, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { getDistritos, getCiclos, getProdutos } from '@/src/app/actions';

const ESTRUTURAS = ['Brasil', 'Distrito', 'Setor'];

// Janela de "abandono" da tela de Médicos não Visitados. Rótulos curtos para
// caber na mesma largura dos demais campos; o subtítulo da tela escreve por
// extenso. '3' é o padrão e por isso some da URL.
const PERIODOS = [
  { value: '3',   label: '3 ciclos' },
  { value: '6',   label: '6 ciclos' },
  { value: 'ano', label: 'No ano' },
];

// "202605" → "Ciclo 05"
function formatCiclo(ciclo: string): string {
  return `Ciclo ${ciclo.slice(-2)}`;
}

interface DashboardFiltersProps {
  availableSetores?: string[];
  showCiclo?: boolean;
  showProduto?: boolean;
  // Só a tela de Médicos não Visitados usa: escolhe a janela de abandono.
  showPeriodo?: boolean;
}

export function DashboardFilters({
  availableSetores = [],
  showCiclo = false,
  showProduto = false,
  showPeriodo = false,
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

  const currentCiclo      = searchParams.get('ciclo')      || 'Todos';
  const currentProduto    = searchParams.get('produto')    || 'Todos';
  const currentPeriodo    = searchParams.get('periodo')    || '3';
  const currentEstrutura  = searchParams.get('estrutura')  || 'Distrito';
  const currentDistritoRaw = searchParams.get('distrito')  || 'Todos';
  const currentSetor      = searchParams.get('setor')      || 'Todos';

  const isSetorMode = currentEstrutura === 'Setor';
  const isBrasilMode = currentEstrutura === 'Brasil';
  const distritoPadraoSetor = distritos[0] ?? 'Todos';
  const hasActiveFilters = currentEstrutura !== 'Distrito' || currentDistritoRaw !== 'Todos' || currentSetor !== 'Todos';

  const cicloOptions = useMemo(() => ciclos.map(c => ({ label: formatCiclo(c), value: c })), [ciclos]);
  const produtoOptions = useMemo(() => produtos.map(p => ({ label: p, value: p })), [produtos]);

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

  const triggerBase = 'h-6 py-0.5 text-[11px] bg-white border-slate-200 shadow-sm transition-colors w-full flex items-center justify-between px-2 rounded-md border [&>span]:block [&>span]:truncate overflow-hidden';
  // Em modo Setor, distrito vira obrigatório (sem opção "Todos").
  const distritoOptions = isSetorMode ? distritos : ['Todos', ...distritos];

  // Componente interno para evitar repetição dos controles
  const FilterFields = () => (
    <div className="flex flex-row items-center gap-2 w-full">
      {/* Ciclo (opcional) */}
      {showCiclo && (
        <div className="flex flex-col gap-0.5 w-[78px] shrink-0">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ciclo</label>
          <CustomDropdown
            value={currentCiclo}
            onChange={(v) => updateParam('ciclo', v)}
            options={cicloOptions}
            defaultValue="Todos"
            disabled={!ciclos.length}
          />
        </div>
      )}

      {/* Produto (opcional) */}
      {showProduto && (
        <div className="flex flex-col gap-0.5 w-[90px] shrink-0">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Produto</label>
          <CustomDropdown
            value={currentProduto}
            onChange={(v) => updateParam('produto', v)}
            options={produtoOptions}
            defaultValue="Todos"
            disabled={!produtos.length}
          />
        </div>
      )}

      {/* Período (opcional) — janela de abandono */}
      {showPeriodo && (
        <div className="flex flex-col gap-0.5 w-[86px] shrink-0">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Período</label>
          <Select
            value={currentPeriodo}
            // '3' é o padrão: sai da URL para o link ficar limpo.
            onValueChange={(v) => updateParam('periodo', v === '3' ? '' : v)}
          >
            <SelectTrigger className={`${triggerBase} hover:border-slate-300`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
              {PERIODOS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Estrutura */}
      <div className="flex flex-col gap-0.5 w-[78px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Estrutura</label>
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
      <div className="flex flex-col gap-0.5 w-[98px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          Distrito{isSetorMode && <span className="ml-1 text-blue-500">*</span>}
        </label>
        <Select value={isBrasilMode ? 'Todos' : currentDistritoRaw} onValueChange={(v) => updateParam('distrito', v)} disabled={isBrasilMode}>
          <SelectTrigger className={`${triggerBase} ${isSetorMode ? 'border-blue-200 ring-1 ring-blue-100' : 'hover:border-slate-300'} ${isBrasilMode ? 'opacity-40 cursor-not-allowed' : ''}`}>
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
      <div className="flex flex-col gap-0.5 w-[98px] shrink-0">
        <label className={`text-[9px] font-bold uppercase tracking-wider ${isSetorMode ? 'text-slate-500' : 'text-slate-300'}`}>
          Setor
        </label>
        <Select value={isBrasilMode ? 'Todos' : currentSetor} onValueChange={(v) => updateParam('setor', v)} disabled={!isSetorMode}>
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

