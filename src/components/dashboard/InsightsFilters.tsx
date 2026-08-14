'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { getDistritos, getCiclos } from '@/src/app/actions';

const TRIGGER_BASE =
  'h-6 py-0.5 text-[11px] bg-white border-slate-200 shadow-sm transition-colors w-full flex items-center justify-between px-2 rounded-md border [&>span]:block [&>span]:truncate overflow-hidden';

// "202607" → "Ciclo 07"
function formatCiclo(ciclo: string): string {
  return `Ciclo ${ciclo.slice(-2)}`;
}

// Filtros: ciclo + distrito (ambos opcionais). Ciclo "Todos" = acumulado do ano
// (só ciclos fechados); um ciclo = recorte àquele ciclo. Distrito "Todos" = visão
// geral; um distrito = recorte para o GD ver os setores dele.
export function InsightsFilters() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [distritos, setDistritos] = useState<string[]>([]);
  const [ciclos,    setCiclos]    = useState<string[]>([]);

  useEffect(() => {
    getDistritos().then(setDistritos);
    getCiclos().then(setCiclos);
  }, []);

  const distrito = searchParams.get('distrito') || 'Todos';
  const ciclo    = searchParams.get('ciclo')    || 'Todos';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'Todos') params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-row items-center gap-2 w-full">
      <div className="flex flex-col gap-0.5 w-[110px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ciclo</label>
        <Select value={ciclo} onValueChange={(v) => updateParam('ciclo', v)} disabled={!ciclos.length}>
          <SelectTrigger className={`${TRIGGER_BASE} hover:border-slate-300`}>
            <SelectValue placeholder={ciclos.length ? undefined : 'Carregando...'} />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
            {['Todos', ...ciclos].map((c) => (
              <SelectItem key={c} value={c} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                {c === 'Todos' ? 'Todos' : formatCiclo(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-0.5 w-[140px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Distrito</label>
        <Select value={distrito} onValueChange={(v) => updateParam('distrito', v)} disabled={!distritos.length}>
          <SelectTrigger className={`${TRIGGER_BASE} hover:border-slate-300`}>
            <SelectValue placeholder={distritos.length ? undefined : 'Carregando...'} />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
            {['Todos', ...distritos].map((d) => (
              <SelectItem key={d} value={d} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
