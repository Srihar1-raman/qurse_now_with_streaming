import React, { useState, useEffect, useRef } from 'react';
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

  // Helper function to extract domain from source
  const getDomain = (source: any): string => {
    let domain = source.domain;
    if (!domain && source.url) {
      try {
        domain = new URL(source.url).hostname;
      } catch (e) {
        domain = source.url;
      }
    }
    return domain || 'Unknown source';
  };
  const [expandedPdfs, setExpandedPdfs] = useState<Set<number>>(new Set());
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Get the correct icon path based on theme
  const getIconSrc = (iconName: string) => {
    // Only use theme-dependent paths after component is mounted to prevent hydration mismatch
    if (!mounted) {
      return `/icon/${iconName}.svg`; // Default to light theme icons during SSR
    }
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  const togglePdfExpansion = (index: number) => {
    const newExpanded = new Set(expandedPdfs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPdfs(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <div className="sources-sidebar" ref={sidebarRef}>
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
          >
            <div 
              className="source-sidebar-header"
              onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')}
              style={{ cursor: 'pointer' }}
            >
              <div className="source-sidebar-favicon">
                {source.favicon ? (
                  <img src={source.favicon} alt="" width={20} height={20} />
                ) : (
                  <div className="source-sidebar-favicon-placeholder">
                    {(getDomain(source) || source.title || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="source-sidebar-info">
                <div className="source-sidebar-title">{source.title}</div>
                <div className="source-sidebar-domain">
                  {getDomain(source)}
                </div>
              </div>
              <div className="source-sidebar-score">
                {Math.round(source.relevance_score * 100)}%
              </div>
            </div>
            
            {/* Show PDF controls for arXiv papers */}
            {source.pdf_url && (
              <div className="source-sidebar-actions">
                <button 
                  className={`source-sidebar-toggle-pdf-btn ${expandedPdfs.has(index) ? 'expanded' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePdfExpansion(index);
                  }}
                >
                  {expandedPdfs.has(index) ? 'Hide PDF' : 'Show PDF'}
                </button>
              </div>
            )}

            {/* Expandable PDF Container */}
            {source.pdf_url && expandedPdfs.has(index) && (
              <div className="source-sidebar-pdf-container">
                <iframe
                  src={source.pdf_url}
                  width="100%"
                  height="600px"
                  style={{ border: 'none' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
