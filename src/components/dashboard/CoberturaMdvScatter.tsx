'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';
import { ScatterChart as ScatterIcon } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/src/components/ui/card';
import { getDesempenhoVisitacao, type SetorDesempenho } from '@/src/app/actions/insights';
import { corDaEstrutura } from '@/src/lib/charts/cores-estrutura';

type Gran = 'setor' | 'distrito';

interface Ponto {
  x: number;        // cobertura em %
  y: number;        // mdv
  nome: string;
  distrito: string;
  visitas: number;
}

// Meta fixa de MDV (mesma referência do gráfico de MDV da tela).
const META_MDV = 10.8;

// A cor do ponto passou a ser a da ESTRUTURA (ver `corDaEstrutura`), para bater
// com os gráficos de Cobertura e MDV. As cores de quadrante (verde/âmbar/rosa)
// foram removidas: sinalizar meta por cor conflitava com identificar estrutura
// por cor. O quadrante segue visível pela posição frente às linhas de meta.
const COR = {
  grid:  '#f1f5f9',
  tick:  '#64748b',
  meta:  '#ef4444',  // linhas de meta (mesmo vermelho dos gráficos de linha)
};

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

// Legenda em pílulas clicáveis, no mesmo formato (e mesmas classes de estado)
// dos gráficos de Cobertura e MDV: clicar realça a estrutura no gráfico.
function LegendaPill({
  cor,
  ativo,
  onClick,
  children,
}: {
  cor: string;
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold transition-all shadow-sm cursor-pointer ${
        ativo
          ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          : 'border-slate-100 bg-white text-slate-300 opacity-50 hover:opacity-80'
      }`}
    >
      <span
        className="w-2 h-2 rounded-full inline-block shrink-0 transition-opacity"
        style={{ backgroundColor: cor, opacity: ativo ? 1 : 0.35 }}
      />
      {children}
    </button>
  );
}

// Auto-suficiente: lê os filtros da tela (ciclo/distrito/setor/estrutura) da URL
// e busca cobertura/MDV por setor. Linhas de meta: MDV cravada em 10.8 e
// cobertura na meta do ciclo filtrado (90% × DU/15).
export function CoberturaMdvScatter() {
  const searchParams = useSearchParams();
  const estrutura = searchParams.get('estrutura') || 'Distrito';
  const distrito  = searchParams.get('distrito')  || 'Todos';
  const setor     = searchParams.get('setor')     || 'Todos';
  const ciclo     = searchParams.get('ciclo')     || 'Todos';

  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<SetorDesempenho[]>([]);
  const [metaCob, setMetaCob] = useState<number>(90);
  const [loading, setLoading] = useState(true);

  // Realce por estrutura (mesma mecânica do LineChartCard): conjunto vazio =
  // todas em destaque; com seleção, só as escolhidas ficam opacas.
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const toggleEstrutura = (nome: string) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };
  const isActive = (nome: string) => highlighted.size === 0 || highlighted.has(nome);

  // Granularidade dos pontos segue a Estrutura da tela: Setor → um ponto por
  // setor; Distrito/Brasil → um ponto por distrito.
  const gran: Gran = estrutura === 'Setor' ? 'setor' : 'distrito';

  useEffect(() => { setMounted(true); }, []);

  // Recarrega ao trocar o ciclo (recorte de dados + meta de cobertura).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDesempenhoVisitacao(ciclo)
      .then((d) => {
        if (cancelled) return;
        setRows(d.rows);
        setMetaCob(d.metaCobertura != null ? d.metaCobertura : 90);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ciclo]);

  const pontos = useMemo<Ponto[]>(() => {
    let base = rows.filter((r) => distrito === 'Todos' || r.nome_distrito === distrito);
    if (setor !== 'Todos') base = base.filter((r) => r.nome_setor === setor);
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
  }, [rows, distrito, setor, gran]);

  // Domínios SIMÉTRICOS em torno das metas, para as duas linhas ficarem sempre
  // centralizadas (X na meta de cobertura, Y na meta de MDV = 10.8). R = maior
  // distância de um ponto à meta + folga (com um mínimo pra não achatar).
  const { xDom, yDom } = useMemo(() => {
    if (!pontos.length) return { xDom: [metaCob - 20, metaCob + 20] as [number, number], yDom: [META_MDV - 5, META_MDV + 5] as [number, number] };
    const rx = Math.max(...pontos.map((p) => Math.abs(p.x - metaCob)), 5) * 1.12;
    const ry = Math.max(...pontos.map((p) => Math.abs(p.y - META_MDV)), 1) * 1.12;
    return {
      xDom: [metaCob - rx, metaCob + rx] as [number, number],
      yDom: [META_MDV - ry, META_MDV + ry] as [number, number],
    };
  }, [pontos, metaCob]);

  const granLabel = gran === 'setor' ? 'Setor' : 'Distrito';

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <ScatterIcon className="h-5 w-5 text-blue-600" />
          Cobertura × MDV por {granLabel}
        </CardTitle>
        <CardDescription className="text-slate-500 mt-1">
          Cada ponto = um {gran}. Linhas tracejadas = meta
          {distrito !== 'Todos' ? ` em ${distrito}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legenda por ESTRUTURA — mesma cor e mesmo formato de pílula dos
            gráficos de Cobertura e MDV. O desempenho contra a meta continua
            legível pela posição do ponto em relação às linhas tracejadas. */}
        <div className="flex flex-wrap justify-center gap-2 pb-4 select-none">
          {pontos.map((p) => (
            <LegendaPill
              key={p.nome}
              cor={corDaEstrutura(p.nome)}
              ativo={isActive(p.nome)}
              onClick={() => toggleEstrutura(p.nome)}
            >
              {p.nome}
            </LegendaPill>
          ))}
        </div>

        <div className="h-[400px] w-full">
          {loading ? (
            <div className="h-full bg-slate-100 rounded-lg animate-pulse" />
          ) : pontos.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados.</div>
          ) : mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 30, bottom: 28, left: 12 }}>
                <CartesianGrid stroke={COR.grid} />
                <XAxis
                  type="number" dataKey="x" name="Cobertura" domain={xDom}
                  tickFormatter={(v) => `${Math.round(v)}%`} axisLine={false} tickLine={false}
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
                <ReferenceLine x={metaCob} stroke={COR.meta} strokeDasharray="5 5" strokeWidth={1.5}
                  label={{ value: `Meta ${metaCob.toFixed(0)}%`, position: 'top', fill: COR.meta, fontSize: 11, fontWeight: 600 }} />
                <ReferenceLine y={META_MDV} stroke={COR.meta} strokeDasharray="5 5" strokeWidth={1.5}
                  label={{ value: `Meta ${META_MDV.toFixed(1)}`, position: 'right', fill: COR.meta, fontSize: 11, fontWeight: 600 }} />
                {/* isAnimationActive={false}: o wrapper do Tooltip anima a
                    posição por 400ms (default 'auto') e o card "viaja" da origem
                    do gráfico até o ponto. Mesmo ajuste feito nos gráficos de
                    Cobertura e MDV. */}
                <Tooltip
                  content={<CustomTooltip />}
                  isAnimationActive={false}
                  cursor={{ strokeDasharray: '3 3' }}
                />
                {/* fillOpacity por Cell: o ponto não selecionado esmaece em vez
                    de desaparecer, para não perder a noção da nuvem. */}
                <Scatter data={pontos}>
                  {pontos.map((p, i) => (
                    <Cell
                      key={i}
                      fill={corDaEstrutura(p.nome)}
                      fillOpacity={isActive(p.nome) ? 0.78 : 0.12}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
