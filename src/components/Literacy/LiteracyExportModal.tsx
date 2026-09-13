'use client';

import {
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
} from 'lucide-react';
import * as React from 'react';
import { logLiteracyExportAuditAction } from '@/app/[locale]/(auth)/dashboard/alfabetizacao/actions';
import { generateLiteracyCsv, type LiteracyExportStudent } from '@/utils/LiteracyExport';
import { LiteracyOfficialReportDocument } from './LiteracyOfficialReportDocument';

export const LiteracyExportModal = (props: {
  isOpen: boolean;
  onCloseAction: () => void;
  students: LiteracyExportStudent[];
  organizationName: string;
}) => {
  const [selectedStatus, setSelectedStatus] = React.useState<string>('INSCRITO');
  const [selectedShift, setSelectedShift] = React.useState<string>('ALL');
  const [viewMode, setViewMode] = React.useState<'OPTIONS' | 'PREVIEW'>('OPTIONS');
  const [isDownloading, setIsDownloading] = React.useState(false);

  if (!props.isOpen) {
    return null;
  }

  const filteredStudents = props.students.filter((student) => {
    const matchesStatus = selectedStatus === 'ALL' || student.status === selectedStatus;
    const matchesShift = selectedShift === 'ALL' || student.preferredShift === selectedShift;
    return matchesStatus && matchesShift;
  });

  const handleDownloadCsv = () => {
    try {
      setIsDownloading(true);

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeStatus = selectedStatus.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `relacao_alunos_alfabetizacao_${safeStatus}_${dateStr}.csv`;

      const csvContent = generateLiteracyCsv(filteredStudents);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logLiteracyExportAuditAction(selectedStatus, filteredStudents.length).catch(() => { });
    } catch (error) {
      console.error('Erro ao baixar planilha CSV:', error);
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
      }, 500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (viewMode === 'OPTIONS') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs print:hidden">
        <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl duration-150 md:p-8">
          {/* BOTÃO FECHAR */}
          <button
            type="button"
            onClick={props.onCloseAction}
            className="absolute top-6 right-6 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>

          {/* CABEÇALHO */}
          <div className="flex items-center gap-3 text-blue-600">
            <div className="rounded-2xl bg-blue-50 p-3">
              <Download size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                Encaminhamento Oficial
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Exportar Relação de Alunos
              </h2>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed font-medium text-slate-500">
            Gere a planilha de dados ou a relação nominal impressa para envio à Secretaria de Educação, Conselho de Assistência, MEC ou órgão homologador responsável.
          </p>

          {/* FILTROS DE EXPORTAÇÃO */}
          <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div>
              <span className="block text-[11px] font-black tracking-wider text-slate-700 uppercase">
                Filtrar por Situação da Inscrição:
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'INSCRITO', label: 'Apenas Inscritos (Aguardando Turma)' },
                  { id: 'ALL', label: 'Todos os Alunos' },
                  { id: 'CONFIRMADO', label: 'Confirmados' },
                  { id: 'TURMA_FORMADA', label: 'Em Turma Formada' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedStatus(item.id)}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-left font-bold transition-all ${selectedStatus === item.id
                      ? 'border-blue-600 bg-blue-50/80 text-blue-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    {selectedStatus === item.id && <Check size={14} className="shrink-0 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="export-shift-select" className="block text-[11px] font-black tracking-wider text-slate-700 uppercase">
                Filtrar por Turno Preferencial:
              </label>
              <select
                id="export-shift-select"
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
              >
                <option value="ALL">Todos os Turnos</option>
                <option value="MANHA">Manhã</option>
                <option value="TARDE">Tarde</option>
                <option value="NOITE">Noite (Período Noturno)</option>
                <option value="SABADO">Sábado</option>
              </select>
            </div>

            {/* TOTALIZADOR */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs">
              <span className="font-bold text-slate-500">Alunos a exportar:</span>
              <span className="rounded-lg bg-blue-100/70 px-2.5 py-1 font-black text-blue-800">
                {filteredStudents.length}
                {' '}
                aluno(s)
              </span>
            </div>
          </div>

          {/* AÇÕES DE EXPORTAÇÃO */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={isDownloading || filteredStudents.length === 0}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black tracking-wider text-white uppercase shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              {isDownloading ? 'Baixando...' : 'Baixar Planilha CSV (Excel)'}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('PREVIEW')}
              disabled={filteredStudents.length === 0}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xs font-black tracking-wider text-slate-700 uppercase transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              <FileText size={16} />
              Visualizar Relação Oficial (PDF)
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[11px] font-medium text-slate-400">
              A planilha é formatada em UTF-8 BOM com separador oficial para abrir perfeitamente no Excel sem caracteres corrompidos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs print:static print:inset-auto print:z-auto print:block print:overflow-visible print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-10 print:static print:max-h-none print:w-full print:overflow-visible print:rounded-none print:border-none print:p-0 print:shadow-none">
        {/* BARRA DE AÇÕES SUPERIOR (OCULTA NA IMPRESSÃO) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('OPTIONS')}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              ← Voltar às Opções
            </button>
            <span className="text-xs font-black text-slate-800">
              Pré-visualização da Relação Oficial (
              {filteredStudents.length}
              {' '}
              alunos)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/dashboard/alfabetizacao/relatorio?status=${selectedStatus}&shift=${selectedShift}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              title="Abrir página dedicada para impressão"
            >
              <ExternalLink size={14} />
              Abrir em Nova Aba
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black tracking-wider text-white uppercase shadow-md hover:bg-blue-700 active:scale-95"
            >
              <Printer size={16} />
              Imprimir / Salvar em PDF
            </button>

            <button
              type="button"
              onClick={props.onCloseAction}
              className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* DICA DE IMPRESSÃO (OCULTA NA IMPRESSÃO) */}
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 print:hidden">
          <span className="font-medium">
            💡
            {' '}
            <strong>Dica para o PDF:</strong>
            {' '}
            Ao abrir a janela de impressão, selecione
            {' '}
            <em>&quot;Salvar como PDF&quot;</em>
            . Para remover qualquer URL ou data que o navegador possa inserir nas bordas, desmarque a opção
            {' '}
            <em>&quot;Cabeçalhos e rodapés&quot;</em>
            .
          </span>
        </div>

        {/* CONTEÚDO DO DOCUMENTO OFICIAL (FORMATADO PARA PAPEL A4 E ENVIO A ÓRGÃO) */}
        <div className="print:m-0 print:overflow-visible print:p-0">
          <LiteracyOfficialReportDocument
            students={filteredStudents}
            organizationName={props.organizationName}
            selectedStatus={selectedStatus}
            selectedShift={selectedShift}
          />
        </div>
      </div>
    </div>
  );
};
