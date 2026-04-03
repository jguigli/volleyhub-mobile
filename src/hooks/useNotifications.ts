import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { colors } from '../theme/colors';
import { usersApi } from '../api/users.api';
import { useAuthStore } from '../store/auth.store';
import { navigateToMatchDetailFromNotification } from '../navigation/rootNavigation';
import { saveInviteNotification } from '../utils/inviteNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Notifications] Must use physical device for push notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'VolleyHub',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.primary,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function useNotifications() {
  const { user, updateUser } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    registerForPushNotifications().then((token) => {
      if (token && token !== user.fcmToken) {
        usersApi
          .updateMe({ fcmToken: token })
          .then((updated) => updateUser(updated))
          .catch(() => {});
      }
    });

    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notification received]', notification);
        const data = notification.request.content.data as {
          matchId?: string;
          type?: string;
        };
        if (data.type === 'event_invite' && data.matchId) {
          void saveInviteNotification({
            matchId: data.matchId,
            title: notification.request.content.title ?? 'Event invitation',
            body: notification.request.content.body ?? '',
          });
        }
      },
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          matchId?: string;
          type?: string;
        };
        console.log('[Notification tapped]', data);
        if (data.type === 'event_invite' && data.matchId) {
          void saveInviteNotification({
            matchId: data.matchId,
            title: response.notification.request.content.title ?? 'Event invitation',
            body: response.notification.request.content.body ?? '',
          });
        }
        if (data.matchId) {
          navigateToMatchDetailFromNotification(data.matchId);
        }
      });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [user, updateUser]);
}
