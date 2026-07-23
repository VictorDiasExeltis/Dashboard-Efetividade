'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TrendingDown,
  TrendingUp,
  ArrowDownRight,
  CalendarOff,
  UserX,
  FlaskConical,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { useLayout } from '@/src/context/LayoutContext';
import { InsightsFilters } from '@/src/components/dashboard/InsightsFilters';
import { getAnaliseDiaria, type AnaliseDiariaRow } from '@/src/app/actions/analise-diaria';
import { getInsightsExtras } from '@/src/app/actions/insights';
import { getMedicosNaoVisitados } from '@/src/app/actions/medicos';
import type { MedicoNaoVisitado } from '@/src/app/actions/medicos.types';

const TOP_N = 3;

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

// Linha de setor com tudo que os insights precisam.
interface Setor {
  cod_setor: number;
  nome_setor: string;
  nome_distrito: string;
  nome_rep: string | null;
  atingimento: number | null;   // projeção / meta
  diasAbonados: number;
  alta: number;                 // alta categoria não visitada
  amostras: number;
  semSeg: number;               // médicos visitados sem segmentação
}

interface Item { setor: string; rep: string; valor: string }
interface InsightDef {
  icon: React.ElementType;
  accent: string;   // text color
  bg: string;
  title: string;
  hint: string;
  periodo?: string; // badge de ciclo (quando difere do atual)
  items: Item[];
}

const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(0)}%`);
const dnum = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function InsightCard({ def, loading }: { def: InsightDef; loading: boolean }) {
  const Icon = def.icon;
  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-lg ${def.bg} shrink-0`}><Icon className={`h-5 w-5 ${def.accent}`} /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-sm">{def.title}</h3>
              {def.periodo && (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                  {def.periodo}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{def.hint}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: TOP_N }).map((_, i) => <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : def.items.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Sem dados.</p>
        ) : (
          <ol className="space-y-1.5">
            {def.items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-[11px] font-bold text-slate-400 tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 truncate">{it.setor}</div>
                  <div className="text-[11px] text-slate-500 truncate">{it.rep}</div>
                </div>
                <span className={`font-semibold tabular-nums ${def.accent}`}>{it.valor}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default function InsightsPage() {
  const { setHeaderState } = useLayout();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [base, setBase] = useState<AnaliseDiariaRow[]>([]);
  const [extras, setExtras] = useState<Record<number, { alta: number; amostras: number; semSeg: number }>>({});
  const [cicloDetalhe, setCicloDetalhe] = useState<string | null>(null);
  const [altoPotencial, setAltoPotencial] = useState<MedicoNaoVisitado[]>([]);
  const [loadingMed, setLoadingMed] = useState(true);

  const distrito = searchParams.get('distrito') || 'Todos';

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getAnaliseDiaria(), getInsightsExtras()])
      .then(([b, ex]) => {
        if (cancelled) return;
        setBase(b);
        const map: Record<number, { alta: number; amostras: number; semSeg: number }> = {};
        ex.rows.forEach((r) => { map[r.cod_setor] = { alta: r.alta_cat_nao_visitada, amostras: r.amostras, semSeg: r.visitados_sem_seg }; });
        setExtras(map);
        setCicloDetalhe(ex.cicloDetalhe);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Médicos potencial 1-3 sem visita nos últimos 3 ciclos (lista de nomes).
  // Busca UMA vez (todos os distritos) e filtra no client — evita re-rodar a
  // query pesada a cada troca de distrito.
  useEffect(() => {
    let cancelled = false;
    setLoadingMed(true);
    getMedicosNaoVisitados('Todos', 'Todos')
      .then((meds) => {
        if (cancelled) return;
        setAltoPotencial(
          meds.filter((m) => m.potencial != null && m.potencial >= 1 && m.potencial <= 3),
        );
      })
      .finally(() => { if (!cancelled) setLoadingMed(false); });
    return () => { cancelled = true; };
  }, []);

  // Junta base (fato_visitas) + extras (visita). Aplica filtro de distrito.
  const setores = useMemo<Setor[]>(() => {
    return base
      .filter((r) => distrito === 'Todos' || r.nome_distrito === distrito)
      .map((r) => {
        const e = extras[r.cod_setor] ?? { alta: 0, amostras: 0, semSeg: 0 };
        const atingimento = r.projecao_fim != null && r.visitas_meta ? r.projecao_fim / r.visitas_meta : null;
        return {
          cod_setor: r.cod_setor,
          nome_setor: r.nome_setor,
          nome_distrito: r.nome_distrito ?? '—',
          nome_rep: r.nome_rep,
          atingimento,
          diasAbonados: Number(r.dias_abonados) || 0,
          alta: e.alta,
          amostras: e.amostras,
          semSeg: e.semSeg,
        };
      });
  }, [base, extras, distrito]);

  // Média de atingimento por distrito (para "abaixo da média do distrito").
  const mediaDistrito = useMemo(() => {
    const acc = new Map<string, number[]>();
    setores.forEach((s) => { if (s.atingimento != null) { const a = acc.get(s.nome_distrito) ?? []; a.push(s.atingimento); acc.set(s.nome_distrito, a); } });
    const m = new Map<string, number>();
    acc.forEach((arr, d) => m.set(d, arr.reduce((x, y) => x + y, 0) / arr.length));
    return m;
  }, [setores]);

  const mediaAmostras = useMemo(() => {
    const v = setores.map((s) => s.amostras).filter((x) => x > 0);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  }, [setores]);

  const item = (s: Setor, valor: string): Item => ({ setor: s.nome_setor, rep: abreviarNome(s.nome_rep), valor });

  const periodoDetalhe = cicloDetalhe ? `Ciclo ${cicloDetalhe.slice(-2)}` : undefined;

  // ── Definição dos 7 cards ──────────────────────────────────
  const cards = useMemo<InsightDef[]>(() => {
    const comAting = setores.filter((s) => s.atingimento != null);

    const piores = [...comAting].sort((a, b) => a.atingimento! - b.atingimento!).slice(0, TOP_N)
      .map((s) => item(s, pct(s.atingimento)));

    const melhores = [...comAting].sort((a, b) => b.atingimento! - a.atingimento!).slice(0, TOP_N)
      .map((s) => item(s, pct(s.atingimento)));

    const abaixoMedia = comAting
      .map((s) => ({ s, gap: s.atingimento! - (mediaDistrito.get(s.nome_distrito) ?? 0) }))
      .filter((x) => x.gap < 0)
      .sort((a, b) => a.gap - b.gap)
      .slice(0, TOP_N)
      .map((x) => item(x.s, `${pct(x.s.atingimento)} · méd ${pct(mediaDistrito.get(x.s.nome_distrito) ?? null)}`));

    const abonos = [...setores].filter((s) => s.diasAbonados > 0).sort((a, b) => b.diasAbonados - a.diasAbonados).slice(0, TOP_N)
      .map((s) => item(s, `${dnum(s.diasAbonados)}d`));

    const altaCat = [...setores].filter((s) => s.alta > 0).sort((a, b) => b.alta - a.alta).slice(0, TOP_N)
      .map((s) => item(s, String(s.alta)));

    const maisAmostras = [...setores].filter((s) => s.amostras > mediaAmostras && mediaAmostras > 0)
      .sort((a, b) => b.amostras - a.amostras).slice(0, TOP_N)
      .map((s) => item(s, dnum(s.amostras)));

    const semSeg = [...setores].filter((s) => s.semSeg > 0).sort((a, b) => b.semSeg - a.semSeg).slice(0, TOP_N)
      .map((s) => item(s, String(s.semSeg)));

    return [
      { icon: TrendingDown,  accent: 'text-rose-600',    bg: 'bg-rose-50',    title: 'Pior desempenho',                hint: 'Menor atingimento projetado (projeção/meta)', items: piores },
      { icon: TrendingUp,    accent: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Maior desempenho',               hint: 'Maior atingimento projetado',                 items: melhores },
      { icon: ArrowDownRight,accent: 'text-amber-600',   bg: 'bg-amber-50',   title: 'Abaixo da média do distrito',    hint: 'Atingimento abaixo da média do próprio distrito', items: abaixoMedia },
      { icon: CalendarOff,   accent: 'text-orange-600',  bg: 'bg-orange-50',  title: 'Maior volume de abonos',         hint: 'Dias abonados no ciclo',                      items: abonos },
      { icon: UserX,         accent: 'text-fuchsia-600', bg: 'bg-fuchsia-50', title: 'Alta categoria não visitada',    hint: 'Médicos potencial 1-2 sem visita',  periodo: periodoDetalhe, items: altaCat },
      { icon: FlaskConical,  accent: 'text-sky-600',     bg: 'bg-sky-50',     title: 'Amostras acima da média',        hint: 'Total de amostras entregues',       periodo: periodoDetalhe, items: maisAmostras },
      { icon: Layers,        accent: 'text-violet-600',  bg: 'bg-violet-50',  title: 'Visitas a médicos sem segmentação', hint: 'Médicos visitados sem nenhuma segmentação', periodo: periodoDetalhe, items: semSeg },
    ];
  }, [setores, mediaDistrito, mediaAmostras, periodoDetalhe]);

  // Filtra por distrito (client-side) + ordena por potencial (1 = maior).
  const altoPotencialOrdenado = useMemo(
    () => altoPotencial
      .filter((m) => distrito === 'Todos' || m.nome_distrito === distrito)
      .sort((a, b) => (a.potencial ?? 9) - (b.potencial ?? 9)),
    [altoPotencial, distrito],
  );

  const POT_BADGE: Record<number, string> = {
    1: 'bg-rose-100 text-rose-700 border-rose-200',
    2: 'bg-orange-100 text-orange-700 border-orange-200',
    3: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((def, i) => <InsightCard key={i} def={def} loading={loading} />)}
      </div>

      {/* Médicos de alto potencial (1-3) sem visita nos últimos 3 ciclos — lista de nomes */}
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
              <p className="text-xs text-slate-500 mt-0.5">Potencial 1 a 3, sem visita nos últimos 3 ciclos{distrito !== 'Todos' ? ` — ${distrito}` : ''}</p>
            </div>
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
      <p className="text-xs text-slate-400 mt-4">
        Insights de visita (alta categoria, amostras, segmentação) usam o último ciclo com dados detalhados
        {periodoDetalhe ? ` (${periodoDetalhe})` : ''}. Os demais usam o ciclo atual.
      </p>
    </div>
  );
}
