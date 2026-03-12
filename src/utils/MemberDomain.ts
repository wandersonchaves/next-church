export const MemberDomain = {
  /**
   * Calcula a trilha Kids baseada na idade atual.
   * 0-2: Berçário, 3-5: Maternal, 6-9: Kids 1, 10-14: Juniores.
   * @param birthDate - Data de nascimento do membro para calcular a idade.
   */
  getKidsClass: (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 0 || age > 14) {
      return null;
    }
    if (age <= 2) {
      return 'BERCARIO';
    }
    if (age <= 5) {
      return 'MATERNAL';
    }
    if (age <= 9) {
      return 'KIDS_1';
    }
    return 'JUNIORES';
  },

  /**
   * State Machine para a Jornada de 7 Passos.
   * @param current - O passo atual do membro na jornada.
   * @param next - O próximo passo para o qual o membro deseja transitar.
   */
  canTransitionTo: (current: string, next: string): boolean => {
    const steps = [
      'DECISION',
      'CONSOLIDATION',
      'ENCOUNTER',
      'POST_ENCOUNTER',
      'SCHOOL_OF_LEADERS',
      'PRE_REENTRY',
      'SENDING',
    ];

    const currentIndex = steps.indexOf(current);
    const nextIndex = steps.indexOf(next);

    return nextIndex === currentIndex + 1 || next === 'DECISION';
  },
};
