export type LiteracyExportStudent = {
  id: string;
  studentName: string;
  guardianName?: string | null;
  guardianPhone: string;
  address: string;
  neighborhood?: string | null;
  city?: string | null;
  age: number;
  birthDate?: Date | string | null;
  gender: 'M' | 'F' | string;
  educationLevel: string;
  preferredShift: string;
  hasSpecialNeeds: boolean;
  specialNeedsDetails?: string | null;
  registeredBy?: string | null;
  status: string;
  assignedClass?: string | null;
  notes?: string | null;
  createdAt: Date | string;
};

export const EDUCATION_EXPORT_LABELS: Record<string, string> = {
  NUNCA_ESTUDOU: 'Não alfabetizado (Nunca estudou)',
  ALFABETIZANDO_INICIAL: 'Alfabetizando (Fase inicial)',
  FUNDAMENTAL_INCOMPLETO: 'Ensino Fundamental Incompleto',
  FUNDAMENTAL_COMPLETO: 'Ensino Fundamental Completo',
  MEDIO_INCOMPLETO: 'Ensino Médio Incompleto',
  MEDIO_COMPLETO: 'Ensino Médio Completo',
  OUTRO: 'Outro',
};

export const SHIFT_EXPORT_LABELS: Record<string, string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  NOITE: 'Noite',
  SABADO: 'Sábado',
};

export const STATUS_EXPORT_LABELS: Record<string, string> = {
  INSCRITO: 'Inscrito (Aguardando Turma)',
  CONFIRMADO: 'Confirmado',
  TURMA_FORMADA: 'Em Turma Formada',
  DESISTENTE: 'Desistente',
};

export const GENDER_EXPORT_LABELS: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
};

/**
 * Escapes a cell value for RFC-4180 CSV compliance with semicolon delimiter.
 * @param value - Cell value to format and escape.
 * @returns Escaped CSV cell string.
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value).trim();
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a Date object or ISO string to Brazilian date format DD/MM/AAAA.
 * @param date - Date to format.
 * @returns Formatted date string or hyphen if invalid.
 */
export function formatBrazilianDate(date: Date | string | null | undefined): string {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return '-';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a Date object or ISO string to Brazilian date and time format DD/MM/AAAA HH:mm.
 * @param date - Date to format.
 * @returns Formatted date-time string or hyphen if invalid.
 */
export function formatBrazilianDateTime(date: Date | string | null | undefined): string {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return '-';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export const LITERACY_EXPORT_HEADERS = [
  'Nº',
  'Nome do Aluno',
  'Idade',
  'Data de Nascimento',
  'Sexo',
  'Nível de Alfabetização / Escolaridade',
  'Turno Pretendido',
  'Endereço Completo',
  'Bairro',
  'Cidade',
  'Telefone / WhatsApp',
  'Nome do Responsável',
  'Possui Necessidade Especial?',
  'Detalhes da Necessidade',
  'Status da Inscrição',
  'Turma Alocada',
  'Data de Inscrição',
  'Cadastrado Por',
  'Observações',
] as const;

/**
 * Generates an RFC-4180 compliant CSV file with UTF-8 BOM for Microsoft Excel compatibility.
 * @param students - List of literacy students to serialize into CSV format.
 * @returns CSV string starting with UTF-8 BOM.
 */
export function generateLiteracyCsv(students: LiteracyExportStudent[]): string {
  const headerLine = LITERACY_EXPORT_HEADERS.map(h => escapeCsvCell(h)).join(';');

  const rows = students.map((student, index) => {
    const rowNumber = index + 1;
    const gender = GENDER_EXPORT_LABELS[student.gender] || student.gender;
    const education = EDUCATION_EXPORT_LABELS[student.educationLevel] || student.educationLevel;
    const shift = SHIFT_EXPORT_LABELS[student.preferredShift] || student.preferredShift;
    const status = STATUS_EXPORT_LABELS[student.status] || student.status;
    const specialNeeds = student.hasSpecialNeeds ? 'Sim' : 'Não';
    const birthDate = formatBrazilianDate(student.birthDate);
    const registrationDate = formatBrazilianDateTime(student.createdAt);

    const cells = [
      rowNumber,
      student.studentName,
      student.age,
      birthDate,
      gender,
      education,
      shift,
      student.address,
      student.neighborhood || '-',
      student.city || 'Teresina',
      student.guardianPhone,
      student.guardianName || '-',
      specialNeeds,
      student.specialNeedsDetails || '-',
      status,
      student.assignedClass || '-',
      registrationDate,
      student.registeredBy || '-',
      student.notes || '-',
    ];

    return cells.map(escapeCsvCell).join(';');
  });

  // \uFEFF is UTF-8 Byte Order Mark for Excel automatic UTF-8 detection
  return `\uFEFF${[headerLine, ...rows].join('\r\n')}`;
}
