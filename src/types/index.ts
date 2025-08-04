export type Place = {
  id: string;
  name: string;
  street_address: string;
  city: string;
  state: string;
  logo: string | null;
  longitude: number;
  latitude: number;
  industry: string;
  isTradeAreaAvailable: boolean;
  isHomeZipcodesAvailable: boolean;
};

export type Polygon = {
  type: string;
  coordinates: number[][][];
};

export type TradeArea = {
  pid: string;
  polygon: Polygon;
  trade_area: number; // 30, 50, or 70
};

export type Location = {
  [id: string]: number; // id is zipcode, value is percentage
};

export type Zipcode = {
  id: string;
  polygon: Polygon;
};

export type HomeZipcodes = {
  pid: string; // Changed from place_id to match actual data structure
  locations: Location[]; // zipcode percentile data
};

export type FilterState = {
  radius: number;
  industries: string[];
  showPlaces: boolean;
  showCustomerData: boolean;
  dataType: 'tradeArea' | 'homeZipcodes';
  selectedTradeAreas: number[]; // [30, 50, 70]
  selectedPlaceId: string | null;
};

export type MapState = {
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  selectedPlace: Place | null;
  visibleTradeAreas: TradeArea[];
  visibleHomeZipcodes: HomeZipcodes | null;
};
