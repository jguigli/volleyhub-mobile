import type { TournamentGame } from '../types';

export type TeamStanding = {
  teamIndex: number;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

export function computeTeamStandings(
  games: TournamentGame[],
  teamCount: number,
): TeamStanding[] {
  const rows: Map<number, TeamStanding> = new Map();
  for (let i = 0; i < teamCount; i += 1) {
    rows.set(i, {
      teamIndex: i,
      played: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
  }

  for (const g of games) {
    if (g.status !== 'finished') continue;
    const a = g.teamAIndex;
    const b = g.teamBIndex;
    if (a < 0 || b < 0 || a >= teamCount || b >= teamCount) continue;
    if (a === b) continue;
    const sa = g.scoreA ?? 0;
    const sb = g.scoreB ?? 0;
    if (sa === sb) continue;

    const rowA = rows.get(a);
    const rowB = rows.get(b);
    if (!rowA || !rowB) continue;

    rowA.played += 1;
    rowB.played += 1;
    rowA.pointsFor += sa;
    rowA.pointsAgainst += sb;
    rowB.pointsFor += sb;
    rowB.pointsAgainst += sa;

    if (sa > sb) {
      rowA.wins += 1;
      rowB.losses += 1;
    } else {
      rowB.wins += 1;
      rowA.losses += 1;
    }
  }

  return [...rows.values()].sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    const dx = x.pointsFor - x.pointsAgainst;
    const dy = y.pointsFor - y.pointsAgainst;
    if (dy !== dx) return dy - dx;
    return x.teamIndex - y.teamIndex;
  });
}
