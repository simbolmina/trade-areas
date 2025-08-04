'use client';

import { Box, Typography } from '@mui/material';
import PlaceAnalysis from './PlaceAnalysis';
import CustomerAnalysis from './CustomerAnalysis';
import { FilterState } from '@/types';

interface LeftSidebarProps {
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  availableIndustries: string[];
}

export default function LeftSidebar({
  filterState,
  onFilterChange,
  availableIndustries,
}: LeftSidebarProps) {
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
        🎯 Filters & Controls
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <PlaceAnalysis
          filterState={filterState}
          onFilterChange={onFilterChange}
          availableIndustries={availableIndustries}
        />

        <CustomerAnalysis
          filterState={filterState}
          onFilterChange={onFilterChange}
        />
      </Box>
    </Box>
  );
}
