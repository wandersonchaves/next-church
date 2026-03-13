import { z } from 'zod';
import { genderEnum, journeyStepEnum } from '@/models/Schema';

export const MemberSchema = z.object({
  firstName: z.string().min(2, 'Nome é obrigatório'),
  lastName: z.string().min(2, 'Sobrenome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone inválido'),
  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.enum(genderEnum.enumValues),
  leaderId: z.string().optional().nullable().or(z.literal('')),
  generationSlot: z.string().optional().nullable().or(z.literal('')),
  // Removemos o .default() para evitar o tipo 'undefined' no TypeScript
  currentStep: z.enum(journeyStepEnum.enumValues),
  isBaptized: z.boolean(),
});

export const StepCompletionSchema = z.object({
  memberId: z.string().uuid(),
  step: z.enum(journeyStepEnum.enumValues),
  notes: z.string().optional(),
});

export type MemberInput = z.infer<typeof MemberSchema>;
