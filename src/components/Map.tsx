'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PolygonLayer } from '@deck.gl/layers';
import { MapView } from '@deck.gl/core';
import { Map as ReactMapGL } from 'react-map-gl/mapbox';
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
}

export default function Map({
  mapState,
  filterState,
  onMapStateChange,
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

      const placesToValidate = filteredPlaces.slice(0, 10);

      for (const place of placesToValidate) {
        try {
          const [tradeAreaAvailable, homeZipcodesAvailable] = await Promise.all(
            [
              validateTradeAreaAvailability(place.id),
              validateHomeZipcodesAvailability(place.id),
            ]
          );

          validationResults[place.id] = {
            tradeArea: tradeAreaAvailable,
            homeZipcodes: homeZipcodesAvailable,
          };
        } catch {
          // Validation failed, keep original flags
        }
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

      try {
        const polygons = await getRealHomeZipcodesPolygons(visibleHomeZipcodes);
        setVisibleHomeZipcodesPolygons(polygons);
      } catch {
        showNotification('Error loading zipcode polygons', 'error');
        setVisibleHomeZipcodesPolygons([]);
      }
    };

    loadHomeZipcodes();
  }, [visibleHomeZipcodes, showNotification]);

  useEffect(() => {
    if (visibleTradeAreas.length > 0) {
      setVisibleTradeAreas((prev) =>
        prev.filter((tradeArea) =>
          filterState.selectedTradeAreas.includes(tradeArea.trade_area)
        )
      );
    }
  }, [filterState.selectedTradeAreas]);

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
      onHover: (info) => {
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
      onClick: (info) => {
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
        getPolygon: (zipcode) => {
          if (
            !zipcode.polygon ||
            !zipcode.polygon.coordinates ||
            !zipcode.polygon.coordinates[0]
          ) {
            return [];
          }
          return zipcode.polygon.coordinates[0];
        },
        getFillColor: (zipcode) => {
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

      if (filterState.dataType !== 'tradeArea') {
        showNotification(
          'Home Zipcodes is selected. Switch to Trade Areas in the sidebar to show trade areas.',
          'warning'
        );
        return;
      }

      const tradeAreas = await getRealTradeAreasForPlaces(
        [placeId],
        filterState.selectedTradeAreas
      );

      setVisibleTradeAreas((prev) => {
        const existingPids = new Set(prev.map((ta) => ta.pid));
        const newTradeAreas = tradeAreas.filter(
          (ta) => !existingPids.has(ta.pid)
        );
        return [...prev, ...newTradeAreas];
      });
    },
    [
      filterState.selectedTradeAreas,
      filterState.showCustomerData,
      filterState.dataType,
      showNotification,
    ]
  );

  const handleHideTradeArea = useCallback((placeId: string) => {
    setVisibleTradeAreas((prev) => prev.filter((ta) => ta.pid !== placeId));
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

      if (filterState.dataType !== 'homeZipcodes') {
        showNotification(
          'Trade Areas is selected. Switch to Home Zipcodes in the sidebar to show home zipcodes.',
          'warning'
        );
        return;
      }

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
      }
    },
    [
      onMapStateChange,
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
        />
      )}
    </Box>
  );
}
