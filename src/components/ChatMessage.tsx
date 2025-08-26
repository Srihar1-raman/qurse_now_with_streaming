'use client';

import React, { useState } from 'react';
import { parseReasoningResponse } from '@/lib/ai/parsing';
import { isReasoningModel } from '@/lib/ai/models';
import { useTheme } from '@/lib/ThemeContext';
import Image from 'next/image';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  model?: string;
  onRedo?: () => void | Promise<void>;
  rawResponse?: any; // Add raw response for XAI models
  reasoning?: any; // Add captured reasoning data
  sources?: Array<{
    title: string;
    relevance_score: number;
    domain: string;
    url: string;
    favicon?: string;
    arxiv_id?: string;
    authors?: string;
    abstract?: string;
    pdf_url?: string;
  }>;
  onSourcesClick?: () => void; // Add callback for sources button click
}

const ChatMessage = React.memo(function ChatMessage({ content, isUser, model, onRedo, rawResponse, reasoning, sources, onSourcesClick }: ChatMessageProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const { resolvedTheme, mounted } = useTheme();

  // Performance optimization: memoized component to reduce re-renders

  // Get the correct icon path based on theme
  const getIconSrc = (iconName: string) => {
    // Only use theme-dependent paths after component is mounted to prevent hydration mismatch
    if (!mounted) {
      return `/icon/${iconName}.svg`; // Default to light theme icons during SSR
    }
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  // Parse reasoning for bot messages from reasoning models
  const shouldParseReasoning = !isUser && model && isReasoningModel(model);
  
  console.log(`🔍 ChatMessage component:`, {
    isUser,
    model,
    shouldParseReasoning,
    contentLength: content?.length,
    rawResponseKeys: rawResponse ? Object.keys(rawResponse) : 'undefined',
    hasReasoningProp: !!reasoning,
    reasoningKeys: reasoning ? Object.keys(reasoning) : 'undefined',
    reasoningCombinedLength: reasoning?.combinedReasoning?.length || 0
  });
  
  // If we have captured reasoning data, use it directly
  let parsedResponse = null;
  if (reasoning && reasoning.combinedReasoning) {
    parsedResponse = {
      reasoning: reasoning.combinedReasoning,
      finalAnswer: content,
      hasReasoning: true
    };
  } else if (shouldParseReasoning) {
    parsedResponse = parseReasoningResponse(content, model, rawResponse);
  }
  
  const displayContent = parsedResponse?.hasReasoning ? parsedResponse.finalAnswer : content;
  
  // Performance optimization: Simple debouncing to prevent excessive markdown rendering
  const [debouncedContent, setDebouncedContent] = useState(content);
  const [shouldUseMarkdown, setShouldUseMarkdown] = useState(true);
  
  React.useEffect(() => {
    // Disable markdown rendering during rapid content changes (streaming)
    setShouldUseMarkdown(false);
    const timer = setTimeout(() => {
      setDebouncedContent(displayContent);
      setShouldUseMarkdown(true);
    }, 150); // Short delay to batch updates
    
    return () => clearTimeout(timer);
  }, [displayContent]);
  


  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
      <div style={{ maxWidth: '95%', marginLeft: isUser ? 'auto' : 0, marginRight: isUser ? 0 : 'auto' }}>

        {/* Simplified Reasoning Section - only for bot messages with reasoning */}
        {!isUser && parsedResponse?.hasReasoning && (
          <div className="reasoning-box">
            <div 
              className="reasoning-toggle-btn"
              onClick={() => setShowReasoning(!showReasoning)}
            >
              <Image src={getIconSrc("reason")} alt="Reasoning" width={12} height={12} className="reasoning-icon" />
              Reasoning 
              <Image 
                src={getIconSrc(showReasoning ? "collapse" : "expand")} 
                alt={showReasoning ? "Collapse" : "Expand"} 
                width={12} 
                height={12} 
                className="toggle-icon" 
              />
            </div>
            
            {showReasoning && (
              <div className="reasoning-content-simple">
                {parsedResponse.reasoning}
              </div>
            )}
          </div>
        )}

        {/* ArXiv Papers Inline - show top 3 papers side by side */}
        {!isUser && sources && sources.length > 0 && sources.some(s => s.domain === 'arxiv.org') && (
          <div className="arxiv-papers-wrapper">
            <div className="arxiv-papers-inline">
              {sources
                .filter(source => source.domain === 'arxiv.org')
                .slice(0, 3)
                .map((source, index) => (
                  <div 
                    key={index} 
                    className={`arxiv-paper-card arxiv-paper-${Math.min(sources.length, 3)}`}
                    onClick={() => source.pdf_url && window.open(source.pdf_url, '_blank', 'noopener,noreferrer')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="arxiv-paper-header">
                      <div className="arxiv-paper-favicon">
                        <img src={source.favicon || '/icon/arxiv-logo.svg'} alt="ArXiv" width={20} height={20} />
                      </div>
                      <div className="arxiv-paper-title">
                        {source.title}
                      </div>
                      <div className="arxiv-paper-score">
                        {Math.round((source.relevance_score || 0) * 100)}%
                      </div>
                    </div>
                    
                    {/* Automatic PDF iframe rendering */}
                    {source.pdf_url && (
                      <div className="arxiv-pdf-container">
                        <iframe
                          src={source.pdf_url}
                          width="100%"
                          height="300px"
                          style={{ border: 'none', borderRadius: '6px' }}
                          title={`PDF: ${source.title}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="message-content">
          {isUser ? (
            displayContent
          ) : (
            // Use simple text during streaming, markdown when stable
            shouldUseMarkdown ? (
              <MarkdownRenderer content={debouncedContent} />
            ) : (
              // Show plain text during streaming to prevent lag
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                fontFamily: 'inherit',
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'transparent'
              }}>
                {displayContent}
              </pre>
            )
          )}
        </div>
        
        {!isUser && (
          <div className="message-actions">
            <button onClick={copyToClipboard} className="action-btn">
              <Image src={getIconSrc("copy")} alt="Copy" width={16} height={16} className="icon" />
            </button>
            {onRedo && (
              <button 
                onClick={async () => {
                  try {
                    await onRedo();
                  } catch (error) {
                    // Silently handle error
                  }
                }} 
                className="action-btn" 
                title="Regenerate response"
              >
                <Image src={getIconSrc("redo")} alt="Redo" width={16} height={16} className="icon" />
              </button>
            )}
            
            {/* Sources Section - inline with message actions */}
            {sources && sources.length > 0 && (
              <div className="sources-box-inline">
                <button 
                  className="sources-toggle-btn"
                  onClick={onSourcesClick}
                >
                  <div className="sources-favicons">
                    {sources.slice(0, 3).map((source, index) => (
                      <div key={index} className="source-favicon-preview">
                        {source.favicon ? (
                          <img src={source.favicon} alt="" width={16} height={16} />
                        ) : (
                          <div className="source-sidebar-favicon-placeholder">
                            {source.domain.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="sources-text">Sources</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatMessage; 