import { Location } from '@/types';

// Calculate percentile groups for home zipcodes data
export interface PercentileGroup {
  min: number;
  max: number;
  color: [number, number, number, number];
  label: string;
  locations: Location[];
}

// Standard 5-color scheme for percentile groups
export const PERCENTILE_COLORS: [number, number, number, number][] = [
  [255, 245, 240, 180], // Very light orange (0-20%)
  [254, 217, 166, 180], // Light orange (20-40%)
  [253, 174, 107, 180], // Medium orange (40-60%)
  [253, 141, 60, 180], // Dark orange (60-80%)
  [230, 85, 13, 180], // Very dark orange (80-100%)
];

export const calculatePercentileGroups = (
  data: Array<{ percentage: number }> | Location[]
): PercentileGroup[] => {
  if (!data || data.length === 0) {
    return [];
  }

  // Extract percentages from the data
  let percentages: number[];
  if ('percentage' in data[0]) {
    // Handle { percentage: number }[] format
    percentages = (data as Array<{ percentage: number }>).map(
      (d) => d.percentage
    );
  } else {
    // Handle Location[] format - extract all percentage values from all objects
    percentages = [];
    (data as Location[]).forEach((location) => {
      Object.values(location).forEach((value) => {
        if (typeof value === 'number') {
          percentages.push(value);
        } else if (typeof value === 'string') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            percentages.push(numValue);
          }
        }
      });
    });
  }

  // Sort percentages in ascending order
  const sortedPercentages = [...percentages].sort((a, b) => a - b);

  // Calculate percentile thresholds
  const length = sortedPercentages.length;
  const percentiles = [
    { threshold: 0.2, label: '0-20%' },
    { threshold: 0.4, label: '20-40%' },
    { threshold: 0.6, label: '40-60%' },
    { threshold: 0.8, label: '60-80%' },
    { threshold: 1.0, label: '80-100%' },
  ];

  const groups: PercentileGroup[] = [];
  let startIndex = 0;

  percentiles.forEach((percentile, index) => {
    const endIndex = Math.ceil(length * percentile.threshold);
    const groupPercentages = sortedPercentages.slice(startIndex, endIndex);

    if (groupPercentages.length > 0) {
      const minPercentage = groupPercentages[0];
      const maxPercentage = groupPercentages[groupPercentages.length - 1];

      groups.push({
        min: minPercentage,
        max: maxPercentage,
        color: PERCENTILE_COLORS[index],
        label: percentile.label,
        locations: [], // No longer using locations array for the new structure
      });
    }

    startIndex = endIndex;
  });

  return groups;
};

// Get color for a specific location based on its percentage
export const getLocationColor = (
  percentage: number,
  percentileGroups: PercentileGroup[]
): [number, number, number, number] => {
  for (const group of percentileGroups) {
    if (percentage >= group.min && percentage <= group.max) {
      return group.color;
    }
  }

  // Default color if no group matches
  return [128, 128, 128, 180];
};

// Calculate dynamic thresholds for legend display
export const getPercentileThresholds = (locations: Location[]): number[] => {
  if (!locations || locations.length === 0) {
    return [0, 20, 40, 60, 80, 100];
  }

  const percentages = locations
    .map((loc) => loc.percentage)
    .sort((a, b) => a - b);
  const length = percentages.length;

  return [
    Math.round(percentages[0] * 100) / 100, // Min
    Math.round(percentages[Math.floor(length * 0.2)] * 100) / 100,
    Math.round(percentages[Math.floor(length * 0.4)] * 100) / 100,
    Math.round(percentages[Math.floor(length * 0.6)] * 100) / 100,
    Math.round(percentages[Math.floor(length * 0.8)] * 100) / 100,
    Math.round(percentages[length - 1] * 100) / 100, // Max
  ];
};
