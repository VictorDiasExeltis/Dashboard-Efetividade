import React, { Suspense } from 'react';
import { TargetListClient } from '@/src/components/dashboard/TargetListClient';

export const metadata = {
  title: 'Médicos não Visitados - SFE Dashboard',
  description: 'Lista de médicos alvo que não receberam visitas.',
};

export default function TargetListPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <TargetListClient />
    </Suspense>
  );
}
