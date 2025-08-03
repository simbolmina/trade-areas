'use client';

import { Box, Paper, Typography, Button, Divider } from '@mui/material';
import { Place } from '@/types';

interface MapTooltipProps {
  place: Place;
  x: number;
  y: number;
  onShowTradeArea: () => void;
  onHideTradeArea: () => void;
  onShowHomeZipcodes: () => void;
  onHideHomeZipcodes: () => void;
  isTradeAreaVisible: boolean;
  isHomeZipcodesVisible: boolean;
  isMyPlace: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  validatedTradeAreaAvailable?: boolean;
  validatedHomeZipcodesAvailable?: boolean;
}

export default function MapTooltip({
  place,
  x,
  y,
  onShowTradeArea,
  onHideTradeArea,
  onShowHomeZipcodes,
  onHideHomeZipcodes,
  isTradeAreaVisible,
  isHomeZipcodesVisible,
  isMyPlace,
  onMouseEnter,
  onMouseLeave,
  validatedTradeAreaAvailable,
  validatedHomeZipcodesAvailable,
}: MapTooltipProps) {
  const tradeAreaAvailable =
    validatedTradeAreaAvailable ?? place.isTradeAreaAvailable;
  const homeZipcodesAvailable =
    validatedHomeZipcodesAvailable ?? place.isHomeZipcodesAvailable;
  return (
    <Paper
      elevation={8}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        position: 'absolute',
        left: x + 10,
        top: y - 50, // Adjusted position to reduce gap
        p: 2,
        minWidth: 250,
        maxWidth: 300,
        zIndex: 1000,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        pointerEvents: 'auto', // Ensure mouse events work
      }}
    >
      {/* Place Information */}
      <Typography variant="h6" gutterBottom>
        {place.name}
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        {place.street_address}
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        {place.city}, {place.state}
      </Typography>

      <Typography
        variant="caption"
        color="primary"
        gutterBottom
        sx={{ display: 'block' }}
      >
        Industry: {place.industry}
      </Typography>

      <Divider sx={{ my: 1 }} />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Trade Area Buttons */}
        {tradeAreaAvailable ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={isTradeAreaVisible ? 'contained' : 'outlined'}
              size="small"
              onClick={isTradeAreaVisible ? onHideTradeArea : onShowTradeArea}
              sx={{ flex: 1 }}
            >
              {isTradeAreaVisible ? 'Hide' : 'Show'} Trade Area
            </Button>
          </Box>
        ) : (
          <Button
            variant="outlined"
            size="small"
            disabled
            sx={{ width: '100%' }}
            title="Trade area data not available for this location"
          >
            Trade Area (Not Available)
          </Button>
        )}

        {/* Home Zipcodes Buttons */}
        {homeZipcodesAvailable ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={isHomeZipcodesVisible ? 'contained' : 'outlined'}
              size="small"
              onClick={
                isHomeZipcodesVisible ? onHideHomeZipcodes : onShowHomeZipcodes
              }
              sx={{ flex: 1 }}
            >
              {isHomeZipcodesVisible ? 'Hide' : 'Show'} Home Zipcodes
            </Button>
          </Box>
        ) : (
          <Button
            variant="outlined"
            size="small"
            disabled
            sx={{ width: '100%' }}
            title="Home zipcodes data not available for this location"
          >
            Home Zipcodes (Not Available)
          </Button>
        )}
      </Box>

      {/* Special indicator for "My Place" */}
      {isMyPlace && (
        <Box sx={{ mt: 1, p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="caption" color="primary.contrastText">
            📍 This is your reference location
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
