import { useMemo } from 'react';
import { FilterState } from '@/types';
import { realMyPlace, getFilteredRealPlaces } from '@/data/realDataLoader';
import { clusterPlaces } from '@/utils/performanceOptimizations';

export const useMapData = (filterState: FilterState, zoom: number) => {
  // Get filtered places based on current filter state
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

  // Cluster places for performance
  const clusteredPlaces = useMemo(() => {
    if (!filterState.showPlaces || filteredPlaces.length === 0) return [];

    const centerPlace = realMyPlace;

    return clusterPlaces(
      filteredPlaces,
      zoom,
      centerPlace.latitude,
      centerPlace.longitude
    );
  }, [filteredPlaces, zoom, filterState.showPlaces]);

  return {
    filteredPlaces,
    clusteredPlaces,
  };
};
