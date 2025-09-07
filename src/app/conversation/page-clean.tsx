'use client';

import { Suspense } from 'react';
import Header from '@/components/Header';
import AuthPopup from '@/components/AuthPopup';
import HistorySidebar from '@/components/HistorySidebar';
import SourcesSidebar from '@/components/SourcesSidebar';
import ConversationThread from '@/components/conversation/ConversationThread';
import ConversationInput from '@/components/conversation/ConversationInput';
import { useConversation } from '@/hooks/useConversation';

function ConversationContent() {
  const {
    // State
    aiError,
    selectedModel,
    isInputModelDropdownOpen,
    modelSearchQuery,
    showAuthPopup,
    isHistoryOpen,
    isSourcesOpen,
    currentSources,
    selectedWebSearchOption,
    isWebSearchDropdownOpen,
    showWebModeSuggestion,

    // Refs
    conversationEndRef,
    textareaRef,

    // Chat hook
    messages,
    input,
    handleInputChange,
    isLoading,
    setMessages,
    append,

    // Handlers
    handleSend,
    handleHistoryClick,
    handleNewChatClick,

    // Utilities
    getFilteredModelGroups,
    getIconSrc,

    // Setters
    setAiError,
    setSelectedModel,
    setIsInputModelDropdownOpen,
    setModelSearchQuery,
    setShowAuthPopup,
    setIsHistoryOpen,
    setIsSourcesOpen,
    setCurrentSources,
    setSelectedWebSearchOption,
    setIsWebSearchDropdownOpen,
    setShowWebModeSuggestion,

    // Auth
    user,

    // Navigation
    router,

    // Constants
    webSearchOptions,
  } = useConversation();

  return (
    <div className="homepage-container">
      <Header
        showNewChatButton={true}
        onNewChatClick={handleNewChatClick}
        showHistoryButton={true}
        onHistoryClick={handleHistoryClick}
      />

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <main className="conversation-main-content">
        {/* Conversation Container */}
        <div className="conversation-container">
          <ConversationThread
            messages={messages}
            isLoading={isLoading}
            currentSources={currentSources}
            selectedModel={selectedModel}
            showWebModeSuggestion={showWebModeSuggestion}
            setSelectedWebSearchOption={setSelectedWebSearchOption}
            setShowWebModeSuggestion={setShowWebModeSuggestion}
            setCurrentSources={setCurrentSources}
            setIsSourcesOpen={setIsSourcesOpen}
            setMessages={setMessages}
            append={append}
            aiError={aiError}
            setAiError={setAiError}
            conversationEndRef={conversationEndRef}
          />
        </div>

        {/* Input Section */}
        <ConversationInput
          input={input}
          handleInputChange={handleInputChange}
          handleSend={handleSend}
          isLoading={isLoading}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          isInputModelDropdownOpen={isInputModelDropdownOpen}
          setIsInputModelDropdownOpen={setIsInputModelDropdownOpen}
          modelSearchQuery={modelSearchQuery}
          setModelSearchQuery={setModelSearchQuery}
          selectedWebSearchOption={selectedWebSearchOption}
          setSelectedWebSearchOption={setSelectedWebSearchOption}
          isWebSearchDropdownOpen={isWebSearchDropdownOpen}
          setIsWebSearchDropdownOpen={setIsWebSearchDropdownOpen}
          setShowWebModeSuggestion={setShowWebModeSuggestion}
          webSearchOptions={webSearchOptions}
          getFilteredModelGroups={getFilteredModelGroups}
          getIconSrc={getIconSrc}
          user={user}
          textareaRef={textareaRef}
        />
      </main>

      {/* Auth Popup */}
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
      />

      {/* Sources Sidebar */}
      <SourcesSidebar
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
        sources={currentSources}
      />
    </div>
  );
}

export default function ConversationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConversationContent />
    </Suspense>
  );
}
