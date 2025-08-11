// Simple test script for location detector and weather tools

async function testLocationDetector() {
  console.log('🧪 Testing Location Detector Tool...');
  
  let locationData = null;
  
  try {
    // Primary service: ipapi.co
    const response = await fetch('https://ipapi.co/json/');
    locationData = await response.json();
    
    console.log('📡 Primary API response:', JSON.stringify(locationData, null, 2));
    
    // Check for rate limiting or errors
    if (locationData.error || !locationData.latitude) {
      throw new Error(locationData.reason || 'Primary service failed');
    }
  } catch (error) {
    console.warn('Primary location service failed, trying fallback...');
    
    // Fallback service: ip-api.com
    try {
      const fallbackResponse = await fetch('http://ip-api.com/json/');
      const fallbackData = await fallbackResponse.json();
      
      console.log('📡 Fallback API response:', JSON.stringify(fallbackData, null, 2));
      
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
    } catch (fallbackError) {
      console.error('❌ Fallback location detection also failed:', fallbackError.message);
      return null;
    }
  }
  
  console.log('📍 Final location data:', locationData);
  return locationData;
}

async function testWeatherTool(location) {
  console.log('🌤️ Testing Weather Tool...');
  
  try {
    // Simulate weather tool response
    const weatherData = {
      location: location || 'Unknown location',
      current: {
        temperature: 22,
        condition: 'Partly Cloudy',
        humidity: 65,
        windSpeed: 15,
        unit: 'km/h',
        feelsLike: 24
      },
      units: 'metric',
      timestamp: new Date().toISOString()
    };
    
    console.log('🌤️ Weather data:', weatherData);
    return weatherData;
  } catch (error) {
    console.error('❌ Weather tool failed:', error.message);
    return null;
  }
}

async function testFullFlow() {
  console.log('🚀 Testing Full Location + Weather Flow...\n');
  
  // Step 1: Detect location
  const locationData = await testLocationDetector();
  
  if (locationData) {
    console.log('\n✅ Location detection successful!');
    
    // Step 2: Get weather for detected location
    const weatherData = await testWeatherTool(`${locationData.city}, ${locationData.country}`);
    
    if (weatherData) {
      console.log('\n✅ Weather retrieval successful!');
      console.log(`\n🎯 Final Result: It's ${weatherData.current.temperature}°C in ${weatherData.location} right now!`);
    }
  } else {
    console.log('\n❌ Location detection failed - cannot proceed with weather test');
  }
  
  console.log('\n✨ Test completed!');
}

// Run the test
testFullFlow().catch(console.error); 