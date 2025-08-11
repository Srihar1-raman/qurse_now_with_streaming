import { tool } from 'ai';
import { z } from 'zod';

// Location detection tool that AI can call when needed
export const locationDetectorTool = tool({
  description: 'Detect the user\'s current location using IP geolocation. Use this tool when you need to know the user\'s location for weather, local services, or location-specific information.',
  parameters: z.object({
    reason: z.string().describe('Why you need the user\'s location (e.g., "weather request", "local search", "timezone detection")'),
    precision: z.enum(['country', 'city', 'coordinates']).default('coordinates').describe('Level of precision needed: country (general), city (specific), coordinates (exact)'),
  }),
  execute: async ({ reason, precision }) => {
    try {
      console.log(`📍 Location detection requested: ${reason} (precision: ${precision})`);
      
      // Try multiple IP geolocation services for reliability
      let locationData: any = null;
      
      try {
        // Primary service: ipapi.co
        const response = await fetch('https://ipapi.co/json/');
        locationData = await response.json();
        
        // Check for rate limiting or errors
        if (locationData.error || !locationData.latitude) {
          throw new Error(locationData.reason || 'Primary service failed');
        }
      } catch (error) {
        console.warn('Primary location service failed, trying fallback...');
        
        // Fallback service: ip-api.com
        const fallbackResponse = await fetch('http://ip-api.com/json/');
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData && fallbackData.lat && fallbackData.lon) {
          locationData = {
            latitude: fallbackData.lat,
            longitude: fallbackData.lon,
            city: fallbackData.city,
            region: fallbackData.regionName,
            country: fallbackData.country,
            country_code: fallbackData.countryCode,
            timezone: fallbackData.timezone,
            isp: fallbackData.isp
          };
        } else {
          throw new Error('All location services failed');
        }
      }
      
      // Return data based on requested precision
      if (precision === 'country') {
        return {
          success: true,
          reason: reason,
          precision: precision,
          country: locationData.country,
          country_code: locationData.country_code,
          timezone: locationData.timezone,
          message: `Detected user is in ${locationData.country}`
        };
      } else if (precision === 'city') {
        return {
          success: true,
          reason: reason,
          precision: precision,
          city: locationData.city,
          region: locationData.region,
          country: locationData.country,
          country_code: locationData.country_code,
          timezone: locationData.timezone,
          message: `Detected user is in ${locationData.city}, ${locationData.country}`
        };
      } else {
        // coordinates (default)
        return {
          success: true,
          reason: reason,
          precision: precision,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          city: locationData.city,
          region: locationData.region,
          country: locationData.country,
          country_code: locationData.country_code,
          timezone: locationData.timezone,
          message: `Detected user location: ${locationData.city}, ${locationData.country} (${locationData.latitude}, ${locationData.longitude})`
        };
      }
      
    } catch (error) {
      console.error('Location detection failed:', error);
      return {
        success: false,
        reason: reason,
        error: 'Failed to detect user location',
        message: 'Unable to determine your location. Please specify a location manually.',
        suggestion: 'Try asking with a specific location like "weather in New York" or "temperature in London"'
      };
    }
  },
}); 