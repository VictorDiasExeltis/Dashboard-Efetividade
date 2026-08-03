'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Stethoscope, MapPin, FlaskConical, PackageOpen } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/src/components/ui/select';
import {
  getMarcas, getVisitacaoEntregaAmostras,
  type Marca, type RankItem, type VisitacaoEntregaResult,
} from '@/src/app/actions/insights';

const TOP = 5;
const VAZIO: VisitacaoEntregaResult = { segVisitas: [], segAmostras: [], classVisitas: [], classAmostras: [] };
const fmt = (v: number) => v.toLocaleString('pt-BR');

// Lista rankeada (maior → menor) com barra proporcional. Top 5.
function RankList({ title, icon: Icon, accent, bar, items, loading }: {
  title: string; icon: React.ElementType; accent: string; bar: string;
  items: RankItem[]; loading: boolean;
}) {
  const top = items.slice(0, TOP);
  const max = top.reduce((m, x) => Math.max(m, x.valor), 0) || 1;
  const total = items.reduce((s, x) => s + x.valor, 0) || 1;   // base do % = lista inteira
  const pct = (v: number) => `${((v / total) * 100).toFixed(0)}%`;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent}`} />
        <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: TOP }).map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : top.length === 0 ? (
        <p className="text-[11px] text-slate-400 py-3 text-center">Sem dados.</p>
      ) : (
        <ol className="space-y-1">
          {top.map((it, i) => (
            <li key={it.label} className="flex items-center gap-2">
              <span className="w-3.5 text-[11px] font-bold text-slate-400 tabular-nums shrink-0">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900 text-xs truncate" title={it.label}>{it.label}</div>
                <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${(it.valor / max) * 100}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0 leading-tight">
                <div className={`font-semibold text-xs tabular-nums ${accent}`}>{fmt(it.valor)}</div>
                <div className="text-[10px] text-slate-400 tabular-nums">{pct(it.valor)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function VisitacaoEntregaCard({ distrito }: { distrito: string }) {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [marcaId, setMarcaId] = useState<number | null>(null);
  const [data, setData] = useState<VisitacaoEntregaResult>(VAZIO);
  const [loading, setLoading] = useState(true);

  // Marcas uma vez; default = primeira (a mais amostrada).
  useEffect(() => {
    getMarcas().then((ms) => {
      setMarcas(ms);
      if (ms.length) setMarcaId((cur) => cur ?? ms[0].id_marca);
    });
  }, []);

  // Recarrega ao trocar marca ou distrito.
  useEffect(() => {
    if (marcaId == null) return;
    let cancelled = false;
    setLoading(true);
    getVisitacaoEntregaAmostras(marcaId, distrito)
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [marcaId, distrito]);

  const marcaNome = useMemo(
    () => marcas.find((m) => m.id_marca === marcaId)?.nome_marca ?? '',
    [marcas, marcaId],
  );

  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 rounded-lg bg-teal-50 shrink-0"><PackageOpen className="h-5 w-5 text-teal-600" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 text-sm">Visitação e Entrega de Amostras</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranking por segmentação e classificação — segmentação e amostras conforme a marca{marcaNome ? ` · ${marcaNome}` : ''}
            </p>
          </div>
          {/* Filtro de marca do próprio card */}
          <div className="shrink-0 w-[168px]">
            <Select
              value={marcaId != null ? String(marcaId) : undefined}
              onValueChange={(v) => setMarcaId(Number(v))}
              disabled={!marcas.length}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200 shadow-sm w-full flex items-center justify-between px-2.5 rounded-md border [&>span]:truncate">
                <SelectValue placeholder={marcas.length ? undefined : 'Carregando...'} />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg">
                {marcas.map((m) => (
                  <SelectItem key={m.id_marca} value={String(m.id_marca)} className="text-xs rounded-md cursor-pointer hover:bg-slate-50 focus:bg-teal-50 focus:text-teal-700">
                    {m.nome_marca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:divide-x lg:divide-slate-200">
          {/* Segmentação */}
          <div className="space-y-5 lg:pr-6">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              <Layers className="h-3.5 w-3.5" /> Segmentação
            </div>
            <RankList title="Mais visitas"  icon={MapPin}        accent="text-indigo-600" bar="bg-indigo-400" items={data.segVisitas}  loading={loading} />
            <RankList title="Mais amostras" icon={FlaskConical}  accent="text-teal-600"   bar="bg-teal-400"   items={data.segAmostras} loading={loading} />
          </div>
          {/* Classificação */}
          <div className="space-y-5 lg:pl-6">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              <Stethoscope className="h-3.5 w-3.5" /> Classificação
            </div>
            <RankList title="Mais visitas"  icon={MapPin}       accent="text-indigo-600" bar="bg-indigo-400" items={data.classVisitas}  loading={loading} />
            <RankList title="Mais amostras" icon={FlaskConical} accent="text-teal-600"   bar="bg-teal-400"   items={data.classAmostras} loading={loading} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
