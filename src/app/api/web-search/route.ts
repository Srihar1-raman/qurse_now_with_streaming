import { NextRequest, NextResponse } from 'next/server';
import { performExaSearch, formatExaSearchResultsForAI } from '@/lib/exa-service';

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 5, isReasoningModel = false } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required and must be a string' }, { status: 400 });
    }

    console.log('Performing Exa web search for:', query, 'isReasoningModel:', isReasoningModel);
    const searchResults = await performExaSearch(query, maxResults, 'general', 'default');
    const formattedResults = formatExaSearchResultsForAI(searchResults, isReasoningModel);

    return NextResponse.json({
      success: true,
      results: searchResults,
      formattedResults
    });

  } catch (error) {
    console.error('Web search API error:', error);
    return NextResponse.json(
      { error: 'Web search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 