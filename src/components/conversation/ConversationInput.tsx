import { useState } from 'react';
import Image from 'next/image';
import { MODEL_GROUPS } from '@/lib/ai-service';
import { WebSearchOption } from '@/types/conversation';

interface ConversationInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSend: (e?: React.FormEvent) => void;
  isLoading: boolean;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isInputModelDropdownOpen: boolean;
  setIsInputModelDropdownOpen: (open: boolean) => void;
  modelSearchQuery: string;
  setModelSearchQuery: (query: string) => void;
  selectedWebSearchOption: string;
  setSelectedWebSearchOption: (option: string) => void;
  isWebSearchDropdownOpen: boolean;
  setIsWebSearchDropdownOpen: (open: boolean) => void;
  setShowWebModeSuggestion: (show: boolean) => void;
  webSearchOptions: WebSearchOption[];
  getFilteredModelGroups: () => any[];
  getIconSrc: (iconName: string, isActive?: boolean) => string;
  user: any;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export default function ConversationInput({
  input,
  handleInputChange,
  handleSend,
  isLoading,
  selectedModel,
  setSelectedModel,
  isInputModelDropdownOpen,
  setIsInputModelDropdownOpen,
  modelSearchQuery,
  setModelSearchQuery,
  selectedWebSearchOption,
  setSelectedWebSearchOption,
  isWebSearchDropdownOpen,
  setIsWebSearchDropdownOpen,
  setShowWebModeSuggestion,
  webSearchOptions,
  getFilteredModelGroups,
  getIconSrc,
  user,
  textareaRef,
}: ConversationInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-section">
      <div className="input-section-content">
        <div className="input-container conversation-input-container">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Message Qurse..."
            className="main-input conversation-input"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 200) + 'px';
            }}
          />

          {/* Background strip behind buttons */}
          <div className="input-buttons-background"></div>

          {/* Bottom Left - Model Selector and Attach Button */}
          <div className="input-actions-left">
            {/* Model Selector Button */}
            <div className="input-model-selector">
              <button
                type="button"
                onClick={() => setIsInputModelDropdownOpen(!isInputModelDropdownOpen)}
                className="input-btn model-selector-btn"
                title="Select model"
              >
                <Image src={getIconSrc("model")} alt="Model" width={16} height={16} className="icon-sm" />
              </button>

              {isInputModelDropdownOpen && (
                <div className={`input-dropdown-menu model-dropdown-enhanced ${isInputModelDropdownOpen ? 'show' : ''}`}>
                  {/* Search Bar */}
                  <div className="model-search-container">
                    <div className="model-search-input-wrapper">
                      <Image
                        src={getIconSrc("search")}
                        alt="Search"
                        width={14}
                        height={14}
                        className="model-search-icon"
                      />
                      <input
                        type="text"
                        placeholder="Search Models..."
                        value={modelSearchQuery}
                        onChange={(e) => setModelSearchQuery(e.target.value)}
                        className="model-search-input model-search-input-small"
                      />
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="model-dropdown-content">
                    {/* Filtered Model Groups */}
                    {getFilteredModelGroups().map((group) => (
                      <div key={group.provider} className="model-group-section">
                        <div className="model-group-header-enhanced model-group-header-small">
                          {group.provider}
                        </div>
                        {group.models.map((model) => (
                          <div
                            key={model.name}
                            onClick={() => {
                              if (!model.disabled) {
                                setSelectedModel(model.name);
                                setIsInputModelDropdownOpen(false);
                                setModelSearchQuery('');
                              }
                            }}
                            className={`model-item-enhanced model-item-small ${selectedModel === model.name ? 'active' : ''} ${model.disabled ? 'disabled' : ''}`}
                          >
                            <span className="model-name">{model.name}</span>
                            <div className="model-badges">
                              {model.imageSupport && (
                                <span className="image-badge">
                                  <Image src={getIconSrc("image", selectedModel === model.name)} alt="Image Support" width={10} height={10} className="badge-icon" />
                                </span>
                              )}
                              {model.reasoningModel && (
                                <span className="reasoning-badge">
                                  <Image src={getIconSrc("reason", selectedModel === model.name)} alt="Reasoning Model" width={10} height={10} className="badge-icon" />
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
                        No models found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Web Search Dropdown Button */}
            <div className="input-model-selector">
              <button
                type="button"
                onClick={() => setIsWebSearchDropdownOpen(!isWebSearchDropdownOpen)}
                className={`input-btn model-selector-btn ${isWebSearchDropdownOpen ? 'active' : ''}`}
                title="Select web search option"
              >
                <Image
                  src={getIconSrc(
                    selectedWebSearchOption === 'Chat' ? 'chat' :
                    selectedWebSearchOption === 'Web Search (Exa)' ? 'exa' :
                    selectedWebSearchOption === 'arXiv' ? 'arxiv-logo' :
                    'internet',
                    isWebSearchDropdownOpen
                  )}
                  alt="Web Search"
                  width={16}
                  height={16}
                  className="icon-sm"
                />
              </button>

              {isWebSearchDropdownOpen && (
                <div className={`input-dropdown-menu model-dropdown-enhanced ${isWebSearchDropdownOpen ? 'show' : ''}`}>
                  {/* Scrollable Content */}
                  <div className="model-dropdown-content">
                    {/* Web Search Options */}
                    <div className="model-group-section">
                      <div className="model-group-header-enhanced model-group-header-small">
                        Web Search Options
                      </div>
                      {webSearchOptions.map((option) => (
                        <div
                          key={option.name}
                          onClick={() => {
                            setSelectedWebSearchOption(option.name);
                            // Update web search option based on selection
                            if (option.name === 'Chat') {
                              // Chat mode - no web search
                            } else if (option.name === 'Web Search (Exa)' || option.name === 'arXiv') {
                              // Web search modes (disabled)
                            }
                            // Hide web mode suggestion if user manually switches to web mode
                            if (option.name !== 'Chat') {
                              setShowWebModeSuggestion(false);
                            }
                            setIsWebSearchDropdownOpen(false);
                          }}
                          className={`model-item-enhanced model-item-small ${selectedWebSearchOption === option.name ? 'active' : ''}`}
                        >
                          <span className="model-name">{option.name}</span>
                          <div className="model-badges">
                            {option.name === 'Chat' && (
                              <span className="image-badge">
                                <Image src={getIconSrc("chat", selectedWebSearchOption === option.name)} alt="Chat" width={10} height={10} className="badge-icon" />
                              </span>
                            )}
                            {option.name === 'Web Search (Exa)' && (
                              <span className="image-badge">
                                <Image src={getIconSrc("exa", selectedWebSearchOption === option.name)} alt="Exa" width={10} height={10} className="badge-icon" />
                              </span>
                            )}
                            {option.name === 'arXiv' && (
                              <span className="image-badge">
                                <Image src={getIconSrc("arxiv-logo", selectedWebSearchOption === option.name)} alt="arXiv" width={10} height={10} className="badge-icon" />
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

            <button
              type="button"
              onClick={() => {/* Attach file functionality */}}
              className="input-btn attach-btn"
              title="Attach file"
            >
              <Image src={getIconSrc("attach")} alt="Attach" width={16} height={16} className="icon-sm" />
            </button>

            {/* Storage Status Indicator */}
            <div
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: user?.id ? '#10b981' : '#f59e0b',
                color: 'white',
                marginLeft: '8px'
              }}
              title={user?.id ? "Saving to Supabase" : "Saving to localStorage (guest mode)"}
            >
              💾 {user?.id ? 'Cloud' : 'Local'}
            </div>
          </div>

          {/* Bottom Right - Send Button */}
          <div className="input-actions-right">
            <button
              type="button"
              onClick={handleSend}
              className={`input-btn send-btn ${input.trim() ? 'active' : ''}`}
              title="Send message"
              disabled={!input.trim() || isLoading}
            >
              <Image src={getIconSrc("send")} alt="Send" width={16} height={16} className="icon-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
