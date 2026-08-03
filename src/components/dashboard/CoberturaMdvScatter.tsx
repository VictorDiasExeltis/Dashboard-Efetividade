'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';
import { ScatterChart as ScatterIcon } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { getDesempenhoVisitacao, type SetorDesempenho } from '@/src/app/actions/insights';

type Gran = 'setor' | 'distrito';

interface Ponto {
  x: number;        // cobertura em %
  y: number;        // mdv
  nome: string;
  distrito: string;
  visitas: number;
}

const COR = {
  bom:   '#059669',  // alta cobertura + alto MDV
  ruim:  '#e11d48',  // baixa cobertura + baixo MDV
  misto: '#d97706',  // um alto, outro baixo
  grid:  '#f1f5f9',
  tick:  '#64748b',
  ref:   '#94a3b8',
};

function quadranteCor(p: Ponto, mx: number, my: number): string {
  const cobAlta = p.x >= mx;
  const mdvAlto = p.y >= my;
  if (cobAlta && mdvAlto) return COR.bom;
  if (!cobAlta && !mdvAlto) return COR.ruim;
  return COR.misto;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: Ponto = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
      <div className="font-semibold text-slate-800 mb-1">{p.nome}</div>
      <div className="text-slate-500">{p.distrito}</div>
      <div className="mt-1 flex gap-3">
        <span className="text-slate-600">Cobertura <b className="text-slate-900">{p.x.toFixed(0)}%</b></span>
        <span className="text-slate-600">MDV <b className="text-slate-900">{p.y.toFixed(1)}</b></span>
      </div>
      <div className="text-slate-400 mt-0.5">{p.visitas.toLocaleString('pt-BR')} visitas</div>
    </div>
  );
}

// Auto-suficiente: busca cobertura/MDV por setor (ano sem ciclo 1). `distrito`
// vem da tela onde é montado; 'Todos' mostra todos os setores.
export function CoberturaMdvScatter({ distrito = 'Todos' }: { distrito?: string }) {
  const [mounted, setMounted] = useState(false);
  const [gran, setGran] = useState<Gran>('setor');
  const [rows, setRows] = useState<SetorDesempenho[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<string | undefined>(undefined);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDesempenhoVisitacao()
      .then((d) => {
        if (cancelled) return;
        setRows(d.rows);
        setPeriodo(d.cicloInicial && d.cicloFinal
          ? `Ciclos ${d.cicloInicial.slice(-2)}–${d.cicloFinal.slice(-2)}/${d.ano ?? ''}`
          : undefined);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const pontos = useMemo<Ponto[]>(() => {
    const base = rows.filter((r) => distrito === 'Todos' || r.nome_distrito === distrito);
    if (gran === 'setor') {
      return base
        .filter((r) => r.cobertura != null && r.mdv != null)
        .map((r) => ({ x: r.cobertura! * 100, y: r.mdv!, nome: r.nome_setor, distrito: r.nome_distrito, visitas: r.visitas }));
    }
    // Agrega por distrito: soma visitas/painel/dias (evita média de razões).
    const acc = new Map<string, { v: number; p: number; d: number }>();
    base.forEach((r) => {
      const a = acc.get(r.nome_distrito) ?? { v: 0, p: 0, d: 0 };
      a.v += r.visitas; a.p += r.painel; a.d += r.dias;
      acc.set(r.nome_distrito, a);
    });
    return [...acc.entries()]
      .filter(([, a]) => a.p > 0 && a.d > 0)
      .map(([nome, a]) => ({ x: (a.v / a.p) * 100, y: a.v / a.d, nome, distrito: nome, visitas: a.v }));
  }, [rows, distrito, gran]);

  // Médias (linhas de referência → quadrantes).
  const { mx, my, xDom, yDom } = useMemo(() => {
    if (!pontos.length) return { mx: 0, my: 0, xDom: [0, 100] as [number, number], yDom: [0, 15] as [number, number] };
    const xs = pontos.map((p) => p.x), ys = pontos.map((p) => p.y);
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const pad = (min: number, max: number, f: number) => {
      const g = Math.max((max - min) * 0.12, f);
      return [Math.floor(min - g), Math.ceil(max + g)] as [number, number];
    };
    return { mx: avg(xs), my: avg(ys), xDom: pad(Math.min(...xs), Math.max(...xs), 2), yDom: pad(Math.min(...ys), Math.max(...ys), 1) };
  }, [pontos]);

  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-50 shrink-0"><ScatterIcon className="h-5 w-5 text-blue-600" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-sm">Cobertura × MDV</h3>
              {periodo && (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">{periodo}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Cada ponto = {gran === 'setor' ? 'um setor' : 'um distrito'}. Linhas tracejadas = média{distrito !== 'Todos' ? ` — ${distrito}` : ''}</p>
          </div>
          {/* Toggle setor / distrito */}
          <div className="shrink-0 flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-semibold">
            {(['setor', 'distrito'] as Gran[]).map((g) => (
              <button
                key={g}
                onClick={() => setGran(g)}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${gran === g ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[380px] w-full">
          {loading ? (
            <div className="h-full bg-slate-100 rounded-lg animate-pulse" />
          ) : pontos.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados.</div>
          ) : mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 24, bottom: 28, left: 8 }}>
                <CartesianGrid stroke={COR.grid} />
                <XAxis
                  type="number" dataKey="x" name="Cobertura" domain={xDom}
                  tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false}
                  tick={{ fill: COR.tick, fontSize: 11 }}
                  label={{ value: 'Cobertura', position: 'insideBottom', offset: -14, fill: COR.tick, fontSize: 12 }}
                />
                <YAxis
                  type="number" dataKey="y" name="MDV" domain={yDom}
                  tickFormatter={(v) => v.toFixed(1)} axisLine={false} tickLine={false}
                  tick={{ fill: COR.tick, fontSize: 11 }}
                  label={{ value: 'MDV', angle: -90, position: 'insideLeft', fill: COR.tick, fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="visitas" range={[40, 260]} />
                <ReferenceLine x={mx} stroke={COR.ref} strokeDasharray="5 5"
                  label={{ value: `méd ${mx.toFixed(0)}%`, position: 'top', fill: COR.ref, fontSize: 10 }} />
                <ReferenceLine y={my} stroke={COR.ref} strokeDasharray="5 5"
                  label={{ value: `méd ${my.toFixed(1)}`, position: 'right', fill: COR.ref, fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={pontos} fillOpacity={0.78}>
                  {pontos.map((p, i) => <Cell key={i} fill={quadranteCor(p, mx, my)} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legenda de quadrantes */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COR.bom }} /> Cobertura e MDV acima da média</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COR.misto }} /> Um acima, outro abaixo</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COR.ruim }} /> Ambos abaixo da média</span>
        </div>
      </CardContent>
    </Card>
  );
}
