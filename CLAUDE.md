# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start              # dev server (Expo Go)
npx expo run:android        # build and run on Android device/emulator
npx tsc --noEmit            # type-check without emitting (no test framework configured)
```

Background location does not work reliably in the Android emulator — test on a physical device.

## Architecture

**Entry point is `index.ts`, not `src/App.tsx`.** `TaskManager.defineTask` must be called at the top level of this file before `registerRootComponent`. Moving it into a component or `useEffect` silently breaks background detection — this is an Expo hard requirement.

**Two tracking modes share one handler.** Both the background task (`index.ts`) and the foreground subscription (`src/App.tsx`) call `handleLocationUpdate()` from `src/services/proximityService.ts`. The foreground callback (`onLocationUpdate` in `App.tsx`) wraps it to also update UI state and trigger reverse geocoding — the background task calls `handleLocationUpdate` directly since it has no UI context.

**Notification intercept pattern.** `proximityService` always schedules a local push notification. `App.tsx` adds a `Notifications.addNotificationReceivedListener` — when `AppState === 'active'`, it dismisses the notification and shows `WelcomeModal` instead. This avoids the cross-context `AppState` problem (background tasks run in a headless JS worker and cannot read React state).

## Key Constraints

- `distanceFilter: 10` on the location subscription prevents flooding Google Places API. Do not remove.
- Places API (New) uses **POST** to `https://places.googleapis.com/v1/places:searchNearby`. The legacy GET `nearbysearch` endpoint is deprecated.
- Query radius is **100m**; client-side Haversine filter is **15m**. Do not reduce the query radius to 15m — GPS drift requires the wider net.
- Android 14+ requires `FOREGROUND_SERVICE_LOCATION` permission (not just `FOREGROUND_SERVICE`). Both are declared in `app.json`.
- Use `expo-secure-store` for all persistence. Do not use `AsyncStorage`.
- `EXPO_PUBLIC_` prefix is required for env vars to be accessible in app source code.

## Environment Variables

Add to `.env` (never commit):
```
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_key_here
```
App degrades gracefully (returns empty store list) when key is missing or set to the placeholder value.

## Reverse Geocoding

`Location.reverseGeocodeAsync()` is called in `App.tsx`'s `onLocationUpdate` after each GPS fix to resolve the landmark/address displayed on screen. It uses the device's built-in geocoder — no API key required. The emulator defaults to Apple HQ in Cupertino; test on a physical device for a real address.

## Cooldown Storage

SecureStore key pattern: `cooldown_<placeId>` → ISO 8601 timestamp of last trigger. Duration: 5 min (`COOLDOWN_MS` in `src/constants/stores.ts`).

## File Responsibilities

| File | Responsibility |
|---|---|
| `index.ts` | Entry point; background task definition (top-level, Expo requirement) |
| `src/App.tsx` | Permission flow, `onLocationUpdate` callback (sets UI state + reverse geocode + proximity check), notification intercept, modal state |
| `src/services/proximityService.ts` | Haversine distance, cooldown check/record, `handleLocationUpdate` shared handler |
| `src/services/placesService.ts` | Google Places API (New) POST + client-side store name filter |
| `src/services/locationService.ts` | `expo-location` wrappers: foreground watch, background task start/stop |
| `src/services/notificationService.ts` | Android notification channel setup, push notification scheduling |
| `src/components/WelcomeModal.tsx` | In-app welcome modal shown when app is foregrounded near a store |
| `src/hooks/useAppState.ts` | Thin `AppState` change listener; restarts/stops foreground tracking on app state transitions |
| `src/constants/stores.ts` | `BACKGROUND_LOCATION_TASK` name, `TARGET_STORES` list, proximity/search radii, cooldown duration |
