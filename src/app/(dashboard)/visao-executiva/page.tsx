'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
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
  const [fetchError, setFetchError] = useState<string | null>(null);

  const estrutura = searchParams.get('estrutura') || 'Distrito';
  const setorRaw  = searchParams.get('setor')     || 'Todos';
  const distritoRaw = searchParams.get('distrito') || 'Todos';
  const distrito  = estrutura === 'Brasil' ? 'Todos' : (estrutura === 'Setor' && distritoRaw === 'Todos' ? 'MG/CO' : distritoRaw);
  const setor     = estrutura === 'Brasil' ? 'Todos' : setorRaw;
  // Filtro de ciclo (CSV via Ctrl+clique no header). Vazio = sem filtro,
  // a RPC volta a tratar como "último ciclo".
  const cicloParam = searchParams.get('ciclo') || '';
  const ciclos = cicloParam ? cicloParam.split(',').map((c) => c.trim()).filter(Boolean) : [];
  const ciclosKey = ciclos.join('|');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await getExecutiveMetrics(distrito, estrutura, setor, ciclos);
      setData(result);
    } catch (err) {
      console.error('Erro ao buscar métricas:', err);
      setFetchError('Não foi possível carregar os dados do dashboard. Verifique a conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distrito, estrutura, setor, ciclosKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const searchParamsObj = {
    estrutura,
    setor,
    distrito,
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Falha ao carregar o dashboard</h2>
          <p className="text-sm text-slate-500 mb-6">{fetchError}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="min-h-screen bg-background">
      <ExecutiveDashboardClient data={data} searchParams={searchParamsObj} />
    </main>
  );
}
