import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/ThemeContext';

interface Source {
  title: string;
  relevance_score: number;
  domain: string;
  url: string;
  favicon?: string;
  // arXiv-specific fields
  arxiv_id?: string;
  authors?: string;
  abstract?: string;
  submission_date?: string;
  pdf_url?: string;
}

interface SourcesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sources: Source[];
}

export default function SourcesSidebar({ isOpen, onClose, sources }: SourcesSidebarProps) {
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

  if (!isOpen) return null;

  return (
    <div className="sources-sidebar">
      <div className="sources-sidebar-header">
        <h3>Sources ({sources.length})</h3>
        <button onClick={onClose} className="sources-close-btn">
          <Image src={getIconSrc("cross")} alt="Close" width={16} height={16} />
        </button>
      </div>
      
      <div className="sources-sidebar-content">
        {sources.map((source, index) => (
          <div 
            key={index} 
            className="source-sidebar-item"
            onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')}
          >
            <div className="source-sidebar-header">
              <div className="source-sidebar-favicon">
                {source.favicon ? (
                  <img src={source.favicon} alt="" width={20} height={20} />
                ) : (
                  <div className="source-sidebar-favicon-placeholder">
                    {source.domain.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="source-sidebar-info">
                <div className="source-sidebar-title">{source.title}</div>
                <div className="source-sidebar-domain">{source.domain}</div>
                {/* Show arXiv-specific information */}
                {source.arxiv_id && (
                  <div className="source-sidebar-arxiv-info">
                    <div className="source-sidebar-authors">
                      {source.authors && `Authors: ${source.authors}`}
                    </div>
                    {source.submission_date && (
                      <div className="source-sidebar-date">
                        Submitted: {source.submission_date}
                      </div>
                    )}
                    {source.abstract && (
                      <div className="source-sidebar-abstract">
                        {source.abstract.length > 150 
                          ? `${source.abstract.substring(0, 150)}...` 
                          : source.abstract}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="source-sidebar-score">
                {Math.round(source.relevance_score * 100)}%
              </div>
            </div>
            {/* Show PDF link for arXiv papers */}
            {source.pdf_url && (
              <div className="source-sidebar-actions">
                <button 
                  className="source-sidebar-pdf-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(source.pdf_url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  View PDF
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
