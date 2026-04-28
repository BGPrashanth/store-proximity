import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

import App from './src/App';
import { BACKGROUND_LOCATION_TASK } from './src/constants/stores';
import { handleLocationUpdate } from './src/services/proximityService';

// Must be top-level in the entry file — Expo requirement for background tasks.
// Do NOT move this inside a component or useEffect.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BGTask] Location task error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    for (const loc of locations) {
      await handleLocationUpdate(loc);
    }
  }
});

registerRootComponent(App);
