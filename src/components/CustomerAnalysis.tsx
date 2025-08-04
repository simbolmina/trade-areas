'use client';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Checkbox,
  Box,
  RadioGroup,
  Radio,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FilterState } from '@/types';

interface CustomerAnalysisProps {
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
}

export default function CustomerAnalysis({
  filterState,
  onFilterChange,
}: CustomerAnalysisProps) {
  const handleDataTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'tradeArea' | 'homeZipcodes';

    // Only change data type, don't trigger auto-loading by clearing other states
    onFilterChange({
      dataType: value,
      selectedTradeAreas: value === 'tradeArea' ? [30, 50, 70] : [],
    });
  };

  const handleTradeAreaChange = (tradeArea: number) => {
    const currentSelected = filterState.selectedTradeAreas;
    const newSelected = currentSelected.includes(tradeArea)
      ? currentSelected.filter((ta) => ta !== tradeArea)
      : [...currentSelected, tradeArea];

    onFilterChange({ selectedTradeAreas: newSelected });
  };

  const handleShowCustomerDataChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onFilterChange({ showCustomerData: event.target.checked });
  };

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Customer Analysis</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Data Type Selector */}
          <FormControl component="fieldset">
            <Typography variant="subtitle2" gutterBottom>
              Data Type
            </Typography>
            <RadioGroup
              value={filterState.dataType}
              onChange={handleDataTypeChange}
            >
              <FormControlLabel
                value="tradeArea"
                control={<Radio />}
                label="Trade Area"
              />
              <FormControlLabel
                value="homeZipcodes"
                control={<Radio />}
                label="Home Zipcodes"
              />
            </RadioGroup>
          </FormControl>

          {/* Trade Area Checkboxes - only visible when Trade Area selected */}
          {filterState.dataType === 'tradeArea' && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Trade Areas
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[30, 50, 70].map((tradeArea) => (
                  <FormControlLabel
                    key={tradeArea}
                    control={
                      <Checkbox
                        checked={filterState.selectedTradeAreas.includes(
                          tradeArea
                        )}
                        onChange={() => handleTradeAreaChange(tradeArea)}
                      />
                    }
                    label={`${tradeArea}%`}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Show/Hide Customer Data Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={filterState.showCustomerData}
                onChange={handleShowCustomerDataChange}
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
            label="Show Customer Data"
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
