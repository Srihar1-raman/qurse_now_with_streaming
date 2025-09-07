import { useChat } from 'ai/react';
import ChatMessage from '@/components/ChatMessage';
import { Source } from '@/types/conversation';

interface ConversationThreadProps {
  messages: ReturnType<typeof useChat>['messages'];
  isLoading: boolean;
  currentSources: Source[];
  selectedModel: string;
  showWebModeSuggestion: boolean;
  setSelectedWebSearchOption: (option: string) => void;
  setShowWebModeSuggestion: (show: boolean) => void;
  setCurrentSources: (sources: Source[]) => void;
  setIsSourcesOpen: (open: boolean) => void;
  setMessages: (messages: any[]) => void;
  append: (message: { role: 'user' | 'assistant'; content: string }) => void;
  aiError: string | null;
  setAiError: (error: string | null) => void;
  conversationEndRef: React.RefObject<HTMLDivElement>;
}

export default function ConversationThread({
  messages,
  isLoading,
  currentSources,
  selectedModel,
  showWebModeSuggestion,
  setSelectedWebSearchOption,
  setShowWebModeSuggestion,
  setCurrentSources,
  setIsSourcesOpen,
  setMessages,
  append,
  aiError,
  setAiError,
  conversationEndRef,
}: ConversationThreadProps) {
  return (
    <div className="conversation-thread">
      {/* Display messages from useChat - single source of truth */}
      {messages.map((message, index) => {
        // Get sources for this specific message
        const messageSources = message.role === 'assistant' ?
          // For the latest message, use currentSources (live during streaming)
          (index === messages.length - 1 && currentSources.length > 0 ? currentSources :
          // For older messages, try to get from global lastSearchResults or use currentSources
          (global as any)?.messageSourcesMap?.[message.id] || []) : undefined;

        // Get reasoning for this specific message (for GPT-OSS and other reasoning models)
        const messageReasoning = message.role === 'assistant' ?
          (global as any)?.messageReasoningMap?.[message.id] : undefined;

        // Check if this message is currently being streamed (last assistant message + isLoading)
        const isCurrentlyStreaming = message.role === 'assistant' &&
                                     index === messages.length - 1 &&
                                     isLoading;

        // Debug logging for sources and buttons (comment out to reduce console spam)
        // if (message.role === 'assistant') {
        //   console.log(`🔍 Debug: Message ${message.id}:`, {
        //     sourcesCount: messageSources?.length || 0,
        //     sources: messageSources,
        //     isStreaming: isCurrentlyStreaming,
        //     hasOnRedo: !!(!isCurrentlyStreaming),
        //     messageIndex: index,
        //     totalMessages: messages.length
        //   });
        // }

        return (
          <ChatMessage
            key={message.id}
            content={message.content}
            isUser={message.role === 'user'}
            model={selectedModel}
            sources={messageSources}
            reasoning={messageReasoning}
            parts={message.parts}
            onRedo={message.role === 'assistant' && !isCurrentlyStreaming ? () => {
              // Regenerate the assistant message by removing it and re-submitting
              console.log('🔄 Regenerating message:', message.id);
              const messageIndex = messages.findIndex(m => m.id === message.id);
              if (messageIndex > 0) {
                // Remove this assistant message and regenerate
                const updatedMessages = messages.slice(0, messageIndex);
                setMessages(updatedMessages);

                // Find the user message before this assistant message
                const userMessage = messages[messageIndex - 1];
                if (userMessage && userMessage.role === 'user') {
                  // Re-submit the user message to trigger regeneration
                  setTimeout(() => {
                    append({
                      role: 'user',
                      content: userMessage.content
                    });
                  }, 100);
                }
              }
            } : undefined}
            onSourcesClick={() => {
              if (messageSources && messageSources.length > 0) {
                setCurrentSources(messageSources);
              // Toggle sidebar: if already open, close it; otherwise open it
              if ((global as any).isSourcesOpen) {
                setIsSourcesOpen(false);
              } else {
                setIsSourcesOpen(true);
              }
            }
          }}
        />
        );
      })}

      {/* Web Mode Suggestion */}
      {showWebModeSuggestion && (
        <div className="web-mode-suggestion">
          <div className="suggestion-content">
            <div className="suggestion-text">
              <strong>Switch to Web Mode for better answers</strong>
              <p>The AI suggested switching to Web Mode (Exa) to get more accurate and up-to-date information.</p>
            </div>
            <button
              className="switch-mode-btn"
              onClick={() => {
                setSelectedWebSearchOption('Web Search (Exa)');
                setShowWebModeSuggestion(false);
              }}
            >
              Switch to Web Mode
            </button>
          </div>
        </div>
      )}

      {/* Loading Animation */}
      {isLoading && (
        <div className="message bot-message">
          <div style={{ maxWidth: '95%', marginRight: 'auto' }}>
            <div className="message-content">
              {/* Reasoning model loading animation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'reasoning 2s infinite linear',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    animation: 'reasoningPulse 1s infinite ease-in-out'
                  }}></div>
                </div>
                <span style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '14px',
                  fontStyle: 'italic'
                }}>
                  Reasoning...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {aiError && (
        <div className="message bot-message">
          <div style={{ maxWidth: '95%', marginRight: 'auto' }}>
            <div className="message-content" style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              ⚠️ {aiError}
              <button
                onClick={() => {
                  setAiError(null);
                  // TODO: Implement retry with useChat
                  console.log('Retry clicked - implement with useChat reload');
                }}
                style={{
                  marginLeft: '10px',
                  padding: '4px 8px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={conversationEndRef} />
    </div>
  );
}
