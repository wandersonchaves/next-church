'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  MapPin,
  Phone,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import * as React from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import { PatternFormat } from 'react-number-format';
import { createLiteracyStudentAction } from '@/app/[locale]/(auth)/dashboard/alfabetizacao/actions';
import { createPublicLiteracyRegistrationAction } from '@/app/[locale]/alfabetizacao/actions';
import { type LiteracyStudentInput, LiteracyStudentSchema } from '@/validations/LiteracyValidation';

export const LiteracyRegistrationForm = (props: {
  isPublic?: boolean;
  orgId?: string;
  onSuccessAction?: () => void;
}) => {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [lastRegisteredStudent, setLastRegisteredStudent] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LiteracyStudentInput>({
    resolver: zodResolver(LiteracyStudentSchema),
    defaultValues: {
      studentName: '',
      guardianName: '',
      guardianPhone: '',
      address: '',
      neighborhood: '',
      city: 'Teresina',
      age: '' as any,
      birthDate: '',
      gender: 'F',
      educationLevel: 'NUNCA_ESTUDOU',
      preferredShift: 'NOITE',
      hasSpecialNeeds: false,
      specialNeedsDetails: '',
      registeredBy: '',
      status: 'INSCRITO',
      notes: '',
    },
  });

  const selectedGender = watch('gender');
  const selectedEducation = watch('educationLevel');
  const hasSpecialNeeds = watch('hasSpecialNeeds');

  const onSubmit: SubmitHandler<LiteracyStudentInput> = async (data) => {
    setServerError(null);

    let result;
    if (props.isPublic) {
      result = await createPublicLiteracyRegistrationAction({
        ...data,
        orgId: props.orgId,
      });
    } else {
      result = await createLiteracyStudentAction(data);
    }

    if (result.success) {
      setLastRegisteredStudent(data.studentName);
      setIsSuccess(true);
      if (props.onSuccessAction) {
        props.onSuccessAction();
      }
    } else {
      setServerError(result.error || 'Erro ao realizar cadastro.');
    }
  };

  const handleRegisterAnother = () => {
    reset({
      studentName: '',
      guardianName: '',
      guardianPhone: '',
      address: '',
      neighborhood: '',
      city: 'Teresina',
      age: '' as any,
      birthDate: '',
      gender: 'F',
      educationLevel: 'NUNCA_ESTUDOU',
      preferredShift: 'NOITE',
      hasSpecialNeeds: false,
      specialNeedsDetails: '',
      registeredBy: watch('registeredBy') || '', // Mantém o nome do voluntário para os próximos cadastros
      status: 'INSCRITO',
      notes: '',
    });
    setIsSuccess(false);
    setServerError(null);
  };

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl transition-all duration-300 md:p-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-50">
          <CheckCircle2 size={48} strokeWidth={2.5} />
        </div>

        <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-black tracking-widest text-emerald-700 uppercase">
          Inscrição Concluída
        </span>

        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Aluno Cadastrado com Sucesso!
        </h2>

        <p className="mt-3 text-base font-medium text-slate-600">
          {lastRegisteredStudent
            ? (
                <>
                  Os dados de
                  {' '}
                  <strong className="text-slate-900">{lastRegisteredStudent}</strong>
                  {' '}
                  foram registrados no sistema.
                </>
              )
            : (
                'O cadastro foi salvo com sucesso e o aluno já consta na lista de inscritos.'
              )}
        </p>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs font-bold text-blue-800">
          📍 Turmas em formação no período da Noite. A liderança entrará em contato em breve.
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleRegisterAnother}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
          >
            <PlusCircle size={18} />
            Cadastrar Outro Aluno
          </button>

          {!props.isPublic && (
            <a
              href="/dashboard/alfabetizacao"
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-6 py-5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100"
            >
              Ver Lista de Turmas
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-10"
    >
      {/* CABEÇALHO DO FORMULÁRIO */}
      <div className="border-b border-slate-100 pb-6">
        <div className="flex items-center gap-2 text-xs font-black tracking-widest text-blue-600 uppercase">
          <Sparkles size={16} />
          Projeto Alfabetização Comunitária
        </div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
          {props.isPublic ? 'Ficha de Inscrição' : 'Cadastrar Aluno na Alfabetização'}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Preencha os dados abaixo para cadastro na lista e formação das turmas.
        </p>
      </div>

      {serverError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {serverError}
        </div>
      )}

      {/* SEÇÃO 1: DADOS DO ALUNO */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
          <User size={16} className="text-blue-600" />
          1. Dados do Aluno
        </div>

        <div className="space-y-2">
          <label htmlFor="studentName" className="text-xs font-bold tracking-wider text-slate-600 uppercase">
            Nome Completo do Aluno
            {' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            id="studentName"
            {...register('studentName')}
            placeholder="Ex: Maria das Graças Silva"
            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-5 py-4 text-base font-semibold text-slate-800 transition-all outline-none focus:border-blue-600 focus:bg-white"
          />
          {errors.studentName && (
            <p className="text-xs font-bold text-red-600">{errors.studentName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="age" className="text-xs font-bold tracking-wider text-slate-600 uppercase">
              Idade do Aluno
              {' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="age"
              type="number"
              {...register('age')}
              placeholder="Ex: 48"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-5 py-4 text-base font-semibold text-slate-800 transition-all outline-none focus:border-blue-600 focus:bg-white"
            />
            {errors.age && (
              <p className="text-xs font-bold text-red-600">{errors.age.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-bold tracking-wider text-slate-600 uppercase">
              Sexo
              {' '}
              <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue('gender', 'F')}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-sm font-bold transition-all ${selectedGender === 'F'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {selectedGender === 'F' && <Check size={16} />}
                Feminino
              </button>

              <button
                type="button"
                onClick={() => setValue('gender', 'M')}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-sm font-bold transition-all ${selectedGender === 'M'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {selectedGender === 'M' && <Check size={16} />}
                Masculino
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: CONTATO E RESPONSÁVEL */}
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
          <Phone size={16} className="text-blue-600" />
          2. Contato & Responsável
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="guardianPhone" className="text-xs font-bold tracking-wider text-slate-600 uppercase">
              WhatsApp / Telefone
              {' '}
              <span className="text-red-500">*</span>
            </label>
            <Controller
              name="guardianPhone"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <PatternFormat
                  {...field}
                  id="guardianPhone"
                  format="(##) #####-####"
                  mask="_"
                  value={value}
                  onValueChange={values => onChange(values.value)}
                  placeholder="(86) 99999-9999"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-5 py-4 text-base font-semibold text-slate-800 transition-all outline-none focus:border-blue-600 focus:bg-white"
                />
              )}
            />
            {errors.guardianPhone && (
              <p className="text-xs font-bold text-red-600">{errors.guardianPhone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="guardianName" className="text-xs font-bold tracking-wider text-slate-600 uppercase">
              Nome do Responsável / Contato Familiar
            </label>
            <input
              id="guardianName"
              {...register('guardianName')}
              placeholder="Ex: Próprio aluno ou filho(a)"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-5 py-4 text-base font-semibold text-slate-800 transition-all outline-none focus:border-blue-600 focus:bg-white"
            />
            <span className="text-[11px] text-slate-400">
              Se for adulto, pode ser o próprio aluno ou parente próximo.
            </span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: ENDEREÇO E BAIRRO */}
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
          <MapPin size={16} className="text-blue-600" />
          3. Endereço na Comunidade
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="address" className="text-xs font-bold tracking-wider text-slate-600 uppercase">
              Rua, Número e Ponto de Referência
              {' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="address"
              {...register('address')}
              placeholder="Ex: Rua São Francisco, nº 140 (próximo ao mercadinho)"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-5 py-4 text-base font-semibold text-slate-800 transition-all outline-none focus:border-blue-600 focus:bg-white"
            />
            {errors.address && (
              <p className="text-xs font-bold text-red-600">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="neighborhood" className="text-xs font-bold tracking-wider text-slate-600 uppercase">
              Bairro / Região
            </label>
            <input
              id="neighborhood"
              {...register('neighborhood')}
              placeholder="Ex: Primavera / Dirceu"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-5 py-4 text-base font-semibold text-slate-800 transition-all outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 4: ESCOLARIDADE */}
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
            <BookOpen size={16} className="text-blue-600" />
            4. Nível de Escolaridade
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700">
            🌙 Turmas Noturnas
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-slate-600 uppercase">
            Qual a situação atual de escolaridade?
            {' '}
            <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              { value: 'NUNCA_ESTUDOU', label: 'Nunca frequentou a escola (Não sabe ler)' },
              { value: 'ALFABETIZANDO_INICIAL', label: 'Sabe assinar o nome / Lê poucas palavras' },
              { value: 'FUNDAMENTAL_INCOMPLETO', label: 'Ensino Fundamental Incompleto' },
              { value: 'FUNDAMENTAL_COMPLETO', label: 'Ensino Fundamental Completo' },
              { value: 'MEDIO_INCOMPLETO', label: 'Ensino Médio Incompleto' },
              { value: 'OUTRO', label: 'Outra escolaridade' },
            ].map(item => (
              <button
                key={item.value}
                type="button"
                onClick={() => setValue('educationLevel', item.value as any)}
                className={`flex items-center justify-between rounded-2xl border-2 p-3.5 text-left text-xs font-bold transition-all ${selectedEducation === item.value
                  ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.label}</span>
                {selectedEducation === item.value && <Check size={16} className="shrink-0 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO 5: ACESSIBILIDADE E CADASTRO */}
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
          <HeartHandshake size={16} className="text-blue-600" />
          5. Observações & Cadastrador
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              {...register('hasSpecialNeeds')}
              className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-bold text-slate-700">
              Possui alguma necessidade especial, dificuldade visual, auditiva ou de locomoção?
            </span>
          </label>

          {hasSpecialNeeds && (
            <div className="mt-3">
              <input
                {...register('specialNeedsDetails')}
                placeholder="Descreva a necessidade (ex: cadeira de rodas, dificuldade de visão)"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="registeredBy" className="text-xs font-bold tracking-wider text-slate-600 uppercase">
              Nome do Voluntário / Cadastrador
            </label>
            <input
              id="registeredBy"
              {...register('registeredBy')}
              placeholder="Seu nome (voluntário da igreja)"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-5 py-4 text-base font-semibold text-slate-800 transition-all outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-xs font-bold tracking-wider text-slate-600 uppercase">
              Observações Gerais
            </label>
            <input
              id="notes"
              {...register('notes')}
              placeholder="Ex: Prefere estudar perto de casa"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-5 py-4 text-base font-semibold text-slate-800 transition-all outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* BOTÃO DE CONFIRMAÇÃO */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-700 py-5 text-base font-black tracking-wider text-white uppercase shadow-xl shadow-blue-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {isSubmitting
            ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Salvando Inscrição...
                </>
              )
            : (
                <>
                  Confirmar e Cadastrar Aluno
                  <ArrowRight size={20} />
                </>
              )}
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          <ShieldCheck size={14} className="text-emerald-600" />
          Dados salvos com segurança na base da igreja
        </div>
      </div>
    </form>
  );
};
