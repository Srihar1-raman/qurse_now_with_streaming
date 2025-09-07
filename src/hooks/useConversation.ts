import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/SessionProvider';
import { useChat } from 'ai/react';
import { useTheme } from '@/lib/ThemeContext';
import { MODEL_GROUPS } from '@/lib/ai-service';
import { Message, Source } from '@/types/conversation';
import {
  webSearchOptions,
  DEFAULT_MODEL,
  COMPATIBLE_ARXIV_MODELS,
  COMPATIBLE_ARXIV_PROVIDERS,
  SCROLL_DELAY,
  SUBMIT_RATE_LIMIT
} from '@/lib/constants/conversation';

export function useConversation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // State
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [modelInitialized, setModelInitialized] = useState(false);
  const [isInputModelDropdownOpen, setIsInputModelDropdownOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [selectedWebSearchOption, setSelectedWebSearchOption] = useState('Chat');
  const [isWebSearchDropdownOpen, setIsWebSearchDropdownOpen] = useState(false);
  const [showWebModeSuggestion, setShowWebModeSuggestion] = useState(false);
  const [initialMessages, setInitialMessages] = useState<any[]>([]);

  // Refs
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageHandledRef = useRef(false);
  const conversationLoadedRef = useRef(false);
  const currentConversationIdRef = useRef<string | null>(null);
  const lastSubmitTimeRef = useRef(0);

  const { resolvedTheme } = useTheme();

  // Generate consistent conversation ID
  const conversationId = searchParams.get('id');
  const chatId = useMemo(() => conversationId || `conv-${Date.now()}`, [conversationId]);

  // Update the ref when conversationId changes
  useEffect(() => {
    currentConversationIdRef.current = conversationId;
  }, [conversationId]);

  // Vercel AI SDK useChat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    append,
  } = useChat({
    id: chatId,
    api: '/api/ai',
    initialMessages,
    body: {
      model: selectedModel,
      maxTokens: 8192,
      temperature: 0.7,
      stream: true
    },
    onFinish: async (message) => {
      console.log('✅ Streaming finished - Message length:', message.content?.length || 0);
      console.log('🔍 Full message object:', message);

      // Extract reasoning data from message (for GPT-OSS and other reasoning models)
      let reasoningData = null;
      if ((message as any).reasoning) {
        reasoningData = (message as any).reasoning;
        console.log('🔍 Found reasoning data in message:', reasoningData);
      } else {
        console.log('❌ No reasoning data found in message');
      }

      // No sources in basic chat mode - keeping UI structure for future use
      const sources: Source[] = [];

      // Store sources for this specific message (empty for basic chat)
      if (!((global as any).messageSourcesMap)) {
        (global as any).messageSourcesMap = {};
      }
      (global as any).messageSourcesMap[message.id] = sources;
      setCurrentSources(sources);

      // Store reasoning data for this specific message
      if (!((global as any).messageReasoningMap)) {
        (global as any).messageReasoningMap = {};
      }
      if (reasoningData) {
        (global as any).messageReasoningMap[message.id] = reasoningData;
        console.log('✅ Stored reasoning data for message');
      }

      // Clean up old message sources to prevent memory leaks (keep only last 20)
      const messageSourcesMap = (global as any).messageSourcesMap;
      const messageIds = Object.keys(messageSourcesMap);
      if (messageIds.length > 20) {
        messageIds.slice(0, messageIds.length - 20).forEach(id => {
          delete messageSourcesMap[id];
        });
      }

      // Save to Supabase in background - use ref for current conversation ID
      const currentConvId = currentConversationIdRef.current;
      if (user?.id && currentConvId) {
        // Use immediate async instead of setTimeout to avoid memory leaks
        (async () => {
          try {
            await fetch(`/api/conversations/${currentConvId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: message.content,
                role: 'assistant',
                metadata: {
                  model_used: selectedModel,
                  sources: sources,
                  // webSearchEnabled removed - basic chat only
                  arxivMode: selectedWebSearchOption === 'arXiv'
                }
              })
            });
            console.log('✅ Saved AI message to Supabase');
          } catch (error) {
            console.error('❌ Error saving AI message:', error);
          }
        })();
      } else {
        console.log('⚠️ Not saving AI message - user:', !!user?.id, 'conversationId:', currentConvId);
      }
    },

    onError: (error) => {
      console.error('❌ Chat error:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      setAiError(`AI error: ${error.message || 'Currently unavailable. Please retry.'}`);
    }
  });

  // Check if AI response suggests switching to web mode
  const checkForWebModeSuggestion = (aiResponse: string) => {
    const webModeKeywords = [
      'switch to web mode',
      'web mode (exa)',
      'consider switching to web mode',
      'web search tools',
      'search the internet',
      '💡 **tip:** for the most accurate',
      '---\n💡 **tip:**'
    ];

    const hasWebModeSuggestion = webModeKeywords.some(keyword =>
      aiResponse.toLowerCase().includes(keyword.toLowerCase())
    );

    setShowWebModeSuggestion(hasWebModeSuggestion);
  };

  // Helper function to check if model is compatible with arxiv mode
  const isModelCompatibleWithArxiv = (modelName: string, provider: string) => {
    // For arxiv mode, only allow specific models
    if (selectedWebSearchOption === 'arXiv') {
      const compatibleModels = COMPATIBLE_ARXIV_MODELS;
      const compatibleProviders = COMPATIBLE_ARXIV_PROVIDERS;

      return compatibleModels.includes(modelName) || compatibleProviders.includes(provider);
    }
    return true; // All models allowed for non-arxiv modes
  };

  // Filter models based on search query
  const getFilteredModelGroups = () => {
    if (!modelSearchQuery.trim()) {
      return Object.values(MODEL_GROUPS)
        .filter(group => group.enabled)
        .map(group => ({
          ...group,
          models: group.models.map(model => ({
            ...model,
            disabled: !isModelCompatibleWithArxiv(model.name, group.provider)
          }))
        }));
    }

    const query = modelSearchQuery.toLowerCase();
    return Object.values(MODEL_GROUPS)
      .filter(group => group.enabled)
      .map(group => ({
        ...group,
        models: group.models
          .filter(model =>
            model.name.toLowerCase().includes(query) ||
            group.provider.toLowerCase().includes(query)
          )
          .map(model => ({
            ...model,
            disabled: !isModelCompatibleWithArxiv(model.name, group.provider)
          }))
      }))
      .filter(group => group.models.length > 0);
  };

  // Get the correct icon path based on theme
  const getIconSrc = (iconName: string, isActive: boolean = false) => {
    // Always use theme-dependent paths since we're in a client component

    // If the icon is in an active state (like selected model), always use light icons
    // because the background is green and we need light icons for contrast
    if (isActive) {
      return `/icon_light/${iconName}.svg`;
    }

    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  const conversationContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Simple, immediate scroll to bottom - no complex logic
    setTimeout(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, SCROLL_DELAY);
  };

  // Auto-scroll when messages change - simple approach
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, isLoading]); // Scroll on new messages and when loading state changes

  // Auto-focus textarea when user starts typing
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

      // If it's a printable character, focus the textarea
      if (e.key.length === 1 && textareaRef.current) {
        textareaRef.current.focus();
        // useChat will handle the input value
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus textarea on page load
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const modelSelectors = document.querySelectorAll('.input-model-selector');

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
        setIsInputModelDropdownOpen(false);
        setModelSearchQuery('');
      }

      if (!clickedInsideWebSearchSelector) {
        setIsWebSearchDropdownOpen(false);
      }
    };

    if (isInputModelDropdownOpen || isWebSearchDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isInputModelDropdownOpen, isWebSearchDropdownOpen]);

  // Handle initial message from URL parameters - SINGLE useEffect like old working version
  useEffect(() => {
    const initialMessage = searchParams.get('message');
    const initialModel = searchParams.get('model');
    const conversationId = searchParams.get('id');
    const webSearchParam = searchParams.get('webSearch');
    const arxivModeParam = searchParams.get('arxivMode');

    console.log('🔍 URL Parameters received:', { initialMessage, initialModel, conversationId, webSearchParam, arxivModeParam });

    // Reset modelInitialized for each URL change to ensure proper re-initialization
    setModelInitialized(false);

    // Reset initialMessageHandledRef when conversation ID changes to allow loading different conversations
    initialMessageHandledRef.current = false;

    // Set model from URL parameters FIRST - with robust fallback
    let modelToSet = initialModel;
    if (!modelToSet && typeof window !== 'undefined') {
      // Fallback: check window.location.search if searchParams doesn't have the model
      const urlParams = new URLSearchParams(window.location.search);
      modelToSet = urlParams.get('model');
    }

    if (modelToSet) {
      const decodedModel = decodeURIComponent(modelToSet);
      console.log('Setting initial model from URL:', decodedModel);
      setSelectedModel(decodedModel);
    }

    // Always mark as initialized after processing (whether model was set or not)
    setModelInitialized(true);

    // Set web search state from URL parameters (disabled - basic chat only)
    if (arxivModeParam === 'true') {
      setSelectedWebSearchOption('arXiv');
    } else if (webSearchParam === 'true') {
      setSelectedWebSearchOption('Web Search (Exa)');
    } else {
      setSelectedWebSearchOption('Chat');
    }

    // Only proceed if auth loading is complete
    if (authLoading) {
      return; // Wait for auth to be determined
    }

    // Load existing conversation
    if (conversationId && user?.id && !conversationLoadedRef.current) {
      console.log('📱 Loading existing conversation:', conversationId);
      loadConversation(conversationId);
      conversationLoadedRef.current = true;
      initialMessageHandledRef.current = true;
    }
    // Auto-send initial message for new conversations
    else if (initialMessage && !initialMessageHandledRef.current && modelInitialized && !conversationId) {
      console.log('🚀 Auto-sending initial message:', initialMessage);
      initialMessageHandledRef.current = true;

      // Set the input value and trigger send to create conversation
      setTimeout(async () => {
        // Simulate setting the input and sending
        const event = new Event('submit') as any;
        event.preventDefault = () => {};

        // We need to manually set the input for the initial message
        // Since useChat manages input, we'll call append with conversation creation
        const messageText = initialMessage;

        // Create conversation first for initial messages
        if (user?.id) {
          try {
            console.log('🆕 Creating conversation for initial message...');
            const { SupabaseService } = await import('@/lib/supabase-service');
            const title = await SupabaseService.generateConversationTitle(messageText);

            const response = await fetch('/api/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                model_name: selectedModel,
                user_id: user.id
              })
            });

            if (response.ok) {
              const data = await response.json();
              const newConversationId = data.conversation.id;

              console.log('✅ Created conversation for initial message:', newConversationId);

              // Update ref immediately so onFinish can use it
              currentConversationIdRef.current = newConversationId;

              // Update URL
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('id', newConversationId);
              newUrl.searchParams.delete('message');
              window.history.replaceState({}, '', newUrl.toString());

              // Save user message
              setTimeout(async () => {
                try {
                  await fetch(`/api/conversations/${newConversationId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: messageText,
                      role: 'user',
                      metadata: {}
                    })
                  });
                  console.log('✅ Saved initial user message');
                } catch (error) {
                  console.error('❌ Error saving initial user message:', error);
                }
              }, 100);
            }
          } catch (error) {
            console.error('❌ Error creating conversation for initial message:', error);
          }
        }

        // Send the message via useChat
        append({
          role: 'user',
          content: initialMessage
        });

        // Scroll handled by useEffect
      }, 100);
    }
  }, [searchParams, user?.id, authLoading, modelInitialized]); // Removed handleSendWithMessage from dependencies to prevent infinite loop

  // Handle web search parameter on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const webSearchParam = urlParams.get('webSearch');
      const arxivModeParam = urlParams.get('arxivMode');

      if (arxivModeParam === 'true') {
        setSelectedWebSearchOption('arXiv');
      } else if (webSearchParam === 'true') {
        setSelectedWebSearchOption('Web Search (Exa)');
      } else {
        setSelectedWebSearchOption('Chat');
      }
    }
  }, []);

  const loadConversation = async (conversationId: string) => {
    try {
      console.log('🔍 Loading conversation:', conversationId);
      // Update ref when loading existing conversation
      currentConversationIdRef.current = conversationId;
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const conversation = data.conversation;

        // Set model from conversation if no URL override
        const urlParams = new URLSearchParams(window.location.search);
        const urlModel = urlParams.get('model');
        if (urlModel) {
          setSelectedModel(decodeURIComponent(urlModel));
        } else {
          setSelectedModel(conversation.model_name || DEFAULT_MODEL);
        }

        // Convert to useChat format and extract sources
        const chatMessages = conversation.messages
          .map((msg: any) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            metadata: msg.metadata
          }))
          .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

        // Load sources into messageSourcesMap for each message
        if (!((global as any).messageSourcesMap)) {
          (global as any).messageSourcesMap = {};
        }

        let latestSources: Source[] = [];
        chatMessages.forEach((msg: any) => {
          if (msg.role === 'assistant' && msg.metadata?.sources?.length > 0) {
            (global as any).messageSourcesMap[msg.id] = msg.metadata.sources;
            latestSources = msg.metadata.sources; // Keep track of latest sources
            console.log('🔍 Loaded sources for message:', msg.id, '- count:', msg.metadata.sources.length);
          }
        });

        // Set the latest sources as current sources
        if (latestSources.length > 0) {
          setCurrentSources(latestSources);
          console.log('🔍 Set current sources from conversation:', latestSources.length);
        }

        console.log('✅ Loaded messages for useChat:', chatMessages.length);
        setInitialMessages(chatMessages);
      } else {
        console.error('❌ Failed to load conversation');
      }
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
    }
  };

  // Auto-resize textarea when input changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleHistoryClick = () => {
    if (!user) {
      // Check if we're on mobile
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        // Route to login page on mobile
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      } else {
        // Show popup on desktop
        setShowAuthPopup(true);
      }
    } else {
      setIsHistoryOpen(true);
    }
  };

  const handleNewChatClick = () => {
    // Navigate to home page for new chat
    router.push('/');
  };

  // Send handler with conversation creation
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();

    // Create conversation if it doesn't exist and user is authenticated
    if (!conversationId && user?.id) {
      try {
        console.log('🆕 Creating new conversation...');

        // Generate title from first message
        const { SupabaseService } = await import('@/lib/supabase-service');
        const title = await SupabaseService.generateConversationTitle(messageText);

        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            model_name: selectedModel,
            user_id: user.id
          })
        });

        if (response.ok) {
          const data = await response.json();
          const newConversationId = data.conversation.id;

          console.log('✅ Created conversation:', newConversationId);

          // Update ref immediately so onFinish can use it
          currentConversationIdRef.current = newConversationId;

          // Update URL with new conversation ID
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('id', newConversationId);
          newUrl.searchParams.delete('message'); // Remove initial message param
          window.history.replaceState({}, '', newUrl.toString());

          // Save the user message after conversation creation
          setTimeout(async () => {
            try {
              await fetch(`/api/conversations/${newConversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: messageText,
                  role: 'user',
                  metadata: {}
                })
              });
              console.log('✅ Saved user message to new conversation');
            } catch (error) {
              console.error('❌ Error saving user message:', error);
            }
          }, 100);
        } else {
          console.error('❌ Failed to create conversation:', await response.text());
        }
      } catch (error) {
        console.error('❌ Error creating conversation:', error);
      }
    }
    // Save user message to existing conversation
    else if (user?.id && conversationId) {
      setTimeout(async () => {
        try {
          await fetch(`/api/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: messageText,
              role: 'user',
              metadata: {}
            })
          });
          console.log('✅ Saved user message to existing conversation');
        } catch (error) {
          console.error('❌ Error saving user message:', error);
        }
      }, 100);
    }

    // Clear sources when sending new message (will be updated if new sources found)
    setCurrentSources([]);

    // Let useChat handle the streaming
    handleSubmit(e);

    // Scroll handled by useEffect
  };

  return {
    // State
    aiError,
    selectedModel,
    modelInitialized,
    isInputModelDropdownOpen,
    modelSearchQuery,
    showAuthPopup,
    isHistoryOpen,
    isSourcesOpen,
    currentSources,
    selectedWebSearchOption,
    isWebSearchDropdownOpen,
    showWebModeSuggestion,
    initialMessages,

    // Refs
    conversationEndRef: conversationEndRef as React.RefObject<HTMLDivElement>,
    textareaRef: textareaRef as React.RefObject<HTMLTextAreaElement>,
    conversationContainerRef,

    // Chat hook
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    append,

    // Handlers
    handleSend,
    handleHistoryClick,
    handleNewChatClick,

    // Utilities
    getFilteredModelGroups,
    getIconSrc,
    checkForWebModeSuggestion,

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
    authLoading,

    // Navigation
    router,

    // Constants
    webSearchOptions,
  };
}
