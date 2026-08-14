'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { getInsightsResumo, type ResumoInsight, type ResumoDirecao } from '@/src/app/actions/insights';

const ESTILO: Record<ResumoDirecao, { Icon: React.ElementType; cls: string; bg: string }> = {
  down:   { Icon: TrendingDown,  cls: 'text-rose-600',    bg: 'bg-rose-50' },
  up:     { Icon: TrendingUp,    cls: 'text-emerald-600', bg: 'bg-emerald-50' },
  neutro: { Icon: AlertTriangle, cls: 'text-amber-600',   bg: 'bg-amber-50' },
};

// Resumo automático: frases de tendência por setor/distrito (ciclos fechados).
// Gerado por regras no servidor; aqui só filtra por distrito e renderiza.
export function InsightsResumoCards({ distrito }: { distrito: string }) {
  const [rows, setRows] = useState<ResumoInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInsightsResumo()
      .then((r) => { if (!cancelled) setRows(r); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const lista = useMemo(
    () => rows.filter((r) => distrito === 'Todos' || r.distrito === distrito),
    [rows, distrito],
  );

  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-50 shrink-0"><Sparkles className="h-5 w-5 text-blue-600" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-sm">Resumo automático</h3>
              {!loading && (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                  {lista.length} destaques
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tendências por setor e distrito nos ciclos fechados{distrito !== 'Todos' ? ` — ${distrito}` : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : lista.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Sem destaques de tendência no período.</p>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {lista.map((it, i) => {
              const { Icon, cls, bg } = ESTILO[it.direcao];
              return (
                <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                  <div className={`p-1.5 rounded-md ${bg} shrink-0`}><Icon className={`h-4 w-4 ${cls}`} /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-800 leading-snug">{it.titulo}</p>
                    {it.contexto && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{it.contexto}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
