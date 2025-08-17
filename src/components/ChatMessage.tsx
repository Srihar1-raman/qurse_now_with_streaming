'use client';

import { useState } from 'react';
import { parseReasoningResponse, isReasoningModel } from '@/lib/ai-service';
import { useTheme } from '@/lib/ThemeContext';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkBracketMath } from '@/lib/remark-bracket-math';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, ExternalLink } from 'lucide-react';

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
  }>;
  onSourcesClick?: () => void; // Add callback for sources button click
}

export default function ChatMessage({ content, isUser, model, onRedo, rawResponse, reasoning, sources, onSourcesClick }: ChatMessageProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const { resolvedTheme, mounted } = useTheme();

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
  
  // Enhanced Code Block Component
  const CodeBlock = ({ language, children }: { language?: string; children: string }) => {
    const [copied, setCopied] = useState(false);
    const { resolvedTheme } = useTheme();

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    };

    return (
      <div className="enhanced-code-block">
        <div className="code-header">
          {language && <span className="language-tag">{language}</span>}
          <button 
            onClick={handleCopy}
            className="copy-button"
            title="Copy code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="code-content">
          <SyntaxHighlighter
            language={language || 'text'}
            style={resolvedTheme === 'dark' ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              borderRadius: '0 0 8px 8px',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
            showLineNumbers={true}
            lineNumberStyle={{
              color: 'var(--color-text-secondary)',
              paddingRight: '1rem',
              minWidth: '2.5rem',
              textAlign: 'right',
              userSelect: 'none',
              fontSize: '0.75rem',
            }}
            PreTag={({ children, ...props }) => (
              <pre {...props} className="syntax-highlighter-pre">
                {children}
              </pre>
            )}
          >
            {children}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  };

  // Enhanced Inline Code Component
  const InlineCode = ({ children }: { children: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    };

    // Detect if this is explanatory code (short, simple terms like "row == n", "columns", "pos_diag", "O(V^2)")
    const trimmedChildren = children.trim();
    
    // More aggressive detection for explanatory text
    const isExplanatory = (
      trimmedChildren.length <= 30 && 
      !trimmedChildren.includes('\n') &&
      !trimmedChildren.includes('```') &&
      (
                          // Simple mathematical expressions
                  /^[a-zA-Z0-9\s=<>+\-*/()\[\]{}.,;:_^]+$/.test(trimmedChildren) ||
                  // File extensions and simple commands
                  /^[a-zA-Z0-9._-]+$/.test(trimmedChildren) ||
                  // Simple mathematical notation (but not complex math that should use KaTeX)
                  /^[O()VE+\-*/^=<>0-9\s]+$/.test(trimmedChildren) &&
                  !trimmedChildren.includes('\\') // Don't treat LaTeX as explanatory
      )
    );
    const codeClass = isExplanatory ? "enhanced-inline-code explanatory" : "enhanced-inline-code";

    return (
      <code 
        className={codeClass}
        onClick={isExplanatory ? undefined : handleCopy}
        title={isExplanatory ? undefined : (copied ? 'Copied!' : 'Click to copy')}
      >
        {children}
      </code>
    );
  };

  // Enhanced Table Component
  const Table = ({ children }: { children: React.ReactNode }) => (
    <div className="enhanced-table-wrapper">
      <table className="enhanced-table">{children}</table>
    </div>
  );

  // Enhanced Link Component
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isExternal = href.startsWith('http');
    
    return (
      <a 
        href={href} 
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="enhanced-link"
      >
        {children}
        {isExternal && <ExternalLink size={12} className="external-link-icon" />}
      </a>
    );
  };

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

        <div className="message-content">
          {isUser ? (
            displayContent
          ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath, remarkBracketMath]}
              rehypePlugins={[[rehypeKatex, { 
                strict: false,
                trust: true,
                output: 'html',
                displayMode: false
              }]]}
              components={{
                // Enhanced markdown components
                h1: ({children}) => <h1 className="enhanced-heading h1">{children}</h1>,
                h2: ({children}) => <h2 className="enhanced-heading h2">{children}</h2>,
                h3: ({children}) => <h3 className="enhanced-heading h3">{children}</h3>,
                h4: ({children}) => <h4 className="enhanced-heading h4">{children}</h4>,
                h5: ({children}) => <h5 className="enhanced-heading h5">{children}</h5>,
                h6: ({children}) => <h6 className="enhanced-heading h6">{children}</h6>,
                
                p: ({children}) => <p className="enhanced-paragraph">{children}</p>,
                
                ul: ({children}) => <ul className="enhanced-list ul">{children}</ul>,
                ol: ({children}) => <ol className="enhanced-list ol">{children}</ol>,
                li: ({children}) => <li className="enhanced-list-item">{children}</li>,
                
                strong: ({children}) => <strong className="enhanced-strong">{children}</strong>,
                em: ({children}) => <em className="enhanced-em">{children}</em>,
                
                code: ({inline, className, children}: any) => {
                  const language = className ? className.replace('language-', '') : undefined;
                  const content = String(children);
                  
                  // Check if this should be treated as explanatory text even if it's a block
                  const trimmedContent = content.trim();
                  
                  // More aggressive detection for explanatory text
                  const isExplanatory = (
                    trimmedContent.length <= 30 && 
                    !trimmedContent.includes('\n') &&
                    !trimmedContent.includes('```') &&
                    (
                                        // Simple mathematical expressions
                  /^[a-zA-Z0-9\s=<>+\-*/()\[\]{}.,;:_^]+$/.test(trimmedContent) ||
                  // File extensions and simple commands
                  /^[a-zA-Z0-9._-]+$/.test(trimmedContent) ||
                  // Simple mathematical notation (but not complex math that should use KaTeX)
                  /^[O()VE+\-*/^=<>0-9\s]+$/.test(trimmedContent) &&
                  !trimmedContent.includes('\\') // Don't treat LaTeX as explanatory
                    )
                  );
                  
                  if (inline || isExplanatory) {
                    return <InlineCode>{content}</InlineCode>;
                  } else {
                    return <CodeBlock language={language}>{content}</CodeBlock>;
                  }
                },
                
                pre: ({children}) => <>{children}</>,
                
                blockquote: ({children}) => (
                  <blockquote className="enhanced-blockquote">
                    {children}
                  </blockquote>
                ),
                
                table: ({children}) => <Table>{children}</Table>,
                thead: ({children}) => <thead className="enhanced-thead">{children}</thead>,
                tbody: ({children}) => <tbody className="enhanced-tbody">{children}</tbody>,
                tr: ({children}) => <tr className="enhanced-tr">{children}</tr>,
                th: ({children}) => <th className="enhanced-th">{children}</th>,
                td: ({children}) => <td className="enhanced-td">{children}</td>,
                
                a: ({href, children}) => <Link href={href || '#'}>{children}</Link>,
                
                hr: () => <hr className="enhanced-hr" />,
                
                // Task lists
                input: ({checked, type}) => {
                  if (type === 'checkbox') {
                    return (
                      <input 
                        type="checkbox" 
                        checked={checked || false} 
                        readOnly 
                        className="enhanced-checkbox"
                      />
                    );
                  }
                  return null;
                },
              }}
            >
              {displayContent}
            </ReactMarkdown>
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
} 