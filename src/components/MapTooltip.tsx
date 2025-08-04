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
  isLoadingTradeArea?: boolean;
  isLoadingHomeZipcodes?: boolean;
  isLoadingZipcodePolygons?: boolean;
  dataType?: 'tradeArea' | 'homeZipcodes'; // Make optional
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
  isLoadingTradeArea = false,
  isLoadingHomeZipcodes = false,
  isLoadingZipcodePolygons = false,
  dataType = 'tradeArea', // Default to tradeArea if not provided
}: MapTooltipProps) {
  const tradeAreaAvailable =
    validatedTradeAreaAvailable ?? place.isTradeAreaAvailable;
  const homeZipcodesAvailable =
    validatedHomeZipcodesAvailable ?? place.isHomeZipcodesAvailable;
  return (
    <Paper
      elevation={12}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        position: 'absolute',
        left: x + 10,
        top: y - 50,
        p: 2.5,
        minWidth: 280,
        maxWidth: 320,
        zIndex: 1000,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        pointerEvents: 'auto',
        borderRadius: 2,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: -8,
          width: 0,
          height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '8px solid',
          borderRightColor: 'background.paper',
          transform: 'translateY(-50%)',
        },
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
        {/* Trade Area Buttons - only show when dataType is 'tradeArea' */}
        {dataType === 'tradeArea' && (
          <>
            {tradeAreaAvailable ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={isTradeAreaVisible ? 'contained' : 'outlined'}
                  size="small"
                  onClick={
                    isTradeAreaVisible ? onHideTradeArea : onShowTradeArea
                  }
                  disabled={isLoadingTradeArea}
                  sx={{
                    flex: 1,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  {isLoadingTradeArea ? (
                    <>
                      <Box
                        component="span"
                        sx={{
                          width: 16,
                          height: 16,
                          border: '2px solid',
                          borderColor: 'currentColor',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 1s linear infinite',
                          mr: 1,
                        }}
                      />
                      Loading...
                    </>
                  ) : (
                    `${isTradeAreaVisible ? 'Hide' : 'Show'} Trade Area`
                  )}
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

            {/* Trade Area Status Indicator */}
            {isTradeAreaVisible && (
              <Box
                sx={{
                  mt: 1,
                  p: 1,
                  bgcolor: isMyPlace ? 'primary.light' : 'warning.light',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: isMyPlace ? 'primary.main' : 'warning.main',
                }}
              >
                <Typography
                  variant="caption"
                  color={
                    isMyPlace ? 'primary.contrastText' : 'warning.contrastText'
                  }
                >
                  {isMyPlace ? '🔵' : '🔴'} Trade area visible for{' '}
                  {isMyPlace ? 'your place' : 'this location'}
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Home Zipcodes Buttons - only show when dataType is 'homeZipcodes' */}
        {dataType === 'homeZipcodes' && (
          <>
            {homeZipcodesAvailable ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={isHomeZipcodesVisible ? 'contained' : 'outlined'}
                  size="small"
                  onClick={
                    isHomeZipcodesVisible
                      ? onHideHomeZipcodes
                      : onShowHomeZipcodes
                  }
                  disabled={isLoadingHomeZipcodes || isLoadingZipcodePolygons}
                  sx={{
                    flex: 1,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  {isLoadingHomeZipcodes || isLoadingZipcodePolygons ? (
                    <>
                      <Box
                        component="span"
                        sx={{
                          width: 16,
                          height: 16,
                          border: '2px solid',
                          borderColor: 'currentColor',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 1s linear infinite',
                          mr: 1,
                        }}
                      />
                      Loading...
                    </>
                  ) : (
                    `${isHomeZipcodesVisible ? 'Hide' : 'Show'} Home Zipcodes`
                  )}
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

            {/* Home Zipcodes Status Indicator */}
            {isHomeZipcodesVisible && (
              <Box
                sx={{
                  mt: 1,
                  p: 1,
                  bgcolor: isMyPlace ? 'primary.light' : 'success.light',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: isMyPlace ? 'primary.main' : 'success.main',
                }}
              >
                <Typography
                  variant="caption"
                  color={
                    isMyPlace ? 'primary.contrastText' : 'success.contrastText'
                  }
                >
                  {isMyPlace ? '🔵' : '🟢'} Home zipcodes visible for{' '}
                  {isMyPlace ? 'your place' : 'this location'}
                </Typography>
              </Box>
            )}
          </>
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
