import { getExecutiveMetrics } from '@/src/app/actions';
import { ExecutiveDashboardClient } from '@/src/components/dashboard/ExecutiveDashboardClient';

export const dynamic = 'force-dynamic';

export default async function ExecutiveDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const ciclo     = (params.ciclo     as string) || 'Todos';
  const estrutura = (params.estrutura as string) || 'Distrito';
  const setor     = (params.setor     as string) || 'Todos';

  const distritoRaw = (params.distrito as string) || 'Todos';
  // Quando estrutura=Setor, distrito não pode ser "Todos"
  const distrito = estrutura === 'Setor' && distritoRaw === 'Todos' ? 'MG/CO' : distritoRaw;

  const data = await getExecutiveMetrics(ciclo, distrito, estrutura, setor);

  return (
    <main className="min-h-screen bg-background">
      <ExecutiveDashboardClient data={data} searchParams={params} />
    </main>
  );
}
