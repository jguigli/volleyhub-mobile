/** Ordre d’affichage / logique : poules puis tableau sans phase, puis finales. */
export function tournamentPhaseSortKey(phase: string | null | undefined): number {
  switch (phase) {
    case 'pool_a':
      return 0;
    case 'pool_b':
      return 1;
    case 'finals':
      return 3;
    default:
      return 2;
  }
}

export function formatTournamentPhase(
  t: (key: string) => string,
  phase: string | null | undefined,
): string {
  if (phase == null || phase === '') return '';
  switch (phase) {
    case 'pool_a':
      return t('match.phasePoolA');
    case 'pool_b':
      return t('match.phasePoolB');
    case 'finals':
      return t('match.phaseFinals');
    default: {
      const s = String(phase).replace(/_/g, ' ').trim();
      if (!s.length) return '';
      return s.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
}
