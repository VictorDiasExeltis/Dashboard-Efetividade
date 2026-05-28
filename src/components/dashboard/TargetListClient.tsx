'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  ArrowUpDown,
  Stethoscope,
  Users,
  TrendingDown,
  Flame,
  Layers,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from "@/src/components/ui/card";
import { DashboardFilters } from './DashboardFilters';
import {
  getAvailableSetores,
  getMedicosNaoVisitados,
  getTotalMedicosAtivosTerritorio,
  type MedicoNaoVisitado,
} from '@/src/app/actions';
import { useLayout } from '@/src/context/LayoutContext';

const ROWS_PER_PAGE = 12;

const PRODUCT_COLUMNS: Array<{ key: keyof Pick<MedicoNaoVisitado, 'slinda' | 'regenesis' | 'gynpro' | 'gynotran' | 'hemolip' | 'vizuria'>; label: string }> = [
  { key: 'slinda',    label: 'Slinda' },
  { key: 'regenesis', label: 'Regenesis' },
  { key: 'gynpro',    label: 'Gynpro' },
  { key: 'gynotran',  label: 'Gynotran' },
  { key: 'hemolip',   label: 'Hemolip' },
  { key: 'vizuria',   label: 'Vizuria' },
];

const SEG_BADGE: Record<string, string> = {
  'PROTEGER':   'bg-blue-100    text-blue-700    border-blue-200',
  'CONQUISTAR': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'MANTER':     'bg-orange-100  text-orange-700  border-orange-200',
  'OBSERVAR':   'bg-violet-100  text-violet-700  border-violet-200',
  // fallback alfabético, mantém compat
  'A':          'bg-emerald-100 text-emerald-700 border-emerald-200',
  'B':          'bg-blue-100    text-blue-700    border-blue-200',
  'C':          'bg-amber-100   text-amber-700   border-amber-200',
};

function SegmentacaoBadge({ value }: { value: string | null | undefined }) {
  if (!value || value === '-') return <span className="text-slate-300">–</span>;

  const colorClass = SEG_BADGE[value.toUpperCase()] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  // Para valores curtos (A/B/C) renderiza badge quadrado, para nomes completos badge pílula
  const isShort = value.length <= 2;

  return (
    <span className={cn(
      "inline-flex items-center justify-center font-semibold border rounded-md",
      isShort ? "w-6 h-6 text-xs" : "px-2 py-0.5 text-[10px] tracking-wide",
      colorClass
    )}>
      {value}
    </span>
  );
}

// Formata o score Exeltis em estilo "k" compacto. Acima de 1000 vira "17,6k"
// com 1 casa decimal e separador pt-BR; abaixo, inteiro arredondado.
function formatScoreK(score: number | null | undefined): string {
  if (score == null || score === 0) return '–';
  if (score >= 1000) {
    const v = (score / 1000).toFixed(1);
    return v.replace('.', ',') + 'k';
  }
  return Math.round(score).toString();
}

// Cor de fundo do badge de potencial. Gradiente do cinza (baixo) ao âmbar (alto).
const POTENCIAL_BADGE: Record<number, string> = {
  0: 'bg-slate-100  text-slate-600  border-slate-200',
  1: 'bg-slate-100  text-slate-700  border-slate-200',
  2: 'bg-amber-50   text-amber-700  border-amber-200',
  3: 'bg-amber-100  text-amber-800  border-amber-300',
  4: 'bg-orange-100 text-orange-700 border-orange-300',
  5: 'bg-rose-100   text-rose-700   border-rose-300',
};

function PotencialBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-slate-300 text-xs">–</span>;
  const cls = POTENCIAL_BADGE[value] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={cn(
      'inline-flex items-center justify-center w-6 h-6 rounded-md border text-xs font-semibold tabular-nums',
      cls,
    )}>
      {value}
    </span>
  );
}

function splitCrmUf(crmuf: string): { uf: string; crm: string } {
  if (!crmuf || crmuf.length < 3) return { uf: '', crm: crmuf || '' };
  return { uf: crmuf.slice(0, 2), crm: crmuf.slice(2) };
}

// Abrevia nomes do meio: "JOAO PEDRO DA SILVA SANTOS" → "JOAO P. DA S. SANTOS".
// Mantém primeiro e último nome inteiros, preserva conectivos (DA/DE/DO/DOS/DAS/E)
// e reduz os demais tokens internos à inicial seguida de ponto.
const NAME_CONNECTIVES = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E']);

function abreviaNomeMeio(nome: string): string {
  if (!nome) return '';
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome.trim();
  return partes.map((parte, i) => {
    if (i === 0 || i === partes.length - 1) return parte;
    if (NAME_CONNECTIVES.has(parte.toUpperCase())) return parte;
    return parte.charAt(0).toUpperCase() + '.';
  }).join(' ');
}

export function TargetListClient() {
  const [searchTerm, setSearchTerm] = useState('');
  const [doctors, setDoctors] = useState<MedicoNaoVisitado[]>([]);
  const [totalAtivos, setTotalAtivos] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [availableSetores, setAvailableSetores] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const estrutura   = searchParams.get('estrutura') || 'Distrito';
  const distritoRaw = searchParams.get('distrito')  || 'Todos';
  const distrito    = estrutura === 'Setor' && distritoRaw === 'Todos' ? 'MG/CO' : distritoRaw;
  const setor       = searchParams.get('setor')     || 'Todos';

  const { setHeaderState } = useLayout();

  // Setores disponíveis pro DashboardFilters (mesmo padrão das outras páginas)
  useEffect(() => {
    getAvailableSetores(distrito).then(setAvailableSetores);
  }, [distrito]);

  // Busca dados reais quando filtros mudam. Lista de não-visitados e denominador
  // (total ativos no território) em paralelo — denominador alimenta a Taxa de Abandono.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getMedicosNaoVisitados(distrito, setor),
      getTotalMedicosAtivosTerritorio(distrito, setor),
    ])
      .then(([data, total]) => {
        if (cancelled) return;
        setDoctors(data);
        setTotalAtivos(total);
        setPage(1);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [distrito, setor]);

  // Resetar página quando o filtro de busca muda
  useEffect(() => { setPage(1); }, [searchTerm]);

  useEffect(() => {
    setHeaderState({
      title: "Médicos não Visitados",
      subtitle: "Médicos ativos sem visitas nos últimos 3 ciclos",
      filters: (
        <Suspense fallback={<div className="h-10 w-40 bg-slate-100 animate-pulse rounded-md" />}>
          <DashboardFilters availableSetores={availableSetores} />
        </Suspense>
      )
    });
    return () => setHeaderState({});
  }, [setHeaderState, availableSetores]);

  // Filtro client-side por nome ou CRM
  const filteredDoctors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(d =>
      d.nome_medico.toLowerCase().includes(q) ||
      d.crmuf.toLowerCase().includes(q)
    );
  }, [doctors, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const startIdx   = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows   = filteredDoctors.slice(startIdx, startIdx + ROWS_PER_PAGE);

  // Taxa de abandono: % de médicos ativos do território sem visita nos últimos
  // 3 ciclos. Denominador é o total de ativos vinculados ao território (mesma
  // definição usada na lista), garantindo coerência entre numerador e total.
  const taxaAbandono = totalAtivos > 0
    ? (doctors.length / totalAtivos) * 100
    : 0;

  // Potencial alto abandonado: médicos da lista com potencial 4 ou 5. Foca a
  // ação no segmento de maior retorno esperado por visita recuperada.
  const potencialAltoAbandonado = doctors.filter(
    (d) => d.potencial != null && d.potencial >= 4
  ).length;

  // Multi-marca abandonado: médicos com segmentação ativa em ≥3 das 5 marcas.
  // Generaliza o antigo "PROTEGER sem visita" — qualquer segmentação válida
  // (não-nula e diferente de '-') conta. São os alvos estratégicos de portfólio.
  const multiMarcaAbandonado = doctors.filter((d) => {
    const segs = [d.slinda, d.regenesis, d.gynpro, d.gynotran, d.hemolip, d.vizuria];
    return segs.filter((s) => s && s !== '-').length >= 3;
  }).length;

  const kpiCards = [
    {
      title: "Total sem Visita",
      value: doctors.length.toLocaleString('pt-BR'),
      description: "Médicos ativos zerados nos últimos 3 ciclos",
      icon: Users,
      color: "text-slate-600",
      bg: "bg-slate-100",
      tooltip: "Médicos ativos no painel sem visitas registradas nos últimos 3 ciclos."
    },
    {
      title: "Taxa de Abandono",
      value: totalAtivos > 0
        ? `${taxaAbandono.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
        : '–',
      description: totalAtivos > 0
        ? `${doctors.length.toLocaleString('pt-BR')} de ${totalAtivos.toLocaleString('pt-BR')} ativos no território`
        : 'Sem ativos no território',
      icon: TrendingDown,
      color: "text-rose-600",
      bg: "bg-rose-50",
      tooltip: "Percentual de médicos sem visitas nos últimos 3 ciclos em relação ao total de médicos ativos do território."
    },
    {
      title: "Alto Potencial Abandonado",
      value: potencialAltoAbandonado.toLocaleString('pt-BR'),
      description: "Não-visitados com potencial 4 ou 5",
      icon: Flame,
      color: "text-purple-600",
      bg: "bg-purple-50",
      tooltip: "Médicos sem visitas nos últimos 3 ciclos com alto potencial de prescrição (potencial 4 ou 5)."
    },
    {
      title: "Multi-marca Abandonado",
      value: multiMarcaAbandonado.toLocaleString('pt-BR'),
      description: "Não-visitados com segmentação ativa em 3+ marcas",
      icon: Layers,
      color: "text-blue-600",
      bg: "bg-blue-50",
      tooltip: "Médicos sem visitas nos últimos 3 ciclos com segmentação ativa em 3 ou mais marcas de produtos simultaneamente."
    }
  ];

  return (
    <div className="space-y-6 p-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 group relative">
                  <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help shrink-0" />
                  
                  {/* Tooltip Popup */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[10px] font-normal rounded-md shadow-xl border border-slate-800 z-50 leading-relaxed pointer-events-none">
                    {kpi.tooltip}
                  </div>
                </div>
                {loading
                  ? <div className="h-8 w-20 bg-slate-200 rounded-md animate-pulse mt-1" />
                  : <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>}
                <p className="text-xs text-slate-400">{kpi.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou CRM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            {loading ? (
              <span className="inline-flex items-center gap-1 text-blue-500 font-medium">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
              </span>
            ) : (
              <>
                <span className="font-medium text-slate-900">{filteredDoctors.length.toLocaleString('pt-BR')}</span>
                médicos encontrados
              </>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Médico / CRM</th>
                {PRODUCT_COLUMNS.map(col => (
                  <th key={col.key} className="px-4 py-3 font-medium text-center">{col.label}</th>
                ))}
                <th className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1">
                    Score Exeltis
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-center">Potencial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: ROWS_PER_PAGE }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </td>
                    {PRODUCT_COLUMNS.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-6 w-6 mx-auto bg-slate-200 rounded animate-pulse" />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-6 w-6 mx-auto bg-slate-200 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={PRODUCT_COLUMNS.length + 3} className="px-4 py-12 text-center text-slate-500">
                    Nenhum médico encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                pageRows.map((doc) => {
                  const { uf, crm } = splitCrmUf(doc.crmuf);
                  return (
                    <tr key={doc.crmuf} className="group transition-colors hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900" title={doc.nome_medico}>{abreviaNomeMeio(doc.nome_medico)}</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {uf}{doc.especialidade ? <span className="text-slate-400"> – {doc.especialidade}</span> : null}
                        </div>
                      </td>
                      {PRODUCT_COLUMNS.map(col => (
                        <td key={col.key} className="px-4 py-3 text-center">
                          <SegmentacaoBadge value={doc[col.key]} />
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        {doc.score == null || doc.score === 0 ? (
                          <span className="text-slate-300 text-xs">–</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap bg-sky-50 text-sky-700 border-sky-200 tabular-nums">
                            <Stethoscope className="w-3 h-3" />
                            {formatScoreK(doc.score)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PotencialBadge value={doc.potencial} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-sm">
          <div className="text-slate-500">
            {loading ? (
              <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
            ) : filteredDoctors.length === 0 ? (
              <span>Nenhum registro</span>
            ) : (
              <>
                Mostrando <span className="font-medium text-slate-900">{startIdx + 1}</span> a{' '}
                <span className="font-medium text-slate-900">
                  {Math.min(startIdx + ROWS_PER_PAGE, filteredDoctors.length)}
                </span> de{' '}
                <span className="font-medium text-slate-900">{filteredDoctors.length.toLocaleString('pt-BR')}</span> registros
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <span className="text-xs text-slate-500 px-2">
              {loading ? '–' : `Página ${safePage} de ${totalPages}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
