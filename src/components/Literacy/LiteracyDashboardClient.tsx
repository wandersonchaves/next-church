'use client';

import * as React from 'react';
import {
  GraduationCap,
  Users,
  Clock,
  BookOpen,
  Search,
  Plus,
  Share2,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit,
  ExternalLink,
  Copy,
  Check,
  Filter,
} from 'lucide-react';
import { Link } from '@/libs/I18nNavigation';
import {
  assignLiteracyClassAction,
  deleteLiteracyStudentAction,
} from '@/app/[locale]/(auth)/dashboard/alfabetizacao/actions';

interface Student {
  id: string;
  organizationId: string;
  studentName: string;
  guardianName: string | null;
  guardianPhone: string;
  address: string;
  neighborhood: string | null;
  city: string | null;
  age: number;
  gender: 'M' | 'F';
  educationLevel: 'NUNCA_ESTUDOU' | 'ALFABETIZANDO_INICIAL' | 'FUNDAMENTAL_INCOMPLETO' | 'FUNDAMENTAL_COMPLETO' | 'MEDIO_INCOMPLETO' | 'MEDIO_COMPLETO' | 'OUTRO';
  preferredShift: 'MANHA' | 'TARDE' | 'NOITE' | 'SABADO';
  hasSpecialNeeds: boolean;
  specialNeedsDetails: string | null;
  registeredBy: string | null;
  status: 'INSCRITO' | 'CONFIRMADO' | 'TURMA_FORMADA' | 'DESISTENTE';
  assignedClass: string | null;
  notes: string | null;
  createdAt: Date;
}

interface Metrics {
  total: number;
  byShift: {
    MANHA: number;
    TARDE: number;
    NOITE: number;
    SABADO: number;
  };
  byStatus: {
    INSCRITO: number;
    CONFIRMADO: number;
    TURMA_FORMADA: number;
    DESISTENTE: number;
  };
  byEducation: {
    NUNCA_ESTUDOU: number;
    ALFABETIZANDO_INICIAL: number;
    FUNDAMENTAL_INCOMPLETO: number;
    OUTROS: number;
  };
  avgAge: number;
}

const educationLabels: Record<string, string> = {
  NUNCA_ESTUDOU: 'Não sabe ler',
  ALFABETIZANDO_INICIAL: 'Alfabetizando',
  FUNDAMENTAL_INCOMPLETO: 'Fund. Incompleto',
  FUNDAMENTAL_COMPLETO: 'Fund. Completo',
  MEDIO_INCOMPLETO: 'Médio Incompleto',
  MEDIO_COMPLETO: 'Médio Completo',
  OUTRO: 'Outro',
};

const shiftLabels: Record<string, { label: string; icon: string; color: string }> = {
  MANHA: { label: 'Manhã', icon: '☀️', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  TARDE: { label: 'Tarde', icon: '🌤️', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  NOITE: { label: 'Noite', icon: '🌙', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  SABADO: { label: 'Sábado', icon: '📅', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  INSCRITO: { label: 'Inscrito (Pendente)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  CONFIRMADO: { label: 'Confirmado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  TURMA_FORMADA: { label: 'Em Turma', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  DESISTENTE: { label: 'Desistente', color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export const LiteracyDashboardClient = (props: {
  initialStudents: Student[];
  metrics: Metrics | null;
}) => {
  const [students, setStudents] = React.useState<Student[]>(props.initialStudents);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [editingStudentId, setEditingStudentId] = React.useState<string | null>(null);
  const [newClassInput, setNewClassInput] = React.useState('');

  const filteredStudents = React.useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        !searchTerm.trim() ||
        s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.guardianName && s.guardianName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.guardianPhone.includes(searchTerm) ||
        (s.neighborhood && s.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.address.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, selectedStatus]);

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/alfabetizacao`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleAssignClass = async (id: string) => {
    if (!newClassInput.trim()) return;
    const res = await assignLiteracyClassAction(id, newClassInput, 'TURMA_FORMADA');
    if (res.success && res.student) {
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, assignedClass: res.student!.assignedClass, status: res.student!.status } : s))
      );
      setEditingStudentId(null);
      setNewClassInput('');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o aluno "${name}" da lista de Alfabetização?`)) {
      return;
    }

    const res = await deleteLiteracyStudentAction(id);
    if (res.success) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const formatWhatsAppUrl = (phone: string, studentName: string) => {
    const cleanNumber = phone.replace(/\D/g, '');
    const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const text = encodeURIComponent(
      `Olá! Tudo bem? Entramos em contato a respeito da inscrição no Projeto de Alfabetização da Igreja (${studentName}).`
    );
    return `https://wa.me/${fullNumber}?text=${text}`;
  };

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600">
            <GraduationCap size={18} />
            Programa de Inclusão e Formação de Turmas
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            Lista de Alfabetização
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Gerencie os alunos cadastrados na comunidade e organize a montagem das turmas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-2xl border-2 border-blue-200 bg-blue-50/70 px-5 py-3 text-xs font-black uppercase tracking-wider text-blue-700 transition-all hover:bg-blue-100 active:scale-95 shadow-xs"
          >
            {copiedLink ? (
              <>
                <Check size={16} className="text-emerald-600" />
                Link Copiado!
              </>
            ) : (
              <>
                <Share2 size={16} />
                Copiar Link da Comunidade
              </>
            )}
          </button>

          <Link
            href="/dashboard/alfabetizacao/new"
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95"
          >
            <Plus size={16} />
            Novo Cadastro
          </Link>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      {props.metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Total Inscritos</span>
              <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
                <Users size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{props.metrics.total}</span>
              <span className="text-xs font-bold text-slate-400">alunos na lista</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Não Alfabetizados</span>
              <div className="rounded-2xl bg-rose-50 p-2.5 text-rose-600">
                <BookOpen size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{props.metrics.byEducation.NUNCA_ESTUDOU}</span>
              <span className="text-xs font-bold text-slate-400">início do zero</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Horário das Aulas</span>
              <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600">
                <Clock size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">🌙 Noite</span>
              <span className="text-xs font-bold text-slate-400">(Período Noturno)</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Média de Idade</span>
              <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600">
                <GraduationCap size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{props.metrics.avgAge || 0}</span>
              <span className="text-xs font-bold text-slate-400">anos de idade</span>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do aluno, responsável, telefone ou bairro..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <span className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Status:</span>
            {['ALL', 'INSCRITO', 'CONFIRMADO', 'TURMA_FORMADA'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedStatus === st
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                {st === 'ALL' ? 'Todos' : st === 'INSCRITO' ? 'Inscritos' : st === 'CONFIRMADO' ? 'Confirmados' : 'Em Turma'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LISTAGEM DE ALUNOS */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-black tracking-tight text-slate-800">
            Alunos Cadastrados ({filteredStudents.length})
          </h2>
          <span className="text-xs font-bold text-slate-400">
            Ordenado pelos mais recentes
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Users size={32} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-800">Nenhum aluno encontrado</h3>
            <p className="mt-1 text-sm text-slate-500">
              Não encontramos nenhum aluno para os filtros selecionados ou ainda não há cadastros.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/dashboard/alfabetizacao/new"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-blue-700"
              >
                + Cadastrar Primeiro Aluno
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Aluno / Idade</th>
                  <th className="px-6 py-4">Contato / Responsável</th>
                  <th className="px-6 py-4">Endereço & Bairro</th>
                  <th className="px-6 py-4">Escolaridade</th>
                  <th className="px-6 py-4">Turma & Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.map((student) => {
                  const status = statusLabels[student.status] || statusLabels.INSCRITO;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* ALUNO E IDADE */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-base">{student.studentName}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                          <span>{student.age} anos</span>
                          <span>•</span>
                          <span>{student.gender === 'F' ? 'Feminino' : 'Masculino'}</span>
                          {student.hasSpecialNeeds && (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-100">
                              ♿ {student.specialNeedsDetails || 'Necessidade especial'}
                            </span>
                          )}
                        </div>
                        {student.registeredBy && (
                          <div className="text-[10px] font-medium text-slate-400 mt-1">
                            Cadastrado por: {student.registeredBy}
                          </div>
                        )}
                      </td>

                      {/* CONTATO / RESPONSÁVEL */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={formatWhatsAppUrl(student.guardianPhone, student.studentName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                          >
                            <Phone size={14} className="text-emerald-600" />
                            {student.guardianPhone}
                          </a>
                        </div>
                        {student.guardianName && (
                          <div className="text-xs text-slate-500 font-medium mt-1">
                            Resp: {student.guardianName}
                          </div>
                        )}
                      </td>

                      {/* ENDEREÇO & BAIRRO */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-1.5 text-xs font-semibold text-slate-700">
                          <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <div>{student.address}</div>
                            {student.neighborhood && (
                              <div className="font-bold text-blue-600 mt-0.5">
                                Bairro: {student.neighborhood}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ESCOLARIDADE */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-800">
                          {educationLabels[student.educationLevel] || student.educationLevel}
                        </div>
                      </td>

                      {/* TURMA & STATUS */}
                      <td className="px-6 py-4">
                        {editingStudentId === student.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Nome da Turma (ex: Turma 1 - Noite)"
                              defaultValue={student.assignedClass || ''}
                              onChange={(e) => setNewClassInput(e.target.value)}
                              className="w-full rounded-xl border border-blue-400 px-3 py-1.5 text-xs font-medium outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleAssignClass(student.id)}
                                className="rounded-lg bg-blue-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
                              >
                                Salvar Turma
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudentId(null)}
                                className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span
                              className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                                status?.color || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {status?.label}
                            </span>
                            {student.assignedClass ? (
                              <div className="mt-1 font-black text-xs text-purple-700 flex items-center gap-1">
                                📚 {student.assignedClass}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStudentId(student.id);
                                  setNewClassInput('');
                                }}
                                className="mt-1 block text-[11px] font-bold text-blue-600 hover:underline"
                              >
                                + Alocar Turma
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={formatWhatsAppUrl(student.guardianPhone, student.studentName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Conversar no WhatsApp"
                            className="rounded-xl p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          >
                            <Phone size={16} />
                          </a>

                          <button
                            type="button"
                            title="Remover Registro"
                            onClick={() => handleDelete(student.id, student.studentName)}
                            className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
