import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type CreateMatchParams = {
  openMapPicker?: boolean;
  pickerLat?: number;
  pickerLng?: number;
};

export type FindStackParamList = {
  MatchList: undefined;
  MatchDetail: { matchId: string };
  MatchSettings: { matchId: string };
  EditTournamentSettings: { matchId: string };
  EditMatchSettings: { matchId: string };
  EventGuide: { matchId: string };
  MatchTeamsBoard: { matchId: string };
  TeamsGuide: { tournament: boolean };
  EventScore: { matchId: string };
  TournamentCourts: { matchId: string };
  TournamentStandings: { matchId: string };
  MatchChat: { matchId: string };
  MatchParticipants: { matchId: string };
  InvitePlayer: { matchId: string };
  CreateMatch: CreateMatchParams;
  UserProfile: { userId: string };
  Connections: { userId: string };
};

export type MapStackParamList = {
  Map: { focusLat?: number; focusLng?: number };
  CreateMatch: CreateMatchParams;
  MatchDetail: { matchId: string };
  MatchSettings: { matchId: string };
  EditTournamentSettings: { matchId: string };
  EditMatchSettings: { matchId: string };
  EventGuide: { matchId: string };
  MatchTeamsBoard: { matchId: string };
  TeamsGuide: { tournament: boolean };
  EventScore: { matchId: string };
  TournamentCourts: { matchId: string };
  TournamentStandings: { matchId: string };
  MatchChat: { matchId: string };
  MatchParticipants: { matchId: string };
  InvitePlayer: { matchId: string };
  UserProfile: { userId: string };
  Connections: { userId: string };
};

export type MyStackParamList = {
  MyMatches: undefined;
  MyMatchesCalendar: undefined;
  MatchDetail: { matchId: string };
  MatchSettings: { matchId: string };
  EditTournamentSettings: { matchId: string };
  EditMatchSettings: { matchId: string };
  EventGuide: { matchId: string };
  MatchTeamsBoard: { matchId: string };
  TeamsGuide: { tournament: boolean };
  EventScore: { matchId: string };
  TournamentCourts: { matchId: string };
  TournamentStandings: { matchId: string };
  MatchChat: { matchId: string };
  MatchParticipants: { matchId: string };
  InvitePlayer: { matchId: string };
  CreateMatch: CreateMatchParams;
  UserProfile: { userId: string };
  Connections: { userId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Connections: { userId: string };
  Settings: undefined;
  NotificationSettings: undefined;
  Help: undefined;
  EditProfile: undefined;
  MatchDetail: { matchId: string };
  MatchSettings: { matchId: string };
  EditTournamentSettings: { matchId: string };
  EditMatchSettings: { matchId: string };
  EventGuide: { matchId: string };
  MatchTeamsBoard: { matchId: string };
  TeamsGuide: { tournament: boolean };
  EventScore: { matchId: string };
  TournamentCourts: { matchId: string };
  TournamentStandings: { matchId: string };
  MatchChat: { matchId: string };
  MatchParticipants: { matchId: string };
  InvitePlayer: { matchId: string };
  /** Recherche de joueurs par pseudo (UI mock côté client pour l’instant) */
  SearchUsers: undefined;
  UserProfile: { userId: string };
  Notifications: undefined;
};

export type NotificationsStackParamList = {
  Notifications: undefined;
  MatchDetail: { matchId: string };
  MatchSettings: { matchId: string };
  EditMatchSettings: { matchId: string };
  EventGuide: { matchId: string };
  MatchTeamsBoard: { matchId: string };
  TeamsGuide: { tournament: boolean };
  EventScore: { matchId: string };
  TournamentCourts: { matchId: string };
  MatchChat: { matchId: string };
  UserProfile: { userId: string };
  Connections: { userId: string };
};

export type MainTabParamList = {
  FindTab: NavigatorScreenParams<FindStackParamList>;
  MyTab: NavigatorScreenParams<MyStackParamList>;
  MapTab: NavigatorScreenParams<MapStackParamList>;
  NotificationsTab: NavigatorScreenParams<NotificationsStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

/** Backward-compat alias used inside MatchDetail (shared between stacks) */
export type MatchesStackParamList = FindStackParamList;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

export type MapStackScreenProps<T extends keyof MapStackParamList> =
  NativeStackScreenProps<MapStackParamList, T>;
