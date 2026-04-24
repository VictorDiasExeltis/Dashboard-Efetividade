'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getExecutiveMetrics } from '@/src/app/actions';
import { ExecutiveDashboardClient } from '@/src/components/dashboard/ExecutiveDashboardClient';

type DashboardData = Awaited<ReturnType<typeof getExecutiveMetrics>>;

function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-6 pt-5 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-md" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="h-10 w-64 bg-slate-100 rounded-xl" />
      </div>
      <div className="h-3 w-40 bg-slate-100 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-9 w-9 bg-slate-100 rounded-lg" />
            </div>
            <div className="space-y-1">
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-8 w-20 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="h-3 w-64 bg-slate-100 rounded" />
        <div className="h-[400px] w-full bg-slate-50 rounded-lg" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="h-3 w-56 bg-slate-100 rounded" />
        <div className="h-[400px] w-full bg-slate-50 rounded-lg" />
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ciclo     = searchParams.get('ciclo')     || 'Todos';
  const estrutura = searchParams.get('estrutura') || 'Distrito';
  const setor     = searchParams.get('setor')     || 'Todos';
  const distritoRaw = searchParams.get('distrito') || 'Todos';
  const distrito  = estrutura === 'Setor' && distritoRaw === 'Todos' ? 'MG/CO' : distritoRaw;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getExecutiveMetrics(ciclo, distrito, estrutura, setor);
      setData(result);
    } catch (err) {
      console.error('Erro ao buscar métricas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ciclo, distrito, estrutura, setor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const searchParamsObj = {
    ciclo,
    estrutura,
    setor,
    distrito,
  };

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="min-h-screen bg-background">
      <ExecutiveDashboardClient data={data} searchParams={searchParamsObj} />
    </main>
  );
}
