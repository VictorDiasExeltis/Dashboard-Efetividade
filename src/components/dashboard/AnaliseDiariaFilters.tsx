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
import { getSetoresPorDistrito, getDistritos } from '@/src/app/actions';

const TRIGGER_BASE =
  'h-6 py-0.5 text-[11px] bg-white border-slate-200 shadow-sm transition-colors w-full flex items-center justify-between px-2 rounded-md border [&>span]:block [&>span]:truncate overflow-hidden';

export function AnaliseDiariaFilters() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [distritos,          setDistritos]          = useState<string[]>([]);
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<string[]>([]);
  const [loadingSetores,     setLoadingSetores]     = useState(false);

  useEffect(() => {
    getDistritos().then(setDistritos);
  }, []);

  const currentDistrito = searchParams.get('distrito') || '';
  const currentSetor    = searchParams.get('setor')    || 'Todos';

  // Distrito é obrigatório: ao carregar a lista, força o primeiro se não houver
  // nenhum selecionado na URL.
  useEffect(() => {
    if (!currentDistrito && distritos.length) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('distrito', distritos[0]);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [currentDistrito, distritos, router, searchParams]);

  const setorHabilitado = !!currentDistrito;

  useEffect(() => {
    if (!setorHabilitado) {
      setSetoresDisponiveis([]);
      return;
    }
    setLoadingSetores(true);
    getSetoresPorDistrito(currentDistrito)
      .then(setSetoresDisponiveis)
      .finally(() => setLoadingSetores(false));
  }, [setorHabilitado, currentDistrito]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'Todos') params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleDistrito = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('distrito', value);
    params.delete('setor'); // troca de distrito reseta o setor
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-row items-center gap-2 w-full">
      {/* Distrito */}
      <div className="flex flex-col gap-0.5 w-[110px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Distrito</label>
        <Select value={currentDistrito || (distritos[0] ?? '')} onValueChange={handleDistrito} disabled={!distritos.length}>
          <SelectTrigger className={`${TRIGGER_BASE} hover:border-slate-300`}>
            <SelectValue placeholder={distritos.length ? undefined : 'Carregando...'} />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
            {distritos.map((d) => (
              <SelectItem key={d} value={d} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Setor */}
      <div className="flex flex-col gap-0.5 w-[110px] shrink-0">
        <label className={`text-[9px] font-bold uppercase tracking-wider ${setorHabilitado ? 'text-slate-500' : 'text-slate-300'}`}>
          Setor
        </label>
        <Select value={currentSetor} onValueChange={(v) => updateParam('setor', v)} disabled={!setorHabilitado || loadingSetores}>
          <SelectTrigger className={`${TRIGGER_BASE} ${setorHabilitado && !loadingSetores ? 'hover:border-slate-300' : 'opacity-40 cursor-not-allowed'}`}>
            <SelectValue placeholder={!setorHabilitado ? 'Escolha o distrito' : loadingSetores ? 'Carregando...' : 'Todos'} />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-[60]">
            <SelectItem value="Todos" className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
              Todos
            </SelectItem>
            {setoresDisponiveis.map((s) => (
              <SelectItem key={s} value={s} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
