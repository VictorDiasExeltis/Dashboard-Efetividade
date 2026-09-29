'use client';

import { Users } from 'lucide-react';
import { LineChartCard, type LineChartCardConfig } from './charts/LineChartCard';

const config: LineChartCardConfig = {
  icon: Users,
  accent: {
    icon: 'text-emerald-600',
    loader: 'text-emerald-500',
    emptyBg: 'bg-emerald-50',
    emptyIcon: 'text-emerald-400',
    retryBg: 'bg-blue-600',
    retryHoverBg: 'hover:bg-blue-700',
  },

  titleBase: 'MDV',
  loadingTitle: 'MDV por Distrito',
  loadingDescription: 'Carregando média de visitas diárias...',
  loadingMessage: 'Calculando médias...',
  descriptionPrefix: 'Evolução da Média de Visita Diária',
  emptyStateMessage: 'Utilize o filtro de "Distrito" no topo para detalhar o MDV por setor.',

  rpcName: 'get_mdv_dinamico',
  errorPrefix: 'Erro ao buscar MDV',
  computeValue: (row) => {
    if (!row.total_dias || row.total_dias <= 0) return 0;
    return Math.round((row.total_visitas / row.total_dias) * 10) / 10;
  },

  // Escala cheia, de 0 a 14, pelo mesmo motivo da Cobertura: barra proporcional
  // ao valor e nada sumindo por ficar fora do eixo. O teto de 14 dá folga sobre
  // a meta de 10,8 sem achatar a variação real, que vive entre 9 e 11.
  yDomain: [0, 14],
  yTicks: [0, 2, 4, 6, 8, 10, 12, 14],
  yTickFormatter: (v) => v.toFixed(1),
  tooltipFormatter: (v) => `${v.toFixed(1)} visitas`,
  labelFormatValue: (v) => v.toFixed(1),
  labelWidth: 34,
  referenceLine: { y: 10.8, label: 'Meta 10.8' },
};

export function GraficoMDV() {
  return <LineChartCard config={config} />;
}
