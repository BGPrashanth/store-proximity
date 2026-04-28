import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'store-proximity';

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function configureNotificationChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Store Proximity Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

export async function scheduleProximityNotification(storeName: string): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Welcome to ${storeName}!`,
      body: `You're near a ${storeName}. Tap to open the app.`,
      data: { storeName },
    },
    trigger: null,
  });
}
