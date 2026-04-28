import { TARGET_STORES, PLACES_SEARCH_RADIUS_M } from '../constants/stores';

export interface NearbyStore {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
}

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';

export async function findNearbyTargetStores(
  latitude: number,
  longitude: number
): Promise<NearbyStore[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === 'your_google_places_api_key_here') {
    console.warn('[PlacesService] No API key configured. Store detection disabled.');
    return [];
  }

  try {
    const response = await fetch(PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
      },
      body: JSON.stringify({
        includedPrimaryTypes: ['supermarket', 'department_store'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: PLACES_SEARCH_RADIUS_M,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('[PlacesService] API error:', response.status, await response.text());
      return [];
    }

    const json = await response.json();
    const places: NearbyStore[] = (json.places ?? [])
      .filter((p: any) => {
        const name: string = p.displayName?.text?.toLowerCase() ?? '';
        return TARGET_STORES.some((store) => name.includes(store));
      })
      .map((p: any) => ({
        placeId: p.id,
        name: p.displayName?.text ?? 'Unknown Store',
        latitude: p.location?.latitude ?? 0,
        longitude: p.location?.longitude ?? 0,
      }));

    return places;
  } catch (err) {
    console.error('[PlacesService] Fetch error:', err);
    return [];
  }
}
