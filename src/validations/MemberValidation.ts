import { z } from 'zod';
import { journeyStepEnum } from '@/models/Schema';

export const MemberSchema = z.object({
  firstName: z.string().min(2, 'Nome é obrigatório'),
  lastName: z.string().min(2, 'Sobrenome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone inválido'),
  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.enum(['M', 'F']),
  leaderId: z.string().optional().nullable().or(z.literal('')),
  // Tratamos como string para ser 100% compatível com o <select> do HTML
  generationSlot: z.string().optional().nullable().or(z.literal('')),
  currentStep: z.enum(journeyStepEnum.enumValues),
});

export type MemberInput = z.infer<typeof MemberSchema>;
