'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import Image from 'next/image';

interface SearchStatusProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function SearchStatus({ isVisible, onComplete }: SearchStatusProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [searchResults, setSearchResults] = useState(0);
  const { resolvedTheme, mounted } = useTheme();

  const getIconSrc = (iconName: string) => {
    if (!mounted) {
      return `/icon/${iconName}.svg`;
    }
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  const steps = [
    { icon: 'search', text: 'Searching for information...' },
    { icon: 'deep_search', text: 'Analyzing sources...' },
    { icon: 'reason', text: 'Generating answer...' }
  ];

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setSearchResults(0);
      return;
    }

    // Simulate search progress
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval);
          setTimeout(() => {
            onComplete();
          }, 1000);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    // Simulate finding results
    const resultsInterval = setInterval(() => {
      setSearchResults(prev => {
        if (prev >= 4) {
          clearInterval(resultsInterval);
          return prev;
        }
        return prev + Math.floor(Math.random() * 2) + 1;
      });
    }, 800);

    return () => {
      clearInterval(stepInterval);
      clearInterval(resultsInterval);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="search-status">
      <div className="search-status-content">
        <div className="search-step">
          <Image 
            src={getIconSrc(steps[currentStep].icon)} 
            alt="Search" 
            width={16} 
            height={16} 
            className="search-icon" 
          />
          <span className="search-text">{steps[currentStep].text}</span>
        </div>
        
        {searchResults > 0 && (
          <div className="search-results">
            <span className="results-text">Found {searchResults} sources</span>
          </div>
        )}
        
        <div className="search-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
} 