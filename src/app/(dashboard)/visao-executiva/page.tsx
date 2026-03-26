import { getExecutiveMetrics } from '@/src/app/actions';
import { ExecutiveDashboardClient } from '@/src/components/dashboard/ExecutiveDashboardClient';

export default async function ExecutiveDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const ciclo = (params.ciclo as string) || 'CICLO 02';
  const distrito = (params.distrito as string) || 'Todos';

  const data = await getExecutiveMetrics(ciclo, 'CICLO 01', distrito);

  return (
    <main className="min-h-screen bg-background">
      <ExecutiveDashboardClient data={data} searchParams={params} />
    </main>
  );
}
