import { NextRequest, NextResponse } from 'next/server';
import { arxivTool } from '@/lib/tools/arxiv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query = 'cybersecurity', maxResults = 5 } = body;

    console.log('🧪 Testing arXiv tool with query:', query, 'maxResults:', maxResults);

    // Execute the arXiv tool directly
    const result = await arxivTool.execute({
      query,
      maxResults,
      category: undefined
    });

    console.log('🧪 arXiv tool result:', JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      query,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🧪 Test arXiv error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
