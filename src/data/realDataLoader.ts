import { Place, TradeArea, HomeZipcodes, Zipcode } from '@/types';
import {
  tradeAreasCache,
  homeZipcodesCache,
  zipcodesCache,
} from '@/utils/cache';

// Import the real data files
import myPlaceData from './my_place.json';
import competitorsData from './competitors.json';
// Note: trade_areas.json and home_zipcodes.json are too large to import directly
// We'll load them dynamically when needed

// TypeScript interfaces for raw data structures
interface RawCompetitorData {
  pid: string;
  name: string;
  street_address: string;
  city: string;
  region: string;
  logo: string | null;
  longitude: number;
  latitude: number;
  sub_category: string;
  trade_area_activity: boolean;
  home_locations_activity: boolean;
}

interface ZipcodePolygonData {
  zipcode: string;
  polygon: object;
  percentage: number;
}

// Convert the my_place data to our Place interface
export const realMyPlace: Place = {
  id: myPlaceData.id,
  name: myPlaceData.name,
  street_address: myPlaceData.street_address,
  city: myPlaceData.city,
  state: myPlaceData.state,
  logo: myPlaceData.logo,
  longitude: myPlaceData.longitude,
  latitude: myPlaceData.latitude,
  industry: myPlaceData.industry,
  isTradeAreaAvailable: myPlaceData.isTradeAreaAvailable,
  isHomeZipcodesAvailable: myPlaceData.isHomeZipcodesAvailable,
};

// Convert competitors data to our Place interface
export const realCompetitors: Place[] = competitorsData.map(
  (competitor: RawCompetitorData) => ({
    id: competitor.pid,
    name: competitor.name,
    street_address: competitor.street_address,
    city: competitor.city,
    state: competitor.region,
    logo: competitor.logo,
    longitude: competitor.longitude,
    latitude: competitor.latitude,
    industry: competitor.sub_category,
    isTradeAreaAvailable: competitor.trade_area_activity,
    isHomeZipcodesAvailable: competitor.home_locations_activity,
  })
);

// Combine my place with competitors
export const realPlaces: Place[] = [realMyPlace, ...realCompetitors];

// Helper function to get available industries from real data
export const getRealAvailableIndustries = (): string[] => {
  const industries = new Set(realPlaces.map((place) => place.industry));
  return Array.from(industries).sort();
};

// Helper function to filter real places by radius and industry
export const getFilteredRealPlaces = (
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
  industries: string[]
): Place[] => {
  return realPlaces.filter((place) => {
    // Always include My Place (the center place) regardless of filters
    if (place.id === realMyPlace.id) {
      return true;
    }

    // Calculate distance using Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = ((place.latitude - centerLat) * Math.PI) / 180;
    const dLng = ((place.longitude - centerLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((centerLat * Math.PI) / 180) *
        Math.cos((place.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const withinRadius = distance <= radiusMiles;
    const matchesIndustry =
      industries.length === 0 || industries.includes(place.industry);

    return withinRadius && matchesIndustry;
  });
};

// Dynamic loader for trade areas from MongoDB
export const loadTradeAreas = async (): Promise<TradeArea[]> => {
  try {
    const response = await fetch('/api/trade-areas');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as TradeArea[];
  } catch (error) {
    console.warn('⚠️ Failed to load trade areas from MongoDB:', error);
    return [];
  }
};

// Dynamic loader for home zipcodes from MongoDB
export const loadHomeZipcodes = async (): Promise<HomeZipcodes[]> => {
  try {
    const response = await fetch('/api/home-zipcodes');
    if (!response.ok) {
      throw new Error('Failed to load home zipcodes');
    }
    const data = await response.json();
    return data as HomeZipcodes[];
  } catch (error) {
    return [];
  }
};

// Note: Caching is now handled by MongoDB queries with indexes

// Helper function to get trade areas for specific places (with caching)
export const getRealTradeAreasForPlaces = async (
  placeIds: string[],
  tradeAreaPercentages: number[]
): Promise<TradeArea[]> => {
  try {
    const cacheKey = `trade-areas-${placeIds
      .sort()
      .join(',')}-${tradeAreaPercentages.sort().join(',')}`;

    // Check cache first
    const cached = tradeAreasCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams();
    if (placeIds.length > 0) {
      params.append('placeIds', placeIds.join(','));
    }
    if (tradeAreaPercentages.length > 0) {
      params.append('tradeAreaPercentages', tradeAreaPercentages.join(','));
    }

    const response = await fetch(`/api/trade-areas?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the result
    tradeAreasCache.set(cacheKey, data);

    return data as TradeArea[];
  } catch (error) {
    console.warn('⚠️ Failed to load trade areas for specific places:', error);
    return [];
  }
};

// Helper function to get home zipcodes for a specific place
export const getRealHomeZipcodesForPlace = async (
  placeId: string
): Promise<HomeZipcodes | null> => {
  try {
    const cacheKey = `home-zipcodes-${placeId}`;

    // Check cache first
    const cached = homeZipcodesCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(`/api/home-zipcodes?placeId=${placeId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.length > 0 ? data[0] : null;

    // Cache the result
    homeZipcodesCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.warn('⚠️ Failed to load home zipcodes for place:', error);
    return null;
  }
};

// Load zipcode polygons data from MongoDB
const loadZipcodes = async (): Promise<Zipcode[]> => {
  try {
    const response = await fetch('/api/zipcodes');
    if (!response.ok) {
      throw new Error(`Failed to load zipcodes: ${response.status}`);
    }
    const data = await response.json();
    return data as Zipcode[];
  } catch (error) {
    return [];
  }
};

// Helper function to get zipcode polygons
export const getRealZipcodes = async (): Promise<Zipcode[]> => {
  const cacheKey = 'all_zipcodes';
  const cached = zipcodesCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const zipcodes = await loadZipcodes();
  zipcodesCache.set(cacheKey, zipcodes);
  return zipcodes;
};

// Helper function to get specific zipcode by ID
export const getRealZipcodeById = async (
  zipcodeId: string
): Promise<Zipcode | null> => {
  const zipcodes = await getRealZipcodes();
  return zipcodes.find((zc) => zc.id === zipcodeId) || null;
};

// Helper function to get zipcode polygons for home zipcodes visualization
export const getRealHomeZipcodesPolygons = async (
  homeZipcodes: HomeZipcodes
): Promise<ZipcodePolygonData[]> => {
  const allZipcodes = await getRealZipcodes();
  const result: ZipcodePolygonData[] = [];

  for (const location of homeZipcodes.locations) {
    for (const [zipcodeId, percentage] of Object.entries(location)) {
      const zipcodeData = allZipcodes.find((zc) => zc.id === zipcodeId);
      if (zipcodeData) {
        result.push({
          zipcode: zipcodeId,
          polygon: zipcodeData.polygon,
          percentage:
            typeof percentage === 'string'
              ? parseFloat(percentage)
              : percentage,
        });
      }
    }
  }

  return result;
};

// Helper function to validate if place actually has trade area data
export const validateTradeAreaAvailability = async (
  placeId: string
): Promise<boolean> => {
  try {
    const response = await fetch(`/api/trade-areas?placeIds=${placeId}`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.length > 0;
  } catch (error) {
    console.warn('⚠️ Failed to validate trade area availability:', error);
    return false;
  }
};

// Helper function to validate if place actually has home zipcode data
export const validateHomeZipcodesAvailability = async (
  placeId: string
): Promise<boolean> => {
  try {
    const response = await fetch(`/api/home-zipcodes?placeId=${placeId}`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.length > 0;
  } catch (error) {
    console.warn('⚠️ Failed to validate home zipcodes availability:', error);
    return false;
  }
};
