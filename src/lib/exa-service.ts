import Exa from 'exa-js';

// Exa AI service for web search and content retrieval


export interface ExaSearchResult {
  url: string;
  title: string;
  content: string;
  published_date?: string;
  author?: string;
  image?: string;
  favicon?: string;
}

export interface ExaSearchResponse {
  results: ExaSearchResult[];
  query: string;
  searchTime: number;
}

export interface ExaRetrieveResult {
  url: string;
  content: string;
  title: string;
  description: string;
  author?: string;
  publishedDate?: string;
  image?: string;
  favicon?: string;
  language: string;
}

export interface ExaRetrieveResponse {
  base_url: string;
  results: ExaRetrieveResult[];
  response_time: number;
}

// Helper functions from Scira implementation
const extractDomain = (url: string): string => {
  const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
  return url.match(urlPattern)?.[1] || url;
};

const cleanTitle = (title: string): string => {
  // Remove content within square brackets and parentheses, then trim whitespace
  return title
    .replace(/\[.*?\]/g, '') // Remove [content]
    .replace(/\(.*?\)/g, '') // Remove (content)
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
};

const deduplicateByDomainAndUrl = <T extends { url: string }>(items: T[]): T[] => {
  const seenDomains = new Set<string>();
  const seenUrls = new Set<string>();
  
  return items.filter((item) => {
    const domain = extractDomain(item.url);
    const isNewUrl = !seenUrls.has(item.url);
    const isNewDomain = !seenDomains.has(domain);
    
    if (isNewUrl && isNewDomain) {
      seenUrls.add(item.url);
      seenDomains.add(domain);
      return true;
    }
    return false;
  });
};

const processDomains = (domains?: string[]): string[] | undefined => {
  if (!domains || domains.length === 0) return undefined;
  const processedDomains = domains.map((domain) => extractDomain(domain));
  return processedDomains.every((domain) => domain.trim() === '') ? undefined : processedDomains;
};

// Main Exa search function
export async function performExaSearch(
  query: string, 
  maxResults: number = 10, 
  topic: 'general' | 'news' | 'finance' = 'general',
  quality: 'default' | 'best' = 'default',
  includeDomains?: string[],
  excludeDomains?: string[]
): Promise<ExaSearchResponse> {
  try {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new Error('EXA_API_KEY is not configured');
    }

    const exa = new Exa(apiKey);
    
    console.log(`🔍 Exa search: "${query}", maxResults: ${maxResults}, topic: ${topic}, quality: ${quality}`);

    const searchOptions: any = {
      text: true,
      type: quality === 'best' ? 'auto' : 'hybrid',
      numResults: maxResults < 10 ? 10 : maxResults,
      livecrawl: 'preferred',
      useAutoprompt: true,
      category: topic === 'finance' ? 'financial report' : topic === 'news' ? 'news' : '',
    };

    const processedIncludeDomains = processDomains(includeDomains);
    if (processedIncludeDomains) {
      searchOptions.includeDomains = processedIncludeDomains;
    }

    const processedExcludeDomains = processDomains(excludeDomains);
    if (processedExcludeDomains) {
      searchOptions.excludeDomains = processedExcludeDomains;
    }

    const data = await exa.searchAndContents(query, searchOptions);
    
    const results: ExaSearchResult[] = data.results.map((result: any) => ({
      url: result.url,
      title: cleanTitle(result.title || ''),
      content: (result.text || '').substring(0, 500),
      published_date: topic === 'news' && result.publishedDate ? result.publishedDate : undefined,
      author: result.author || undefined,
      image: result.image || undefined,
      favicon: result.favicon || undefined,
    }));

    return {
      results: deduplicateByDomainAndUrl(results),
      query,
      searchTime: Date.now()
    };
  } catch (error) {
    console.error('Exa search error:', error);
    throw error;
  }
}

// Content retrieval function
export async function retrieveExaContent(
  url: string,
  includeSummary: boolean = true,
  liveCrawl: 'never' | 'auto' | 'always' = 'always'
): Promise<ExaRetrieveResponse> {
  try {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new Error('EXA_API_KEY is not configured');
    }

    const exa = new Exa(apiKey);
    
    console.log(`📄 Exa retrieve: ${url}, summary: ${includeSummary}, livecrawl: ${liveCrawl}`);

    const start = Date.now();
    
    const result = await exa.getContents([url], {
      text: true,
      summary: includeSummary ? true : undefined,
      livecrawl: liveCrawl,
    });

    if (!result.results || result.results.length === 0) {
      console.error('Exa AI error: No content retrieved');
      return {
        base_url: url,
        results: [],
        response_time: (Date.now() - start) / 1000
      };
    }

    return {
      base_url: url,
      results: result.results.map((item) => {
        const typedItem = item as any;
        return {
          url: item.url,
          content: typedItem.text || typedItem.summary || '',
          title: typedItem.title || item.url.split('/').pop() || 'Retrieved Content',
          description: typedItem.summary || `Content retrieved from ${item.url}`,
          author: typedItem.author || undefined,
          publishedDate: typedItem.publishedDate || undefined,
          image: typedItem.image || undefined,
          favicon: typedItem.favicon || undefined,
          language: 'en',
        };
      }),
      response_time: (Date.now() - start) / 1000,
    };
  } catch (error) {
    console.error('Exa retrieve error:', error);
    throw error;
  }
}

// Format search results for AI (similar to Tavily service)
export function formatExaSearchResultsForAI(searchResponse: ExaSearchResponse, isReasoningModel: boolean = false): string {
  if (!searchResponse.results || searchResponse.results.length === 0) {
    return 'No search results found.';
  }

  let formattedResults = `WEB SEARCH DATA (NOT REASONING - USE THIS INFORMATION TO ANSWER):\n\n`;
  
  searchResponse.results.forEach((result, index) => {
    formattedResults += `SOURCE ${index + 1}: ${result.title}\n`;
    formattedResults += `URL: ${result.url}\n`;
    if (result.author) {
      formattedResults += `AUTHOR: ${result.author}\n`;
    }
    if (result.published_date) {
      formattedResults += `DATE: ${result.published_date}\n`;
    }
    formattedResults += `DATA: ${result.content}\n\n`;
  });

  if (isReasoningModel) {
    formattedResults += `INSTRUCTIONS: Analyze the above web data and provide your reasoning in <think> tags, then give a clear answer. Do NOT list the sources in your reasoning - use them to think through the problem.`;
  } else {
    formattedResults += `INSTRUCTIONS: Analyze the above web data and provide a clear, direct answer. Do NOT use <think> tags or list the sources - synthesize the information into a coherent response.`;
  }

  return formattedResults;
} 