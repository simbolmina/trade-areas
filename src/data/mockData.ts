import { Place, TradeArea, HomeZipcodes, Location } from '@/types';

// Mock "My Place" - the central reference point
export const myPlace: Place = {
  id: 'my-place-001',
  name: 'My Business Location',
  street_address: '123 Main Street',
  city: 'New York',
  state: 'NY',
  logo: null,
  longitude: -74.006,
  latitude: 40.7128,
  industry: 'Technology',
  isTradeAreaAvailable: true,
  isHomeZipcodesAvailable: true,
};

// Mock places data
export const mockPlaces: Place[] = [
  myPlace,
  {
    id: 'place-002',
    name: 'Downtown Cafe',
    street_address: '456 Broadway',
    city: 'New York',
    state: 'NY',
    logo: null,
    longitude: -74.01,
    latitude: 40.715,
    industry: 'Restaurant',
    isTradeAreaAvailable: true,
    isHomeZipcodesAvailable: false,
  },
  {
    id: 'place-003',
    name: 'Tech Store',
    street_address: '789 5th Avenue',
    city: 'New York',
    state: 'NY',
    logo: null,
    longitude: -73.998,
    latitude: 40.72,
    industry: 'Retail',
    isTradeAreaAvailable: false,
    isHomeZipcodesAvailable: true,
  },
  {
    id: 'place-004',
    name: 'Fitness Center',
    street_address: '321 Park Avenue',
    city: 'New York',
    state: 'NY',
    logo: null,
    longitude: -74.015,
    latitude: 40.708,
    industry: 'Healthcare',
    isTradeAreaAvailable: true,
    isHomeZipcodesAvailable: true,
  },
  {
    id: 'place-005',
    name: 'Art Gallery',
    street_address: '654 West Street',
    city: 'New York',
    state: 'NY',
    logo: null,
    longitude: -73.99,
    latitude: 40.725,
    industry: 'Entertainment',
    isTradeAreaAvailable: false,
    isHomeZipcodesAvailable: false,
  },
];

// Mock trade areas data
export const mockTradeAreas: TradeArea[] = [
  {
    pid: 'my-place-001',
    trade_area: 30,
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [-74.02, 40.705],
          [-73.992, 40.705],
          [-73.992, 40.72],
          [-74.02, 40.72],
          [-74.02, 40.705],
        ],
      ],
    },
  },
  {
    pid: 'my-place-001',
    trade_area: 50,
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [-74.025, 40.7],
          [-73.987, 40.7],
          [-73.987, 40.725],
          [-74.025, 40.725],
          [-74.025, 40.7],
        ],
      ],
    },
  },
  {
    pid: 'my-place-001',
    trade_area: 70,
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [-74.03, 40.695],
          [-73.982, 40.695],
          [-73.982, 40.73],
          [-74.03, 40.73],
          [-74.03, 40.695],
        ],
      ],
    },
  },
  {
    pid: 'place-002',
    trade_area: 30,
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [-74.025, 40.708],
          [-73.995, 40.708],
          [-73.995, 40.722],
          [-74.025, 40.722],
          [-74.025, 40.708],
        ],
      ],
    },
  },
];

// Mock home zipcodes data
export const mockHomeZipcodes: HomeZipcodes[] = [
  {
    pid: 'my-place-001',
    locations: [
      {
        zipcode: '10001',
        latitude: 40.7505,
        longitude: -73.9934,
        percentile: 85,
      },
      {
        zipcode: '10002',
        latitude: 40.7157,
        longitude: -73.986,
        percentile: 72,
      },
      {
        zipcode: '10003',
        latitude: 40.7316,
        longitude: -73.9888,
        percentile: 91,
      },
      {
        zipcode: '10004',
        latitude: 40.7047,
        longitude: -74.0134,
        percentile: 45,
      },
      {
        zipcode: '10005',
        latitude: 40.7062,
        longitude: -74.0087,
        percentile: 38,
      },
      {
        zipcode: '10006',
        latitude: 40.7093,
        longitude: -74.0146,
        percentile: 56,
      },
      {
        zipcode: '10007',
        latitude: 40.7133,
        longitude: -74.007,
        percentile: 23,
      },
      {
        zipcode: '10009',
        latitude: 40.7268,
        longitude: -73.9786,
        percentile: 67,
      },
      {
        zipcode: '10010',
        latitude: 40.7391,
        longitude: -73.9826,
        percentile: 78,
      },
      {
        zipcode: '10011',
        latitude: 40.742,
        longitude: -74.0012,
        percentile: 82,
      },
    ],
  },
  {
    pid: 'place-003',
    locations: [
      {
        zipcode: '10001',
        latitude: 40.7505,
        longitude: -73.9934,
        percentile: 65,
      },
      {
        zipcode: '10002',
        latitude: 40.7157,
        longitude: -73.986,
        percentile: 42,
      },
      {
        zipcode: '10003',
        latitude: 40.7316,
        longitude: -73.9888,
        percentile: 78,
      },
      {
        zipcode: '10010',
        latitude: 40.7391,
        longitude: -73.9826,
        percentile: 88,
      },
      {
        zipcode: '10011',
        latitude: 40.742,
        longitude: -74.0012,
        percentile: 55,
      },
    ],
  },
];

// Helper function to get all available industries
export const getAvailableIndustries = (): string[] => {
  const industries = new Set(mockPlaces.map((place) => place.industry));
  return Array.from(industries).sort();
};

// Helper function to filter places by radius and industry
export const getFilteredPlaces = (
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
  industries: string[]
): Place[] => {
  return mockPlaces.filter((place) => {
    // Calculate distance using simple Pythagorean theorem (approximation for small distances)
    const latDiff = place.latitude - centerLat;
    const lngDiff = place.longitude - centerLng;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // Convert to miles

    const withinRadius = distance <= radiusMiles;
    const matchesIndustry =
      industries.length === 0 || industries.includes(place.industry);

    return withinRadius && matchesIndustry;
  });
};

// Helper function to get trade areas for specific places
export const getTradeAreasForPlaces = (
  placeIds: string[],
  tradeAreaPercentages: number[]
): TradeArea[] => {
  return mockTradeAreas.filter(
    (ta) =>
      placeIds.includes(ta.pid) && tradeAreaPercentages.includes(ta.trade_area)
  );
};

// Helper function to get home zipcodes for a specific place
export const getHomeZipcodesForPlace = (
  placeId: string
): HomeZipcodes | null => {
  return mockHomeZipcodes.find((hz) => hz.pid === placeId) || null;
};
