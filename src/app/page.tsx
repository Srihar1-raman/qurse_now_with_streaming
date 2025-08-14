'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/components/SessionProvider';
import { useRouter } from 'next/navigation';
import HistorySidebar from '@/components/HistorySidebar';
import { MODEL_GROUPS, isReasoningModel } from '@/lib/ai-service';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('Deepseek R1 Distill 70B');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [selectedWebSearchOption, setSelectedWebSearchOption] = useState('Chat');
  const [isWebSearchDropdownOpen, setIsWebSearchDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, mounted } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  // Web search options
  const webSearchOptions = [
    { name: 'Chat', enabled: false },
    { name: 'Exa', enabled: true }
  ];

  // Get all available models from enabled groups
  const getAvailableModels = () => {
    const models: { name: string; provider: string; imageSupport?: boolean; reasoningModel?: boolean }[] = [];
    Object.values(MODEL_GROUPS).forEach(group => {
      if (group.enabled) {
        group.models.forEach(model => {
          models.push({
            name: model.name,
            provider: group.provider,
            imageSupport: model.imageSupport,
            reasoningModel: model.reasoningModel
          });
        });
      }
    });
    return models;
  };

  const availableModels = getAvailableModels();

  // Filter models based on search query
  const getFilteredModelGroups = () => {
    if (!modelSearchQuery.trim()) {
      return Object.values(MODEL_GROUPS).filter(group => group.enabled);
    }

    const query = modelSearchQuery.toLowerCase();
    return Object.values(MODEL_GROUPS)
      .filter(group => group.enabled)
      .map(group => ({
        ...group,
        models: group.models.filter(model => 
          model.name.toLowerCase().includes(query) ||
          group.provider.toLowerCase().includes(query)
        )
      }))
      .filter(group => group.models.length > 0);
  };

  // Get the correct icon path based on theme
  const getIconSrc = (iconName: string, isActive: boolean = false) => {
    // Only use theme-dependent paths after component is mounted to prevent hydration mismatch
    if (!mounted) {
      return `/icon/${iconName}.svg`; // Default to light theme icons during SSR
    }
    
    // If the icon is in an active state (like selected model), always use light icons
    // because the background is green and we need light icons for contrast
    if (isActive) {
      return `/icon_light/${iconName}.svg`;
    }
    
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  // Auto-focus input when user starts typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if any input, textarea, or editable element is currently focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      // Ignore special keys, shortcuts, and when any input is already focused
      if (
        e.ctrlKey || 
        e.metaKey || 
        e.altKey || 
        e.key === 'Tab' ||
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key.startsWith('Arrow') ||
        e.key.startsWith('F') ||
        isInputFocused
      ) {
        return;
      }

      // If it's a printable character, focus the input and add the character
      if (e.key.length === 1 && inputRef.current) {
        inputRef.current.focus();
        setInputValue(prev => prev + e.key);
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input on page load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSend = () => {
    if (inputValue.trim()) {
      // Navigate to conversation page with the message, selected model, and web search state
      const encodedMessage = encodeURIComponent(inputValue.trim());
      const encodedModel = encodeURIComponent(selectedModel);
      const webSearchParam = webSearchEnabled ? '&webSearch=true' : '';
      router.push(`/conversation?message=${encodedMessage}&model=${encodedModel}${webSearchParam}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleDeepSearch = () => {
    // Implementation for deep search
  };

  const handleInternetSearch = () => {
    setWebSearchEnabled(!webSearchEnabled);
  };

  const handleHistoryClick = () => {
    setIsHistoryOpen(true);
  };

  // Close dropdown when clicking outside and prevent page scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const modelSelectors = document.querySelectorAll('.model-selector');
      
      // Check if click is outside all model selectors
      let clickedInsideModelSelector = false;
      let clickedInsideWebSearchSelector = false;
      
      modelSelectors.forEach((selector, index) => {
        if (selector.contains(event.target as Node)) {
          if (index === 0) {
            clickedInsideModelSelector = true;
          } else {
            clickedInsideWebSearchSelector = true;
          }
        }
      });
      
      if (!clickedInsideModelSelector) {
        setIsModelDropdownOpen(false);
        setModelSearchQuery('');
      }
      
      if (!clickedInsideWebSearchSelector) {
        setIsWebSearchDropdownOpen(false);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (isModelDropdownOpen || isWebSearchDropdownOpen) {
        const modelDropdowns = document.querySelectorAll('.model-dropdown-enhanced');
        const dropdownContent = document.querySelector('.model-dropdown-content');
        
        // Check if event is inside any dropdown
        let isInsideDropdown = false;
        modelDropdowns.forEach(dropdown => {
          if (dropdown.contains(event.target as Node)) {
            isInsideDropdown = true;
          }
        });
        
        // If the event is not inside any dropdown, prevent it completely
        if (!isInsideDropdown) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
        
        // If inside dropdown content, let it scroll but prevent propagation
        if (dropdownContent && dropdownContent.contains(event.target as Node)) {
          event.stopPropagation();
        }
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isModelDropdownOpen || isWebSearchDropdownOpen) {
        const modelDropdowns = document.querySelectorAll('.model-dropdown-enhanced');
        
        // Check if event is inside any dropdown
        let isInsideDropdown = false;
        modelDropdowns.forEach(dropdown => {
          if (dropdown.contains(event.target as Node)) {
            isInsideDropdown = true;
          }
        });
        
        if (!isInsideDropdown) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if ((isModelDropdownOpen || isWebSearchDropdownOpen) && (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'PageUp' || event.key === 'PageDown' || event.key === 'Home' || event.key === 'End')) {
        const modelDropdowns = document.querySelectorAll('.model-dropdown-enhanced');
        
        // Check if event is inside any dropdown
        let isInsideDropdown = false;
        modelDropdowns.forEach(dropdown => {
          if (dropdown.contains(event.target as Node)) {
            isInsideDropdown = true;
          }
        });
        
        if (!isInsideDropdown) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      }
    };

    if (isModelDropdownOpen || isWebSearchDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
      document.addEventListener('keydown', handleKeydown, { passive: false, capture: true });
      
      // Additional aggressive prevention
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('keydown', handleKeydown);
      
      // Always restore on cleanup
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
    };
  }, [isModelDropdownOpen]);

  return (
    <div className="homepage-container">
      <Header 
        showHistoryButton={!!user}
        onHistoryClick={handleHistoryClick}
      />
      
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      
      <main className="main-content">
        <h1 className="title">Qurse</h1>
        
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            className="main-input"
            placeholder="Message Qurse..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <div className="input-actions">
            <button
              onClick={() => {/* Attach file functionality */}}
              className="input-btn attach-btn"
              title="Attach file"
            >
              <Image src={getIconSrc("attach")} alt="Attach" width={16} height={16} className="icon-sm" />
            </button>
            <button
              onClick={handleSend}
              className={`input-btn send-btn ${inputValue.trim() ? 'active' : ''}`}
              title="Send message"
              disabled={!inputValue.trim()}
            >
              <Image src={getIconSrc("send")} alt="Send" width={16} height={16} className="icon-sm" />
            </button>
          </div>
        </div>

        <div className="control-buttons">
          {/* Model Selector */}
          <div className="model-selector">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className={`control-btn model-btn ${isModelDropdownOpen ? 'active' : ''}`}
            >
              <Image src={getIconSrc("model")} alt="Model" width={14} height={14} className="icon-sm" />
              <span>{selectedModel}</span>
              <Image 
                src={getIconSrc("dropdown-arrow")} 
                alt="Dropdown" 
                width={12} 
                height={12} 
                className={`dropdown-arrow ${isModelDropdownOpen ? 'active' : ''}`}
              />
            </button>
            
            {isModelDropdownOpen && (
              <div className={`dropdown-menu model-dropdown-enhanced ${isModelDropdownOpen ? 'show' : ''}`}>
                {/* Search Bar */}
                <div className="model-search-container">
                  <div className="model-search-input-wrapper">
                    <Image 
                      src={getIconSrc("search")} 
                      alt="Search" 
                      width={16} 
                      height={16} 
                      className="model-search-icon" 
                    />
                    <input
                      type="text"
                      placeholder="Search Models..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      className="model-search-input"
                    />
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="model-dropdown-content">
                  {/* Filtered Model Groups */}
                  {getFilteredModelGroups().map((group) => (
                    <div key={group.provider} className="model-group-section">
                      <div className="model-group-header-enhanced">
                        {group.provider}
                      </div>
                      {group.models.map((model) => (
                        <div
                          key={model.name}
                          onClick={() => {
                            setSelectedModel(model.name);
                            setIsModelDropdownOpen(false);
                            setModelSearchQuery('');
                          }}
                          className={`model-item-enhanced ${selectedModel === model.name ? 'active' : ''}`}
                        >
                          <span className="model-name">{model.name}</span>
                          <div className="model-badges">
                            {model.imageSupport && (
                              <span className="image-badge">
                                <Image src={getIconSrc("image", selectedModel === model.name)} alt="Image Support" width={12} height={12} className="badge-icon" />
                              </span>
                            )}
                            {model.reasoningModel && (
                              <span className="reasoning-badge">
                                <Image src={getIconSrc("reason", selectedModel === model.name)} alt="Reasoning Model" width={12} height={12} className="badge-icon" />
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* No results message */}
                  {modelSearchQuery && getFilteredModelGroups().length === 0 && (
                    <div className="model-search-no-results">
                      No models found for "{modelSearchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Deep Search Button */}
          <button
            onClick={handleDeepSearch}
            className="control-btn"
          >
            <Image src={getIconSrc("deep_search")} alt="Deep Search" width={14} height={14} className="icon-sm" />
            <span>Deep search</span>
          </button>

          {/* Web Search Dropdown */}
          <div className="model-selector">
            <button
              onClick={() => setIsWebSearchDropdownOpen(!isWebSearchDropdownOpen)}
              className={`control-btn model-btn ${isWebSearchDropdownOpen ? 'active' : ''}`}
            >
              <Image 
                src={getIconSrc(
                  selectedWebSearchOption === 'Chat' ? 'chat' : 
                  selectedWebSearchOption === 'Exa' ? 'exa' : 
                  'internet', 
                  isWebSearchDropdownOpen
                )} 
                alt="Web Search" 
                width={14} 
                height={14} 
                className="icon-sm" 
              />
              <span>{selectedWebSearchOption}</span>
              <Image 
                src={getIconSrc("dropdown-arrow", isWebSearchDropdownOpen)} 
                alt="Dropdown" 
                width={12} 
                height={12} 
                className={`dropdown-arrow ${isWebSearchDropdownOpen ? 'active' : ''}`}
              />
            </button>
            
            {isWebSearchDropdownOpen && (
              <div className={`dropdown-menu model-dropdown-enhanced ${isWebSearchDropdownOpen ? 'show' : ''}`}>
                {/* Scrollable Content */}
                <div className="model-dropdown-content">
                  {/* Web Search Options */}
                  <div className="model-group-section">
                    <div className="model-group-header-enhanced">
                      Web Search Options
                    </div>
                    {webSearchOptions.map((option) => (
                      <div
                        key={option.name}
                        onClick={() => {
                          setSelectedWebSearchOption(option.name);
                          setWebSearchEnabled(option.enabled);
                          setIsWebSearchDropdownOpen(false);
                        }}
                        className={`model-item-enhanced ${selectedWebSearchOption === option.name ? 'active' : ''}`}
                      >
                        <span className="model-name">{option.name}</span>
                        <div className="model-badges">
                          {option.name === 'Chat' && (
                            <span className="image-badge">
                              <Image src={getIconSrc("chat", selectedWebSearchOption === option.name)} alt="Chat" width={12} height={12} className="badge-icon" />
                            </span>
                          )}
                          {option.name === 'Exa' && (
                            <span className="image-badge">
                              <Image src={getIconSrc("exa", selectedWebSearchOption === option.name)} alt="Exa" width={12} height={12} className="badge-icon" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <a href="/info?section=terms">Terms</a> • <a href="/info?section=privacy">Privacy Policy</a> • <a href="/info?section=cookies">Cookies</a>
      </footer>
    </div>
  );
}
