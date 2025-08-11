// Tavily web search service
export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilySearchResponse {
  results: TavilySearchResult[];
  query: string;
  searchTime: number;
}

export async function performTavilySearch(query: string, maxResults: number = 5, timePeriod: string = '1d'): Promise<TavilySearchResponse> {
  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY not found in environment variables');
    }

    // Add current date and "latest" to query for more recent results
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentYear = new Date().getFullYear();
    let enhancedQuery = query;
    
    // Always ensure we get the latest results
    if (query.toLowerCase().includes('2023') || query.toLowerCase().includes('2024')) {
      // Replace old years with current year
      enhancedQuery = query.replace(/2023|2024/g, currentYear.toString());
    } else if (!query.toLowerCase().includes('latest') && !query.toLowerCase().includes('recent') && !query.toLowerCase().includes(currentYear.toString())) {
      enhancedQuery = `${query} latest ${currentYear} today ${currentDate}`;
    } else {
      // Always add current year to ensure latest results
      enhancedQuery = `${query} ${currentYear} ${currentDate}`;
    }

    console.log(`🔍 Enhanced search query: "${enhancedQuery}"`);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
              body: JSON.stringify({
          query: enhancedQuery,
          search_depth: 'advanced', // Use advanced for better relevance
          max_results: maxResults,
          include_answer: false,
          include_raw_content: true,
          include_images: false,
          time_period: timePeriod, // Get results from the specified time period
          sort_by: 'date', // Sort by date to get the most recent results first
          include_domains: [
            'amazon.in', 'flipkart.com', 'reliance-digital.com', 'apple.com', 'gadgets360.com', '91mobiles.com',
            'news.google.com', 'reuters.com', 'bloomberg.com', 'cnn.com', 'bbc.com', 'nytimes.com', 'wsj.com', 'techcrunch.com'
          ], // Include e-commerce and tech sites
          exclude_domains: ['wikipedia.org', 'reddit.com', 'stackoverflow.com', 'quora.com'] // Exclude unreliable sites
        })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    return {
      results: data.results || [],
      query,
      searchTime: Date.now()
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    throw error;
  }
}

export function formatSearchResultsForAI(searchResponse: TavilySearchResponse, isReasoningModel: boolean = false): string {
  if (!searchResponse.results || searchResponse.results.length === 0) {
    return 'No search results found.';
  }

  let formattedResults = `WEB SEARCH DATA (NOT REASONING - USE THIS INFORMATION TO ANSWER):\n\n`;
  
  searchResponse.results.forEach((result, index) => {
    formattedResults += `SOURCE ${index + 1}: ${result.title}\n`;
    formattedResults += `URL: ${result.url}\n`;
    formattedResults += `DATA: ${result.content}\n\n`;
  });

  if (isReasoningModel) {
    formattedResults += `INSTRUCTIONS: Analyze the above web data and provide your reasoning in <think> tags, then give a clear answer. Do NOT list the sources in your reasoning - use them to think through the problem.`;
  } else {
    formattedResults += `INSTRUCTIONS: Analyze the above web data and provide a clear, direct answer. Do NOT use <think> tags or list the sources - synthesize the information into a coherent response.`;
  }

  return formattedResults;
} 