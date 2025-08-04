'use client';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Chip,
  OutlinedInput,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FilterState } from '@/types';

interface PlaceAnalysisProps {
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  availableIndustries: string[];
}

export default function PlaceAnalysis({
  filterState,
  onFilterChange,
  availableIndustries,
}: PlaceAnalysisProps) {
  const handleRadiusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0) {
      onFilterChange({ radius: value });
    }
  };

  const handleIndustryChange = (event: any) => {
    const value = event.target.value;
    onFilterChange({
      industries: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleShowPlacesChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onFilterChange({ showPlaces: event.target.checked });
  };

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Place Analysis</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Radius Filter */}
          <TextField
            label="Radius (miles)"
            type="number"
            value={filterState.radius}
            onChange={handleRadiusChange}
            inputProps={{ min: 0, step: 0.1 }}
            fullWidth
          />

          {/* Industry Filter */}
          <FormControl fullWidth>
            <InputLabel>Industry</InputLabel>
            <Select
              multiple
              value={filterState.industries}
              onChange={handleIndustryChange}
              input={<OutlinedInput label="Industry" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {availableIndustries.map((industry) => (
                <MenuItem key={industry} value={industry}>
                  {industry}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Show/Hide Places Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={filterState.showPlaces}
                onChange={handleShowPlacesChange}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase': {
                    padding: '2px',
                    '&.Mui-checked': {
                      transform: 'translateX(20px)',
                    },
                  },
                  '& .MuiSwitch-thumb': {
                    width: '16px',
                    height: '16px',
                  },
                  '& .MuiSwitch-track': {
                    height: '20px',
                    borderRadius: '10px',
                    width: '40px',
                  },
                }}
              />
            }
            label="Show Places"
            sx={{
              margin: 0,
              '& .MuiFormControlLabel-label': {
                fontSize: '0.875rem',
                marginLeft: '8px',
              },
            }}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
