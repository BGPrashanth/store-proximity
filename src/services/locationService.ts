import * as Location from 'expo-location';
import { BACKGROUND_LOCATION_TASK } from '../constants/stores';

const LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 10,
  timeInterval: 10000,
};

export async function requestPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { foreground: false, background: false };
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  return {
    foreground: true,
    background: bg.status === 'granted',
  };
}

export async function startBackgroundTracking(): Promise<void> {
  const isRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isRegistered) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    ...LOCATION_OPTIONS,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Store Proximity Active',
      notificationBody: 'Monitoring your location for nearby stores.',
      notificationColor: '#4A90E2',
    },
  });
}

export async function stopBackgroundTracking(): Promise<void> {
  const isRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

export function startForegroundTracking(
  callback: (location: Location.LocationObject) => void
): () => void {
  let subscription: Location.LocationSubscription | null = null;

  Location.watchPositionAsync(LOCATION_OPTIONS, callback).then((sub) => {
    subscription = sub;
  });

  return () => {
    subscription?.remove();
  };
}
