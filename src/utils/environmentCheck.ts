// Environment and setup validation utilities

export const checkMapboxToken = (): {
  isValid: boolean;
  token: string;
  message: string;
} => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  if (
    !token ||
    token === 'pk.your_token_here' ||
    token === 'your_mapbox_token_here'
  ) {
    return {
      isValid: false,
      token,
      message:
        'Mapbox token not configured. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file.',
    };
  }

  if (!token.startsWith('pk.')) {
    return {
      isValid: false,
      token,
      message:
        'Invalid Mapbox token format. Public tokens should start with "pk."',
    };
  }

  return {
    isValid: true,
    token,
    message: 'Mapbox token configured successfully!',
  };
};

export const getEnvironmentInfo = () => {
  const mapboxCheck = checkMapboxToken();

  return {
    mapbox: mapboxCheck,
    nodeEnv: process.env.NODE_ENV,
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
};
