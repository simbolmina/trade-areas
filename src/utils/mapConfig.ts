// Map configuration constants
export const MAP_CONFIG = {
  // You'll need to add your Mapbox access token here
  MAPBOX_ACCESS_TOKEN:
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.your_token_here',

  // Default map settings
  DEFAULT_VIEW_STATE: {
    longitude: -74.006,
    latitude: 40.7128,
    zoom: 12,
    pitch: 0,
    bearing: 0,
  },

  // Color schemes
  TRADE_AREA_COLORS: {
    30: [255, 0, 0, 80], // Red with low opacity
    50: [255, 165, 0, 120], // Orange with medium opacity
    70: [255, 255, 0, 160], // Yellow with high opacity
  },

  // Home zipcodes color scheme (5 percentile groups)
  HOME_ZIPCODES_COLORS: [
    [255, 255, 178, 180], // 0-20%: Light yellow
    [254, 204, 92, 180], // 20-40%: Light orange
    [253, 141, 60, 180], // 40-60%: Orange
    [240, 59, 32, 180], // 60-80%: Red-orange
    [189, 0, 38, 180], // 80-100%: Dark red
  ],

  // Place marker colors
  PLACE_COLORS: {
    myPlace: [0, 100, 200, 255], // Blue for "My Place"
    other: [100, 100, 100, 255], // Gray for other places
    selected: [255, 0, 0, 255], // Red for selected place
  },
};

// Helper function to get color for home zipcode based on percentile
export const getHomeZipcodeColor = (percentile: number): number[] => {
  if (percentile <= 20) return MAP_CONFIG.HOME_ZIPCODES_COLORS[0];
  if (percentile <= 40) return MAP_CONFIG.HOME_ZIPCODES_COLORS[1];
  if (percentile <= 60) return MAP_CONFIG.HOME_ZIPCODES_COLORS[2];
  if (percentile <= 80) return MAP_CONFIG.HOME_ZIPCODES_COLORS[3];
  return MAP_CONFIG.HOME_ZIPCODES_COLORS[4];
};

// Helper function to calculate distance between two points
export const calculateDistance = (
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
