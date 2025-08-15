'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from './SessionProvider';
import { SupabaseService, ConversationWithCount } from '@/lib/supabase-service';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMenuProps {
  chat: ConversationWithCount;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

interface ConversationGroup {
  label: string;
  conversations: ConversationWithCount[];
}

export default function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const { resolvedTheme, mounted } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chatHistory, setChatHistory] = useState<ConversationWithCount[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [connectionStatus, setConnectionStatus] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  // Refs for managing intervals and timeouts
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataFetchRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get the correct icon path based on theme
  const getIconSrc = (iconName: string) => {
    if (!mounted) {
      return `/icon/${iconName}.svg`;
    }
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  // Update cache statistics
  const updateCacheStats = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const stats = SupabaseService.getCacheStats();
        setCacheStats(stats);
      } catch (error) {
        console.warn('Failed to get cache stats:', error);
      }
    }
  }, []);

  // Enhanced load conversations with better error handling and retry logic
  const loadConversations = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;
    
    // Don't load if we recently fetched data (within 10 seconds) unless forced
    const now = Date.now();
    if (!forceRefresh && (now - lastDataFetchRef.current) < 10000) {
      console.log('Skipping conversation load - data was recently fetched');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Check connection health first
      const isConnected = await SupabaseService.checkConnection();
      setConnectionStatus(isConnected ? 'healthy' : 'unhealthy');
      
      if (!isConnected && !forceRefresh) {
        console.warn('Supabase connection unhealthy, attempting to use cached data');
        // Try to get cached data from SupabaseService
        const cachedData = await SupabaseService.getConversations(user.id, false);
        if (cachedData.length > 0) {
          setChatHistory(cachedData);
          setLastRefreshTime(now);
          return;
        }
      }
      
      const conversations = await SupabaseService.getConversations(user.id, forceRefresh);
      setChatHistory(conversations);
      setError(null);
      setLastRefreshTime(now);
      lastDataFetchRef.current = now;
      setConnectionStatus('healthy');
      
      // Clear any retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError('Failed to load conversations. Please try again.');
      setConnectionStatus('unhealthy');
      
      // Schedule a retry after 30 seconds if this wasn't a forced refresh
      if (!forceRefresh) {
        retryTimeoutRef.current = setTimeout(() => {
          console.log('Retrying conversation load after error');
          loadConversations(false);
        }, 30000);
      }
    } finally {
      setIsLoading(false);
      // Update cache stats after loading
      updateCacheStats();
    }
  }, [user?.id, updateCacheStats]);

  // Load conversations when sidebar opens or user changes
  useEffect(() => {
    // Don't do anything if auth is still loading
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    const loadData = async () => {
      if (isOpen && user?.id) {
        console.log('Sidebar opened, loading conversations for user:', user.id);
        try {
          setIsLoading(true);
          setError(null);
          const conversations = await SupabaseService.getConversations(user.id, true);
          console.log('Loaded conversations:', conversations.length);
          setChatHistory(conversations);
          setLastRefreshTime(Date.now());
          lastDataFetchRef.current = Date.now();
        } catch (error) {
          console.error('Error loading conversations:', error);
          setError('Failed to load conversations');
          setChatHistory([]);
        } finally {
          setIsLoading(false);
        }
      } else if (isOpen && !user?.id) {
        console.log('No user found, clearing chat history');
        setChatHistory([]);
        setError(null);
        setConnectionStatus('unknown');
      }
    };

    loadData();
  }, [isOpen, user?.id, authLoading]);

  // Periodic refresh - only when sidebar is open and user is authenticated
  useEffect(() => {
    if (!isOpen || !user?.id || authLoading) {
      // Clear intervals when sidebar is closed or user not ready
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Refresh conversations every 5 minutes (simplified)
    refreshIntervalRef.current = setInterval(async () => {
      console.log('Performing periodic refresh of chat history');
      try {
        const conversations = await SupabaseService.getConversations(user.id, true);
        setChatHistory(conversations);
        setLastRefreshTime(Date.now());
      } catch (error) {
        console.error('Periodic refresh failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isOpen, user?.id, authLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Listen for visibility changes to refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && isOpen && user?.id) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTime;
        
        // Refresh if it's been more than 1 minute since last refresh
        if (timeSinceLastRefresh > 1 * 60 * 1000) {
          console.log('Tab became visible, refreshing chat history');
          try {
            const conversations = await SupabaseService.getConversations(user.id, true);
            setChatHistory(conversations);
            setLastRefreshTime(now);
          } catch (error) {
            console.error('Visibility refresh failed:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, user?.id, lastRefreshTime]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
      }
    } catch (error) {
      return 'Invalid time';
    }
  };

  const getDateGroup = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return 'Today';
      } else if (diffInHours < 24) {
        return 'Last 24 hours';
      } else if (diffInHours < 168) { // 7 days
        return 'Last 7 days';
      } else if (diffInHours < 720) { // 30 days
        return 'Last 30 days';
      } else {
        return 'Older';
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  const groupConversations = (conversations: ConversationWithCount[]): ConversationGroup[] => {
    const groups: Record<string, ConversationWithCount[]> = {};
    
    conversations.forEach(conversation => {
      if (conversation.updated_at) {
        const group = getDateGroup(conversation.updated_at);
        if (!groups[group]) {
          groups[group] = [];
        }
        groups[group].push(conversation);
      }
    });

    // Sort groups in chronological order
    const groupOrder = ['Today', 'Last 24 hours', 'Last 7 days', 'Last 30 days', 'Older'];
    return groupOrder
      .filter(group => groups[group])
      .map(group => ({
        label: group,
        conversations: groups[group].sort((a, b) => {
          if (!a.updated_at || !b.updated_at) return 0;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        })
      }));
  };

  const getFilteredConversations = () => {
    if (!searchQuery.trim()) {
      return chatHistory;
    }
    
    const query = searchQuery.toLowerCase();
    return chatHistory.filter(chat => 
      (chat.title && chat.title.toLowerCase().includes(query))
    );
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/conversation?id=${chatId}`);
    onClose(); // Close the sidebar after navigation
  };

  const handleClearHistory = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setChatHistory([]);
        setShowClearConfirm(false);
        if (window.location.pathname === '/conversation') {
          router.push('/');
        }
      } else {
        console.error('Failed to clear history');
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const success = await SupabaseService.updateConversationTitle(id, newTitle);
      if (success) {
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === id ? { ...chat, title: newTitle } : chat
          )
        );
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
    setEditingId(null);
    setEditTitle('');
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await SupabaseService.deleteConversation(id);
      if (success) {
        setChatHistory(prev => prev.filter(chat => chat.id !== id));
        
        if (typeof window !== 'undefined') {
          const currentUrl = new URL(window.location.href);
          const currentConversationId = currentUrl.searchParams.get('id');
          
          if (currentConversationId === id && window.location.pathname === '/conversation') {
            router.push('/');
          }
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
    setOpenMenuId(null);
  };

  const handleMenuToggle = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      setOpenMenuId(id);
      setMenuPosition(getMenuPosition(event));
    }
  };

  const getMenuPosition = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right
    };
  };

  const handleStartEdit = (chat: ConversationWithCount) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
    setOpenMenuId(null);
  };

  const toggleSection = (sectionLabel: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionLabel)) {
        newSet.delete(sectionLabel);
      } else {
        newSet.add(sectionLabel);
      }
      return newSet;
    });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.chat-menu') && !target.closest('.chat-menu-trigger')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Chat Menu Component
  const ChatMenu = ({ chat, onRename, onDelete, onClose, position }: ChatMenuProps & { position: { top: number; right: number } }) => {
    return (
      <div 
        className="chat-menu"
        style={{
          top: `${position.top}px`,
          right: `${position.right}px`
        }}
      >
        <div className="chat-menu-item" onClick={(e) => {
          e.stopPropagation();
          handleStartEdit(chat);
        }}>
          <Image 
            src={getIconSrc("rename")} 
            alt="Rename" 
            width={14} 
            height={14} 
            className="icon-sm" 
          />
          <span>Rename</span>
        </div>
        <div className="chat-menu-item" onClick={(e) => {
          e.stopPropagation();
          onDelete(chat.id);
        }}>
          <Image 
            src={getIconSrc("delete")} 
            alt="Delete" 
            width={14} 
            height={14} 
            className="icon-sm" 
          />
          <span>Delete</span>
        </div>
      </div>
    );
  };

  const filteredConversations = getFilteredConversations();
  const groupedConversations = groupConversations(filteredConversations);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="history-backdrop"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`history-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="history-header">
          <div className="history-header-content">
            <div className="history-header-left">
              <Image 
                src={getIconSrc("history")} 
                alt="History" 
                width={20} 
                height={20} 
                className="history-header-icon" 
              />
              <h2>Chat History</h2>
                              <div className="header-controls">
                  <button
                    onClick={() => {
                      setShowDebugInfo(!showDebugInfo);
                      updateCacheStats();
                    }}
                    className="history-debug-btn"
                    title="Show debug info"
                  >
                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>i</span>
                  </button>
                </div>
            </div>
            <button 
              onClick={onClose}
              className="history-close-btn"
              title="Close"
            >
              <Image 
                src={getIconSrc("cross")} 
                alt="Close" 
                width={16} 
                height={16} 
                className="icon" 
              />
            </button>
          </div>
        </div>

        <div className="history-content">
          {error && (
            <div className="history-error">
              <p>{error}</p>
              <button 
                onClick={async () => {
                  if (user?.id) {
                    try {
                      setIsLoading(true);
                      setError(null);
                      const conversations = await SupabaseService.getConversations(user.id, true);
                      setChatHistory(conversations);
                      setLastRefreshTime(Date.now());
                    } catch (error) {
                      console.error('Retry failed:', error);
                      setError('Failed to load conversations');
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }}
                className="retry-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}
          
          {authLoading ? (
            <div className="history-loading">
              <p>Loading user session...</p>
            </div>
          ) : chatHistory.length === 0 && !error && !isLoading ? (
            <div className="history-empty">
              <Image 
                src={getIconSrc("history")} 
                alt="History" 
                width={48} 
                height={48} 
                className="history-empty-icon" 
              />
              <p>No chat history yet</p>
              <span>Your conversations will appear here</span>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="history-loading">
                  <p>Loading conversations...</p>
                </div>
              )}
              
              {/* Search Bar with Clear History */}
              <div className="history-search-container">
                <div className="history-search-input-wrapper">
                  <Image 
                    src={getIconSrc("send")} 
                    alt="Search" 
                    width={14} 
                    height={14} 
                    className="history-search-icon" 
                  />
                  <input
                    type="text"
                    placeholder={`Search from ${chatHistory.length} conversations...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="history-search-input"
                  />
                </div>
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="clear-history-btn-search"
                  disabled={isLoading || chatHistory.length === 0}
                  title="Clear all conversations"
                >
                  <Image 
                    src="/icon_light/clear_history.svg" 
                    alt="Clear" 
                    width={14} 
                    height={14} 
                    className="icon-sm" 
                  />
                  Clear
                </button>
              </div>

              {/* Debug Info Panel */}
              {showDebugInfo && (
                <div className="history-debug-panel">
                  <div className="debug-section">
                    <h4>Connection Status</h4>
                    <p>Status: <span className={`status-${connectionStatus}`}>{connectionStatus}</span></p>
                    <p>Last Refresh: {new Date(lastRefreshTime).toLocaleTimeString()}</p>
                    <p>Data Age: {Math.round((Date.now() - lastDataFetchRef.current) / 1000)}s ago</p>
                  </div>
                  {cacheStats && (
                    <div className="debug-section">
                      <h4>Cache Statistics</h4>
                      <p>Total Entries: {cacheStats.totalEntries}</p>
                      <p>Valid Entries: {cacheStats.validEntries}</p>
                      <p>Expired Entries: {cacheStats.expiredEntries}</p>
                      <p>Total Data: {cacheStats.totalDataSize} conversations</p>
                    </div>
                  )}
                  <div className="debug-actions">
                    <button 
                      onClick={async () => {
                        if (user?.id) {
                          try {
                            await SupabaseService.refreshUserCache(user.id);
                            const conversations = await SupabaseService.getConversations(user.id, true);
                            setChatHistory(conversations);
                            setLastRefreshTime(Date.now());
                            updateCacheStats();
                          } catch (error) {
                            console.error('Cache refresh failed:', error);
                          }
                        }
                      }}
                      className="debug-refresh-btn"
                      disabled={isLoading}
                    >
                      Force Cache Refresh
                    </button>
                    <button 
                      onClick={() => {
                        if (user?.id) {
                          SupabaseService.clearConversationCache(user.id);
                          updateCacheStats();
                        }
                      }}
                      className="debug-clear-btn"
                    >
                      Clear Cache
                    </button>
                  </div>
                </div>
              )}
              
              {/* Conversations List */}
              <div className="history-tree-container">
                {groupedConversations.length === 0 ? (
                  <div className="history-no-results">
                    <p>No conversations found</p>
                    <span>Try adjusting your search terms</span>
                  </div>
                ) : (
                  groupedConversations.map((group) => (
                    <div key={group.label} className="history-tree-section">
                      <div className="history-tree-header">
                        <div className="tree-header-content">
                          <div 
                            className="tree-header-icon"
                            onClick={() => toggleSection(group.label)}
                            style={{ cursor: 'pointer' }}
                          >
                            <svg 
                              width="12" 
                              height="12" 
                              viewBox="0 0 12 12" 
                              fill="none"
                              style={{ 
                                transform: collapsedSections.has(group.label) ? 'rotate(-90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                              }}
                            >
                              <path 
                                d="M2 3L6 7L10 3" 
                                stroke="currentColor" 
                                strokeWidth="1.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <span className="tree-header-label">{group.label}</span>
                        </div>
                      </div>
                      
                      {!collapsedSections.has(group.label) && (
                        <div className="history-tree-list">
                          {group.conversations.map((chat) => (
                          <div key={chat.id} className="history-tree-item">
                            <div 
                              className="tree-item-content"
                              onClick={() => {
                                if (editingId !== chat.id) {
                                  handleChatClick(chat.id);
                                }
                              }}
                              style={{ cursor: editingId === chat.id ? 'default' : 'pointer' }}
                            >
                              <div className="tree-item-main">
                                {editingId === chat.id ? (
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (editTitle.trim()) {
                                          handleRename(chat.id, editTitle.trim());
                                        } else {
                                          setEditingId(null);
                                          setEditTitle('');
                                        }
                                      } else if (e.key === 'Escape') {
                                        setEditingId(null);
                                        setEditTitle('');
                                      }
                                    }}
                                    onBlur={() => {
                                      if (editTitle.trim()) {
                                        handleRename(chat.id, editTitle.trim());
                                      } else {
                                        setEditingId(null);
                                        setEditTitle('');
                                      }
                                    }}
                                    className="tree-item-edit-input"
                                    autoFocus
                                  />
                                ) : (
                                  <>
                                    <div className="tree-item-title">{chat.title}</div>
                                    <div className="tree-item-meta">
                                      <span className="tree-item-time">{chat.updated_at ? formatTimestamp(chat.updated_at) : 'Unknown Time'}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {/* Actions */}
                              <div className="tree-item-actions">
                                <button
                                  className="chat-menu-trigger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMenuToggle(chat.id, e);
                                  }}
                                  title="More options"
                                >
                                  <Image 
                                    src={getIconSrc("more")} 
                                    alt="More options" 
                                    width={12} 
                                    height={12} 
                                    className={`tree-item-more ${openMenuId === chat.id ? 'active' : ''}`}
                                  />
                                </button>
                                
                                {openMenuId === chat.id && menuPosition && (
                                  <ChatMenu
                                    chat={chat}
                                    onRename={handleRename}
                                    onDelete={handleDelete}
                                    onClose={() => {
                                      setOpenMenuId(null);
                                      setMenuPosition(null);
                                    }}
                                    position={menuPosition}
                                  />
                                )}

                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Clear History Confirmation Modal */}
      {showClearConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1003,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 8px 32px var(--color-shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: 'var(--color-text)'
            }}>
              Clear Chat History
            </h3>
            <p style={{ 
              margin: '0 0 20px 0', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              This will permanently delete all your conversations. This action cannot be undone.
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 