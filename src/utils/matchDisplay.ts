import type { NearbyMatch, TournamentSystem } from '../types';

/** Libellé court du système de tournoi (fiche événement, etc.). */
export function tournamentSystemTitle(
  t: (key: string) => string,
  system: TournamentSystem | null | undefined,
): string | null {
  if (!system) {
    return null;
  }
  switch (system) {
    case 'single_elimination':
      return t('createMatch.tournamentSystemSingleElimTitle');
    case 'pools_finals':
      return t('createMatch.tournamentSystemPoolsTitle');
    case 'round_robin':
      return t('createMatch.tournamentSystemRoundRobinTitle');
    default:
      return null;
  }
}

/** Champs nécessaires pour formater le libellé lieu (liste, carte, fiche). */
export type VenuePlaceInput = Pick<
  NearbyMatch,
  'court_name' | 'court_address' | 'court_lat' | 'court_lng' | 'court_is_registry'
>;

/** Coordonnées affichables ou null si absentes / invalides (évite toFixed sur undefined). */
/** Segments affichés sous les coordonnées pour un lieu « pin » (adresse géocodée stockée). */
export type PinAddressParts = {
  city?: string;
  /** "12 Rue de la Paix" (ou équivalent) */
  streetLine?: string;
  department?: string;
  country?: string;
};

/** Interprète `court.address` (ex. « Ville, Pays » ou « Ville, Région, Pays »). */
export function parsePinAddressForDetails(
  address: string | null | undefined,
): PinAddressParts {
  const text = address?.trim();
  if (!text) {
    return {};
  }
  const parts = text.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 1) {
    return { city: parts[0] };
  }
  if (parts.length === 2) {
    return { city: parts[0], country: parts[1] };
  }
  // Pin "enrichi" attendu: `City, StreetLine, Department, Country`
  // - `streetLine` = parts[1] quand on a au moins 4 segments
  // - sinon on retombe sur le comportement historique: department = tous les segments intermédiaires
  const city = parts[0];
  const country = parts[parts.length - 1];

  if (parts.length >= 4) {
    return {
      city,
      streetLine: parts[1],
      department: parts.slice(2, -1).join(', '),
      country,
    };
  }

  return {
    city,
    department: parts.slice(1, -1).join(', '),
    country,
  };
}

export function formatMatchCoords(
  lat: unknown,
  lng: unknown,
  digits: number,
): string | null {
  const la = typeof lat === 'number' ? lat : lat != null ? Number(lat) : NaN;
  const lo = typeof lng === 'number' ? lng : lng != null ? Number(lng) : NaN;
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return null;
  }
  return `${la.toFixed(digits)}, ${lo.toFixed(digits)}`;
}

/** Ville issue du géocodage au pin (souvent « Ville, Pays » en base). */
function extractCityFromPinAddress(addr: string | null | undefined): string | null {
  const t = addr?.trim();
  if (!t) return null;
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean);
  return parts[0] ?? null;
}

/** Localité pour un complexe référentiel : dernier segment si adresse multi-parties, sinon le champ entier. */
function extractCityFromRegistryAddress(addr: string | null | undefined): string | null {
  const t = addr?.trim();
  if (!t) return null;
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 1] ?? null;
  }
  return parts[0] ?? null;
}

function registryCardVenueLine(
  courtName: string | null | undefined,
  courtAddress: string | null | undefined,
): string {
  const name = courtName?.trim() || '—';
  const city = extractCityFromRegistryAddress(courtAddress);
  if (city) {
    return `${name}, ${city}`;
  }
  return name;
}

/**
 * Cartes liste (Trouver / Mes matchs), bottom sheet : ville seule pour un pin ;
 * référentiel : nom + ville.
 */
export function matchCardVenuePlace(match: VenuePlaceInput): string {
  if (match.court_is_registry === false) {
    return extractCityFromPinAddress(match.court_address) || '—';
  }
  return registryCardVenueLine(match.court_name, match.court_address);
}

/**
 * Fiche détail : pin = coordonnées uniquement ; référentiel = nom + ville (comme les cartes).
 */
export function matchDetailVenuePlaceFromCourt(court: {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  isRegistry?: boolean;
}): string {
  if (court.isRegistry === false) {
    return formatMatchCoords(court.lat, court.lng, 5) ?? '—';
  }
  return registryCardVenueLine(court.name, court.address);
}

export function isTournamentMatch(match: {
  event_format?: string | null;
  eventFormat?: string | null;
}): boolean {
  const fmt = match.event_format ?? match.eventFormat;
  return fmt === 'tournament';
}

/** Sets gagnés à partir des points par set (strictement plus haut = set remporté). */
export function countSetsWonFromScores(
  sets: { teamA: number; teamB: number }[] | null | undefined,
): { teamA: number; teamB: number } {
  let teamA = 0;
  let teamB = 0;
  for (const s of sets ?? []) {
    if (s.teamA > s.teamB) {
      teamA += 1;
    } else if (s.teamB > s.teamA) {
      teamB += 1;
    }
  }
  return { teamA, teamB };
}

/** Victoires par équipe (index) à partir des scores des rencontres tournoi. */
export function countTournamentWinsFromGames(
  games:
    | {
        teamAIndex: number;
        teamBIndex: number;
        scoreA: number;
        scoreB: number;
      }[]
    | null
    | undefined,
  teamCount: number,
): number[] {
  const wins = Array.from({ length: teamCount }, () => 0);
  for (const g of games ?? []) {
    const ai = g.teamAIndex;
    const bi = g.teamBIndex;
    if (g.scoreA > g.scoreB && ai >= 0 && ai < teamCount) {
      wins[ai] += 1;
    } else if (g.scoreB > g.scoreA && bi >= 0 && bi < teamCount) {
      wins[bi] += 1;
    }
  }
  return wins;
}

/**
 * Le champ `description` en base commence souvent par la ligne méta auto (création d’événement).
 * On n’affiche que le texte libre sous la carte « détails format ».
 */
export function userWrittenDescription(
  stored: string | null | undefined,
): string {
  const text = (stored ?? '').trim();
  if (!text) {
    return '';
  }
  const lines = text.split('\n');
  const first = lines[0]?.trim() ?? '';
  const isAutoMeta =
    /^Type\s*:/i.test(first) ||
    /^Tournament\s*•/i.test(first) ||
    /^Tournoi\s*•/i.test(first);
  if (isAutoMeta) {
    return lines.slice(1).join('\n').trim();
  }
  return text;
}
