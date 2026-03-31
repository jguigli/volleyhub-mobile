import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/** Ouvre le profil public (y compris le tien, même rendu qu’un autre utilisateur). */
export function navigateToUserProfile(
  navigation: NavigationProp<ParamListBase>,
  userId: string,
  _currentUserId: string | undefined,
): void {
  const nav = navigation as NavigationProp<ParamListBase> & {
    navigate: (name: string, params?: object) => void;
  };
  nav.navigate('UserProfile', { userId });
}
