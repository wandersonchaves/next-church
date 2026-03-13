export const MemberDomain = {
  /**
   * Calcula a classe Kids com base na idade exata.
   * Regras:
   * 0-2: Berçário
   * 3-5: Maternal
   * 6-9: Kids 1
   * 10-14: Juniores
   * 15+: Adulto
   * @param birthDate - A data de nascimento do membro.
   */
  getKidsClass: (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 0) {
      return null;
    }
    if (age <= 2) {
      return 'BERCÁRIO';
    }
    if (age <= 5) {
      return 'MATERNAL';
    }
    if (age <= 9) {
      return 'KIDS 1';
    }
    if (age <= 14) {
      return 'JUNIORES';
    }
    return null; // Acima de 14 anos não é mais Kids
  },

  /**
   * State Machine para a Jornada de 7 Passos.
   * @param current - O passo atual do membro na jornada.
   * @param next - O próximo passo para o qual o membro deseja progredir.
   */
  canTransitionTo: (current: string, next: string): boolean => {
    const steps = [
      'DECISION',
      'CELL',
      'UNIVERSITY_OF_LIFE',
      'ENCOUNTER',
      'LEADERSHIP_TRAINING',
      'RE_ENCOUNTER',
      'SENDING',
    ];

    const currentIndex = steps.indexOf(current);
    const nextIndex = steps.indexOf(next);

    // Permite avançar um por um ou resetar para o início
    return nextIndex === currentIndex + 1 || next === 'DECISION';
  },
};
