export type NotificationType =
  | 'player_joined'
  | 'match_almost_full'
  | 'event_invite'
  | 'match_renewed_invite'
  | 'event_settings_changed'
  | 'event_started_early'
  | 'event_deleted'
  | 'player_removed'
  | 'event_full'
  | 'event_completed'
  | 'opponent_score_locked'
  | 'score_overridden'
  | 'connection_accepted'
  | 'player_left_event'
  | 'event_reminder_30min'
  | 'chat_message';

export interface GeneralNotification {
  id: string;
  type: NotificationType;
  matchId?: string;
  actorUsername?: string;
  actorId?: string;
  extra?: Record<string, string>;
  createdAt: string;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type Position =
  | 'setter'
  | 'libero'
  | 'outside_hitter'
  | 'opposite_hitter'
  | 'middle_blocker'
  | 'any';
export type CourtType = 'indoor' | 'outdoor';
export type MatchStatus = 'open' | 'full' | 'cancelled' | 'completed';

export type VolleyType = 'classic' | 'beach' | 'green';

export type EventFormat = 'match' | 'tournament';

export type TournamentSystem =
  | 'single_elimination'
  | 'pools_finals'
  | 'round_robin';

export type League =
  | 'departmental'
  | 'regional'
  | 'pre_national'
  | 'national'
  | 'professional';

export interface User {
  id: string;
  username: string;
  email: string;
  skillLevel: SkillLevel;
  position: Position;
  club?: string | null;
  competition?: string | null;
  league?: League | null;
  profilePicture: string | null;
  bio?: string | null;
  fcmToken: string | null;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface Court {
  id: string;
  name: string;
  type: CourtType;
  address: string | null;
  lat: number;
  lng: number;
  createdAt: string;
  distance?: number;
  /** false = lieu créé par pin (hors référentiel), pas de point bleu sur la carte */
  isRegistry?: boolean;
}

export interface TournamentGame {
  /** Présent quand le serveur gère les confrontations (table fixtures). */
  fixtureId?: string;
  /** Indice équipe ou -1 si à déterminer */
  teamAIndex: number;
  teamBIndex: number;
  scoreA: number;
  scoreB: number;
  scoreAConfirmed?: boolean;
  scoreBConfirmed?: boolean;
  /** Terrain 0 … tournamentCourtCount-1 */
  courtIndex?: number;
  /** Tour de l’arbre (0 = premier tour). */
  round?: number;
  /** Ordre d’affichage dans le tour. */
  order?: number;
  status?: 'pending' | 'ready' | 'live' | 'finished';
  phase?: string | null;
}

/** Confrontation serveur (GET match détail tournoi). */
export interface TournamentFixture {
  id: string;
  teamAIndex: number | null;
  teamBIndex: number | null;
  scoreA: number;
  scoreB: number;
  scoreAConfirmed?: boolean;
  scoreBConfirmed?: boolean;
  courtIndex: number | null;
  status: 'pending' | 'ready' | 'live' | 'finished';
  dependsOnFixtureIds: string[] | null;
  feedsFixtureId: string | null;
  feedsSlot: 'A' | 'B' | null;
  round: number;
  order: number;
  phase: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface MatchChatMessage {
  id: string;
  matchId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: Pick<User, 'id' | 'username' | 'profilePicture'>;
}

export interface MatchParticipant {
  matchId: string;
  userId: string;
  joinedAt: string;
  /** 0 = équipe A, 1 = équipe B, null / undefined = non assigné */
  teamIndex?: number | null;
  /** Position dans l'équipe (0-based) */
  slotIndex?: number | null;
  user: Pick<
    User,
    'id' | 'username' | 'profilePicture' | 'skillLevel' | 'position'
  >;
}

export interface Match {
  id: string;
  courtId: string;
  court: Court;
  creatorId: string;
  creator: Pick<User, 'id' | 'username' | 'profilePicture'>;
  scheduledAt: string;
  maxPlayers: number;
  currentPlayers: number;
  skillLevel: SkillLevel;
  volleyType?: VolleyType;
  eventFormat?: EventFormat;
  teamCount?: number | null;
  teamSize?: number | null;
  matchSets?: number | null;
  pointsToWin?: number | null;
  scoringRule?: 'point_sec' | 'two_point_gap' | null;
  tournamentPointsPerMatch?: number | null;
  tournamentCourtCount?: number | null;
  tournamentSystem?: TournamentSystem | null;
  status: MatchStatus;
  description: string | null;
  /** Résultat final (match simple), renseigné par l’organisateur */
  teamAScore?: number | null;
  teamBScore?: number | null;
  setScores?: { teamA: number; teamB: number }[] | null;
  /** Confrontations tournoi (indices d’équipe 0 … teamCount-1). */
  tournamentGames?: TournamentGame[] | null;
  /** Détail confrontations (si backend expose les fixtures). */
  tournamentFixtures?: TournamentFixture[] | null;
  participants: MatchParticipant[];
  createdAt: string;
}

export interface NearbyMatch {
  id: string;
  scheduled_at: string;
  max_players: number;
  current_players: number;
  skill_level: SkillLevel;
  volley_type?: VolleyType;
  event_format?: EventFormat;
  match_sets?: number | null;
  points_to_win?: number | null;
  scoring_rule?: 'point_sec' | 'two_point_gap' | null;
  set_scores?: { teamA: number; teamB: number }[] | null;
  tournament_games?: any[] | null;
  tournament_points_per_match?: number | null;
  status: MatchStatus;
  description: string | null;
  created_at: string;
  court_id: string;
  court_name: string;
  court_type: CourtType;
  court_address: string | null;
  court_lat: number;
  court_lng: number;
  /** false = lieu créé par pin (ne pas afficher court_name brut type "Custom Spot …") */
  court_is_registry?: boolean;
  creator_id: string;
  creator_username: string;
  creator_picture: string | null;
  distance?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'court' | 'match';
  data: Court | NearbyMatch;
}
