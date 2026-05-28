'use client';

import React, { Suspense } from 'react';
import { SegmentacaoFilters } from '@/src/components/dashboard/SegmentacaoFilters';
import { Card, CardContent } from "@/src/components/ui/card";
import { Shield, Target, UserCheck, Eye, HelpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLayout } from '@/src/context/LayoutContext';
import {
  getSegmentacaoData,
  getClassificacoes,
  getCiclos,
  getCoberturaPorSegmentacao,
  type CoberturaSegmentacao,
} from '@/src/app/actions';

const productMarcaMap: Record<string, number> = {
  "FAMÍLIA REGENESIS": 10004,
  "SLINDA": 10005,
  "GYNOTRAN": 10001,
  "GYNPRO": 10002,
  "HEMOLIP": 10003,
  "VIZURIA": 10007,
};

// Ordem canônica + estilo de cada segmentação. Mantemos uma única fonte para
// que o card vazio (banco ainda sem dado para o segmento) apareça com a paleta
// correta — não basta indexar pelo array que vem do backend.
const SEGMENTACAO_META: Record<string, { icon: any; color: string; bg: string; description: string }> = {
  PROTEGER:   { icon: Shield,    color: 'text-blue-600',    bg: 'bg-blue-50',    description: 'Segmento de defesa — manter relacionamento' },
  CONQUISTAR: { icon: Target,    color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Foco em aquisição/expansão' },
  MANTER:     { icon: UserCheck, color: 'text-amber-600',   bg: 'bg-amber-50',   description: 'Frequência regular esperada' },
  OBSERVAR:   { icon: Eye,       color: 'text-purple-600',  bg: 'bg-purple-50',  description: 'Monitoramento, baixa prioridade' },
};

const SEGMENTACOES_ORDEM: Array<keyof typeof SEGMENTACAO_META> = ['PROTEGER', 'CONQUISTAR', 'MANTER', 'OBSERVAR'];

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
              <th className="px-4 py-3 font-medium">Sim</th>
              <th className="px-4 py-3 font-medium">Não</th>
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

  const [cobertura,   setCobertura]   = useState<CoberturaSegmentacao[]>([]);
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

  useEffect(() => {
    if (!ciclo) return;
    setLoadingKpis(true);
    getCoberturaPorSegmentacao(ciclo, distrito, setor, classificacao)
      .then(setCobertura)
      .finally(() => setLoadingKpis(false));
  }, [ciclo, classificacao, distrito, setor]);

  // Indexa por nome pro lookup nos cards (a ordem dos cards é fixa,
  // independente do que vem do banco).
  const coberturaByName = Object.fromEntries(
    cobertura.map((c) => [c.segmentacao, c]),
  ) as Record<string, CoberturaSegmentacao>;

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

  return (
    <div className="p-6 space-y-6">

      {/* KPI Cards — Cobertura por Segmentação (agregada todas as marcas) no ciclo selecionado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SEGMENTACOES_ORDEM.map((seg) => {
          const meta = SEGMENTACAO_META[seg];
          const Icon = meta.icon;
          const dado = coberturaByName[seg];
          const total      = dado?.total ?? 0;
          const visitados  = dado?.visitados ?? 0;
          const cobertura  = dado?.cobertura ?? 0;
          return (
            <Card key={seg} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  {!loadingKpis && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                      {visitados.toLocaleString('pt-BR')} / {total.toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 group relative">
                    <p className="text-sm font-medium text-slate-500">{seg}</p>
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help shrink-0" />
                    
                    {/* Tooltip Popup */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[10px] font-normal rounded-md shadow-xl border border-slate-800 z-50 leading-relaxed pointer-events-none normal-case">
                      Percentual de médicos visitados em relação ao total planejado (painel) para a estratégia {seg.toLowerCase()} no ciclo selecionado.
                    </div>
                  </div>
                  {loadingKpis
                    ? <div className="h-8 w-20 bg-slate-200 rounded-md animate-pulse mt-1" />
                    : <h3 className="text-2xl font-bold text-slate-900">{cobertura.toFixed(1)}%</h3>}
                  <p className="text-xs text-slate-400">{meta.description}</p>
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
