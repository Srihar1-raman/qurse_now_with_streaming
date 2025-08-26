'use client';

import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/SessionProvider';
import { useChat } from 'ai/react';
import Image from 'next/image';
import Header from '@/components/Header';
import ChatMessage from '@/components/ChatMessage';

import { useTheme } from '@/lib/ThemeContext';
import { aiService, ChatMessage as AIChatMessage, MODEL_GROUPS } from '@/lib/ai-service';
import { SupabaseService } from '@/lib/supabase-service';
import AuthPopup from '@/components/AuthPopup';
import HistorySidebar from '@/components/HistorySidebar';
import SourcesSidebar from '@/components/SourcesSidebar';
// Web search functions moved to API route


interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  model?: string; // Add model to message interface
  rawResponse?: unknown; // Add raw response for XAI models
  reasoning?: unknown; // Add reasoning for captured reasoning data
  sources?: Array<{
    title: string;
    relevance_score: number;
    domain: string;
    url: string;
    favicon?: string;
  }>;
}

function ConversationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [aiError, setAiError] = useState<string | null>(null);
  

  const lastSubmitTimeRef = useRef(0);
  const [selectedModel, setSelectedModel] = useState('GPT-OSS 120B');
  const [modelInitialized, setModelInitialized] = useState(false);
  const [isInputModelDropdownOpen, setIsInputModelDropdownOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [currentSources, setCurrentSources] = useState<Array<{
    title: string;
    relevance_score: number;
    domain: string;
    url: string;
    favicon?: string;
  }>>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [selectedWebSearchOption, setSelectedWebSearchOption] = useState('Chat');
  const [isWebSearchDropdownOpen, setIsWebSearchDropdownOpen] = useState(false);
  const webSearchInitializedRef = useRef(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { resolvedTheme } = useTheme();
  const initialMessageHandledRef = useRef(false);
  const conversationLoadedRef = useRef(false);
  const messageCounterRef = useRef(0); // Keep for old functions (TODO: remove)
  const currentConversationIdRef = useRef<string | null>(null);
  
  const [showWebModeSuggestion, setShowWebModeSuggestion] = useState(false);

  // Web search options
  const webSearchOptions = [
    { name: 'Chat', enabled: false },
    { name: 'Web Search (Exa)', enabled: true },
    { name: 'arXiv', enabled: false }
  ];

  // Update web search enabled based on selected option
  useEffect(() => {
    if (selectedWebSearchOption === 'Chat') {
      setWebSearchEnabled(false);
    } else if (selectedWebSearchOption === 'Web Search (Exa)') {
      setWebSearchEnabled(true);
    } else if (selectedWebSearchOption === 'arXiv') {
      setWebSearchEnabled(true);
    }
  }, [selectedWebSearchOption]);

  // Initialize web search enabled based on selected option
  useEffect(() => {
    if (selectedWebSearchOption === 'Web Search (Exa)') {
      setWebSearchEnabled(true);
    } else if (selectedWebSearchOption === 'arXiv') {
      setWebSearchEnabled(true);
    } else {
      setWebSearchEnabled(false);
    }
  }, [selectedWebSearchOption]);

  // Load initial messages for existing conversations
  const [initialMessages, setInitialMessages] = useState<any[]>([]);

  // Generate consistent conversation ID like scira-main
  const conversationId = searchParams.get('id');
  const chatId = useMemo(() => conversationId || `conv-${Date.now()}`, [conversationId]);
  
  // Update the ref when conversationId changes
  useEffect(() => {
    currentConversationIdRef.current = conversationId;
  }, [conversationId]);
  
  // Vercel AI SDK useChat hook - SINGLE source of truth for messages
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
      stream: true,
      webSearchEnabled,
      arxivMode: selectedWebSearchOption === 'arXiv'
    },
    onFinish: async (message) => {
      console.log('✅ Streaming finished - Message length:', message.content?.length || 0);
      
      // Try to extract sources from toolInvocations first
      let sources = [];
      if (message.toolInvocations && message.toolInvocations.length > 0) {
        for (const invocation of message.toolInvocations) {
          const inv = invocation as any; // Type assertion for tool invocation result
          if (inv.result && inv.result.results) {
            sources = inv.result.results;
            console.log('🔍 Found', sources.length, 'sources from', inv.toolName);
            break;
          }
        }
      }
      
      // Fallback to global state (set by tools)
      if (sources.length === 0) {
        sources = (global as any)?.lastSearchResults || [];
        if (sources.length > 0) {
          console.log('🔍 Using', sources.length, 'sources from global state');
        }
      }
      
      // Store sources for this specific message
      if (!((global as any).messageSourcesMap)) {
        (global as any).messageSourcesMap = {};
      }
      if (sources.length > 0) {
        (global as any).messageSourcesMap[message.id] = sources;
        setCurrentSources(sources);
        console.log('✅ Stored', sources.length, 'sources for message');
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
                          webSearchEnabled,
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
      const compatibleModels = [
        'GPT-OSS 120B',
        'GPT-OSS 20B',
        'Qwen3 32B',
        'Deepseek R1 Distill 70B',
        'Llama 4 Scout 17B',
        'Kimi K2 Instruct'
      ];
      
      const compatibleProviders = ['XAI', 'OpenAI', 'Anthropic'];
      
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
    }, 50);
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
    
    // Set web search state from URL parameters
    if (arxivModeParam === 'true') {
      setWebSearchEnabled(true);
      setSelectedWebSearchOption('arXiv');
      console.log('Setting web search to arXiv mode from URL parameter');
    } else if (webSearchParam === 'true') {
      setWebSearchEnabled(true);
      setSelectedWebSearchOption('Web Search (Exa)'); // Set to Exa when web search is enabled from URL
      console.log('Setting web search to Exa mode from URL parameter');
    } else {
      // Ensure we're in Chat mode when no web search
      setWebSearchEnabled(false);
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
    if (typeof window !== 'undefined' && !webSearchInitializedRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const webSearchParam = urlParams.get('webSearch');
      const arxivModeParam = urlParams.get('arxivMode');
      
      if (arxivModeParam === 'true') {
        setWebSearchEnabled(true);
        setSelectedWebSearchOption('arXiv');
        webSearchInitializedRef.current = true;
      } else if (webSearchParam === 'true') {
        setWebSearchEnabled(true);
        setSelectedWebSearchOption('Web Search (Exa)');
        webSearchInitializedRef.current = true;
      } else {
        setSelectedWebSearchOption('Chat');
        webSearchInitializedRef.current = true;
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
          setSelectedModel(conversation.model_name || 'GPT-OSS 120B');
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
        
        let latestSources: any[] = [];
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

  /* DISABLED OLD FUNCTION - USING useChat NOW
  const handleAIResponse = async (userMessageText: string, userMessageObj: Message, conversationId?: string) => {
    try {
      setAiError(null); // Clear any previous errors
      
      // Validate userMessageObj
      if (!userMessageObj || !userMessageObj.timestamp) {
        setAiError('Invalid message object. Please try again.');

        return;
      }
      
      // Convert existing messages to AI service format for context
      const aiMessages: AIChatMessage[] = [];
      
      // Add system prompt based on mode
      if (webSearchEnabled) {
        // Exa mode: Aggressive system prompt for web search (handled by API)
        // No need to add system message here as it's handled in generateAITextWithTools
      } else {
        // Chat mode: Add system prompt to let models know they are QURSE
        aiMessages.push({
          role: 'system',
                  content: `You are QURSE, an AI assistant designed to help users with conversations, questions, and general assistance. You are helpful, knowledgeable, and engaging. Respond naturally and conversationally while being informative and supportive.

                IMPORTANT: Always answer the user's question first with your best knowledge. Then, if the query requires real-time information, current events, recent data, or would benefit from web search tools for a more accurate and up-to-date answer, add a suggestion at the end of your response like this:

"---\n💡 **Tip:** For the most accurate and up-to-date information about this topic, consider switching to Web Mode (Exa) which can search the internet for current data."

CRITICAL: You CANNOT switch to Web Mode yourself. You can only SUGGEST that the user switch. Do NOT say things like "I'll switch to Web Mode" or "Let me search for you" - you don't have that capability in Chat Mode.

DO NOT:
- Say "I'm switching to Web Mode" or "Let me search for you"
- Pretend to perform web searches
- Act like you have access to real-time information
- Say "I'll fetch the latest updates" or similar phrases

ONLY:
- Answer with your training knowledge
- Suggest the user switch to Web Mode if needed
- Wait for the user to actually switch modes

Examples of when to suggest Web Mode:
- Current events, news, or recent developments
- Real-time data, statistics, or market information
- Recent product releases, updates, or reviews
- Current weather, traffic, or location-based information
- Recent research, studies, or academic publications
- Live sports scores, results, or schedules

Always provide a helpful answer first, then suggest the mode switch if it would improve the response quality. Remember: you can only suggest, not perform the switch.`
        });
      }
      
      // Add conversation history (last 9 messages for context, excluding current message)
      const recentMessages = messages.slice(-9);
      recentMessages.forEach(msg => {
        // Ensure we only pass valid message properties to the AI SDK
        const cleanMessage = {
          role: (msg.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.text || ''
        };
        
        // Only add messages with valid content
        if (cleanMessage.content.trim()) {
          aiMessages.push(cleanMessage);
        }
      });
      
      console.log('🔍 Cleaned AI messages:', aiMessages);

      // Add the current user message
      aiMessages.push({
        role: 'user',
        content: userMessageText
      });

      // Get AI response with tool support via API route
      let aiResponse: Message;
      try {
        console.log(`🚀 Calling AI API with webSearchEnabled: ${webSearchEnabled}`);
        
        // Call the API route instead of using aiService directly
        const apiResponse = await fetch('/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: aiMessages,
            maxTokens: 8192,
            temperature: 0.7,
            webSearchEnabled: webSearchEnabled,
            arxivMode: selectedWebSearchOption === 'arXiv'
          })
        });

        if (!apiResponse.ok) {
          throw new Error(`API request failed: ${apiResponse.status}`);
        }

        const result = await apiResponse.json();
        
        console.log('🔍 AI API response received:', {
          hasSources: !!result.sources,
          sourcesCount: result.sources?.length || 0,
          sources: result.sources
        });
        
        const userTimestamp = new Date(userMessageObj.timestamp);
        if (isNaN(userTimestamp.getTime())) {
          throw new Error('Invalid user message timestamp');
        }
        const aiTimestamp = new Date(userTimestamp.getTime() + 2000);
        const aiCounter = messageCounterRef.current++;
        aiResponse = {
          id: `ai-${aiTimestamp.getTime()}-${aiCounter}`,
          text: result.choices[0].message.content,
          isUser: false,
          timestamp: aiTimestamp.toISOString(),
          model: selectedModel, // Store the model used for this response
          rawResponse: result.rawResult, // Store the raw response for XAI models
          reasoning: result.reasoning, // Store the captured reasoning data
          sources: result.sources || [] // Store the web search sources
        };
        
        // Store sources for later use (don't auto-open sidebar)
        if (result.sources && result.sources.length > 0) {
          // Format sources based on the selected mode
          let formattedSources = result.sources;
          
          if (selectedWebSearchOption === 'arXiv') {
            // Format arXiv sources for the sources sidebar
            formattedSources = result.sources.map((source: { title: string; relevance_score: number; domain: string; url: string; favicon?: string; arxiv_id?: string; authors?: string[]; abstract?: string; submission_date?: string; pdf_url?: string }) => ({
              title: source.title || source.title || 'Unknown Paper',
              relevance_score: source.relevance_score || 1,
              domain: 'arxiv.org',
              url: source.url || source.url || '#',
              favicon: '/icon/arxiv-logo.svg',
              // Add arXiv-specific metadata
              arxiv_id: source.arxiv_id,
              authors: source.authors,
              abstract: source.abstract,
              submission_date: source.submission_date,
              pdf_url: source.pdf_url
            }));
          } else {
            // Format web search sources (existing logic)
            formattedSources = result.sources.map((source: { title: string; relevance_score: number; domain: string; url: string; favicon?: string }) => ({
              title: source.title || source.title || 'Unknown Title',
              relevance_score: source.relevance_score || 1,
              domain: source.domain || 'unknown',
              url: source.url || source.url || '#',
              favicon: source.favicon || `https://www.google.com/s2/favicons?domain=${source.url}&sz=32`
            }));
          }
          
          setCurrentSources(formattedSources);
        }
        
        // Check if AI suggests switching to web mode
        checkForWebModeSuggestion(result.choices[0].message.content);
      } catch {
        // Both AI and simulation failed
        setAiError('AI is currently unavailable. Your message has been saved and you can retry.');

        return; // Exit without creating AI response
      }

      // Add AI response to messages
      setMessages(currentMessages => {
        // Check if this AI response already exists to prevent duplicates
        const aiResponseExists = currentMessages.some(m => m.id === aiResponse.id);
        if (aiResponseExists) {
          return currentMessages;
        }
        
        return [...currentMessages, aiResponse];
      });
      


      // Save AI response to database if user is authenticated and conversation exists
      // Use passed conversationId or fallback to URL params
      const targetConversationId = conversationId || searchParams.get('id');
      console.log('Saving AI response to conversation:', targetConversationId);
      if (user?.id && targetConversationId) {
        try {
          const response = await fetch(`/api/conversations/${targetConversationId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: aiResponse.text,
              role: 'assistant',
              model: selectedModel,
              metadata: { 
                model_used: selectedModel,
                sources: aiResponse.sources || [], // Save sources to metadata
                reasoning: aiResponse.reasoning, // Save reasoning data
                rawResponse: aiResponse.rawResponse // Save raw response data
              }
            })
          });
          
          console.log('AI response save status:', response.status);
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to save AI response:', errorText);
          } else {
            console.log('AI response saved successfully');
          }
        } catch (error) {
          console.error('Error saving AI response:', error);
        }
      } else {
        console.log('Not saving AI response - user:', !!user?.id, 'conversationId:', targetConversationId);
      }

    } catch (error) {
      setAiError('Failed to get AI response. Please try again.');

    }
  };
  */

  /* DISABLED OLD FUNCTION - USING useChat NOW
  const handleSendMessage_OLD = async (messageOverride?: string) => {
    const messageText = messageOverride || input.trim();
    if (!messageText || isLoading) return;

    // Clear any previous AI errors
    setAiError(null);
    
    // Hide web mode suggestion when new message is sent
    setShowWebModeSuggestion(false);

    // Prevent rapid-fire submissions (minimum 500ms between sends)
    const currentTime = Date.now();
    if (currentTime - lastSubmitTimeRef.current < 500) {
      return;
    }
    lastSubmitTimeRef.current = currentTime;

    // Generate unique timestamp and counter to ensure ordering
    const now = Date.now();
    const counter = messageCounterRef.current++;
    const userMessage: Message = {
      id: `user-${now}-${counter}`,
      text: messageText,
      isUser: true,
      timestamp: new Date(now).toISOString()
    };

    // useChat handles input clearing automatically


    // Add user message simply
    setMessages(currentMessages => [...currentMessages, userMessage]);

    // Create conversation if it doesn't exist and user is authenticated
    let conversationId = searchParams.get('id');
    if (!conversationId && user?.id && user?.email) {
      try {
        const title = await SupabaseService.generateConversationTitle(messageText);
        
        // Use API route to create conversation
        console.log('Creating conversation with:', { title, model: selectedModel, initialMessage: messageText });
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            model: selectedModel,
            initialMessage: messageText
          })
        });

        console.log('Conversation creation response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Conversation created successfully:', data);
          conversationId = data.conversation.id;
          
          // Update URL with conversation ID immediately
          const url = new URL(window.location.href);
          url.searchParams.set('id', conversationId!);
          url.searchParams.delete('message'); // Remove initial message from URL
          window.history.replaceState({}, '', url.toString());
          
          // Save the initial user message to the newly created conversation
          try {
            const messageResponse = await fetch(`/api/conversations/${conversationId}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: messageText,
                role: 'user',
                metadata: { model_used: selectedModel }
              })
            });
            
            if (!messageResponse.ok) {
              console.error('Failed to save initial message:', await messageResponse.text());
            } else {
              console.log('Initial message saved successfully');
            }
          } catch (error) {
            console.error('Error saving initial message:', error);
          }
          
          // Now proceed with AI response
          setTimeout(() => {
            handleAIResponse(messageText, userMessage, conversationId || undefined);
          }, 100);
          
          return; // Exit early since we're handling the flow differently
        } else {
          const errorText = await response.text();
          console.error('Conversation creation failed:', errorText);
          
          // Check if it's a user-related error
          if (errorText.includes('User not found') || errorText.includes('Unauthorized')) {
            console.log('User authentication issue - continuing without conversation');
            // User authentication issue - try to continue without conversation
            setTimeout(() => {
              handleAIResponse(messageText, userMessage, undefined);
            }, 100);
            return;
          }
          
          // If conversation creation failed, still try to get AI response
          console.log('Conversation creation failed - continuing without conversation');
          setTimeout(() => {
            handleAIResponse(messageText, userMessage, undefined);
          }, 100);
          return;
        }
      } catch {
        // If conversation creation failed, still try to get AI response
        setTimeout(() => {
          handleAIResponse(messageText, userMessage, undefined);
        }, 100);
        return;
      }
    } else if (conversationId && user?.id) {
      // Add user message to existing conversation
      console.log('Adding user message to existing conversation:', conversationId);
      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: messageText,
            role: 'user',
            metadata: { model_used: selectedModel } // Add model info to metadata
          })
        });
        
        console.log('User message save status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to save user message:', errorText);
        } else {
          console.log('User message saved successfully');
        }
      } catch {
        console.error('Error saving user message');
        // Continue with AI response even if saving failed
      }
    } else if (!conversationId && user?.id) {
      // This case should not happen anymore since we create conversation above
      console.log('No conversation ID but user is authenticated - this should not happen');
    } else {
      console.log('Not saving user message - conversationId:', conversationId, 'user:', !!user?.id);
    }
    
    // Small delay to ensure the user message renders before getting AI response
    setTimeout(() => {
      handleAIResponse(messageText, userMessage, conversationId || undefined);
    }, 100);
  }; // END OF OLD FUNCTION - TO BE REMOVED
  */

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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

  /* DISABLED OLD FUNCTION - USING useChat NOW
  const handleRedoMessage = async (messageIndex: number) => {
    // Validate message index
    if (messageIndex < 0 || messageIndex >= messages.length) {
      console.error('Invalid message index:', messageIndex);
      return;
    }

    // Find the AI message to redo
    const aiMessage = messages[messageIndex];
    if (!aiMessage || aiMessage.isUser) return;

    // Find the user message that preceded this AI response
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0) {
      console.error('No user message found before AI message');
      return;
    }
    const userMessage = messages[userMessageIndex];
    if (!userMessage || !userMessage.isUser) return;

    // Set loading state


    const conversationId = searchParams.get('id');

    // If user is authenticated and conversation exists, delete subsequent messages from Supabase
    if (user?.id && conversationId) {
      try {
        // Delete all messages from the current AI message onwards
        await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deleteFromIndex: messageIndex
          })
        });
      } catch {
        console.error('Error deleting messages from Supabase');
        // Continue with local redo even if database deletion fails
      }
    }

    // Remove all messages from the current AI message onwards locally
    setMessages(currentMessages => {
      const newMessages = [...currentMessages];
      newMessages.splice(messageIndex);
      return newMessages;
    });

    // Regenerate AI response
    setTimeout(() => {
      handleAIResponse(userMessage.text, userMessage, conversationId || undefined);
    }, 100);
  };
  */

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
              console.error('❌ Error saving user message to new conversation:', error);
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
        <div className="conversation-container" ref={conversationContainerRef}>
          <div className="conversation-thread">
            
            {/* Display messages from useChat - single source of truth */}
            {messages.map((message, index) => {
              // Get sources for this specific message
              const messageSources = message.role === 'assistant' ? 
                // For the latest message, use currentSources (live during streaming)
                (index === messages.length - 1 && currentSources.length > 0 ? currentSources : 
                // For older messages, try to get from global lastSearchResults or use currentSources
                (global as any)?.messageSourcesMap?.[message.id] || []) : undefined;
              
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
                      if (isSourcesOpen) {
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
            {showWebModeSuggestion && !webSearchEnabled && (
              <div className="web-mode-suggestion">
                <div className="suggestion-content">
                  <div className="suggestion-text">
                    <strong>Switch to Web Mode for better answers</strong>
                    <p>The AI suggested switching to Web Mode (Exa) to get more accurate and up-to-date information.</p>
                  </div>
                  <button 
                    className="switch-mode-btn"
                    onClick={() => {
                      setWebSearchEnabled(true);
                      setSelectedWebSearchOption('Web Search (Exa)');
                      setShowWebModeSuggestion(false);
                    }}
                  >
                    Switch to Web Mode
                  </button>
                </div>
              </div>
            )}
            
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
        </div>

        {/* Input Section */}
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
                                // Update web search enabled based on selection
                                if (option.name === 'Chat') {
                                  setWebSearchEnabled(false);
                                } else if (option.name === 'Web Search (Exa)' || option.name === 'arXiv') {
                                  setWebSearchEnabled(true);
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