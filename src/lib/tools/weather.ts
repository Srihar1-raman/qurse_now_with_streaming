import { tool } from 'ai';
import { z } from 'zod';

// Weather tool that can work with location detector
export const weatherTool = tool({
  description: 'Get current weather information for a specific location. Use this tool when you need to find weather conditions, temperature, or forecast data.',
  parameters: z.object({
    location: z.string().optional().describe('City name or coordinates (e.g., "New York" or "40.7128,-74.0060"). If not provided, will use detected user location.'),
    units: z.enum(['metric', 'imperial']).default('metric').describe('Temperature units: metric (Celsius) or imperial (Fahrenheit)'),
    includeForecast: z.boolean().default(false).describe('Whether to include 5-day forecast'),
    useUserLocation: z.boolean().default(false).describe('Whether to use the user\'s detected location (call location detector first if true)'),
  }),
  execute: async ({ location, units, includeForecast, useUserLocation }) => {
    try {
      console.log(`🌤️ Weather tool called: location="${location}", units="${units}", useUserLocation=${useUserLocation}`);
      
      let weatherLocation = location;
      let coordinates = null;
      
      // If user wants to use their location but no location provided
      if (useUserLocation && !location) {
        console.log('📍 Weather tool needs user location, but location not provided');
        return {
          success: false,
          error: 'Location required',
          message: 'I need to detect your location first. Please ask me to check your location or provide a specific city.',
          suggestion: 'Try asking "What\'s the weather where I am?" or "Check my location and tell me the temperature"'
        };
      }
      
      // If location is provided, use it
      if (location) {
        weatherLocation = location;
        
        // Check if it's coordinates
        const coordMatch = location.match(/^(-?\d+\.?\d*),?\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
          coordinates = {
            lat: parseFloat(coordMatch[1]),
            lng: parseFloat(coordMatch[2])
          };
          weatherLocation = `${coordinates.lat}, ${coordinates.lng}`;
        }
      }
      
      // Example implementation - replace with actual weather API
      const weatherData = {
        location: weatherLocation || 'Unknown location',
        current: {
          temperature: units === 'metric' ? 22 : 72,
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: units === 'metric' ? 15 : 9,
          unit: units === 'metric' ? 'km/h' : 'mph',
          feelsLike: units === 'metric' ? 24 : 75
        },
        forecast: includeForecast ? [
          { day: 'Today', high: units === 'metric' ? 25 : 77, low: units === 'metric' ? 18 : 64, condition: 'Sunny' },
          { day: 'Tomorrow', high: units === 'metric' ? 23 : 73, low: units === 'metric' ? 16 : 61, condition: 'Cloudy' },
          { day: 'Wednesday', high: units === 'metric' ? 26 : 79, low: units === 'metric' ? 19 : 66, condition: 'Clear' }
        ] : undefined,
        units: units,
        coordinates: coordinates,
        timestamp: new Date().toISOString()
      };
      
      return {
        success: true,
        data: weatherData,
        message: `Weather for ${weatherData.location}: ${weatherData.current.temperature}°${units === 'metric' ? 'C' : 'F'}, ${weatherData.current.condition}`
      };
    } catch (error) {
      console.error('Weather tool error:', error);
      return {
        success: false,
        error: 'Failed to fetch weather data',
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'Sorry, I couldn\'t get the weather information right now.'
      };
    }
  },
}); 