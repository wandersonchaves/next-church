import { z } from 'zod';

export const LITERACY_GENDERS = ['M', 'F'] as const;

export const LITERACY_SHIFTS = ['MANHA', 'TARDE', 'NOITE', 'SABADO'] as const;

export const LITERACY_STATUSES = [
  'INSCRITO',
  'CONFIRMADO',
  'TURMA_FORMADA',
  'DESISTENTE',
] as const;

export const LITERACY_EDUCATIONS = [
  'NUNCA_ESTUDOU',
  'ALFABETIZANDO_INICIAL',
  'FUNDAMENTAL_INCOMPLETO',
  'FUNDAMENTAL_COMPLETO',
  'MEDIO_INCOMPLETO',
  'MEDIO_COMPLETO',
  'OUTRO',
] as const;

export const LiteracyStudentSchema = z.object({
  studentName: z.string().min(2, 'Nome do aluno é obrigatório'),
  guardianName: z.string().optional().nullable().or(z.literal('')),
  guardianPhone: z.string().min(8, 'WhatsApp/Telefone é obrigatório'),
  address: z.string().min(3, 'Endereço é obrigatório'),
  neighborhood: z.string().optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable().or(z.literal('')),
  age: z.string().min(1, 'Idade é obrigatória'),
  birthDate: z.string().optional().nullable().or(z.literal('')),
  gender: z.enum(LITERACY_GENDERS),
  educationLevel: z.enum(LITERACY_EDUCATIONS),
  preferredShift: z.enum(LITERACY_SHIFTS),
  hasSpecialNeeds: z.boolean(),
  specialNeedsDetails: z.string().optional().nullable().or(z.literal('')),
  registeredBy: z.string().optional().nullable().or(z.literal('')),
  status: z.enum(LITERACY_STATUSES).optional(),
  assignedClass: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
});

export type LiteracyStudentInput = z.infer<typeof LiteracyStudentSchema>;

