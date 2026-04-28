import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AppState,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

import WelcomeModal from './components/WelcomeModal';
import { useAppState } from './hooks/useAppState';
import {
  requestPermissions,
  startBackgroundTracking,
  startForegroundTracking,
} from './services/locationService';
import {
  requestNotificationPermission,
  configureNotificationChannel,
} from './services/notificationService';
import { handleLocationUpdate } from './services/proximityService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PermissionState = 'pending' | 'foreground-only' | 'full' | 'denied';

function parseGeocode(geo: Location.LocationGeocodedAddress): {
  landmarkName: string | null;
  address: string;
} {
  const addressParts = [
    geo.streetNumber,
    geo.street,
    geo.district,
    geo.city,
    geo.region,
    geo.postalCode,
    geo.country,
  ].filter(Boolean);

  return {
    landmarkName: geo.name ?? null,
    address: addressParts.join(', '),
  };
}

export default function App() {
  const [permissionState, setPermissionState] = useState<PermissionState>('pending');
  const [welcomeStore, setWelcomeStore] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [landmarkName, setLandmarkName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const stopForegroundRef = useRef<(() => void) | null>(null);

  const onLocationUpdate = useCallback(async (loc: Location.LocationObject) => {
    setCurrentLocation(loc);
    handleLocationUpdate(loc);

    try {
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo) {
        const { landmarkName: name, address: addr } = parseGeocode(geo);
        setLandmarkName(name);
        setAddress(addr);
      }
    } catch {
      // Geocoder unavailable — silently skip
    }
  }, []);

  useEffect(() => {
    setup();
    return () => {
      stopForegroundRef.current?.();
    };
  }, []);

  async function setup() {
    await configureNotificationChannel();
    await requestNotificationPermission();

    const { foreground, background } = await requestPermissions();

    if (!foreground) {
      setPermissionState('denied');
      return;
    }

    if (background) {
      setPermissionState('full');
      await startBackgroundTracking();
    } else {
      setPermissionState('foreground-only');
    }

    const stop = startForegroundTracking(onLocationUpdate);
    stopForegroundRef.current = stop;
  }

  // Intercept incoming notifications while the app is in the foreground.
  // Dismiss the push banner and show the in-app modal instead.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      if (AppState.currentState === 'active') {
        Notifications.dismissNotificationAsync(notification.request.identifier);
        const storeName = notification.request.content.data?.storeName as string | undefined;
        if (storeName) {
          setWelcomeStore(storeName);
        }
      }
    });
    return () => sub.remove();
  }, []);

  useAppState((state) => {
    if (state !== 'active') {
      stopForegroundRef.current?.();
      stopForegroundRef.current = null;
    } else if (!stopForegroundRef.current) {
      const stop = startForegroundTracking(onLocationUpdate);
      stopForegroundRef.current = stop;
    }
  });

  if (permissionState === 'denied') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Location Required</Text>
        <Text style={styles.errorBody}>
          This app needs location access to detect nearby stores.{'\n'}
          Please enable it in your device Settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Store Proximity</Text>
      <Text style={styles.subtitle}>
        {permissionState === 'pending'
          ? 'Setting up…'
          : permissionState === 'foreground-only'
          ? 'Active (open app only)\nBackground alerts disabled — tap Allow in Settings to enable.'
          : 'Active — monitoring for nearby stores'}
      </Text>

      <View style={styles.storeList}>
        <Text style={styles.sectionLabel}>Watching for:</Text>
        {['Costco', 'Target', 'Walmart'].map((s) => (
          <Text key={s} style={styles.storeItem}>• {s}</Text>
        ))}
      </View>

      <View style={styles.locationCard}>
        <Text style={styles.sectionLabel}>Current Location</Text>
        {currentLocation ? (
          <>
            <Text style={styles.locationValue}>
              Lat: {currentLocation.coords.latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationValue}>
              Lng: {currentLocation.coords.longitude.toFixed(6)}
            </Text>
            <Text style={styles.locationAccuracy}>
              Accuracy: ±{currentLocation.coords.accuracy?.toFixed(1) ?? '?'} m
            </Text>
            {landmarkName || address ? (
              <View style={styles.geocodeBlock}>
                {landmarkName ? (
                  <Text style={styles.landmarkName}>{landmarkName}</Text>
                ) : null}
                {address ? (
                  <Text style={styles.address}>{address}</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.locationWaiting}>Resolving address…</Text>
            )}
          </>
        ) : (
          <Text style={styles.locationWaiting}>Waiting for GPS fix…</Text>
        )}
      </View>

      <WelcomeModal
        storeName={welcomeStore}
        onDismiss={() => setWelcomeStore(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  storeList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  storeItem: {
    fontSize: 18,
    color: '#1a1a1a',
    paddingVertical: 4,
  },
  locationValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontVariant: ['tabular-nums'],
    paddingVertical: 2,
  },
  locationAccuracy: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  geocodeBlock: {
    marginTop: 10,
  },
  landmarkName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  address: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  locationWaiting: {
    fontSize: 15,
    color: '#aaa',
    fontStyle: 'italic',
    marginTop: 4,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e53935',
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
});
