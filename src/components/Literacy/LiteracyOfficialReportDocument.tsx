import * as React from 'react';
import {
  EDUCATION_EXPORT_LABELS,
  formatBrazilianDate,
  formatBrazilianTime,
  GENDER_EXPORT_LABELS,
  getDailyRegistrationStats,
  type LiteracyExportStudent,
  SHIFT_EXPORT_LABELS,
  STATUS_EXPORT_LABELS,
} from '@/utils/LiteracyExport';

export const LiteracyOfficialReportDocument = (props: {
  students: LiteracyExportStudent[];
  organizationName?: string;
  selectedStatus?: string;
  selectedShift?: string;
  emittedAt?: Date;
}) => {
  const emissionDate = props.emittedAt || new Date();
  const statusLabel = (props.selectedStatus && props.selectedStatus !== 'ALL' && STATUS_EXPORT_LABELS[props.selectedStatus]) || null;
  const shiftLabel = (props.selectedShift && props.selectedShift !== 'ALL' && SHIFT_EXPORT_LABELS[props.selectedShift]) || null;
  const dailyStats = getDailyRegistrationStats(props.students);

  return (
    <div className="font-sans text-slate-900 print:px-8 print:py-6 print:text-black">
      {/* ESTILOS DE IMPRESSÃO EMBUTIDOS PARA ISOLAMENTO COMPLETO E SUPRESSÃO DE URL DO NAVEGADOR */}
      <style>
        {`
        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          table thead {
            display: table-header-group !important;
          }
          table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table td,
          table th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}
      </style>

      {/* CABEÇALHO ESSENCIAL E MINIMALISTA */}
      <header className="break-inside-avoid border-b-2 border-slate-800 pb-3 text-center print:break-inside-avoid print:border-black">
        {props.organizationName && (
          <div className="text-xs font-black tracking-widest text-slate-700 uppercase print:text-black">
            {props.organizationName}
          </div>
        )}
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 uppercase sm:text-2xl print:text-xl print:text-black">
          Relação de Alunos - Alfabetização
        </h1>

        {/* METADADOS ESSENCIAIS */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-600 print:text-[10px] print:text-black">
          <span>
            Data de Emissão:
            {' '}
            <strong>{formatBrazilianDate(emissionDate)}</strong>
          </span>
          {statusLabel && (
            <>
              <span>•</span>
              <span>
                Situação:
                {' '}
                <strong>{statusLabel}</strong>
              </span>
            </>
          )}
          {shiftLabel && (
            <>
              <span>•</span>
              <span>
                Turno:
                {' '}
                <strong>{shiftLabel}</strong>
              </span>
            </>
          )}
          <span>•</span>
          <span>
            Total:
            {' '}
            <strong>
              {props.students.length}
              {' '}
              aluno(s)
            </strong>
          </span>
        </div>

        {/* CONTROLE DIÁRIO DE CADASTROS (QUANTIDADE POR DIA) */}
        {dailyStats.length > 0 && (
          <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50/80 px-3 py-2 text-center print:border-slate-400 print:bg-slate-100">
            <div className="text-[10px] font-black tracking-wider text-slate-700 uppercase print:text-black">
              Controle Diário de Cadastros
              {' '}
              <span className="font-semibold text-slate-500 print:text-slate-700">
                (
                {dailyStats.length}
                {' '}
                {dailyStats.length === 1 ? 'dia com inscrições' : 'dias com inscrições'}
                )
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-[10px] print:text-[9px]">
              {dailyStats.map(stat => (
                <span
                  key={stat.date}
                  className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-800 print:border-slate-400 print:bg-white print:text-black"
                >
                  <span className="text-slate-600 print:text-black">
                    {stat.date}
                    :
                  </span>
                  <strong className="text-blue-700 print:text-black">
                    {stat.count}
                    {' '}
                    {stat.count === 1 ? 'registro' : 'registros'}
                  </strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* TABELA DE ALUNOS */}
      <div className="mt-4 overflow-visible print:mt-4">
        <table className="w-full border-collapse border border-slate-400 text-left text-[10.5px] leading-tight print:text-[9.5px]">
          <thead className="border-b-2 border-slate-400 bg-slate-100 uppercase print:table-header-group print:bg-slate-200">
            <tr className="border-b border-slate-400 text-[10px] font-black tracking-wider text-slate-800 print:text-[8.5px]">
              <th className="w-[3%] border border-slate-400 px-1 py-2 text-center">Nº</th>
              <th className="w-[11%] border border-slate-400 px-1 py-2 text-center">Data/Hora Registro</th>
              <th className="w-[20%] border border-slate-400 px-2 py-2">Nome do Aluno</th>
              <th className="w-[4%] border border-slate-400 px-1 py-2 text-center">Idade</th>
              <th className="w-[4%] border border-slate-400 px-1 py-2 text-center">Sexo</th>
              <th className="w-[14%] border border-slate-400 px-2 py-2">Escolaridade Atual</th>
              <th className="w-[7%] border border-slate-400 px-1 py-2 text-center">Turno</th>
              <th className="w-[18%] border border-slate-400 px-2 py-2">Endereço & Bairro</th>
              <th className="w-[11%] border border-slate-400 px-1.5 py-2">Contato</th>
              <th className="w-[8%] border border-slate-400 px-1 py-2 text-center">Necessidade Especial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 print:divide-slate-300">
            {props.students.map((student, index) => (
              <tr
                key={student.id}
                className="break-inside-avoid hover:bg-slate-50 print:break-inside-avoid print:hover:bg-transparent"
              >
                <td className="border border-slate-300 px-1 py-1.5 text-center align-top font-bold text-slate-600 print:text-black">
                  {index + 1}
                </td>
                <td className="border border-slate-300 px-1.5 py-1.5 text-center align-top text-slate-800 print:text-black">
                  <div className="font-bold text-slate-900 print:text-black">
                    {formatBrazilianDate(student.createdAt)}
                  </div>
                  <div className="text-[9px] font-medium text-slate-500 print:text-slate-700">
                    {formatBrazilianTime(student.createdAt)}
                  </div>
                </td>
                <td className="border border-slate-300 px-2 py-1.5 align-top font-bold text-slate-900 print:text-black">
                  <div>{student.studentName}</div>
                  {student.guardianName && (
                    <div className="mt-0.5 text-[9px] font-normal text-slate-500 print:text-slate-700">
                      Resp:
                      {' '}
                      {student.guardianName}
                    </div>
                  )}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-center align-top font-semibold text-slate-800 print:text-black">
                  {student.age}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-center align-top font-semibold text-slate-800 print:text-black">
                  {GENDER_EXPORT_LABELS[student.gender] || student.gender}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 align-top text-slate-800 print:text-black">
                  {EDUCATION_EXPORT_LABELS[student.educationLevel] || student.educationLevel}
                </td>
                <td className="border border-slate-300 px-1.5 py-1.5 text-center align-top font-medium text-slate-800 print:text-black">
                  {SHIFT_EXPORT_LABELS[student.preferredShift] || student.preferredShift}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 align-top text-slate-800 print:text-black">
                  <div>{student.address}</div>
                  {student.neighborhood && (
                    <div className="mt-0.5 text-[9px] font-semibold text-slate-600 print:text-slate-800">
                      Bairro:
                      {' '}
                      {student.neighborhood}
                    </div>
                  )}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 align-top font-semibold text-slate-800 print:text-black">
                  {student.guardianPhone}
                </td>
                <td className="border border-slate-300 px-1.5 py-1.5 text-center align-top">
                  {student.hasSpecialNeeds
                    ? (
                        <span className="font-bold text-rose-700 print:text-black">
                          Sim
                          {student.specialNeedsDetails ? ` (${student.specialNeedsDetails})` : ''}
                        </span>
                      )
                    : (
                        <span className="text-slate-400 print:text-slate-600">Não</span>
                      )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
