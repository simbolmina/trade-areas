'use client';

import { Box, Paper } from '@mui/material';
import { useState } from 'react';
import { FilterState, MapState } from '@/types';
import LeftSidebar from '@/components/LeftSidebar';
import Map from '@/components/Map';
import Legend from '@/components/Legend';
import { getRealAvailableIndustries, realMyPlace } from '@/data/realDataLoader';
import { useMapData } from '@/hooks/useMapData';
import { NotificationProvider } from '@/components/NotificationSystem';

export default function Home() {
  const [filterState, setFilterState] = useState<FilterState>({
    radius: 10,
    industries: [],
    showPlaces: true,
    showCustomerData: true,
    dataType: 'tradeArea',
    selectedTradeAreas: [30, 50, 70],
    selectedPlaceId: null,
  });

  const [mapState, setMapState] = useState<MapState>({
    viewState: {
      longitude: realMyPlace.longitude,
      latitude: realMyPlace.latitude,
      zoom: 12,
    },
    selectedPlace: null,
    visibleTradeAreas: [],
    visibleHomeZipcodes: null,
  });

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  };

  const handleMapStateChange = (updates: Partial<MapState>) => {
    setMapState((prev) => ({ ...prev, ...updates }));
  };

  const availableIndustries = getRealAvailableIndustries();

  // Get filtered and clustered places data
  const { filteredPlaces, clusteredPlaces } = useMapData(
    filterState,
    mapState.viewState.zoom
  );

  return (
    <NotificationProvider>
      <Box sx={{ height: '100vh', display: 'flex' }}>
        {/* Left Sidebar - Filters & Controls */}
        <Paper
          elevation={3}
          sx={{
            width: 320,
            height: '100%',
            overflow: 'auto',
            borderRadius: 0,
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <LeftSidebar
            filterState={filterState}
            onFilterChange={handleFilterChange}
            availableIndustries={availableIndustries}
          />
        </Paper>

        {/* Main Map Area */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <Map
            mapState={mapState}
            filterState={filterState}
            onMapStateChange={handleMapStateChange}
            onFilterChange={handleFilterChange}
          />
        </Box>

        {/* Right Sidebar - Dynamic Legend */}
        <Paper
          elevation={3}
          sx={{
            width: 280,
            height: '100%',
            overflow: 'auto',
            borderRadius: 0,
            borderLeft: 1,
            borderColor: 'divider',
          }}
        >
          <Legend
            filterState={filterState}
            placesCount={filteredPlaces.length}
            clusteredCount={clusteredPlaces.length}
            visibleHomeZipcodes={mapState.visibleHomeZipcodes}
          />
        </Paper>
      </Box>
    </NotificationProvider>
  );
}
