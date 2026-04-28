import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { PROXIMITY_THRESHOLD_M, COOLDOWN_MS } from '../constants/stores';
import { findNearbyTargetStores } from './placesService';
import { scheduleProximityNotification } from './notificationService';

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function isCoolingDown(placeId: string): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(`cooldown_${placeId}`);
  if (!raw) return false;
  return Date.now() - new Date(raw).getTime() < COOLDOWN_MS;
}

async function recordTrigger(placeId: string): Promise<void> {
  await SecureStore.setItemAsync(`cooldown_${placeId}`, new Date().toISOString());
}

export async function handleLocationUpdate(location: Location.LocationObject): Promise<void> {
  const { latitude, longitude } = location.coords;

  const stores = await findNearbyTargetStores(latitude, longitude);
  if (stores.length === 0) return;

  for (const store of stores) {
    const distance = haversineDistance(latitude, longitude, store.latitude, store.longitude);
    if (distance > PROXIMITY_THRESHOLD_M) continue;

    const cooling = await isCoolingDown(store.placeId);
    if (cooling) continue;

    await recordTrigger(store.placeId);
    await scheduleProximityNotification(store.name);
  }
}
