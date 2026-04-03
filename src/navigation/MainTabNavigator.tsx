import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MapScreen } from '../screens/MapScreen';
import { MatchListScreen } from '../screens/MatchListScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { MatchSettingsScreen } from '../screens/MatchSettingsScreen';
import { MatchTeamsBoardScreen } from '../screens/MatchTeamsBoardScreen';
import { EventScoreScreen } from '../screens/EventScoreScreen';
import { TournamentCourtsScreen } from '../screens/TournamentCourtsScreen';
import { TournamentStandingsScreen } from '../screens/TournamentStandingsScreen';
import { MatchChatScreen } from '../screens/MatchChatScreen';
import { MatchParticipantsScreen } from '../screens/MatchParticipantsScreen';
import { CreateMatchScreen } from '../screens/CreateMatchScreen';
import { MyMatchesScreen } from '../screens/MyMatchesScreen';
import { MyMatchesCalendarScreen } from '../screens/MyMatchesCalendarScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { SearchUsersScreen } from '../screens/SearchUsersScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { InvitePlayerScreen } from '../screens/InvitePlayerScreen';
import { ConnectionsScreen } from '../screens/ConnectionsScreen';
import {
  MainTabParamList,
  FindStackParamList,
  MapStackParamList,
  MyStackParamList,
  ProfileStackParamList,
  NotificationsStackParamList,
} from './types';
import { colors } from '../theme';
import { useTranslation } from '../i18n';
import { withNoFeedbackHeaderBack } from './headerOptions';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';

const Tab = createBottomTabNavigator<MainTabParamList>();
const FindStack = createNativeStackNavigator<FindStackParamList>();
const MapStack = createNativeStackNavigator<MapStackParamList>();
const MyStack = createNativeStackNavigator<MyStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const NotifStack = createNativeStackNavigator<NotificationsStackParamList>();

const STACK_HEADER_OPTIONS = {
  headerStyle: { backgroundColor: colors.surface, height: 110 },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const },
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: colors.background },
  headerTopInsetEnabled: true,
};

function FindNavigator() {
  const { t } = useTranslation();
  return (
    <FindStack.Navigator
      screenOptions={({ navigation }) =>
        withNoFeedbackHeaderBack(navigation, STACK_HEADER_OPTIONS)
      }
    >
      <FindStack.Screen
        name="MatchList"
        component={MatchListScreen}
        options={{ title: t('nav.findMatch') }}
      />
      <FindStack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: t('nav.matchDetails') }}
      />
      <FindStack.Screen
        name="MatchSettings"
        component={MatchSettingsScreen}
        options={{ title: t('nav.matchSettings') }}
      />
      <FindStack.Screen
        name="MatchTeamsBoard"
        component={MatchTeamsBoardScreen}
        options={{ title: t('match.viewTeamsBoard') }}
      />
      <FindStack.Screen
        name="EventScore"
        component={EventScoreScreen}
        options={{ title: t('match.viewScoreDetail') }}
      />
      <FindStack.Screen
        name="TournamentCourts"
        component={TournamentCourtsScreen}
        options={{ title: t('match.tournamentCourtsPageTitle') }}
      />
      <FindStack.Screen
        name="TournamentStandings"
        component={TournamentStandingsScreen}
        options={{ title: t('match.tournamentStandingsTitle') }}
      />
      <FindStack.Screen
        name="MatchChat"
        component={MatchChatScreen}
        options={{ title: t('nav.matchGroupChat') }}
      />
      <FindStack.Screen
        name="MatchParticipants"
        component={MatchParticipantsScreen}
        options={{ title: t('nav.eventParticipants') }}
      />
      <FindStack.Screen
        name="InvitePlayer"
        component={InvitePlayerScreen}
        options={{ title: t('match.invitePlayer') }}
      />
      <FindStack.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
        options={{ title: t('nav.createEvent') }}
      />
      <FindStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: t('nav.profile') }}
      />
      <FindStack.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{ title: t('nav.followers') }}
      />
    </FindStack.Navigator>
  );
}

function MapNavigator() {
  const { t } = useTranslation();
  return (
    <MapStack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        ...withNoFeedbackHeaderBack(navigation, STACK_HEADER_OPTIONS),
      })}
    >
      <MapStack.Screen name="Map" component={MapScreen} />
      <MapStack.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
        options={{
          headerShown: true,
          title: t('nav.createEvent'),
        }}
      />
      <MapStack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ headerShown: true, title: t('nav.matchDetails') }}
      />
      <MapStack.Screen
        name="MatchSettings"
        component={MatchSettingsScreen}
        options={{ headerShown: true, title: t('nav.matchSettings') }}
      />
      <MapStack.Screen
        name="MatchTeamsBoard"
        component={MatchTeamsBoardScreen}
        options={{
          headerShown: true,
          title: t('match.viewTeamsBoard'),
        }}
      />
      <MapStack.Screen
        name="EventScore"
        component={EventScoreScreen}
        options={{
          headerShown: true,
          title: t('match.viewScoreDetail'),
        }}
      />
      <MapStack.Screen
        name="TournamentCourts"
        component={TournamentCourtsScreen}
        options={{
          headerShown: true,
          title: t('match.tournamentCourtsPageTitle'),
        }}
      />
      <MapStack.Screen
        name="TournamentStandings"
        component={TournamentStandingsScreen}
        options={{
          headerShown: true,
          title: t('match.tournamentStandingsTitle'),
        }}
      />
      <MapStack.Screen
        name="MatchChat"
        component={MatchChatScreen}
        options={{
          headerShown: true,
          title: t('nav.matchGroupChat'),
        }}
      />
      <MapStack.Screen
        name="MatchParticipants"
        component={MatchParticipantsScreen}
        options={{
          headerShown: true,
          title: t('nav.eventParticipants'),
        }}
      />
      <MapStack.Screen
        name="InvitePlayer"
        component={InvitePlayerScreen}
        options={{
          headerShown: true,
          title: t('match.invitePlayer'),
        }}
      />
      <MapStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ headerShown: true, title: t('nav.profile') }}
      />
      <MapStack.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{ headerShown: true, title: t('nav.followers') }}
      />
    </MapStack.Navigator>
  );
}

function MyNavigator() {
  const { t } = useTranslation();
  return (
    <MyStack.Navigator
      screenOptions={({ navigation }) =>
        withNoFeedbackHeaderBack(navigation, STACK_HEADER_OPTIONS)
      }
    >
      <MyStack.Screen
        name="MyMatches"
        component={MyMatchesScreen}
        options={{ title: t('nav.myMatches') }}
      />
      <MyStack.Screen
        name="MyMatchesCalendar"
        component={MyMatchesCalendarScreen}
        options={{ title: t('myMatches.calendarTitle') }}
      />
      <MyStack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: t('nav.matchDetails') }}
      />
      <MyStack.Screen
        name="MatchSettings"
        component={MatchSettingsScreen}
        options={{ title: t('nav.matchSettings') }}
      />
      <MyStack.Screen
        name="MatchTeamsBoard"
        component={MatchTeamsBoardScreen}
        options={{ title: t('match.viewTeamsBoard') }}
      />
      <MyStack.Screen
        name="EventScore"
        component={EventScoreScreen}
        options={{ title: t('match.viewScoreDetail') }}
      />
      <MyStack.Screen
        name="TournamentCourts"
        component={TournamentCourtsScreen}
        options={{ title: t('match.tournamentCourtsPageTitle') }}
      />
      <MyStack.Screen
        name="TournamentStandings"
        component={TournamentStandingsScreen}
        options={{ title: t('match.tournamentStandingsTitle') }}
      />
      <MyStack.Screen
        name="MatchChat"
        component={MatchChatScreen}
        options={{ title: t('nav.matchGroupChat') }}
      />
      <MyStack.Screen
        name="MatchParticipants"
        component={MatchParticipantsScreen}
        options={{ title: t('nav.eventParticipants') }}
      />
      <MyStack.Screen
        name="InvitePlayer"
        component={InvitePlayerScreen}
        options={{ title: t('match.invitePlayer') }}
      />
      <MyStack.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
        options={{ title: t('nav.createEvent') }}
      />
      <MyStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: t('nav.profile') }}
      />
      <MyStack.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{ title: t('nav.followers') }}
      />
    </MyStack.Navigator>
  );
}

function ProfileNavigator() {
  const { t } = useTranslation();
  return (
    <ProfileStack.Navigator
      screenOptions={({ navigation }) =>
        withNoFeedbackHeaderBack(navigation, STACK_HEADER_OPTIONS)
      }
    >
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('nav.myProfile') }}
      />
      <ProfileStack.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{ title: t('nav.followers') }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('nav.settings') }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t('settings.editProfile') }}
      />
      <ProfileStack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: t('nav.matchDetails') }}
      />
      <ProfileStack.Screen
        name="MatchSettings"
        component={MatchSettingsScreen}
        options={{ title: t('nav.matchSettings') }}
      />
      <ProfileStack.Screen
        name="MatchTeamsBoard"
        component={MatchTeamsBoardScreen}
        options={{ title: t('match.viewTeamsBoard') }}
      />
      <ProfileStack.Screen
        name="EventScore"
        component={EventScoreScreen}
        options={{ title: t('match.viewScoreDetail') }}
      />
      <ProfileStack.Screen
        name="TournamentCourts"
        component={TournamentCourtsScreen}
        options={{ title: t('match.tournamentCourtsPageTitle') }}
      />
      <ProfileStack.Screen
        name="TournamentStandings"
        component={TournamentStandingsScreen}
        options={{ title: t('match.tournamentStandingsTitle') }}
      />
      <ProfileStack.Screen
        name="MatchChat"
        component={MatchChatScreen}
        options={{ title: t('nav.matchGroupChat') }}
      />
      <ProfileStack.Screen
        name="MatchParticipants"
        component={MatchParticipantsScreen}
        options={{ title: t('nav.eventParticipants') }}
      />
      <ProfileStack.Screen
        name="InvitePlayer"
        component={InvitePlayerScreen}
        options={{ title: t('match.invitePlayer') }}
      />
      <ProfileStack.Screen
        name="SearchUsers"
        component={SearchUsersScreen}
        options={{ title: t('userList.searchPlayersTitle') }}
      />
      <ProfileStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: t('nav.profile') }}
      />
    </ProfileStack.Navigator>
  );
}

function NotificationsNavigator() {
  const { t } = useTranslation();
  return (
    <NotifStack.Navigator
      screenOptions={({ navigation }) =>
        withNoFeedbackHeaderBack(navigation, STACK_HEADER_OPTIONS)
      }
    >
      <NotifStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('nav.notifications') }}
      />
    </NotifStack.Navigator>
  );
}

export function MainTabNavigator() {
  const { t, locale } = useTranslation();
  const { hasUnread } = useUnreadNotifications();
  return (
    <Tab.Navigator
      key={locale}
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: colors.background },
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 6,
          minHeight: 56,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'search';

          if (route.name === 'FindTab') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'MyTab') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'MapTab') {
            iconName = focused ? 'earth' : 'earth-outline';
          } else if (route.name === 'NotificationsTab') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          if (route.name === 'NotificationsTab') {
            return (
              <View style={styles.profileTabIconWrap}>
                <Ionicons name={iconName} size={size} color={color} />
                {hasUnread ? <View style={styles.profileTabUnreadDot} /> : null}
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="FindTab"
        component={FindNavigator}
        options={{ tabBarAccessibilityLabel: t('tabs.find') }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapNavigator}
        options={{ tabBarAccessibilityLabel: t('tabs.map') }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsNavigator}
        options={{ tabBarAccessibilityLabel: t('nav.notifications') }}
      />
      <Tab.Screen
        name="MyTab"
        component={MyNavigator}
        options={{ tabBarAccessibilityLabel: t('tabs.myMatches') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{ tabBarAccessibilityLabel: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  profileTabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTabUnreadDot: {
    marginTop: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  profileHeaderIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -4,
  },
});
