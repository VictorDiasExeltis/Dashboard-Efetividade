'use client';

import React, { Suspense } from 'react';
import { SegmentacaoFilters } from '@/src/components/dashboard/SegmentacaoFilters';
import { Card, CardContent } from "@/src/components/ui/card";
import { HelpCircle, Flame } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLayout } from '@/src/context/LayoutContext';
import {
  getSegmentacaoData,
  getClassificacoes,
  getCiclos,
  getMedicosPorPotencial,
} from '@/src/app/actions';

const productMarcaMap: Record<string, number> = {
  "FAMÍLIA REGENESIS": 10004,
  "SLINDA": 10005,
  "GYNOTRAN": 10001,
  "GYNPRO": 10002,
  "HEMOLIP": 10003,
  "VIZURIA": 10007,
};

// Cinco níveis de potencial (1..5). Na escala da empresa, 1 = MAIOR potencial
// e 5 = MENOR potencial. Cores: rosa intenso no 1, cinza no 5.
const POTENCIAL_META: Array<{ nivel: number; color: string; bg: string; description: string }> = [
  { nivel: 1, color: 'text-rose-600',   bg: 'bg-rose-100',   description: 'Potencial máximo' },
  { nivel: 2, color: 'text-orange-600', bg: 'bg-orange-100', description: 'Alto potencial' },
  { nivel: 3, color: 'text-amber-700',  bg: 'bg-amber-100',  description: 'Potencial médio' },
  { nivel: 4, color: 'text-amber-600',  bg: 'bg-amber-50',   description: 'Baixo potencial' },
  { nivel: 5, color: 'text-slate-600',  bg: 'bg-slate-100',  description: 'Baixíssimo potencial' },
];

interface SegmentacaoTableProps {
  productName: string;
  classificacao: string;
  distrito: string;
  setor: string;
  ciclo: string;
}

const SegmentacaoTable: React.FC<SegmentacaoTableProps> = ({
  productName,
  classificacao,
  distrito,
  setor,
  ciclo,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ sim: '0%', simNum: 0, nao: '0%', naoNum: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const marcaId = productMarcaMap[productName];
      if (!marcaId) { setLoading(false); return; }
      // Aguarda o ciclo default ser resolvido (lista vinda do banco)
      if (!ciclo) return;

      setLoading(true);
      try {
        const resultRaw = await getSegmentacaoData(marcaId, classificacao, distrito, setor, ciclo);
        if (cancelled) return;

        // Agregar duplicados como "SEM SEGMENTAÇÃO"
        const result: any[] = [];
        const seen: Record<string, any> = {};

        resultRaw.forEach(row => {
          if (seen[row.label]) {
            seen[row.label].total += row.total;
            seen[row.label].simNum += row.simNum;
            seen[row.label].naoNum += row.naoNum;

            const total = seen[row.label].total;
            seen[row.label].sim = total > 0 ? Math.round((seen[row.label].simNum / total) * 100) + '%' : '0%';
            seen[row.label].nao = total > 0 ? Math.round((seen[row.label].naoNum / total) * 100) + '%' : '0%';
          } else {
            seen[row.label] = { ...row };
            result.push(seen[row.label]);
          }
        });

        const order = ['PROTEGER', 'CONQUISTAR', 'MANTER', 'OBSERVAR', 'SEM SEGMENTAÇÃO'];
        result.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));

        let totalSim = 0;
        let totalNao = 0;
        let totalTotal = 0;

        result.forEach(r => {
          totalSim += r.simNum;
          totalNao += r.naoNum;
          totalTotal += r.total;
        });

        setData(result);
        setTotals({
          sim: totalTotal > 0 ? Math.round((totalSim / totalTotal) * 100) + '%' : '0%',
          simNum: totalSim,
          nao: totalTotal > 0 ? Math.round((totalNao / totalTotal) * 100) + '%' : '0%',
          naoNum: totalNao
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [productName, classificacao, distrito, setor, ciclo]);

  return (
    <Card className="overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800">{productName}</h3>
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">Número de Médicos</span>
          {loading && (
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 font-medium ml-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-white text-slate-500 border-b border-slate-200 text-xs hidden md:table-header-group">
            <tr>
              <th className="px-4 py-3 font-medium">Segmentação</th>
              <th className="px-4 py-3 font-medium">Visitados</th>
              <th className="px-4 py-3 font-medium">Não Visitados</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="bg-white border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                      <div className="h-4 w-10 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                      <div className="h-4 w-10 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              data.map((row, i) => (
                <tr key={i} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{row.simNum.toLocaleString('pt-BR')}</span>
                      <span className="text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{row.sim}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{row.naoNum.toLocaleString('pt-BR')}</span>
                      <span className="text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{row.nao}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-white font-semibold text-slate-900 border-t border-slate-200">
            <tr>
              <td className="px-4 py-3">Total Geral</td>
              <td className="px-4 py-3">
                {loading ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-14 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-10 bg-slate-100 rounded animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{totals.simNum.toLocaleString('pt-BR')}</span>
                    <span className="text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{totals.sim}</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                {loading ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-14 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-10 bg-slate-100 rounded animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{totals.naoNum.toLocaleString('pt-BR')}</span>
                    <span className="text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{totals.nao}</span>
                  </div>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};

export default function VisitacaoXSegmentacao() {
  const { setHeaderState } = useLayout();
  const urlParams      = useSearchParams();
  const classificacao  = urlParams.get('classificacao') || 'Todas';
  const distrito       = urlParams.get('distrito')      || 'Todos';
  const setor          = urlParams.get('setor')         || 'Todos';

  const [potenciais,  setPotenciais]  = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [ciclos,      setCiclos]      = useState<string[]>([]);

  // Default do ciclo: último disponível no banco. Enquanto a lista não chega,
  // mantemos string vazia — as queries downstream só rodam quando ciclo != ''.
  const ultimoCiclo = ciclos.length ? ciclos[ciclos.length - 1] : '';
  const ciclo       = urlParams.get('ciclo') || ultimoCiclo;

  useEffect(() => {
    // Pré-carrega lista de classificações pro filtro lateral.
    getClassificacoes();
    getCiclos().then(setCiclos);
  }, []);

  // Os KPIs de potencial são per-médico (não dependem de ciclo).
  useEffect(() => {
    setLoadingKpis(true);
    getMedicosPorPotencial(distrito, setor, classificacao)
      .then(setPotenciais)
      .finally(() => setLoadingKpis(false));
  }, [classificacao, distrito, setor]);

  useEffect(() => {
    setHeaderState({
      title: "Visitação x Segmentação",
      subtitle: "Qualidade do painel e controle de segmentação",
      filters: (
        <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-md" />}>
          <SegmentacaoFilters />
        </Suspense>
      )
    });
    return () => setHeaderState({});
  }, [setHeaderState]);

  const products = [
    "FAMÍLIA REGENESIS",
    "SLINDA",
    "GYNOTRAN",
    "GYNPRO",
    "HEMOLIP",
    "VIZURIA",
  ];

  const totalPanel = Object.values(potenciais).reduce((acc, val) => acc + val, 0);

  return (
    <div className="p-6 space-y-6">

      {/* KPI Cards — Médicos por nível de Potencial (1..5), respeita
          território e classificação. Potencial é per-médico, então independe
          do ciclo selecionado. */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {POTENCIAL_META.map((p, idx) => {
          const total = potenciais[p.nivel] ?? 0;
          const pct = totalPanel > 0 ? (total / totalPanel) * 100 : 0;
          // Primeiro card alinha o tooltip à esquerda (cresce pra direita),
          // pra não bater na sidebar. Os demais alinham à direita.
          const tooltipAlign = idx === 0 ? 'left-0' : 'right-0';
          return (
            <Card key={p.nivel} className="border border-slate-200 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${p.bg}`}>
                    <Flame className={`h-5 w-5 ${p.color}`} />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>
                    {total.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-slate-500">Potencial {p.nivel}</p>
                    <span className="group relative inline-flex">
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help shrink-0" />
                      <div className={`absolute bottom-full ${tooltipAlign} mb-2 hidden group-hover:block w-max max-w-[220px] p-2 bg-slate-900 text-white text-[10px] font-normal rounded-md shadow-xl border border-slate-800 z-50 leading-relaxed pointer-events-none normal-case whitespace-normal`}>
                        Médicos do painel com potencial {p.nivel}, considerando os filtros de território e classificação.
                      </div>
                    </span>
                  </div>
                  {loadingKpis
                    ? <div className="h-8 w-20 bg-slate-200 rounded-md animate-pulse mt-1" />
                    : <h3 className="text-2xl font-bold text-slate-900">{pct.toFixed(1)}%</h3>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product) => (
          <SegmentacaoTable
            key={product}
            productName={product}
            classificacao={classificacao}
            distrito={distrito}
            setor={setor}
            ciclo={ciclo}
          />
        ))}
      </div>
    </div>
  );
}
