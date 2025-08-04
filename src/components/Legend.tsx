'use client';

import { Box, Typography, Paper, Divider } from '@mui/material';
import { FilterState } from '@/types';
import { MAP_CONFIG, getHomeZipcodeColor } from '@/utils/mapConfig';
import {
  calculatePercentileGroups,
  PERCENTILE_COLORS,
} from '@/utils/percentileCalculations';

interface LegendProps {
  filterState: FilterState;
  placesCount?: number;
  clusteredCount?: number;
  visibleHomeZipcodes?: any;
}

interface ColorBoxProps {
  color: number[];
  label: string;
  size?: 'small' | 'medium';
}

const ColorBox = ({ color, label, size = 'medium' }: ColorBoxProps) => {
  const boxSize = size === 'small' ? 12 : 16;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 1,
        p: 0.5,
        borderRadius: 1,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          bgcolor: 'action.hover',
          transform: 'translateX(2px)',
        },
      }}
    >
      <Box
        sx={{
          width: boxSize,
          height: boxSize,
          backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${
            color[3] / 255
          })`,
          border: '2px solid',
          borderColor: 'divider',
          borderRadius: 1,
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 500 }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default function Legend({
  filterState,
  placesCount,
  clusteredCount,
  visibleHomeZipcodes,
}: LegendProps) {
  const showPlacesLegend = filterState.showPlaces;
  const showCustomerDataLegend = filterState.showCustomerData;

  return (
    <Box
      sx={{
        p: 3,
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          mb: 3,
          fontWeight: 600,
          color: 'text.primary',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          pb: 1,
        }}
      >
        📊 Legend
      </Typography>

      {/* Places Legend */}
      {showPlacesLegend && (
        <Paper
          elevation={2}
          sx={{
            p: 2.5,
            mb: 2.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 2,
            }}
          >
            Places {placesCount !== undefined && `(${placesCount})`}
          </Typography>
          <ColorBox color={MAP_CONFIG.PLACE_COLORS.myPlace} label="My Place" />
          <ColorBox
            color={MAP_CONFIG.PLACE_COLORS.other}
            label="Other Places"
          />
          <ColorBox color={[255, 165, 0, 200]} label="Clusters" />
          {clusteredCount !== undefined && clusteredCount > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Showing {clusteredCount} groups/places for performance
            </Typography>
          )}
        </Paper>
      )}

      {/* Customer Data Legend */}
      {showCustomerDataLegend && (
        <Paper
          elevation={2}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 2,
            }}
          >
            Customer Data
          </Typography>

          {filterState.dataType === 'tradeArea' && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Trade Areas
              </Typography>
              {filterState.selectedTradeAreas.map((percentage) => (
                <ColorBox
                  key={percentage}
                  color={
                    MAP_CONFIG.TRADE_AREA_COLORS[
                      percentage as keyof typeof MAP_CONFIG.TRADE_AREA_COLORS
                    ]
                  }
                  label={`${percentage}% Trade Area`}
                />
              ))}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                Larger areas = lower percentages
              </Typography>
            </Box>
          )}

          {filterState.dataType === 'homeZipcodes' && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Home Zipcodes (Percentiles)
              </Typography>
              {visibleHomeZipcodes ? (
                // Dynamic legend based on actual data
                (() => {
                  const percentileGroups = calculatePercentileGroups(
                    visibleHomeZipcodes.locations
                  );
                  return percentileGroups.map((group, index) => (
                    <ColorBox
                      key={index}
                      color={group.color}
                      label={`${group.label}: ${group.min.toFixed(
                        2
                      )}-${group.max.toFixed(2)}%`}
                      size="small"
                    />
                  ));
                })()
              ) : (
                // Default static legend when no data
                <>
                  <ColorBox
                    color={PERCENTILE_COLORS[0]}
                    label="0-20%"
                    size="small"
                  />
                  <ColorBox
                    color={PERCENTILE_COLORS[1]}
                    label="20-40%"
                    size="small"
                  />
                  <ColorBox
                    color={PERCENTILE_COLORS[2]}
                    label="40-60%"
                    size="small"
                  />
                  <ColorBox
                    color={PERCENTILE_COLORS[3]}
                    label="60-80%"
                    size="small"
                  />
                  <ColorBox
                    color={PERCENTILE_COLORS[4]}
                    label="80-100%"
                    size="small"
                  />
                </>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                {visibleHomeZipcodes
                  ? `Based on ${visibleHomeZipcodes.locations.length} locations`
                  : 'Higher percentiles = more customers'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Instructions when no data is shown */}
      {!showPlacesLegend && !showCustomerDataLegend && (
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Use the controls on the left to show places and customer data on the
            map.
          </Typography>
        </Paper>
      )}

      {/* Filter Summary */}
      <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Current Filters
        </Typography>
        <Typography variant="caption" display="block">
          Radius: {filterState.radius} miles
        </Typography>
        {filterState.industries.length > 0 && (
          <Typography variant="caption" display="block">
            Industries: {filterState.industries.join(', ')}
          </Typography>
        )}
        {filterState.industries.length === 0 && (
          <Typography variant="caption" display="block" color="text.secondary">
            All industries
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
