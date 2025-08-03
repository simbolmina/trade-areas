import { Place } from '@/types';

// Performance configuration
export const PERFORMANCE_CONFIG = {
  MAX_PLACES_TO_RENDER: process.env.NEXT_PUBLIC_MAX_PLACES_TO_RENDER
    ? parseInt(process.env.NEXT_PUBLIC_MAX_PLACES_TO_RENDER)
    : 1000,
  ENABLE_CLUSTERING: process.env.NEXT_PUBLIC_ENABLE_CLUSTERING !== 'false',
  CLUSTER_RADIUS: 50, // pixels
  MIN_ZOOM_FOR_INDIVIDUAL_PLACES: 10,
};

// Simple clustering algorithm for performance
export interface ClusterPoint {
  id: string;
  longitude: number;
  latitude: number;
  count: number;
  places: Place[];
  isCluster: boolean;
}

export const clusterPlaces = (
  places: Place[],
  zoom: number,
  centerLat: number,
  centerLng: number
): ClusterPoint[] => {
  // If zoom is high enough or clustering is disabled, show individual places
  if (
    zoom >= PERFORMANCE_CONFIG.MIN_ZOOM_FOR_INDIVIDUAL_PLACES ||
    !PERFORMANCE_CONFIG.ENABLE_CLUSTERING ||
    places.length <= PERFORMANCE_CONFIG.MAX_PLACES_TO_RENDER
  ) {
    // Limit places for performance but prioritize by distance
    const limitedPlaces = limitPlacesByDistance(
      places,
      centerLat,
      centerLng,
      PERFORMANCE_CONFIG.MAX_PLACES_TO_RENDER
    );

    return limitedPlaces.map((place) => ({
      id: place.id,
      longitude: place.longitude,
      latitude: place.latitude,
      count: 1,
      places: [place],
      isCluster: false,
    }));
  }

  // Simple grid-based clustering
  const clusters: { [key: string]: ClusterPoint } = {};
  const gridSize = 0.01; // degrees (roughly 1km)

  places.forEach((place) => {
    const gridX = Math.floor(place.longitude / gridSize);
    const gridY = Math.floor(place.latitude / gridSize);
    const key = `${gridX},${gridY}`;

    if (!clusters[key]) {
      clusters[key] = {
        id: `cluster_${key}`,
        longitude: place.longitude,
        latitude: place.latitude,
        count: 0,
        places: [],
        isCluster: true,
      };
    }

    clusters[key].places.push(place);
    clusters[key].count++;

    // Update cluster center to weighted average
    const totalPlaces = clusters[key].places.length;
    clusters[key].longitude =
      clusters[key].places.reduce((sum, p) => sum + p.longitude, 0) /
      totalPlaces;
    clusters[key].latitude =
      clusters[key].places.reduce((sum, p) => sum + p.latitude, 0) /
      totalPlaces;
  });

  return Object.values(clusters);
};

// Limit places by distance from center for better performance
export const limitPlacesByDistance = (
  places: Place[],
  centerLat: number,
  centerLng: number,
  maxPlaces: number
): Place[] => {
  if (places.length <= maxPlaces) {
    return places;
  }

  // Calculate distances and sort by proximity
  const placesWithDistance = places.map((place) => {
    const distance = calculateDistance(
      centerLat,
      centerLng,
      place.latitude,
      place.longitude
    );
    return { place, distance };
  });

  placesWithDistance.sort((a, b) => a.distance - b.distance);

  return placesWithDistance.slice(0, maxPlaces).map((item) => item.place);
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
