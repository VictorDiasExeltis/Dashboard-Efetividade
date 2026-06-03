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
import { getDistritos } from '@/src/app/actions';

const TRIGGER_BASE =
  'h-6 py-0.5 text-[11px] bg-white border-slate-200 shadow-sm transition-colors w-full flex items-center justify-between px-2 rounded-md border [&>span]:block [&>span]:truncate overflow-hidden';

// Filtro único: distrito (opcional). "Todos" = visão geral de todos os distritos;
// um distrito = recorte para o GD ver os setores dele.
export function InsightsFilters() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [distritos, setDistritos] = useState<string[]>([]);

  useEffect(() => { getDistritos().then(setDistritos); }, []);

  const distrito = searchParams.get('distrito') || 'Todos';

  const handleDistrito = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'Todos') params.delete('distrito');
    else params.set('distrito', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-row items-center gap-2 w-full">
      <div className="flex flex-col gap-0.5 w-[140px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Distrito</label>
        <Select value={distrito} onValueChange={handleDistrito} disabled={!distritos.length}>
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
