'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getSupabaseClient } from '@/src/lib/supabase/client';
import { buscarCiclosFechados } from '@/src/lib/ciclos-fechados';
import {
  normalizarMotivo,
  MOTIVO_DEMAIS,
  TOP_MOTIVOS,
} from '@/src/lib/abonos';
import type { AbonoLinha } from '@/src/components/dashboard/DetalheAbonos';
import { Clock, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';

// ─── Interfaces ──────────────────────────────────────────────

interface AbonoMotivo {
  name: string;
  value: number; // dias (horas / 8)
  color: string;       // cor sólida (legenda/tooltip)
  gradientId: string;  // id do <linearGradient> usado no slice da rosca
}

// AbonoLinha (a linha crua de um abono) mora no DetalheAbonos, que é quem a
// desenha. Aqui ela só é montada e entregue ao pai.

// ─── Constantes visuais ──────────────────────────────────────

// Cada slice da rosca usa um gradiente sutil entre cores vizinhas no espectro.
// `solid` é o tom usado em legenda/tooltip (onde gradiente SVG não se aplica).
const DONUT_GRADIENTS: Array<{ id: string; from: string; to: string; solid: string }> = [
  { id: 'gradD0', from: '#3b82f6', to: '#4f46e5', solid: '#3b82f6' }, // blue → indigo
  { id: 'gradD1', from: '#f59e0b', to: '#f97316', solid: '#ea580c' }, // amber → orange
  { id: 'gradD2', from: '#10b981', to: '#0d9488', solid: '#059669' }, // emerald → teal
  { id: 'gradD3', from: '#ef4444', to: '#e11d48', solid: '#dc2626' }, // red → rose
  { id: 'gradD4', from: '#8b5cf6', to: '#9333ea', solid: '#7c3aed' }, // violet → purple
  { id: 'gradD5', from: '#06b6d4', to: '#2563eb', solid: '#0ea5e9' }, // cyan → blue
];

// Fatia-balde: tom neutro de propósito. "Demais motivos" é o resto da lista,
// não um motivo — dar-lhe cor de categoria sugeriria que é um.
const GRADIENT_DEMAIS = { id: 'gradDemais', from: '#cbd5e1', to: '#94a3b8', solid: '#94a3b8' };

const TOOLTIP_STYLE = {
  bg: '#ffffff',
  border: '#e2e8f0',
  color: '#0f172a',
};

// ─── Custom Label ────────────────────────────────────────────

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
}: any) {
  const radius = outerRadius + 15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#475569"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={10}
      fontWeight={600}
    >
      {value.toFixed(1)}d
    </text>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  return (
    <div
      style={{
        backgroundColor: TOOLTIP_STYLE.bg,
        border: `1px solid ${TOOLTIP_STYLE.border}`,
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <p
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: data.payload.color,
          marginBottom: '4px',
        }}
      >
        {data.name}
      </p>
      <p style={{ fontSize: '11px', color: '#64748b' }}>
        <span style={{ fontWeight: 700, color: TOOLTIP_STYLE.color }}>
          {data.value.toFixed(1)}
        </span>{' '}
        dias
      </p>
      <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
        ({(data.value * 8).toFixed(0)} horas abonadas)
      </p>
    </div>
  );
}

// ─── Custom Legend ───────────────────────────────────────────

function CustomLegend({ payload }: any) {
  if (!payload) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '12px',
        paddingBottom: '12px',
      }}
    >
      {payload.map((entry: any, index: number) => (
        <div
          key={`legend-${index}`}
          title={entry.value}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#475569',
            maxWidth: '140px',
            minWidth: 0,
          }}
        >
          <span
            style={{
              flexShrink: 0,
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: entry.color,
            }}
          />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Interface ───────────────────────────────────────────────

interface GraficoAbonosProps {
  filtroDistrito?: string;
  filtroSetor?: string;
  filtroCiclo?: string;
  // Motivo selecionado (controlado pelo pai) — destaca a fatia correspondente.
  motivoSelecionado?: string | null;
  // Disparado ao clicar numa fatia: passa o motivo (ou null ao desmarcar) e os
  // cod_setor que têm abono daquele motivo, pro pai destacar na tabela.
  onSelecaoMotivo?: (motivo: string | null, codSetores: number[]) => void;
  // Entrega os abonos individuais do recorte. O pai desenha o detalhe numa
  // faixa de largura cheia, abaixo do donut e da tabela — a observação é texto
  // livre e não cabe na coluna estreita daqui.
  onDados?: (d: { linhas: AbonoLinha[]; cauda: string[] }) => void;
}

// ─── Componente Principal ────────────────────────────────────

export function GraficoAbonos({ filtroDistrito, filtroSetor, filtroCiclo = 'Todos', motivoSelecionado = null, onSelecaoMotivo, onDados }: GraficoAbonosProps) {
  const [dados, setDados] = useState<AbonoMotivo[]>([]);
  const [totalDias, setTotalDias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // Mapa motivo → cod_setores (preenchido no fetch); usado no clique da fatia.
  const setoresPorMotivo = useRef<Record<string, number[]>>({});
  const onDadosRef = useRef(onDados);
  onDadosRef.current = onDados;
  const entregar = useCallback((linhas: AbonoLinha[], cauda: string[]) => {
    onDadosRef.current?.({ linhas, cauda });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAbonos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const temFiltro =
        (filtroDistrito && filtroDistrito !== 'Todos') ||
        (filtroSetor    && filtroSetor    !== 'Todos');

      // Passo 1: hierarquia. Buscada sempre, e não só quando há filtro, porque
      // além de resolver o recorte ela dá o nome do representante ao detalhe de
      // cada fatia. São 86 linhas.
      let hierQuery = getSupabaseClient()
        .from('dim_hierarquia')
        .select('cod_setor, nome_rep, nome_setor');

      if (filtroDistrito && filtroDistrito !== 'Todos') {
        hierQuery = hierQuery.eq('nome_distrito', filtroDistrito);
      }
      if (filtroSetor && filtroSetor !== 'Todos') {
        hierQuery = hierQuery.eq('nome_setor', filtroSetor);
      }

      const { data: hierData, error: hierErr } = await hierQuery;
      if (hierErr) throw new Error(`Erro ao buscar hierarquia: ${hierErr.message}`);

      const nomes = new Map<number, { rep: string | null; setor: string | null }>();
      (hierData ?? []).forEach((h: any) => {
        nomes.set(Number(h.cod_setor), { rep: h.nome_rep ?? null, setor: h.nome_setor ?? null });
      });

      const codSetores: string[] | null = temFiltro
        ? (hierData ?? []).map((h: any) => h.cod_setor)
        : null;

      if (codSetores !== null && codSetores.length === 0) {
        setDados([]); setTotalDias(0); entregar([], []);
        return;
      }

      // Passo 2: buscar fato_abonos filtrado por cod_setor e/ou ciclo.
      // filtroCiclo pode ser "Todos", "202604" ou CSV ("202604,202605") quando
      // o usuário usa Ctrl+clique no filtro multi-seleção.
      const ciclosSelecionados = (filtroCiclo && filtroCiclo !== 'Todos')
        ? filtroCiclo.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      const usaFiltroCiclo = ciclosSelecionados.length > 0;

      let query = getSupabaseClient()
        .from('fato_abonos')
        .select('motivo, horas_abonadas, cod_setor, data_abono, observacao, dim_calendario!inner(ciclo)');

      if (codSetores !== null) {
        query = query.in('cod_setor', codSetores);
      }

      if (usaFiltroCiclo) {
        query = query.in('dim_calendario.ciclo', ciclosSelecionados);
      } else {
        // "Todos" = todos os ciclos ENCERRADOS. Tela consolidada não mostra
        // parcial (mesma regra de Cobertura/MDV/Insights). A view já exclui o
        // pseudo-ciclo 202600, o que também cobre o antigo filtro "not like %00".
        const fechados = await buscarCiclosFechados();
        if (fechados.length === 0) {
          setDados([]); setTotalDias(0); entregar([], []);
          setLoading(false);
          return;
        }
        query = query.in('dim_calendario.ciclo', fechados);
      }

      const { data, error: err } = await query;
      if (err) throw new Error(`Erro ao buscar abonos: ${err.message}`);

      if (!data || data.length === 0) {
        setDados([]); setTotalDias(0); entregar([], []);
        return;
      }

      // Agrupar por motivo JÁ NORMALIZADO (ver src/lib/abonos.ts): soma horas,
      // coleta os cod_setor de cada motivo e guarda a linha crua pro detalhe.
      const agrupado: Record<string, number> = {};
      const setoresMap: Record<string, Set<number>> = {};
      const cruas: AbonoLinha[] = [];
      data.forEach((row: any) => {
        const motivo = normalizarMotivo(row.motivo);
        const horas = Number(row.horas_abonadas) || 0;
        agrupado[motivo] = (agrupado[motivo] || 0) + horas;
        const cs = Number(row.cod_setor);
        if (!Number.isNaN(cs)) {
          (setoresMap[motivo] ??= new Set<number>()).add(cs);
        }
        const h = nomes.get(cs);
        cruas.push({
          motivo,
          motivoBruto: String(row.motivo ?? '').trim(),
          dias: horas / 8,
          data: row.data_abono ?? null,
          rep: h?.rep ?? null,
          setor: h?.setor ?? null,
          obs: String(row.observacao ?? '').trim() || null,
        });
      });

      const ordenado = Object.entries(agrupado)
        .map(([motivo, totalHoras]) => ({ name: motivo, horas: totalHoras }))
        .sort((a, b) => b.horas - a.horas);

      // O donut mostra os TOP_MOTIVOS maiores e joga o resto num balde. Antes
      // ele cortava no sexto e DESCARTAVA a cauda: o número no centro ficava
      // ~30% menor que o total real de dias abonados. Agora a cauda vira fatia.
      const principais = ordenado.slice(0, TOP_MOTIVOS);
      const resto = ordenado.slice(TOP_MOTIVOS);

      const fatias: AbonoMotivo[] = principais.map((item, index) => {
        const g = DONUT_GRADIENTS[index % DONUT_GRADIENTS.length];
        return {
          name: item.name,
          value: Math.round((item.horas / 8) * 10) / 10,
          color: g.solid,
          gradientId: g.id,
        };
      });

      if (resto.length > 0) {
        const horasResto = resto.reduce((acc, r) => acc + r.horas, 0);
        fatias.push({
          name: MOTIVO_DEMAIS,
          value: Math.round((horasResto / 8) * 10) / 10,
          color: GRADIENT_DEMAIS.solid,
          gradientId: GRADIENT_DEMAIS.id,
        });
        // O balde herda os setores de todos os motivos que o compõem.
        const uniao = new Set<number>();
        resto.forEach((r) => setoresMap[r.name]?.forEach((cs) => uniao.add(cs)));
        setoresMap[MOTIVO_DEMAIS] = uniao;
      }

      setoresPorMotivo.current = Object.fromEntries(
        Object.entries(setoresMap).map(([m, set]) => [m, Array.from(set)]),
      );

      // Total somado das HORAS, não das fatias já arredondadas.
      const totalHoras = ordenado.reduce((acc, r) => acc + r.horas, 0);
      setTotalDias(Math.round((totalHoras / 8) * 10) / 10);
      setDados(fatias);
      entregar(cruas, resto.map((r) => r.name));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filtroDistrito, filtroSetor, filtroCiclo, entregar]);

  useEffect(() => {
    fetchAbonos();
  }, [fetchAbonos]);

  // ─── Estado: Carregando ─────────────────────────────────────

  if (loading) {
    return (
      <Card className="border-0 shadow-none rounded-none bg-transparent lg:col-span-1 h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-violet-600" />
            Motivos de Absenteísmo
          </CardTitle>
          <CardDescription className="text-slate-500">
            Carregando motivos de ausência...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-sm text-slate-400 animate-pulse">
                Calculando abonos...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Estado: Erro ───────────────────────────────────────────

  if (error) {
    return (
      <Card className="border-red-200 bg-white shadow-sm lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Motivos de Absenteísmo
          </CardTitle>
          <CardDescription className="text-red-500">
            Não foi possível carregar os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-slate-600 max-w-xs">{error}</p>
              <button
                onClick={fetchAbonos}
                className="mt-2 px-4 py-2 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Estado: Sem dados ──────────────────────────────────────

  if (dados.length === 0) {
    return (
      <Card className="border-0 shadow-none rounded-none bg-transparent lg:col-span-1 h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-violet-600" />
            Motivos de Absenteísmo
          </CardTitle>
          <CardDescription className="text-slate-500">
            Nenhum abono registrado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <p className="text-sm text-slate-400">
              Sem dados de abono disponíveis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Renderização Principal ─────────────────────────────────

  return (
    <Card className="border-0 shadow-none rounded-none bg-transparent lg:col-span-1 h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-violet-600" />
          Motivos de Absenteísmo
        </CardTitle>
        <CardDescription className="text-slate-500">
          Motivos mais frequentes (em dias)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-4">
          <CustomLegend
            payload={dados.map((d) => ({ color: d.color, value: d.name }))}
          />
          <div className="h-[340px] w-full relative">
            {mounted && (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {[...DONUT_GRADIENTS, GRADIENT_DEMAIS].map((g) => (
                        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={g.from} stopOpacity={1} />
                          <stop offset="100%" stopColor={g.to} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={dados}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={false}
                      strokeWidth={0}
                      onClick={(_, index) => {
                        const entry = dados[index];
                        if (!onSelecaoMotivo || !entry) return;
                        // Clicar de novo no mesmo motivo desmarca.
                        const novo = motivoSelecionado === entry.name ? null : entry.name;
                        onSelecaoMotivo(novo, novo ? (setoresPorMotivo.current[novo] ?? []) : []);
                      }}
                    >
                      {dados.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`url(#${entry.gradientId})`}
                          style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                            cursor: 'pointer',
                            opacity: motivoSelecionado && entry.name !== motivoSelecionado ? 0.3 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} isAnimationActive={false} wrapperStyle={{ zIndex: 50 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                  <span className="text-[22px] font-bold text-slate-900 leading-none">
                    {totalDias.toFixed(1)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 mt-1">
                    dias totais
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
