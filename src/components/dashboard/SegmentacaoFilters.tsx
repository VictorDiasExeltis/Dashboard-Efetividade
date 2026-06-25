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
import {
  getClassificacoes,
  getSetoresPorDistrito,
  getDistritos,
  getCiclos,
} from '@/src/app/actions';

const ESTRUTURAS = ['Distrito', 'Setor'];

const TRIGGER_BASE = 'h-6 py-0.5 text-[11px] bg-white border-slate-200 shadow-sm transition-colors w-full flex items-center justify-between px-2 rounded-md border [&>span]:block [&>span]:truncate overflow-hidden';

// "202605" → "Ciclo 05"
function formatCiclo(ciclo: string): string {
  return `Ciclo ${ciclo.slice(-2)}`;
}

export function SegmentacaoFilters() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ─── Dados dinâmicos (fonte: banco) ─────────────────────────
  const [classificacoes,      setClassificacoes]      = useState<string[]>([]);
  const [setoresDisponiveis,  setSetoresDisponiveis]  = useState<string[]>([]);
  const [distritos,           setDistritos]           = useState<string[]>([]);
  const [ciclos,              setCiclos]              = useState<string[]>([]);
  const [loadingSetores,      setLoadingSetores]      = useState(false);

  useEffect(() => {
    getClassificacoes().then(setClassificacoes);
    getDistritos().then(setDistritos);
    getCiclos().then(setCiclos);
  }, []);

  // Último ciclo disponível serve como default quando a URL não traz nenhum
  const ultimoCiclo = useMemo(
    () => (ciclos.length ? ciclos[ciclos.length - 1] : ''),
    [ciclos],
  );

  const currentCiclo         = searchParams.get('ciclo')         || ultimoCiclo;
  const currentClassificacao = searchParams.get('classificacao') || 'Todas';
  const currentPotencial     = searchParams.get('potencial')     || 'Todos';
  const currentEstrutura     = searchParams.get('estrutura')     || 'Distrito';
  const currentDistritoRaw   = searchParams.get('distrito')      || 'Todos';
  const currentSetor         = searchParams.get('setor')         || 'Todos';

  const isSetorMode     = currentEstrutura === 'Setor';
  // Quando entra em modo Setor, força um distrito específico (primeiro
  // disponível) já que setor só faz sentido no contexto de um distrito.
  const distritoPadraoSetor = distritos[0] ?? 'Todos';
  const currentDistrito = isSetorMode && currentDistritoRaw === 'Todos'
    ? distritoPadraoSetor
    : currentDistritoRaw;

  const distritoOptions = isSetorMode
    ? distritos                              // setor exige distrito específico
    : ['Todos', ...distritos];

  const cicloOptions = useMemo(() => ciclos.map((c) => ({ label: formatCiclo(c), value: c })), [ciclos]);
  const classificacaoOptions = useMemo(() => classificacoes.map((c) => ({ label: c, value: c })), [classificacoes]);
  // Potencial 1..5 (1 = maior). Multi-seleção via Ctrl+clique no dropdown.
  const potencialOptions = useMemo(
    () => [1, 2, 3, 4, 5].map((n) => ({ label: `Potencial ${n}`, value: String(n) })),
    [],
  );

  useEffect(() => {
    if (!isSetorMode) {
      setSetoresDisponiveis([]);
      return;
    }
    setLoadingSetores(true);
    getSetoresPorDistrito(currentDistrito)
      .then(setSetoresDisponiveis)
      .finally(() => setLoadingSetores(false));
  }, [isSetorMode, currentDistrito]);

  // ─── Handlers ─────────────────────────────────────────────

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'Todos' || value === 'Todas') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`);
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
    router.push(`?${params.toString()}`);
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="flex flex-row items-center gap-2 w-full">

      {/* Ciclo */}
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

      {/* Classificação */}
      <div className="flex flex-col gap-0.5 w-[100px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Classificação</label>
        <CustomDropdown
          value={currentClassificacao}
          onChange={(v) => updateParam('classificacao', v)}
          options={classificacaoOptions}
          defaultValue="Todas"
          disabled={!classificacoes.length}
        />
      </div>

      {/* Potencial */}
      <div className="flex flex-col gap-0.5 w-[100px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Potencial</label>
        <CustomDropdown
          value={currentPotencial}
          onChange={(v) => updateParam('potencial', v)}
          options={potencialOptions}
          defaultValue="Todos"
        />
      </div>

      {/* Estrutura */}
      <div className="flex flex-col gap-0.5 w-[78px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Estrutura</label>
        <Select value={currentEstrutura} onValueChange={handleEstrutura}>
          <SelectTrigger className={`${TRIGGER_BASE} hover:border-slate-300`}>
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
      <div className="flex flex-col gap-0.5 w-[98px] shrink-0">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          Distrito{isSetorMode && <span className="ml-1 text-blue-500">*</span>}
        </label>
        <Select value={currentDistrito} onValueChange={(v) => updateParam('distrito', v)} disabled={!distritos.length}>
          <SelectTrigger className={`${TRIGGER_BASE} ${isSetorMode ? 'border-blue-200 ring-1 ring-blue-100' : 'hover:border-slate-300'}`}>
            <SelectValue placeholder={distritos.length ? undefined : 'Carregando...'} />
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
      <div className="flex flex-col gap-0.5 w-[98px] shrink-0">
        <label className={`text-[10px] font-semibold uppercase tracking-wide ${isSetorMode ? 'text-slate-500' : 'text-slate-300'}`}>
          Setor
        </label>
        <Select value={currentSetor} onValueChange={(v) => updateParam('setor', v)} disabled={!isSetorMode || loadingSetores}>
          <SelectTrigger className={`${TRIGGER_BASE} ${isSetorMode && !loadingSetores ? 'hover:border-slate-300' : 'opacity-40 cursor-not-allowed'}`}>
            <SelectValue placeholder={
              !isSetorMode ? '—' : loadingSetores ? 'Carregando...' : 'Todos'
            } />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg">
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
