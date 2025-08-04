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
  const [isHoveringPlace, setIsHoveringPlace] = useState(false);

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

  // Flag to prevent auto-loading after manual hide
  const [preventAutoLoad, setPreventAutoLoad] = useState(false);

  // Flag to track if this is the initial load
  const [hasInitialized, setHasInitialized] = useState(false);

  // Generate unique colors for places with trade areas
  const placeColors = useMemo(() => {
    const colors: { [placeId: string]: [number, number, number, number] } = {};
    const colorPalette: [number, number, number, number][] = [
      [255, 0, 0, 255], // Red
      [0, 255, 0, 255], // Green
      [0, 0, 255, 255], // Blue
      [255, 255, 0, 255], // Yellow
      [255, 0, 255, 255], // Magenta
      [0, 255, 255, 255], // Cyan
      [255, 165, 0, 255], // Orange
      [128, 0, 128, 255], // Purple
      [255, 192, 203, 255], // Pink
      [0, 128, 0, 255], // Dark Green
      [128, 0, 0, 255], // Dark Red
      [0, 0, 128, 255], // Dark Blue
    ];

    // Get unique place IDs that have trade areas
    const placeIdsWithTradeAreas = new Set(
      visibleTradeAreas.map((ta) => ta.pid)
    );

    let colorIndex = 0;
    placeIdsWithTradeAreas.forEach((placeId) => {
      if (!colors[placeId]) {
        colors[placeId] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
      }
    });

    return colors;
  }, [visibleTradeAreas]);

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
      // Store the trade areas that were visible before clearing them
      const previouslyVisibleTradeAreas = [...visibleTradeAreas];

      if (visibleTradeAreas.length > 0) {
        setVisibleTradeAreas([]);
      }

      // Determine which place's home zipcodes to show based on previously visible trade areas
      const visibleTradeAreaPlaces = new Set(
        previouslyVisibleTradeAreas.map((ta) => ta.pid)
      );

      if (visibleTradeAreaPlaces.size === 1) {
        // If exactly one trade area was visible, show home zipcodes for that place
        const placeId = Array.from(visibleTradeAreaPlaces)[0];
        const place = filteredPlaces.find((p) => p.id === placeId);

        if (place && place.isHomeZipcodesAvailable) {
          const showPlaceHomeZipcodes = async () => {
            try {
              const homeZipcodes = await getRealHomeZipcodesForPlace(placeId);

              if (homeZipcodes) {
                setVisibleHomeZipcodes(homeZipcodes);
                onMapStateChange({
                  visibleHomeZipcodes: homeZipcodes,
                });
                setHasInitialized(true);
              }
            } catch {
              showNotification(
                `Error loading home zipcodes for ${place.name}`,
                'error'
              );
            }
          };

          showPlaceHomeZipcodes();
        }
      } else if (visibleTradeAreaPlaces.size > 1) {
        // If multiple trade areas were visible, show "My Place" home zipcodes
        const myPlace = filteredPlaces.find((p) => p.id === realMyPlace.id);

        if (myPlace && myPlace.isHomeZipcodesAvailable) {
          const showMyPlaceHomeZipcodes = async () => {
            try {
              const homeZipcodes = await getRealHomeZipcodesForPlace(
                realMyPlace.id
              );

              if (homeZipcodes) {
                setVisibleHomeZipcodes(homeZipcodes);
                onMapStateChange({
                  visibleHomeZipcodes: homeZipcodes,
                });
                setHasInitialized(true);
              }
            } catch {
              showNotification(
                `Error loading home zipcodes for ${myPlace.name}`,
                'error'
              );
            }
          };

          showMyPlaceHomeZipcodes();
        }
      }
      // If no trade areas were visible, don't auto-load anything - user must manually click
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
    loadingStates,
    preventAutoLoad,
    hasInitialized,
    onMapStateChange,
    showNotification,
    filteredPlaces,
    realMyPlace.id,
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

  // Separate layer for "My Place" to ensure it's always visible and prominent
  const myPlaceLayer = useMemo(() => {
    if (!filterState.showPlaces) return null;

    // Find "My Place" in the filtered places
    const myPlace = filteredPlaces.find((place) => place.id === realMyPlace.id);
    if (!myPlace) return null;

    // Check if My Place has trade areas visible
    const hasTradeAreas = visibleTradeAreas.some(
      (ta) => ta.pid === realMyPlace.id
    );

    return new ScatterplotLayer({
      id: 'my-place-layer',
      data: [myPlace],
      pickable: true,
      opacity: 1.0,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: hasTradeAreas ? 40 : 30, // Even larger when trade areas are visible
      radiusMaxPixels: hasTradeAreas ? 55 : 45,
      lineWidthMinPixels: 5, // Thicker border
      getPosition: (place: Place) => [place.longitude, place.latitude],
      getRadius: () => (hasTradeAreas ? 45 : 35), // Even larger when trade areas are visible
      getFillColor: () =>
        MAP_CONFIG.PLACE_COLORS.myPlace as [number, number, number, number],
      getLineColor: hasTradeAreas
        ? placeColors[realMyPlace.id] || [255, 255, 0, 255]
        : [255, 255, 255, 255], // Use assigned color or yellow
      getLineWidth: hasTradeAreas ? 6 : 4, // Even thicker border when trade areas visible
      onHover: (info: any) => {
        if (info.object && info.x !== undefined && info.y !== undefined) {
          showTooltip(info.object, info.x, info.y);
          setIsHoveringPlace(true);
        } else {
          hideTooltipWithDelay();
          setIsHoveringPlace(false);
        }
      },
      onClick: (info: any) => {
        if (info.object) {
          onMapStateChange({ selectedPlace: info.object });
        }
      },
    });
  }, [
    filterState.showPlaces,
    filteredPlaces,
    visibleTradeAreas,
    placeColors,
    onMapStateChange,
    showTooltip,
    hideTooltipWithDelay,
  ]);

  // Regular places layer (excluding "My Place")
  const placesLayer = useMemo(() => {
    if (!filterState.showPlaces || clusteredPlaces.length === 0) return null;

    // Filter out "My Place" from clustered places since it has its own layer
    const otherPlaces = clusteredPlaces.filter((cluster) => {
      if (cluster.isCluster) return true;
      return cluster.places[0]?.id !== realMyPlace.id;
    });

    if (otherPlaces.length === 0) return null;

    return new ScatterplotLayer({
      id: 'places-layer',
      data: otherPlaces,
      pickable: true,
      opacity: 0.9, // Slightly more opaque
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 12, // Bigger base size
      radiusMaxPixels: 35, // Bigger max size
      lineWidthMinPixels: 4, // Thicker border
      getPosition: (cluster: ClusterPoint) => [
        cluster.longitude,
        cluster.latitude,
      ],
      getRadius: (cluster: ClusterPoint) => {
        if (cluster.isCluster) {
          return Math.min(12 + Math.log(cluster.count) * 4, 35);
        }
        // Check if this place has trade areas visible
        const place = cluster.places[0];
        const hasTradeAreas = place
          ? visibleTradeAreas.some((ta) => ta.pid === place.id)
          : false;
        return hasTradeAreas ? 25 : 15; // Even larger when trade areas are visible
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
        return MAP_CONFIG.PLACE_COLORS.other as [
          number,
          number,
          number,
          number
        ];
      },
      getLineColor: (cluster: ClusterPoint) => {
        if (cluster.isCluster) {
          return [255, 255, 255, 255];
        }
        // Check if this place has trade areas visible
        const place = cluster.places[0];
        const hasTradeAreas = place
          ? visibleTradeAreas.some((ta) => ta.pid === place.id)
          : false;
        return hasTradeAreas
          ? placeColors[place.id] || [255, 0, 0, 255]
          : [255, 255, 255, 255]; // Use assigned color or red
      },
      getLineWidth: (cluster: ClusterPoint) => {
        if (cluster.isCluster) {
          return 3;
        }
        // Check if this place has trade areas visible
        const place = cluster.places[0];
        const hasTradeAreas = place
          ? visibleTradeAreas.some((ta) => ta.pid === place.id)
          : false;
        return hasTradeAreas ? 5 : 3; // Even thicker border when trade areas visible
      },
      onHover: (info: any) => {
        if (info.object && info.x !== undefined && info.y !== undefined) {
          const cluster = info.object as ClusterPoint;
          if (!cluster.isCluster && cluster.places[0]) {
            showTooltip(cluster.places[0], info.x, info.y);
            setIsHoveringPlace(true);
          } else {
            hideTooltipWithDelay();
            setIsHoveringPlace(false);
          }
        } else {
          hideTooltipWithDelay();
          setIsHoveringPlace(false);
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
    visibleTradeAreas,
    placeColors,
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
        lineWidthMinPixels: 2, // Thicker border for better visibility
        getPolygon: (tradeArea: TradeArea) => tradeArea.polygon.coordinates[0],
        getFillColor: (tradeArea: TradeArea) => {
          const color = MAP_CONFIG.TRADE_AREA_COLORS[
            tradeArea.trade_area as keyof typeof MAP_CONFIG.TRADE_AREA_COLORS
          ] as [number, number, number, number];
          return [color[0], color[1], color[2], 120]; // More transparent
        },
        getLineColor: (tradeArea: TradeArea) => {
          const placeColor = placeColors[tradeArea.pid];
          return placeColor || [255, 255, 255, 255]; // White if no color assigned
        },
        getLineWidth: 2, // Thicker border
      });
    } catch {
      return null;
    }
  }, [
    visibleTradeAreas,
    filterState.showCustomerData,
    filterState.dataType,
    placeColors,
  ]);

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

  const layers = [
    tradeAreasLayer,
    homeZipcodesLayer,
    placesLayer,
    myPlaceLayer,
  ].filter(Boolean);

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

      // Check if home zipcodes are already visible for this place
      if (visibleHomeZipcodes && visibleHomeZipcodes.pid === placeId) {
        showNotification(
          'Home zipcodes are already visible for this place',
          'info'
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

        // Reset prevent auto-load flag when switching modes
        setPreventAutoLoad(false);

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

          // Reset prevent auto-load flag when manually showing
          setPreventAutoLoad(false);
          setHasInitialized(true);
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
      visibleHomeZipcodes,
      onMapStateChange,
      onFilterChange,
      filterState.showCustomerData,
      filterState.dataType,
      showNotification,
    ]
  );

  const handleHideHomeZipcodes = useCallback(
    (placeId: string) => {
      // Always clear home zipcodes regardless of which place they belong to
      // This prevents the auto-loading from interfering with manual hide operations
      setVisibleHomeZipcodes(null);
      setVisibleHomeZipcodesPolygons([]);
      onMapStateChange({ visibleHomeZipcodes: null });

      // Clear any loading states for this place
      setLoadingStates((prev) => ({
        ...prev,
        [placeId]: { ...prev[placeId], homeZipcodes: false },
      }));

      // Prevent auto-loading after manual hide
      setPreventAutoLoad(true);

      // Reset the flag after 5 seconds to allow future auto-loading
      setTimeout(() => {
        setPreventAutoLoad(false);
      }, 5000);

      showNotification('Home zipcodes hidden', 'info');
    },
    [onMapStateChange, showNotification]
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
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: isHoveringPlace ? 'pointer' : 'grab',
        '& *': {
          cursor: isHoveringPlace ? 'pointer' : 'grab',
        },
      }}
    >
      <DeckGL
        views={new MapView({ repeat: true })}
        viewState={mapState.viewState}
        controller={true}
        layers={layers}
        onViewStateChange={onViewStateChange}
        style={{
          width: '100%',
          height: '100%',
          cursor: isHoveringPlace ? 'pointer' : 'grab',
        }}
      >
        <ReactMapGL
          {...mapState.viewState}
          mapboxAccessToken={MAP_CONFIG.MAPBOX_ACCESS_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{
            width: '100%',
            height: '100%',
            cursor: isHoveringPlace ? 'pointer' : 'grab',
          }}
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
          dataType={filterState.dataType}
        />
      )}
    </Box>
  );
}
