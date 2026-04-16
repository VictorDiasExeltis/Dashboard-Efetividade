'use client';

import React, { Suspense } from 'react';
import { SegmentacaoFilters } from '@/src/components/dashboard/SegmentacaoFilters';
import { Card, CardContent } from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/src/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

import { Button } from '@/src/components/ui/button';
import { MoreHorizontal, FileText, X } from 'lucide-react';
import { useState } from 'react';

// Dummy data based on the image
const dummyData = [
  { label: 'PROTEGER', sim: '83%', nao: '17%' },
  { label: 'CONQUISTAR', sim: '79%', nao: '21%' },
  { label: 'MANTER', sim: '81%', nao: '19%' },
  { label: 'OBSERVAR', sim: '77%', nao: '23%' },
  { label: 'SEM SEGMENTAÇÃO', sim: '74%', nao: '26%' },
];

const totalData = { sim: '79%', nao: '21%' };

interface SegmentacaoTableProps {
  productName: string;
}

const SegmentacaoTable: React.FC<SegmentacaoTableProps> = ({ productName }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const openDetails = (row: any) => {
    setSelectedRow(row);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card className="overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">{productName}</h3>
            <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">Contagem de CRM</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 border-b border-slate-200 text-xs hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 font-medium">Segmentação</th>
                <th className="px-4 py-3 font-medium">Sim</th>
                <th className="px-4 py-3 font-medium">Não</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dummyData.map((row, i) => (
                <tr key={i} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                  <td className="px-4 py-3 text-slate-600">{row.sim}</td>
                  <td className="px-4 py-3 text-slate-600">{row.nao}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetails(row)} className="text-slate-500 hover:text-slate-900 h-8 font-medium">
                      <FileText className="w-4 h-4 mr-2" />
                      Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3">Total Geral</td>
                <td className="px-4 py-3">{totalData.sim}</td>
                <td className="px-4 py-3">{totalData.nao}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Simple Custom Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Detalhes de Análise</h2>
              <button onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Produto</p>
                <p className="text-base text-slate-900 font-semibold">{productName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase">Segmentação</p>
                  <p className="text-sm text-slate-900 font-bold mt-1">{selectedRow?.label}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-600 uppercase">Taxa de Sim</p>
                  <p className="text-sm text-emerald-900 font-bold mt-1">{selectedRow?.sim}</p>
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Resumo das Ações</h4>
                <p className="text-sm text-blue-800">Para a segmentação {selectedRow?.label}, {selectedRow?.sim} do painel respondeu positivamente nos registros de CRM para o produto {productName}.</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button onClick={() => setIsDialogOpen(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function VisitacaoXSegmentacao() {
  const products = [
    "GYNOTRAN",
    "PIOSAN",
    "ALERGOL",
    "DERMOVAT",
    "XAROPE C",
    "CARDIO V",
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Visitação x Segmentação</h1>
          <p className="text-sm text-slate-500 mt-1">
            Qualidade do painel e controle de segmentação.
          </p>
        </div>
        <div className="w-full xl:w-auto">
          <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-md" />}>
            <SegmentacaoFilters />
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product) => (
          <SegmentacaoTable key={product} productName={product} />
        ))}
      </div>
    </div>
  );
}
