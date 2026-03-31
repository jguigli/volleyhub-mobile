import type { TournamentGame } from '../types';

export function normalizeTournamentGames(
  games: Partial<TournamentGame>[] | null | undefined,
): TournamentGame[] {
  return (games ?? []).map((g, i) => ({
    fixtureId: g.fixtureId,
    teamAIndex: Number(g.teamAIndex ?? -1),
    teamBIndex: Number(g.teamBIndex ?? -1),
    scoreA: Number(g.scoreA ?? 0),
    scoreB: Number(g.scoreB ?? 0),
    courtIndex: g.courtIndex != null ? Number(g.courtIndex) : 0,
    round: g.round != null ? Number(g.round) : 0,
    order: g.order != null ? Number(g.order) : i,
    status: g.status,
    phase: g.phase,
  }));
}

/** Premier tour : paires consécutives (0vs1, 2vs3…), terrains en rotation. */
export function buildDefaultTournamentFirstRound(
  teamCount: number,
  courtCount: number,
): TournamentGame[] {
  const c = Math.max(1, courtCount);
  const out: TournamentGame[] = [];
  let m = 0;
  for (let i = 0; i + 1 < teamCount; i += 2) {
    out.push({
      teamAIndex: i,
      teamBIndex: i + 1,
      scoreA: 0,
      scoreB: 0,
      courtIndex: m % c,
      round: 0,
      order: m,
    });
    m += 1;
  }
  return out;
}

export function sortedRoundNumbers(games: TournamentGame[]): number[] {
  const s = new Set(games.map((g) => g.round ?? 0));
  return [...s].sort((a, b) => a - b);
}

export function gamesInRound(games: TournamentGame[], round: number): TournamentGame[] {
  return games
    .filter((g) => (g.round ?? 0) === round)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function maxRound(games: TournamentGame[]): number {
  if (games.length === 0) return 0;
  return Math.max(...games.map((g) => g.round ?? 0));
}

export function sortGamesByCourtThenRound(
  games: TournamentGame[],
  courtCount: number,
): TournamentGame[] {
  const c = Math.max(1, courtCount);
  return [...games].sort((a, b) => {
    const ca = Math.min((a.courtIndex ?? 0) % c, c - 1);
    const cb = Math.min((b.courtIndex ?? 0) % c, c - 1);
    if (ca !== cb) return ca - cb;
    const ra = a.round ?? 0;
    const rb = b.round ?? 0;
    if (ra !== rb) return ra - rb;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

export function uniqueSortedRounds(rows: { round: number }[]): number[] {
  const s = new Set(rows.map((r) => r.round));
  return [...s].sort((a, b) => a - b);
}
