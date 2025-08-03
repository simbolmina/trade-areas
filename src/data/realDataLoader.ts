import { Place, TradeArea, HomeZipcodes, Zipcode } from '@/types';

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

interface RawTradeAreaData {
  pid: string;
  polygon: string | object;
  trade_area: number;
}

interface RawZipcodeData {
  id: string;
  polygon: string | object;
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
    state: competitor.region, // Note: using 'region' field as 'state'
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

// Dynamic loader for trade areas (since the file is too large)
export const loadTradeAreas = async (): Promise<TradeArea[]> => {
  try {
    const response = await fetch('/data/trade_areas.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();

    // Parse the polygon data (it's stored as stringified JSON)
    const parsedData = rawData.map((item: RawTradeAreaData) => ({
      pid: item.pid,
      polygon:
        typeof item.polygon === 'string'
          ? JSON.parse(item.polygon)
          : item.polygon,
      trade_area: item.trade_area,
    }));

    return parsedData as TradeArea[];
  } catch (error) {
    // Return empty array for now - we'll use mock data
    return [];
  }
};

// Dynamic loader for home zipcodes (since the file is too large)
export const loadHomeZipcodes = async (): Promise<HomeZipcodes[]> => {
  try {
    const response = await fetch('/data/home_zipcodes.json');
    if (!response.ok) {
      throw new Error('Failed to load home zipcodes');
    }
    const data = await response.json();
    return data as HomeZipcodes[];
  } catch (error) {
    return [];
  }
};

// Cache for large datasets
let tradeAreasCache: TradeArea[] | null = null;
let homeZipcodesCache: HomeZipcodes[] | null = null;
let zipcodesCache: Zipcode[] | null = null;

// Helper function to get trade areas for specific places (with caching)
export const getRealTradeAreasForPlaces = async (
  placeIds: string[],
  tradeAreaPercentages: number[]
): Promise<TradeArea[]> => {
  if (!tradeAreasCache) {
    tradeAreasCache = await loadTradeAreas();
  }

  const matchingTradeAreas = tradeAreasCache.filter(
    (ta) =>
      placeIds.includes(ta.pid) && tradeAreaPercentages.includes(ta.trade_area)
  );

  return matchingTradeAreas;
};

// Helper function to get home zipcodes for a specific place (with caching)
export const getRealHomeZipcodesForPlace = async (
  placeId: string
): Promise<HomeZipcodes | null> => {
  if (!homeZipcodesCache) {
    homeZipcodesCache = await loadHomeZipcodes();
  }

  // The actual data uses 'pid' field, not 'place_id'
  const result = homeZipcodesCache.find((hz) => hz.pid === placeId) || null;

  // Note: Data validation is handled in the Map component with user notifications

  return result;
};

// Load zipcode polygons data
const loadZipcodes = async (): Promise<Zipcode[]> => {
  try {
    const response = await fetch('/data/zipcodes.json');
    if (!response.ok) {
      throw new Error(`Failed to load zipcodes: ${response.status}`);
    }
    const data = await response.json();

    // Parse stringified polygon data (similar to trade areas)
    const parsedZipcodes = data.map((item: RawZipcodeData) => ({
      id: item.id,
      polygon:
        typeof item.polygon === 'string'
          ? JSON.parse(item.polygon)
          : item.polygon,
    }));

    return parsedZipcodes;
  } catch (error) {
    return [];
  }
};

// Helper function to get zipcode polygons (with caching)
export const getRealZipcodes = async (): Promise<Zipcode[]> => {
  if (!zipcodesCache) {
    zipcodesCache = await loadZipcodes();
  }
  return zipcodesCache;
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

// Helper function to validate if place actually has trade area data (cached check)
export const validateTradeAreaAvailability = async (
  placeId: string
): Promise<boolean> => {
  if (!tradeAreasCache) {
    tradeAreasCache = await loadTradeAreas();
  }
  return tradeAreasCache.some((ta) => ta.pid === placeId);
};

// Helper function to validate if place actually has home zipcode data (cached check)
export const validateHomeZipcodesAvailability = async (
  placeId: string
): Promise<boolean> => {
  if (!homeZipcodesCache) {
    homeZipcodesCache = await loadHomeZipcodes();
  }
  return homeZipcodesCache.some((hz) => hz.pid === placeId);
};
