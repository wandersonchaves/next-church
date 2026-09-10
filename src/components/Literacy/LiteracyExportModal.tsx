'use client';

import * as React from 'react';
import {
  Building2,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
} from 'lucide-react';
import {
  EDUCATION_EXPORT_LABELS,
  formatBrazilianDate,
  GENDER_EXPORT_LABELS,
  SHIFT_EXPORT_LABELS,
  STATUS_EXPORT_LABELS,
  type LiteracyExportStudent,
} from '@/utils/LiteracyExport';

export const LiteracyExportModal = (props: {
  isOpen: boolean;
  onClose: () => void;
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
    setIsDownloading(true);
    const params = new URLSearchParams();
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedShift && selectedShift !== 'ALL') params.set('shift', selectedShift);

    const downloadUrl = `/api/literacy/export?${params.toString()}`;

    // Link temporário para acionar o download nativo com máxima performance e streaming
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 1500);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs print:p-0 print:bg-white">
      {viewMode === 'OPTIONS' ? (
        <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8 animate-in fade-in zoom-in-95 duration-150">
          {/* BOTÃO FECHAR */}
          <button
            type="button"
            onClick={props.onClose}
            className="absolute top-6 right-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>

          {/* CABEÇALHO */}
          <div className="flex items-center gap-3 text-blue-600">
            <div className="rounded-2xl bg-blue-50 p-3">
              <Download size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Encaminhamento Oficial
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Exportar Relação de Alunos
              </h2>
            </div>
          </div>

          <p className="mt-3 text-xs font-medium text-slate-500 leading-relaxed">
            Gere a planilha de dados ou a relação nominal impressa para envio à Secretaria de Educação, Conselho de Assistência, MEC ou órgão homologador responsável.
          </p>

          {/* FILTROS DE EXPORTAÇÃO */}
          <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Filtrar por Situação da Inscrição:
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'INSCRITO', label: 'Apenas Inscritos (Aguardando Turma)' },
                  { id: 'ALL', label: 'Todos os Alunos' },
                  { id: 'CONFIRMADO', label: 'Confirmados' },
                  { id: 'TURMA_FORMADA', label: 'Em Turma Formada' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedStatus(item.id)}
                    className={`flex items-center justify-between rounded-xl border p-2.5 font-bold transition-all text-left ${
                      selectedStatus === item.id
                        ? 'border-blue-600 bg-blue-50/80 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    {selectedStatus === item.id && <Check size={14} className="text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Filtrar por Turno Preferencial:
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
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
                {filteredStudents.length} aluno(s)
              </span>
            </div>
          </div>

          {/* AÇÕES DE EXPORTAÇÃO */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={isDownloading || filteredStudents.length === 0}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              <FileSpreadsheet size={16} />
              {isDownloading ? 'Baixando...' : 'Baixar Planilha CSV (Excel)'}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('PREVIEW')}
              disabled={filteredStudents.length === 0}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              <FileText size={16} />
              Visualizar Relação Oficial (PDF)
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              A planilha é formatada em UTF-8 BOM com separador oficial para abrir perfeitamente no Excel sem caracteres corrompidos.
            </p>
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO DO DOCUMENTO OFICIAL PARA IMPRESSÃO / SALVAR COMO PDF */
        <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-10 print:max-h-none print:w-full print:p-0 print:shadow-none">
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
                Pré-visualização da Relação Oficial
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-blue-700 active:scale-95"
              >
                <Printer size={16} />
                Imprimir / Salvar em PDF
              </button>

              <button
                type="button"
                onClick={props.onClose}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* CONTEÚDO DO DOCUMENTO OFICIAL (FORMATADO PARA PAPEL A4 E ENVIO A ÓRGÃO) */}
          <div className="space-y-6 text-slate-900 font-sans print:space-y-4">
            {/* CABEÇALHO INSTITUCIONAL */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
                <Building2 size={16} />
                {props.organizationName || 'NextChurch - Gestão Comunitária'}
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-950 sm:text-2xl">
                Programa Comunitário de Alfabetização
              </h1>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Relação Oficial de Alunos Inscritos para Encaminhamento e Homologação
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] text-slate-500">
                <span>Data de Emissão: <strong>{formatBrazilianDate(new Date())}</strong></span>
                <span>•</span>
                <span>Situação: <strong>{STATUS_EXPORT_LABELS[selectedStatus] || 'Todos'}</strong></span>
                <span>•</span>
                <span>Total de Alunos: <strong>{filteredStudents.length}</strong></span>
              </div>
            </div>

            {/* TERMO DE APRESENTAÇÃO */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-700 leading-relaxed print:bg-white print:border-slate-300">
              <p>
                Abaixo segue a relação nominal dos educandos devidamente inscritos para inserção nas turmas de alfabetização e letramento comunitário, para fins de protocolo, homologação e fornecimento de suporte pedagógico junto ao órgão competente.
              </p>
            </div>

            {/* TABELA OFICIAL DE ALUNOS */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-300 print:bg-slate-200">
                    <th className="border border-slate-300 px-2 py-2 text-center w-8">Nº</th>
                    <th className="border border-slate-300 px-3 py-2">Nome do Aluno</th>
                    <th className="border border-slate-300 px-2 py-2 text-center">Idade</th>
                    <th className="border border-slate-300 px-2 py-2 text-center">Sexo</th>
                    <th className="border border-slate-300 px-3 py-2">Escolaridade Atual</th>
                    <th className="border border-slate-300 px-2 py-2 text-center">Turno</th>
                    <th className="border border-slate-300 px-3 py-2">Endereço & Bairro</th>
                    <th className="border border-slate-300 px-3 py-2">Telefone / Contato</th>
                    <th className="border border-slate-300 px-2 py-2 text-center">Necessidade Especial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-900">
                        {student.studentName}
                        {student.guardianName && (
                          <span className="block text-[9px] font-normal text-slate-500">
                            Resp: {student.guardianName}
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">
                        {student.age}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">
                        {GENDER_EXPORT_LABELS[student.gender] || student.gender}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-slate-700">
                        {EDUCATION_EXPORT_LABELS[student.educationLevel] || student.educationLevel}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-medium">
                        {SHIFT_EXPORT_LABELS[student.preferredShift] || student.preferredShift}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-slate-700">
                        <span>{student.address}</span>
                        {student.neighborhood && (
                          <span className="block text-[9px] font-semibold text-slate-500">
                            Bairro: {student.neighborhood}
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 font-semibold text-slate-800">
                        {student.guardianPhone}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">
                        {student.hasSpecialNeeds ? (
                          <span className="font-bold text-rose-700">
                            Sim ({student.specialNeedsDetails || 'Não detalhado'})
                          </span>
                        ) : (
                          <span className="text-slate-400">Não</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TERMO DE ENCERRAMENTO E ASSINATURAS */}
            <div className="pt-8 space-y-12 break-inside-avoid print:pt-6">
              <div className="text-xs text-slate-600 text-center">
                Certificamos que as informações contidas neste documento conferem com as inscrições realizadas junto à comunidade.
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                <div className="space-y-2">
                  <div className="border-t border-slate-900 w-4/5 mx-auto pt-2 font-bold text-slate-900">
                    Coordenação do Programa de Alfabetização
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {props.organizationName || 'Direção Institucional / Igreja'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="border-t border-slate-900 w-4/5 mx-auto pt-2 font-bold text-slate-900">
                    Órgão Responsável / Homologação
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Data do Protocolo: ____ / ____ / ________
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
