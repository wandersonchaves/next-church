'use client';

import {
  ArrowLeft,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import * as React from 'react';
import { logLiteracyExportAuditAction } from '@/app/[locale]/(auth)/dashboard/alfabetizacao/actions';
import { Link } from '@/libs/I18nNavigation';
import { generateLiteracyCsv, type LiteracyExportStudent } from '@/utils/LiteracyExport';
import { LiteracyOfficialReportDocument } from './LiteracyOfficialReportDocument';

export const LiteracyReportPageClient = (props: {
  students: LiteracyExportStudent[];
  organizationName: string;
  selectedStatus: string;
  selectedShift: string;
}) => {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<'recent' | 'oldest' | 'name'>('recent');

  const sortedStudents = [...props.students].sort((a, b) => {
    if (sortOrder === 'name') {
      return a.studentName.localeCompare(b.studentName);
    }
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortOrder === 'recent' ? timeB - timeA : timeA - timeB;
  });

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadCsv = () => {
    try {
      setIsDownloading(true);

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeStatus = props.selectedStatus.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `relacao_alunos_alfabetizacao_${safeStatus}_${dateStr}.csv`;

      const csvContent = generateLiteracyCsv(sortedStudents);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logLiteracyExportAuditAction(props.selectedStatus, sortedStudents.length).catch(() => { });
    } catch (error) {
      console.error('Erro ao baixar planilha CSV:', error);
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 font-sans md:p-8 print:min-h-0 print:bg-white print:p-0">
      {/* BARRA DE AÇÕES FIXA / SUPERIOR (OCULTA NA IMPRESSÃO) */}
      <div className="mx-auto mb-6 max-w-5xl print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/alfabetizacao"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
            >
              <ArrowLeft size={16} />
              Voltar à Lista
            </Link>
            <div>
              <h1 className="text-sm font-black text-slate-900">
                Documento Oficial de Encaminhamento
              </h1>
              <p className="text-[11px] font-medium text-slate-500">
                Relação formatada para protocolo em órgãos públicos e conselhos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1">
              <span className="text-[11px] font-bold text-slate-500">Ordem:</span>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'recent' | 'oldest' | 'name')}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none"
              >
                <option value="recent">Mais Recentes (Data/Hora ↓)</option>
                <option value="oldest">Mais Antigos (Data/Hora ↑)</option>
                <option value="name">Alfabética (A-Z)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={isDownloading || props.students.length === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" />
              {isDownloading ? 'Baixando...' : 'Baixar CSV (Excel)'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black tracking-wider text-white uppercase shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95"
            >
              <Printer size={16} />
              Imprimir / Salvar em PDF
            </button>
          </div>
        </div>

        {/* DICA DE IMPRESSÃO */}
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900">
          💡
          {' '}
          <strong>Dica:</strong>
          {' '}
          Na janela de impressão, escolha a opção
          {' '}
          <em>&quot;Salvar como PDF&quot;</em>
          . Para remover qualquer URL ou data que o navegador possa inserir nas margens, desmarque a opção
          {' '}
          <em>&quot;Cabeçalhos e rodapés&quot;</em>
          .
        </div>
      </div>

      {/* ÁREA DO DOCUMENTO OFICIAL (FOLHA A4) */}
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-12 print:m-0 print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none">
        <LiteracyOfficialReportDocument
          students={sortedStudents}
          organizationName={props.organizationName}
          selectedStatus={props.selectedStatus}
          selectedShift={props.selectedShift}
        />
      </div>
    </div>
  );
};
