'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PolygonLayer } from '@deck.gl/layers';
import { MapView } from '@deck.gl/core';
import { Map as ReactMapGL } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapState, FilterState, Place, TradeArea, HomeZipcodes } from '@/types';
import { MAP_CONFIG } from '@/utils/mapConfig';
import { clusterPlaces, ClusterPoint } from '@/utils/performanceOptimizations';
import {
  calculatePercentileGroups,
  getLocationColor,
} from '@/utils/percentileCalculations';
import MapTooltip from './MapTooltip';
import {
  realMyPlace,
  getFilteredRealPlaces,
  getRealTradeAreasForPlaces,
  getRealHomeZipcodesForPlace,
  getRealHomeZipcodesPolygons,
  validateTradeAreaAvailability,
  validateHomeZipcodesAvailability,
} from '@/data/realDataLoader';
import { useNotifications } from './NotificationSystem';

interface MapProps {
  mapState: MapState;
  filterState: FilterState;
  onMapStateChange: (updates: Partial<MapState>) => void;
  onFilterChange: (updates: Partial<FilterState>) => void;
}

export default function Map({
  mapState,
  filterState,
  onMapStateChange,
  onFilterChange,
}: MapProps) {
  const { showNotification } = useNotifications();
  const [hoveredPlace, setHoveredPlace] = useState<{
    place: Place;
    x: number;
    y: number;
  } | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const showTooltip = useCallback(
    (place: Place, x: number, y: number) => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        setTooltipTimeout(null);
      }

      setHoveredPlace({ place, x, y });
    },
    [tooltipTimeout]
  );

  const hideTooltipWithDelay = useCallback(() => {
    const timeout = setTimeout(() => {
      setHoveredPlace(null);
      setTooltipTimeout(null);
    }, 150);

    setTooltipTimeout(timeout);
  }, []);

  const keepTooltipVisible = useCallback(() => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
  }, [tooltipTimeout]);

  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);

  const hasMapboxToken =
    MAP_CONFIG.MAPBOX_ACCESS_TOKEN &&
    MAP_CONFIG.MAPBOX_ACCESS_TOKEN !== 'pk.your_token_here';

  const filteredPlaces = useMemo(() => {
    if (!filterState.showPlaces) return [];

    const centerPlace = realMyPlace;

    return getFilteredRealPlaces(
      centerPlace.latitude,
      centerPlace.longitude,
      filterState.radius,
      filterState.industries
    );
  }, [filterState.showPlaces, filterState.radius, filterState.industries]);

  const clusteredPlaces = useMemo(() => {
    if (!filterState.showPlaces || filteredPlaces.length === 0) return [];

    const centerPlace = realMyPlace;

    return clusterPlaces(
      filteredPlaces,
      mapState.viewState.zoom,
      centerPlace.latitude,
      centerPlace.longitude
    );
  }, [filteredPlaces, mapState.viewState.zoom, filterState.showPlaces]);

  const [visibleTradeAreas, setVisibleTradeAreas] = useState<TradeArea[]>([]);
  const [allLoadedTradeAreas, setAllLoadedTradeAreas] = useState<TradeArea[]>(
    []
  );
  const [visibleHomeZipcodes, setVisibleHomeZipcodes] =
    useState<HomeZipcodes | null>(null);
  const [visibleHomeZipcodesPolygons, setVisibleHomeZipcodesPolygons] =
    useState<{ zipcode: string; polygon: object; percentage: number }[]>([]);

  const [validatedAvailability, setValidatedAvailability] = useState<{
    [placeId: string]: {
      tradeArea?: boolean;
      homeZipcodes?: boolean;
    };
  }>({});

  // Loading states for buttons
  const [loadingStates, setLoadingStates] = useState<{
    [placeId: string]: {
      tradeArea: boolean;
      homeZipcodes: boolean;
    };
  }>({});

  // Loading state for zipcode polygons
  const [isLoadingZipcodePolygons, setIsLoadingZipcodePolygons] =
    useState(false);

  useEffect(() => {
    if (filteredPlaces.length === 0) {
      setValidatedAvailability({});
      return;
    }

    const validateAvailability = async () => {
      const validationResults: {
        [placeId: string]: {
          tradeArea?: boolean;
          homeZipcodes?: boolean;
        };
      } = {};

      // Only validate places that are actually visible (first 5 to reduce API calls)
      const placesToValidate = filteredPlaces.slice(0, 5);

      for (const place of placesToValidate) {
        // Use the flags from the place data first, only validate if needed
        validationResults[place.id] = {
          tradeArea: place.isTradeAreaAvailable,
          homeZipcodes: place.isHomeZipcodesAvailable,
        };
      }

      setValidatedAvailability(validationResults);
    };

    validateAvailability();
  }, [filteredPlaces]);

  useEffect(() => {
    if (filterState.dataType === 'homeZipcodes') {
      if (visibleTradeAreas.length > 0) {
        setVisibleTradeAreas([]);
      }

      if (!visibleHomeZipcodes) {
        const myPlaceId = realMyPlace.id;
        const myPlaceData = realMyPlace;

        if (myPlaceData.isHomeZipcodesAvailable) {
          const showMyPlaceHomeZipcodes = async () => {
            try {
              const homeZipcodes = await getRealHomeZipcodesForPlace(myPlaceId);

              if (homeZipcodes) {
                setVisibleHomeZipcodes(homeZipcodes);
                onMapStateChange({
                  visibleHomeZipcodes: homeZipcodes,
                });
              }
            } catch {
              showNotification(
                'Error auto-loading "My Place" home zipcodes',
                'error'
              );
            }
          };

          showMyPlaceHomeZipcodes();
        }
      }
    } else if (filterState.dataType === 'tradeArea') {
      if (visibleHomeZipcodes) {
        setVisibleHomeZipcodes(null);
        setVisibleHomeZipcodesPolygons([]);
        onMapStateChange({ visibleHomeZipcodes: null });
      }
    }
  }, [
    filterState.dataType,
    visibleTradeAreas.length,
    visibleHomeZipcodes,
    onMapStateChange,
    showNotification,
  ]);

  useEffect(() => {
    const loadHomeZipcodes = async () => {
      if (!visibleHomeZipcodes) {
        setVisibleHomeZipcodesPolygons([]);
        return;
      }

      setIsLoadingZipcodePolygons(true);
      try {
        const polygons = await getRealHomeZipcodesPolygons(visibleHomeZipcodes);
        setVisibleHomeZipcodesPolygons(polygons);
      } catch {
        showNotification('Error loading zipcode polygons', 'error');
        setVisibleHomeZipcodesPolygons([]);
      } finally {
        setIsLoadingZipcodePolygons(false);
      }
    };

    loadHomeZipcodes();
  }, [visibleHomeZipcodes, showNotification]);

  useEffect(() => {
    // Filter visible trade areas based on selected trade area percentages
    if (allLoadedTradeAreas.length > 0) {
      const filtered = allLoadedTradeAreas.filter((tradeArea) =>
        filterState.selectedTradeAreas.includes(tradeArea.trade_area)
      );
      setVisibleTradeAreas(filtered);
    } else {
      setVisibleTradeAreas([]);
    }
  }, [filterState.selectedTradeAreas, allLoadedTradeAreas]);

  const placesLayer = useMemo(() => {
    if (!filterState.showPlaces || clusteredPlaces.length === 0) return null;

    return new ScatterplotLayer({
      id: 'places-layer',
      data: clusteredPlaces,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      lineWidthMinPixels: 2,
      getPosition: (cluster: ClusterPoint) => [
        cluster.longitude,
        cluster.latitude,
      ],
      getRadius: (cluster: ClusterPoint) => {
        if (cluster.isCluster) {
          return Math.min(8 + Math.log(cluster.count) * 4, 25);
        }

        const centerPlace = realMyPlace;
        return cluster.places[0]?.id === centerPlace.id ? 15 : 10;
      },
      getFillColor: (cluster: ClusterPoint) => {
        if (cluster.isCluster) {
          const intensity = Math.min(cluster.count / 10, 1);
          return [255, 165 - intensity * 100, 0, 200] as [
            number,
            number,
            number,
            number
          ];
        }

        const centerPlace = realMyPlace;
        return cluster.places[0]?.id === centerPlace.id
          ? (MAP_CONFIG.PLACE_COLORS.myPlace as [
              number,
              number,
              number,
              number
            ])
          : (MAP_CONFIG.PLACE_COLORS.other as [number, number, number, number]);
      },
      getLineColor: [255, 255, 255, 255],
      onHover: (info: any) => {
        if (info.object && info.x !== undefined && info.y !== undefined) {
          const cluster = info.object as ClusterPoint;
          if (!cluster.isCluster && cluster.places[0]) {
            showTooltip(cluster.places[0], info.x, info.y);
          } else {
            hideTooltipWithDelay();
          }
        } else {
          hideTooltipWithDelay();
        }
      },
      onClick: (info: any) => {
        const cluster = info.object as ClusterPoint;
        if (cluster && !cluster.isCluster && cluster.places[0]) {
          onMapStateChange({ selectedPlace: cluster.places[0] });
        }
      },
    });
  }, [
    clusteredPlaces,
    filterState.showPlaces,
    onMapStateChange,
    showTooltip,
    hideTooltipWithDelay,
  ]);

  const tradeAreasLayer = useMemo(() => {
    if (
      visibleTradeAreas.length === 0 ||
      !filterState.showCustomerData ||
      filterState.dataType !== 'tradeArea'
    )
      return null;

    try {
      const validTradeAreas = visibleTradeAreas.filter((tradeArea) => {
        if (
          !tradeArea.polygon ||
          !tradeArea.polygon.coordinates ||
          !tradeArea.polygon.coordinates[0]
        ) {
          return false;
        }
        return true;
      });

      if (validTradeAreas.length === 0) {
        return null;
      }

      return new PolygonLayer({
        id: 'trade-areas-layer',
        data: validTradeAreas,
        pickable: false,
        stroked: true,
        filled: true,
        wireframe: false,
        lineWidthMinPixels: 1,
        getPolygon: (tradeArea: TradeArea) => tradeArea.polygon.coordinates[0],
        getFillColor: (tradeArea: TradeArea) => {
          const color = MAP_CONFIG.TRADE_AREA_COLORS[
            tradeArea.trade_area as keyof typeof MAP_CONFIG.TRADE_AREA_COLORS
          ] as [number, number, number, number];
          return [color[0], color[1], color[2], 120]; // More transparent
        },
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 1,
      });
    } catch {
      return null;
    }
  }, [visibleTradeAreas, filterState.showCustomerData, filterState.dataType]);

  const homeZipcodesLayer = useMemo(() => {
    if (
      !visibleHomeZipcodesPolygons.length ||
      !filterState.showCustomerData ||
      filterState.dataType !== 'homeZipcodes'
    )
      return null;

    try {
      const percentages = visibleHomeZipcodesPolygons.map(
        (zc) => zc.percentage
      );
      const percentileGroups = calculatePercentileGroups(
        percentages.map((p) => ({ percentage: p }))
      );

      return new PolygonLayer({
        id: 'home-zipcodes-layer',
        data: visibleHomeZipcodesPolygons,
        pickable: false,
        stroked: true,
        filled: true,
        wireframe: false,
        lineWidthMinPixels: 1,
        getPolygon: (zipcode: any) => {
          if (
            !zipcode.polygon ||
            !zipcode.polygon.coordinates ||
            !zipcode.polygon.coordinates[0]
          ) {
            return [];
          }
          return zipcode.polygon.coordinates[0];
        },
        getFillColor: (zipcode: any) => {
          const color = getLocationColor(zipcode.percentage, percentileGroups);
          return [color[0], color[1], color[2], 100]; // More transparent
        },
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 1,
      });
    } catch {
      return null;
    }
  }, [
    visibleHomeZipcodesPolygons,
    filterState.showCustomerData,
    filterState.dataType,
  ]);

  const layers = [tradeAreasLayer, homeZipcodesLayer, placesLayer].filter(
    Boolean
  );

  const onViewStateChange = useCallback(
    ({
      viewState,
    }: {
      viewState: { longitude: number; latitude: number; zoom: number };
    }) => {
      onMapStateChange({
        viewState: {
          longitude: viewState.longitude,
          latitude: viewState.latitude,
          zoom: viewState.zoom,
        },
      });
    },
    [onMapStateChange]
  );

  const handleShowTradeArea = useCallback(
    async (placeId: string) => {
      if (!filterState.showCustomerData) {
        showNotification(
          'Customer Data is disabled. Enable it in the sidebar to show trade areas.',
          'warning'
        );
        return;
      }

      // If Home Zipcodes are currently active, automatically switch to Trade Areas
      if (filterState.dataType === 'homeZipcodes') {
        // Clear visible home zipcodes first
        setVisibleHomeZipcodes(null);
        setVisibleHomeZipcodesPolygons([]);

        // Switch to Trade Areas mode
        onFilterChange({
          dataType: 'tradeArea',
        });

        showNotification(
          'Switched to Trade Areas mode and cleared home zipcodes',
          'info'
        );
      }

      // Set loading state
      setLoadingStates((prev) => ({
        ...prev,
        [placeId]: { ...prev[placeId], tradeArea: true },
      }));

      try {
        // Only load the selected trade area percentages
        const tradeAreas = await getRealTradeAreasForPlaces(
          [placeId],
          filterState.selectedTradeAreas
        );

        setAllLoadedTradeAreas((prev) => {
          const existingPids = new Set(prev.map((ta) => ta.pid));
          const newTradeAreas = tradeAreas.filter(
            (ta) => !existingPids.has(ta.pid)
          );
          return [...prev, ...newTradeAreas];
        });
      } catch (error) {
        showNotification('Error loading trade areas', 'error');
      } finally {
        // Clear loading state
        setLoadingStates((prev) => ({
          ...prev,
          [placeId]: { ...prev[placeId], tradeArea: false },
        }));
      }
    },
    [
      filterState.selectedTradeAreas,
      filterState.showCustomerData,
      filterState.dataType,
      showNotification,
      onFilterChange,
    ]
  );

  const handleHideTradeArea = useCallback((placeId: string) => {
    setAllLoadedTradeAreas((prev) => {
      const filtered = prev.filter((ta) => ta.pid !== placeId);
      return filtered;
    });

    // Also immediately clear visible trade areas for this place
    setVisibleTradeAreas((prev) => {
      const filtered = prev.filter((ta) => ta.pid !== placeId);
      return filtered;
    });
  }, []);

  const handleShowHomeZipcodes = useCallback(
    async (placeId: string) => {
      if (!filterState.showCustomerData) {
        showNotification(
          'Customer Data is disabled. Enable it in the sidebar to show home zipcodes.',
          'warning'
        );
        return;
      }

      // If Trade Areas are currently active, automatically switch to Home Zipcodes
      if (filterState.dataType === 'tradeArea') {
        // Clear all visible trade areas first
        setAllLoadedTradeAreas([]);
        setVisibleTradeAreas([]);

        // Switch to Home Zipcodes mode
        onFilterChange({
          dataType: 'homeZipcodes',
        });

        showNotification(
          'Switched to Home Zipcodes mode and cleared trade areas',
          'info'
        );
      }

      // Set loading state
      setLoadingStates((prev) => ({
        ...prev,
        [placeId]: { ...prev[placeId], homeZipcodes: true },
      }));

      try {
        const homeZipcodes = await getRealHomeZipcodesForPlace(placeId);

        if (homeZipcodes) {
          setVisibleHomeZipcodes(homeZipcodes);

          onMapStateChange({
            visibleHomeZipcodes: homeZipcodes,
          });
        } else {
          showNotification(
            'No home zipcodes data available for this place',
            'warning'
          );
        }
      } catch {
        showNotification('Error loading home zipcodes', 'error');
      } finally {
        // Clear loading state
        setLoadingStates((prev) => ({
          ...prev,
          [placeId]: { ...prev[placeId], homeZipcodes: false },
        }));
      }
    },
    [
      onMapStateChange,
      onFilterChange,
      filterState.showCustomerData,
      filterState.dataType,
      showNotification,
    ]
  );

  const handleHideHomeZipcodes = useCallback(
    (placeId: string) => {
      if (visibleHomeZipcodes && visibleHomeZipcodes.pid === placeId) {
        setVisibleHomeZipcodes(null);
        setVisibleHomeZipcodesPolygons([]);

        onMapStateChange({ visibleHomeZipcodes: null });
      } else {
        showNotification(
          'No home zipcodes currently visible for this place',
          'info'
        );
      }
    },
    [onMapStateChange, visibleHomeZipcodes, showNotification]
  );

  if (!hasMapboxToken) {
    return (
      <Box sx={{ width: '100%', height: '100%', position: 'relative', p: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Mapbox Token Required
          </Typography>
          <Typography variant="body2">
            To display the map, you need to:
          </Typography>
          <ol style={{ marginTop: 8, marginBottom: 8 }}>
            <li>
              Get a free Mapbox access token from{' '}
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noopener noreferrer"
              >
                mapbox.com
              </a>
            </li>
            <li>
              Create a <code>.env.local</code> file in your project root
            </li>
            <li>
              Add: <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here</code>
            </li>
          </ol>
        </Alert>

        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Current State (Real Data Mode):
          </Typography>
          <Typography variant="caption" display="block">
            Places:{' '}
            {filterState.showPlaces
              ? `${filteredPlaces.length} visible`
              : 'Hidden'}
          </Typography>
          <Typography variant="caption" display="block">
            Customer Data: {filterState.showCustomerData ? 'Visible' : 'Hidden'}
          </Typography>
          <Typography variant="caption" display="block">
            Data Type: {filterState.dataType}
          </Typography>
          {filterState.dataType === 'tradeArea' && (
            <Typography variant="caption" display="block">
              Trade Areas: {visibleTradeAreas.length} visible
            </Typography>
          )}
          {filterState.dataType === 'homeZipcodes' &&
            visibleHomeZipcodesPolygons.length > 0 && (
              <Typography variant="caption" display="block">
                Home Zipcodes: {visibleHomeZipcodesPolygons.length} polygons
              </Typography>
            )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <DeckGL
        views={new MapView({ repeat: true })}
        viewState={mapState.viewState}
        controller={true}
        layers={layers}
        onViewStateChange={onViewStateChange}
        style={{ width: '100%', height: '100%' }}
      >
        <ReactMapGL
          {...mapState.viewState}
          mapboxAccessToken={MAP_CONFIG.MAPBOX_ACCESS_TOKEN}
          mapStyle="mapbox://styles/mapbox/light-v11"
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>

      {/* Tooltip */}
      {hoveredPlace && (
        <MapTooltip
          place={hoveredPlace.place}
          x={hoveredPlace.x}
          y={hoveredPlace.y}
          onShowTradeArea={() => handleShowTradeArea(hoveredPlace.place.id)}
          onHideTradeArea={() => handleHideTradeArea(hoveredPlace.place.id)}
          onShowHomeZipcodes={() =>
            handleShowHomeZipcodes(hoveredPlace.place.id)
          }
          onHideHomeZipcodes={() =>
            handleHideHomeZipcodes(hoveredPlace.place.id)
          }
          isTradeAreaVisible={visibleTradeAreas.some(
            (ta) => ta.pid === hoveredPlace.place.id
          )}
          isHomeZipcodesVisible={
            visibleHomeZipcodes?.pid === hoveredPlace.place.id
          }
          isMyPlace={hoveredPlace.place.id === realMyPlace.id}
          onMouseEnter={keepTooltipVisible}
          onMouseLeave={hideTooltipWithDelay}
          validatedTradeAreaAvailable={
            validatedAvailability[hoveredPlace.place.id]?.tradeArea
          }
          validatedHomeZipcodesAvailable={
            validatedAvailability[hoveredPlace.place.id]?.homeZipcodes
          }
          isLoadingTradeArea={
            loadingStates[hoveredPlace.place.id]?.tradeArea || false
          }
          isLoadingHomeZipcodes={
            loadingStates[hoveredPlace.place.id]?.homeZipcodes || false
          }
          isLoadingZipcodePolygons={isLoadingZipcodePolygons}
        />
      )}
    </Box>
  );
}
