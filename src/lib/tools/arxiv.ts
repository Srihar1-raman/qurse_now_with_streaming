import { tool } from 'ai';
import { z } from 'zod';

// Function to extract paper information from arXiv search results page content
function extractArxivPapers(content: string, maxResults: number) {
  const papers = [];
  
  try {
    // Split content into paper blocks - arXiv search results are numbered (1., 2., 3., etc.)
    const paperMatches = content.match(/\d+\.\s+arXiv:[\d\.]+[\s\S]*?(?=\d+\.\s+arXiv:|\n\n\nPrevious|\nSearch v\d|$)/g);
    
    if (paperMatches) {
      for (let i = 0; i < Math.min(paperMatches.length, maxResults); i++) {
        const paperBlock = paperMatches[i];
        
        // Extract arXiv ID
        const arxivIdMatch = paperBlock.match(/arXiv:([\d\.]+v?\d*)/);
        const arxivId = arxivIdMatch ? arxivIdMatch[1] : null;
        
        if (!arxivId) continue;
        
        // Extract title (after the arXiv ID and before "Authors:")
        const titleMatch = paperBlock.match(/arXiv:[\d\.]+v?\d*\s+\[[^\]]+\][\s\S]*?\n\s*([^\n]+?)(?:\s*Authors:|$)/);
        const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
        
        // Extract authors
        const authorsMatch = paperBlock.match(/Authors:\s*([^\n]+)/);
        const authors = authorsMatch ? authorsMatch[1].trim() : 'Unknown Authors';
        
        // Extract categories
        const categoriesMatch = paperBlock.match(/arXiv:[\d\.]+v?\d*\s+\[([^\]]+)\]/);
        const categories = categoriesMatch ? categoriesMatch[1].trim() : '';
        
        // Extract abstract
        const abstractMatch = paperBlock.match(/Abstract:\s*([\s\S]*?)(?:\s*△\s*Less|\s*Submitted|\s*Comments:|$)/);
        let abstract = abstractMatch ? abstractMatch[1].trim() : 'Abstract not available';
        
        // Clean up abstract - remove "More" and other artifacts
        abstract = abstract.replace(/…▽\s*More\s*/g, '').replace(/▽\s*More\s*/g, '').trim();
        // Limit abstract length to reduce token usage
        if (abstract.length > 300) {
          abstract = abstract.substring(0, 300) + '...';
        }
        
        // Extract submission date
        const dateMatch = paperBlock.match(/Submitted\s+([^;]+)/);
        const submissionDate = dateMatch ? dateMatch[1].trim() : 'Unknown Date';
        
        // Extract comments (pages, figures, etc.)
        const commentsMatch = paperBlock.match(/Comments:\s*([^\n]+)/);
        const comments = commentsMatch ? commentsMatch[1].trim() : '';
        
        // Extract journal reference
        const journalMatch = paperBlock.match(/Journal ref:\s*([^\n]+)/);
        const journalRef = journalMatch ? journalMatch[1].trim() : '';
        
        // Extract MSC/ACM class
        const mscMatch = paperBlock.match(/MSC Class:\s*([^\n]+)/);
        const acmMatch = paperBlock.match(/ACM Class:\s*([^\n]+)/);
        const classification = mscMatch ? `MSC: ${mscMatch[1].trim()}` : 
                              acmMatch ? `ACM: ${acmMatch[1].trim()}` : '';
        
        papers.push({
          arxiv_id: arxivId,
          title: title,
          authors: authors,
          categories: categories,
          abstract: abstract,
          submission_date: submissionDate,
          comments: comments,
          journal_ref: journalRef,
          classification: classification,
          url: `https://arxiv.org/abs/${arxivId}`,
          pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
          relevance_score: Math.max(0.1, 1 - (papers.length * 0.1))
        });
      }
    }
  } catch (error) {
    console.error('Error extracting arXiv papers:', error);
  }
  
  return papers;
}

// arXiv research paper search tool using Tavily Crawl
export const arxivTool = tool({
  description: 'Search arXiv for research papers on a specific topic and use their content to answer the user\'s question. IMPORTANT: After finding papers, you MUST answer the user\'s question using the information from these papers - do not just list papers!',
  parameters: z.object({
    query: z.string().describe('The research topic or question to search for on arXiv'),
    maxResults: z.number().min(1).max(15).default(5).describe('Maximum number of papers to return (1-15, recommended: 5, 8, or 10). Keep lower for GROQ models due to token limits.'),
    searchType: z.enum(['all', 'title', 'author', 'abstract', 'comments', 'journal_ref', 'paper_id']).default('all').describe('Type of search to perform'),
    sortOrder: z.enum(['-announced_date_first', 'announced_date_first', '-submitted_date', 'submitted_date', 'relevance']).default('-announced_date_first').describe('Sort order for results'),
  }),
  execute: async ({ query, maxResults, searchType, sortOrder }) => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        throw new Error('TAVILY_API_KEY not found in environment variables');
      }

      // Construct proper arXiv search URL with correct format
      const cleanQuery = query.replace(/\s+/g, '+'); // Replace spaces with +
      const size = maxResults <= 25 ? 25 : 50; // arXiv only supports 25 or 50
      const orderParam = sortOrder === 'relevance' ? '' : `&order=${sortOrder}`;
      
      const arxivSearchUrl = `https://arxiv.org/search/?searchtype=${searchType}&query=${cleanQuery}&abstracts=show&size=${size}${orderParam}`;
      console.log('🔍 Crawling arXiv search URL:', arxivSearchUrl);

      // Use Tavily Crawl to search arXiv results page
      const response = await fetch('https://api.tavily.com/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          url: arxivSearchUrl,
          instructions: `Extract comprehensive arXiv paper information from the search results page including: arXiv IDs, titles, authors, abstracts, categories, submission dates, comments, and classification codes. Focus on structured paper listings with all metadata.`,
          max_depth: 1,
          max_breadth: 5,
          limit: 5,
          extract_depth: 'advanced',
          include_raw_content: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily Crawl API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Log the raw Tavily response for debugging
      console.log('🔍 Raw Tavily Crawl Response:', JSON.stringify(data, null, 2));
      
      // Process and extract papers from arXiv search results page
      const papers = [];
      if (data.results && Array.isArray(data.results)) {
        for (const result of data.results) {
          if (result.content) {
            // Extract papers from the arXiv search results page content
            const paperBlocks = extractArxivPapers(result.content, maxResults);
            papers.push(...paperBlocks);
            
            if (papers.length >= maxResults) {
              papers.splice(maxResults); // Trim to exact maxResults
              break;
            }
          }
        }
      }

      // If no papers found through crawling, try a fallback search approach
      if (papers.length === 0) {
        console.log('No papers found through crawling, trying fallback search...');
        
        // Use enhanced Tavily Search as fallback for arXiv
        const enhancedQuery = `"${query}" arXiv research papers`;
        const searchResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            query: `${enhancedQuery} site:arxiv.org`,
            search_depth: 'advanced',
            max_results: Math.min(maxResults * 2, 10),
            include_answer: false,
            include_raw_content: true,
            include_images: false,
            include_domains: ['arxiv.org']
          })
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.results && Array.isArray(searchData.results)) {
            for (const result of searchData.results) {
              if (result.url && result.url.includes('/abs/')) {
                const arxivId = result.url.split('/abs/')[1]?.split('?')[0];
                if (arxivId && arxivId.match(/^\d{4}\.\d{4,5}(v\d+)?$/)) {
                  // Extract metadata from fallback search
                  let title = result.title || 'Unknown Title';
                  let authors = 'Authors not available';
                  let abstract = result.content || 'Abstract not available';
                  
                  // Clean up title
                  title = title.replace(/^\[.*?\]\s*/, '').replace(/^arXiv:\d+\.\d+\s*/i, '');
                  
                  // Try to extract authors from content
                  if (result.raw_content) {
                    const authorMatch = result.raw_content.match(/Authors?:\s*([^\n\r]+)/i);
                    if (authorMatch) {
                      authors = authorMatch[1].trim();
                    }
                  }
                  
                  papers.push({
                    arxiv_id: arxivId,
                    title: title,
                    authors: authors,
                    categories: '',
                    abstract: abstract.length > 300 ? abstract.substring(0, 300) + '...' : abstract,
                    submission_date: 'Date not available',
                    comments: '',
                    journal_ref: '',
                    classification: '',
                    url: result.url,
                    pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
                    relevance_score: Math.max(0.1, 1 - (papers.length * 0.1))
                  });

                  if (papers.length >= maxResults) {
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // Trim results for token efficiency (especially for GROQ models)
      const trimmedPapers = papers.slice(0, maxResults).map(paper => ({
        ...paper,
        // Further trim abstracts if we have many papers
        abstract: papers.length > 5 ? 
          (paper.abstract.length > 200 ? paper.abstract.substring(0, 200) + '...' : paper.abstract) : 
          paper.abstract,
        // Shorten author lists if too long
        authors: paper.authors.length > 150 ? paper.authors.substring(0, 150) + '...' : paper.authors
      }));

      // Store the results globally so they can be captured by the AI system
      if (trimmedPapers.length > 0) {
        console.log(`🔍 Storing ${trimmedPapers.length} arXiv results globally (trimmed for token efficiency)`);
        (global as any).lastSearchResults = trimmedPapers.map(paper => ({
          title: paper.title,
          url: paper.url,
          content: paper.abstract,
          author: paper.authors,
          published_date: paper.submission_date,
          arxiv_id: paper.arxiv_id,
          pdf_url: paper.pdf_url,
          categories: paper.categories,
          comments: paper.comments,
          journal_ref: paper.journal_ref,
          classification: paper.classification,
          relevance_score: paper.relevance_score
        }));
      }

      console.log(`🔍 arXiv search completed: ${papers.length} papers found using ${papers.length > 0 ? 'crawl' : 'fallback'} method`);

      return {
        query: query,
        search_type: searchType,
        sort_order: sortOrder,
        total_papers_found: trimmedPapers.length,
        papers: trimmedPapers,
        search_method: trimmedPapers.length > 0 ? 'crawl' : 'fallback_search',
        token_optimized: true,
        // Add results in the format expected by the AI system for source capture
        results: trimmedPapers.map(paper => ({
          title: paper.title,
          url: paper.url,
          content: paper.abstract,
          author: paper.authors,
          published_date: paper.submission_date,
          arxiv_id: paper.arxiv_id,
          pdf_url: paper.pdf_url,
          categories: paper.categories,
          comments: paper.comments,
          journal_ref: paper.journal_ref,
          classification: paper.classification,
          relevance_score: paper.relevance_score
        }))
      };

    } catch (error) {
      console.error('arXiv search error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to search arXiv: ${errorMessage}`);
    }
  },
});
