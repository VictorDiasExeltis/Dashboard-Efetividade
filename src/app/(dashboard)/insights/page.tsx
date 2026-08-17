'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TrendingDown, TrendingUp, UserX, Target, Gauge, Activity, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { useLayout } from '@/src/context/LayoutContext';
import { InsightsFilters } from '@/src/components/dashboard/InsightsFilters';
import { getDesempenhoVisitacao, type SetorDesempenho } from '@/src/app/actions/insights';
import { getMedicosNaoVisitados } from '@/src/app/actions/medicos';
import type { MedicoNaoVisitado } from '@/src/app/actions/medicos.types';

const TOP_DESEMP = 5;   // itens por lista no card Desempenho de Visitação

// Abrevia nomes do meio: "ANA PAULA DA SILVA" → "Ana P. Silva".
const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
function abreviarNome(nome: string | null): string {
  if (!nome) return '—';
  const p = nome.trim().split(/\s+/).filter(Boolean);
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (p.length <= 1) return p[0] ? cap(p[0]) : '—';
  const meio = p.slice(1, -1).filter((w) => !CONECTORES.has(w.toLowerCase())).map((w) => w.charAt(0).toUpperCase() + '.');
  return [cap(p[0]), ...meio, cap(p[p.length - 1])].join(' ');
}

const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(0)}%`);
const mdvFmt = (v: number | null) => (v == null ? '—' : v.toFixed(1));

// Uma linha de setor numa coluna de Desempenho de Visitação.
interface DesempItem { setor: string; rep: string; valor: string; media: string }

function DesempList({ title, icon: Icon, accent, items, loading, dir }: {
  title: string; icon: React.ElementType; accent: string;
  items: DesempItem[]; loading: boolean; dir: 'abaixo' | 'acima';
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent}`} />
        <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: TOP_DESEMP }).map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[11px] text-slate-400 py-3 text-center">Nenhum setor {dir} da média.</p>
      ) : (
        <ol className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-3.5 text-[11px] font-bold text-slate-400 tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900 text-xs truncate">{it.setor}</div>
                <div className="text-[10px] text-slate-500 truncate">{it.rep}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-semibold text-xs tabular-nums ${accent}`}>{it.valor}</div>
                <div className="text-[10px] text-slate-400 tabular-nums">méd {it.media}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

interface DesempLists {
  cobAbaixo: DesempItem[]; mdvAbaixo: DesempItem[];
  cobAcima: DesempItem[]; mdvAcima: DesempItem[];
}

function DesempenhoVisitacaoCard({ lists, periodo, loading }: { lists: DesempLists; periodo?: string; loading: boolean }) {
  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 rounded-lg bg-indigo-50 shrink-0"><Activity className="h-5 w-5 text-indigo-600" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-sm">Desempenho de Visitação</h3>
              {periodo && (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">{periodo}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Cobertura e MDV por setor vs. média do próprio distrito</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Abaixo da média — Cobertura e MDV lado a lado */}
          <div>
            <div className="flex items-center gap-1.5 mb-3 text-[11px] font-semibold text-rose-600 uppercase tracking-wide">
              <TrendingDown className="h-3.5 w-3.5" /> Abaixo da média
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:divide-x sm:divide-slate-200">
              <div className="sm:pr-6">
                <DesempList title="Cobertura" icon={Target} accent="text-rose-600" items={lists.cobAbaixo} loading={loading} dir="abaixo" />
              </div>
              <div className="sm:pl-6">
                <DesempList title="MDV" icon={Gauge} accent="text-rose-600" items={lists.mdvAbaixo} loading={loading} dir="abaixo" />
              </div>
            </div>
          </div>

          {/* Acima da média — Cobertura e MDV lado a lado */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-1.5 mb-3 text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">
              <TrendingUp className="h-3.5 w-3.5" /> Acima da média
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:divide-x sm:divide-slate-200">
              <div className="sm:pr-6">
                <DesempList title="Cobertura" icon={Target} accent="text-emerald-600" items={lists.cobAcima} loading={loading} dir="acima" />
              </div>
              <div className="sm:pl-6">
                <DesempList title="MDV" icon={Gauge} accent="text-emerald-600" items={lists.mdvAcima} loading={loading} dir="acima" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InsightsPage() {
  const { setHeaderState } = useLayout();
  const searchParams = useSearchParams();
  const [altoPotencial, setAltoPotencial] = useState<MedicoNaoVisitado[]>([]);
  const [loadingMed, setLoadingMed] = useState(true);
  const [desempRows, setDesempRows] = useState<SetorDesempenho[]>([]);
  const [desempMeta, setDesempMeta] = useState<{ ano: string | null; ini: string | null; fim: string | null }>({ ano: null, ini: null, fim: null });
  const [loadingDesemp, setLoadingDesemp] = useState(true);

  const distrito = searchParams.get('distrito') || 'Todos';
  const ciclo    = searchParams.get('ciclo')    || 'Todos';

  useEffect(() => {
    setHeaderState({
      title: 'Insights',
      subtitle: 'Destaques por setor — visão geral dos distritos',
      filters: (
        <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-md" />}>
          <InsightsFilters />
        </Suspense>
      ),
    });
    return () => setHeaderState({});
  }, [setHeaderState]);

  // Desempenho de Visitação — cobertura/MDV por setor. Ciclo 'Todos' = acumulado
  // do ano (sem ciclo 1); um ciclo = recorte àquele ciclo fechado.
  useEffect(() => {
    let cancelled = false;
    setLoadingDesemp(true);
    getDesempenhoVisitacao(ciclo)
      .then((d) => {
        if (cancelled) return;
        setDesempRows(d.rows);
        setDesempMeta({ ano: d.ano, ini: d.cicloInicial, fim: d.cicloFinal });
      })
      .finally(() => { if (!cancelled) setLoadingDesemp(false); });
    return () => { cancelled = true; };
  }, [ciclo]);

  // Médicos potencial 1-3 sem visita na janela (3 ciclos recentes ou o ciclo
  // selecionado). Busca por ciclo (todos os distritos) e filtra distrito no client.
  useEffect(() => {
    let cancelled = false;
    setLoadingMed(true);
    getMedicosNaoVisitados('Todos', 'Todos', true, ciclo)
      .then((meds) => {
        if (cancelled) return;
        setAltoPotencial(
          meds.filter((m) => m.potencial != null && m.potencial >= 1 && m.potencial <= 3),
        );
      })
      .finally(() => { if (!cancelled) setLoadingMed(false); });
    return () => { cancelled = true; };
  }, [ciclo]);

  // ── Desempenho de Visitação: 4 listas (top-5) vs. média do distrito ──
  const desempLists = useMemo<DesempLists>(() => {
    const rows = desempRows.filter((r) => distrito === 'Todos' || r.nome_distrito === distrito);
    // Média simples dos setores dentro de cada distrito.
    const meanBy = (sel: (r: SetorDesempenho) => number | null) => {
      const acc = new Map<string, number[]>();
      rows.forEach((r) => { const v = sel(r); if (v != null) { const a = acc.get(r.nome_distrito) ?? []; a.push(v); acc.set(r.nome_distrito, a); } });
      const m = new Map<string, number>();
      acc.forEach((arr, d) => m.set(d, arr.reduce((x, y) => x + y, 0) / arr.length));
      return m;
    };
    const mCob = meanBy((r) => r.cobertura);
    const mMdv = meanBy((r) => r.mdv);
    const build = (
      sel: (r: SetorDesempenho) => number | null,
      mean: Map<string, number>,
      dir: 'abaixo' | 'acima',
      fmt: (v: number | null) => string,
    ): DesempItem[] =>
      rows
        .map((r) => ({ r, v: sel(r), med: mean.get(r.nome_distrito) }))
        .filter((x): x is { r: SetorDesempenho; v: number; med: number } => x.v != null && x.med != null)
        .map((x) => ({ ...x, gap: x.v - x.med }))
        .filter((x) => (dir === 'abaixo' ? x.gap < 0 : x.gap > 0))
        .sort((a, b) => (dir === 'abaixo' ? a.gap - b.gap : b.gap - a.gap))
        .slice(0, TOP_DESEMP)
        .map((x) => ({ setor: x.r.nome_setor, rep: abreviarNome(x.r.nome_rep), valor: fmt(x.v), media: fmt(x.med) }));
    return {
      cobAbaixo: build((r) => r.cobertura, mCob, 'abaixo', pct),
      cobAcima:  build((r) => r.cobertura, mCob, 'acima',  pct),
      mdvAbaixo: build((r) => r.mdv, mMdv, 'abaixo', mdvFmt),
      mdvAcima:  build((r) => r.mdv, mMdv, 'acima',  mdvFmt),
    };
  }, [desempRows, distrito]);

  const periodoDesemp = desempMeta.ini && desempMeta.fim
    ? desempMeta.ini === desempMeta.fim
      ? `Ciclo ${desempMeta.fim.slice(-2)}/${desempMeta.ano ?? ''}`
      : `Ciclos ${desempMeta.ini.slice(-2)}–${desempMeta.fim.slice(-2)}/${desempMeta.ano ?? ''}`
    : undefined;

  // Filtra por distrito (client-side) + ordena por potencial (1 = maior).
  const altoPotencialOrdenado = useMemo(
    () => altoPotencial
      .filter((m) => distrito === 'Todos' || m.nome_distrito === distrito)
      .sort((a, b) => (a.potencial ?? 9) - (b.potencial ?? 9)),
    [altoPotencial, distrito],
  );

  // Exporta a lista atual (após filtro de distrito) para .xlsx.
  function handleExportMedicos() {
    const rows = altoPotencialOrdenado.map((m) => ({
      Nome:      m.nome_medico,
      CRMUF:     m.crmuf,
      Setor:     m.nome_setor ?? '',
      Distrito:  m.nome_distrito ?? '',
      Potencial: m.potencial ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alto potencial não visitado');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `alto-potencial-nao-visitado_${today}.xlsx`);
  }

  const POT_BADGE: Record<number, string> = {
    1: 'bg-rose-100 text-rose-700 border-rose-200',
    2: 'bg-orange-100 text-orange-700 border-orange-200',
    3: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  return (
    <div className="p-6">
      <div>
        <DesempenhoVisitacaoCard lists={desempLists} periodo={periodoDesemp} loading={loadingDesemp} />
      </div>

      {/* Médicos de alto potencial (1-3) sem visita na janela — lista de nomes */}
      <Card className="border border-slate-200 shadow-sm bg-white mt-4">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-rose-50 shrink-0"><UserX className="h-5 w-5 text-rose-600" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-800 text-sm">Alto potencial não visitado</h3>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                  {altoPotencialOrdenado.length} médicos
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Potencial 1 a 3, sem visita {ciclo === 'Todos' ? 'nos últimos 3 ciclos' : `no ciclo ${ciclo.slice(-2)}`}{distrito !== 'Todos' ? ` — ${distrito}` : ''}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMedicos}
              disabled={loadingMed || altoPotencialOrdenado.length === 0}
              className="gap-1.5 shrink-0"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>

          {loadingMed ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
            </div>
          ) : altoPotencialOrdenado.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Nenhum médico potencial 1-3 sem visita.</p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {altoPotencialOrdenado.map((m) => (
                  <li key={m.crmuf} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-100 bg-slate-50/60">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md border text-[10px] font-semibold tabular-nums shrink-0 ${POT_BADGE[m.potencial ?? 0] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {m.potencial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 text-xs truncate" title={m.nome_medico}>{abreviarNome(m.nome_medico)}</div>
                      <div className="text-[10px] text-slate-500 truncate">{m.nome_setor ?? '—'}{m.nome_distrito ? ` · ${m.nome_distrito}` : ''}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
