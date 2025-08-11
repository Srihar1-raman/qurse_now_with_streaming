import { performExaSearch } from './exa-service';
import { tool } from 'ai';
import { z } from 'zod';

// Proper Vercel AI SDK tool definition for aggressive web search using Exa AI
export const aggressiveWebSearchTool = tool({
  description: 'Search the web for current information using Exa AI. Use this tool when you need to find recent news, facts, or updates to answer questions accurately.',
  parameters: z.object({
    queries: z.array(z.string().describe('Array of search queries to perform')),
    strategy: z.enum(['quick', 'deep', 'breaking', 'expert', 'historical']).default('deep').describe('Search strategy to use'),
    maxResults: z.number().min(1).max(5).default(2).describe('Maximum number of results per query (1-5)'),
    quality: z.enum(['default', 'best']).default('default').describe('Search quality: default=faster, best=better quality'),
    topic: z.enum(['general', 'news', 'finance']).default('general').describe('Topic type: general, news, or finance'),
    timePeriod: z.enum(['1h', '1d', '1w', '1m', 'recent']).optional().describe('Time period for results (legacy parameter, mapped to topic)'),
    maxQueries: z.number().min(1).max(8).default(3).describe('Maximum number of queries to execute (1-8)'),
  }),
  execute: async ({ queries, strategy, maxResults, quality, topic, timePeriod, maxQueries }) => {
    // Map timePeriod to topic if provided (backward compatibility)
    let effectiveTopic = topic;
    if (timePeriod) {
      if (timePeriod === 'recent' || timePeriod === '1h' || timePeriod === '1d') {
        effectiveTopic = 'news';
      } else if (timePeriod === '1w' || timePeriod === '1m') {
        effectiveTopic = 'general';
      }
    }
    
    console.log(`🔍 AI-controlled Exa search: strategy="${strategy}", maxResults=${maxResults}, quality="${quality}", topic="${effectiveTopic}"${timePeriod ? `, timePeriod="${timePeriod}"` : ''}, queries=${Math.min(queries.length, maxQueries)}`);
    
    // Limit queries based on AI's choice
    const limitedQueries = queries.slice(0, maxQueries);
    const allResults: any[] = [];
    
    for (const query of limitedQueries) {
      try {
        console.log(`🔍 Exa searching: ${query}`);
        const searchResponse = await performExaSearch(query, maxResults, effectiveTopic, quality);
        
        if (searchResponse.results && searchResponse.results.length > 0) {
          const formattedResults = searchResponse.results.map((result, index) => ({
            query,
            source: `${index + 1}`,
            title: result.title,
            url: result.url,
            content: result.content,
            author: result.author,
            published_date: result.published_date,
            image: result.image
          }));
          
          allResults.push(...formattedResults);
        }
      } catch (error) {
        console.error(`Exa search failed for "${query}":`, error);
      }
    }
    
    // Store the results globally so we can access them later
    console.log('🔍 Storing aggressive search results globally:', allResults);
    (global as any).lastSearchResults = allResults;
    
    return {
      totalQueries: limitedQueries.length,
      totalResults: allResults.length,
      strategy: strategy,
      maxResults: maxResults,
      quality: quality,
      topic: effectiveTopic,
      timePeriod: timePeriod,
      results: allResults,
      summary: `AI chose: ${strategy} strategy, ${maxResults} results/query, ${quality} quality, ${effectiveTopic} topic${timePeriod ? `, ${timePeriod} time` : ''}, ${limitedQueries.length} queries. Found ${allResults.length} total results.`
    };
  },
});

 