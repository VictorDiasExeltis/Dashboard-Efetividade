'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Package, Users, Percent, Shield } from 'lucide-react';
import { DashboardFilters } from '@/src/components/dashboard/DashboardFilters';
import { getAvailableSetores } from '@/src/app/actions';

const CHART = {
  grid: '#f1f5f9',
  tick: '#64748b',
  tooltip: { bg: '#ffffff', border: '#e2e8f0', color: '#0f172a' },
  color1: '#3b82f6',   // Azul
  color2: '#f97316',   // Laranja
};

const DISTRITOS = [
  { key: 'sp1', name: 'SP1', color: '#3b82f6' },
  { key: 'sp2', name: 'SP2', color: '#f97316' },
  { key: 'rj1', name: 'RJ1', color: '#10b981' },
  { key: 'mg1', name: 'MG1', color: '#8b5cf6' },
  { key: 'sul', name: 'SUL', color: '#ec4899' },
  { key: 'ne1', name: 'NE1', color: '#eab308' },
  { key: 'co1', name: 'CO1', color: '#14b8a6' },
];

const coberturaDistritoData = [
  { name: 'Ciclo 01', sp1: 85, sp2: 80, rj1: 90, mg1: 82, sul: 95, ne1: 75, co1: 88 },
  { name: 'Ciclo 02', sp1: 88, sp2: 82, rj1: 92, mg1: 85, sul: 98, ne1: 78, co1: 90 },
  { name: 'Ciclo 03', sp1: 92, sp2: 85, rj1: 90, mg1: 88, sul: 100, ne1: 80, co1: 92 },
  { name: 'Ciclo 04', sp1: 95, sp2: 88, rj1: 85, mg1: 90, sul: 105, ne1: 82, co1: 95 },
  { name: 'Ciclo 05', sp1: 98, sp2: 90, rj1: 88, mg1: 92, sul: 108, ne1: 85, co1: 98 },
  { name: 'Ciclo 06', sp1: 102, sp2: 95, rj1: 92, mg1: 95, sul: 110, ne1: 88, co1: 100 },
  { name: 'Ciclo 07', sp1: 100, sp2: 98, rj1: 95, mg1: 98, sul: 105, ne1: 90, co1: 102 },
  { name: 'Ciclo 08', sp1: 94, sp2: 105, rj1: 91, mg1: 96, sul: 102, ne1: 85, co1: 98 },
  { name: 'Ciclo 09', sp1: 96, sp2: 100, rj1: 89, mg1: 94, sul: 100, ne1: 82, co1: 95 },
  { name: 'Ciclo 10', sp1: 99, sp2: 102, rj1: 88, mg1: 91, sul: 105, ne1: 84, co1: 98 },
  { name: 'Ciclo 11', sp1: 95, sp2: 98, rj1: 90, mg1: 92, sul: 102, ne1: 86, co1: 95 },
  { name: 'Ciclo 12', sp1: 92, sp2: 95, rj1: 92, mg1: 95, sul: 100, ne1: 88, co1: 92 },
  { name: 'Ciclo 13', sp1: 98, sp2: 100, rj1: 94, mg1: 97, sul: 105, ne1: 90, co1: 96 },
];

const segmentacaoData = [
  { name: 'PROTEGER', mediaAmostras: 5.5, medicos: 12500 },
  { name: 'CONQUISTAR', mediaAmostras: 4.8, medicos: 8200 },
  { name: 'MANTER', mediaAmostras: 5.1, medicos: 14500 },
  { name: 'OBSERVAR', mediaAmostras: 4.2, medicos: 3500 },
];

const classificacaoData = [
  { name: 'Faz TH e Pré-Natal', mediaAmostras: 5.8, medicos: 13500 },
  { name: 'Não Faz TH e Pré-Natal', mediaAmostras: 4.5, medicos: 7800 },
  { name: 'Médico de TH', mediaAmostras: 5.2, medicos: 11200 },
  { name: 'Médico de Pré-Natal', mediaAmostras: 4.9, medicos: 5600 },
  { name: 'Sem Classificação', mediaAmostras: 4.1, medicos: 2500 },
];

function AlocacaoDeRecursosContent() {
  const [mounted, setMounted] = useState(false);
  const [availableSetores, setAvailableSetores] = useState<string[]>([]);
  const searchParams = useSearchParams();
  
  const estrutura = searchParams.get('estrutura') || 'Distrito';
  const distritoRaw = searchParams.get('distrito') || 'Todos';
  const distrito = estrutura === 'Setor' && distritoRaw === 'Todos' ? 'MG/CO' : distritoRaw;

  useEffect(() => {
    setMounted(true);
    const fetchSetores = async () => {
      const setores = await getAvailableSetores(distrito);
      setAvailableSetores(setores);
    };
    fetchSetores();
  }, [distrito]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Entrega de Amostras</h1>
          <p className="text-sm text-slate-500 mt-1">
            Análise de distribuição de amostras por segmentação e classificação.
          </p>
        </div>
        <DashboardFilters availableSetores={availableSetores} />
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total de Amostras",
            value: "185.420",
            description: "Volume total no período",
            icon: Package,
            color: "text-blue-600",
            bg: "bg-blue-50"
          },
          {
            title: "Média por Médico",
            value: "4,8",
            description: "Amostras por médico visitado",
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
          },
          {
            title: "Cobertura Médica",
            value: "92,5%",
            description: "Médicos que receberam amostras",
            icon: Percent,
            color: "text-amber-600",
            bg: "bg-amber-50"
          },
          {
            title: "Média Proteger",
            value: "5,5",
            description: "Foco no segmento de alto valor",
            icon: Shield,
            color: "text-purple-600",
            bg: "bg-purple-50"
          }
        ].map((kpi) => (
          <Card key={kpi.title} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
                <p className="text-xs text-slate-400">{kpi.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* 
          Chart 0: Cobertura por Distrito (Código Salvo para Testes)
          <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Cobertura de Cota por Distrito
            </CardTitle>
            <CardDescription className="text-slate-500">
              Percentual de cobertura alcançada por cada distrito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={coberturaDistritoData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#cbd5e1" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      tickFormatter={(value) => `${value}%`}
                      domain={[50, 100]}
                    />
                    <Tooltip 
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                      contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} 
                      formatter={(value: number, name: string) => {
                        return [`${value.toFixed(1)}%`, name];
                      }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    
                    <ReferenceLine 
                      y={90} 
                      stroke="#ef4444" 
                      strokeDasharray="4 4" 
                      strokeWidth={2}
                      label={{ position: 'insideTopLeft', value: 'Meta (90%)', fill: '#ef4444', fontSize: 12, fontWeight: 600 }} 
                    />

                    {DISTRITOS.map((distrito) => (
                      <Area 
                        key={`area-${distrito.key}`}
                        type="monotone" 
                        name={distrito.name} 
                        dataKey={distrito.key} 
                        stroke={distrito.color} 
                        strokeWidth={2}
                        fillOpacity={0} 
                        activeDot={{ r: 5, stroke: distrito.color, strokeWidth: 2, fill: '#ffffff' }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        */}

        {/* Chart 1: Segmentação */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Média de Amostras vs. Médicos por Segmentação
            </CardTitle>
            <CardDescription className="text-slate-500">
              Média de amostras disponibilizadas em relação ao número de médicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={segmentacaoData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorAmostras1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.color1} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART.color1} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMedicos1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.color2} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART.color2} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      orientation="left"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      tickFormatter={(value) => value.toLocaleString('pt-BR')}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} 
                      formatter={(value: number, name: string) => {
                        if (name === "Número de Médicos") return [value.toLocaleString('pt-BR'), name];
                        return [value.toFixed(1), name];
                      }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      name="Número de Médicos" 
                      dataKey="medicos" 
                      stroke={CHART.color2} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMedicos1)" 
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      name="Média de Amostras" 
                      dataKey="mediaAmostras" 
                      stroke={CHART.color1} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorAmostras1)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Classificação Médica */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Média de Amostras vs. Médicos por Classificação Médica
            </CardTitle>
            <CardDescription className="text-slate-500">
              Média de amostras disponibilizadas em relação ao número de médicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={classificacaoData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorAmostras2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.color1} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART.color1} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMedicos2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.color2} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART.color2} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      orientation="left"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      tickFormatter={(value) => value.toLocaleString('pt-BR')}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} 
                      formatter={(value: number, name: string) => {
                        if (name === "Número de Médicos") return [value.toLocaleString('pt-BR'), name];
                        return [value.toFixed(1), name];
                      }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      name="Número de Médicos" 
                      dataKey="medicos" 
                      stroke={CHART.color2} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMedicos2)" 
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      name="Média de Amostras" 
                      dataKey="mediaAmostras" 
                      stroke={CHART.color1} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorAmostras2)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AlocacaoDeRecursos() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <AlocacaoDeRecursosContent />
    </Suspense>
  );
}

