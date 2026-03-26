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

const CICLOS = ['CICLO 01', 'CICLO 02', 'CICLO 03'];
const DISTRITOS = ['Todos', 'MG/CO', 'RJ/ES', 'SP/SUL', 'NORTE/NE'];

export function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCiclo = searchParams.get('ciclo') || 'CICLO 02';
  const currentDistrito = searchParams.get('distrito') || 'Todos';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'Todos' && key !== 'ciclo') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex flex-col gap-1.5 min-w-[140px]">
        <label className="text-xs font-medium text-muted-foreground">Ciclo</label>
        <Select value={currentCiclo} onValueChange={(v: string) => updateParam('ciclo', v)}>
          <SelectTrigger className="bg-background border-border shadow-sm">
            <SelectValue placeholder="Selecione o Ciclo" />
          </SelectTrigger>
          <SelectContent>
            {CICLOS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[140px]">
        <label className="text-xs font-medium text-muted-foreground">Distrito</label>
        <Select value={currentDistrito} onValueChange={(v: string) => updateParam('distrito', v)}>

          <SelectTrigger className="bg-background border-border shadow-sm">
            <SelectValue placeholder="Selecione o Distrito" />
          </SelectTrigger>
          <SelectContent>
            {DISTRITOS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Placeholders para os outros filtros solicitados */}
      <div className="flex flex-col gap-1.5 min-w-[140px]">
        <label className="text-xs font-medium text-muted-foreground">Estrutura</label>
        <Select defaultValue="GO" disabled>
          <SelectTrigger className="bg-background border-border shadow-sm opacity-50">
            <SelectValue placeholder="GO" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GO">GO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[140px]">
        <label className="text-xs font-medium text-muted-foreground">Setor</label>
        <Select defaultValue="Todos" disabled>
          <SelectTrigger className="bg-background border-border shadow-sm opacity-50">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
