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

const CLASSIFICACOES   = ['A', 'B', 'C', 'Todas'];
const ESTRUTURAS       = ['Distrito', 'Setor'];
const DISTRITOS_ALL    = ['Todos', 'MG/CO', 'SP/PR', 'NORDESTE', 'RS/SC', 'RJ/ES', 'NORTE', 'SP/MT/MS', 'SPI'];
const DISTRITOS_SETOR  = ['MG/CO', 'SP/PR', 'NORDESTE', 'RS/SC', 'RJ/ES', 'NORTE', 'SP/MT/MS', 'SPI'];
const ESTADOS          = ['Todos', 'SP', 'MG', 'RJ', 'PR', 'RS', 'SC', 'BA']; // Exemplos
const MUNICIPIOS       = ['Todos', 'São Paulo', 'Belo Horizonte', 'Rio de Janeiro', 'Curitiba', 'Porto Alegre']; // Exemplos

interface SegmentacaoFiltersProps {
  availableSetores?: string[];
}

export function SegmentacaoFilters({ availableSetores = [] }: SegmentacaoFiltersProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const currentClassificacao = searchParams.get('classificacao') || 'Todas';
  const currentEstrutura     = searchParams.get('estrutura')     || 'Distrito';
  const currentDistritoRaw   = searchParams.get('distrito')      || 'Todos';
  const currentSetor         = searchParams.get('setor')         || 'Todos';
  const currentEstado        = searchParams.get('estado')        || 'Todos';
  const currentMunicipio     = searchParams.get('municipio')     || 'Todos';

  const isSetorMode = currentEstrutura === 'Setor';

  const currentDistrito = isSetorMode && currentDistritoRaw === 'Todos'
    ? 'MG/CO'
    : currentDistritoRaw;

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
    if (value === 'Setor' && currentDistritoRaw === 'Todos') {
      params.set('distrito', 'MG/CO');
    }
    router.push(`?${params.toString()}`);
  };

  const distritoOptions = isSetorMode ? DISTRITOS_SETOR : DISTRITOS_ALL;

  const triggerBase = 'h-8 text-[11px] lg:text-sm bg-white border-slate-200 shadow-sm transition-colors';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4 p-3 bg-white border border-slate-200 rounded-xl shadow-sm w-full">

      {/* Classificação */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Classificação</label>
        <Select value={currentClassificacao} onValueChange={(v) => updateParam('classificacao', v)}>
          <SelectTrigger className={`${triggerBase} hover:border-slate-300`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg">
            {CLASSIFICACOES.map((c) => (
              <SelectItem key={c} value={c} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estado */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Estado</label>
        <Select value={currentEstado} onValueChange={(v) => updateParam('estado', v)}>
          <SelectTrigger className={`${triggerBase} hover:border-slate-300`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg">
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Município */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Município</label>
        <Select value={currentMunicipio} onValueChange={(v) => updateParam('municipio', v)}>
          <SelectTrigger className={`${triggerBase} hover:border-slate-300`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg">
            {MUNICIPIOS.map((m) => (
              <SelectItem key={m} value={m} className="rounded-md cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Select value={currentDistrito} onValueChange={(v) => updateParam('distrito', v)}>
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
