'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/components/SessionProvider';
import HistorySidebar from '@/components/HistorySidebar';
import Image from 'next/image';
import { MODEL_GROUPS, isReasoningModel } from '@/lib/ai-service';


export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('accounts');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingChats, setIsClearingChats] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [userStats, setUserStats] = useState<{ totalConversations: number }>({ totalConversations: 0 });
  const [connectedProvider, setConnectedProvider] = useState<string>('');

  // Determine connected provider based on email
  const getConnectedProvider = (email: string) => {
    if (email?.includes('@gmail.com')) return 'google';
    if (email?.includes('@github.com')) return 'github';
    return 'email'; // Default email sign-in
  };
  const [autoSaveConversations, setAutoSaveConversations] = useState(true);
  const [language, setLanguage] = useState('English');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();
  const { user, signOut } = useAuth();
  const searchParams = useSearchParams();

  // Get all available models from enabled groups
  const getAvailableModels = () => {
    const models: { name: string; provider: string; imageSupport?: boolean }[] = [];
    Object.values(MODEL_GROUPS).forEach(group => {
      if (group.enabled) {
        group.models.forEach(model => {
          models.push({
            name: model.name,
            provider: group.provider,
            imageSupport: model.imageSupport
          });
        });
      }
    });
    return models;
  };

  const availableModels = getAvailableModels();

  // Handle URL parameters for section
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['accounts', 'general', 'payment', 'system'].includes(section)) {
      setActiveSection(section);
    } else {
      setActiveSection('accounts');
    }
  }, [searchParams]);

  // Load user stats and preferences
  useEffect(() => {
    if (user?.id) {
      loadUserStats();
      loadUserPreferences();
    }
  }, [user?.id]);

  // Auto-save settings when they change (debounced)
  useEffect(() => {
    if (!user?.id) return;
    const timeoutId = setTimeout(() => {
      handleSaveSettings(true);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [autoSaveConversations, language]);

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setAutoSaveConversations(data.preferences.auto_save !== false);
          setLanguage(data.preferences.language || 'English');
          if (data.preferences.theme && !localStorage.getItem('theme')) {
            setTheme(data.preferences.theme);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const handleSaveSettings = async (isAutoSave: boolean = false) => {
    if (!user?.id) return;
    if (!isAutoSave) {
      setIsSaving(true);
      setSaveStatus('saving');
    }
    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: {
            auto_save: autoSaveConversations,
            language: language,
          }
        }),
      });
      if (response.ok) {
        if (!isAutoSave) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      } else {
        if (!isAutoSave) {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      if (!isAutoSave) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    // Require confirmation
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type "DELETE" to confirm account deletion.');
      return;
    }
    
    try {
      setIsDeleting(true);
      
      // Delete the user data from our database (this will also handle auth deletion)
      const response = await fetch('/api/user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Sign out the user (this will clear the session)
        await signOut();
        
        // Redirect to home page
        router.push('/');
      } else {
        const errorData = await response.json();
        console.error('Error deleting account:', errorData);
        setIsDeleting(false);
        alert(`Failed to delete account: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
      alert(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearAllChats = async () => {
    if (!user?.id) return;
    try {
      setIsClearingChats(true);
      const response = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        setUserStats({ totalConversations: 0 });
        setShowClearChatsConfirm(false);
        router.push('/');
      } else {
        setIsClearingChats(false);
      }
    } catch (error) {
      setIsClearingChats(false);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    if (user?.id) {
      try {
        await fetch('/api/user', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            preferences: {
              theme: newTheme
            }
          }),
        });
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  };

  const getIconSrc = (iconName: string, isActive: boolean = false) => {
    if (!mounted) {
      return `/icon/${iconName}.svg`;
    }
    if (isActive) {
      return `/icon_light/${iconName}.svg`;
    }
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  const sections = [
    { id: 'accounts', label: 'Accounts', icon: 'accounts' },
    { id: 'general', label: 'General', icon: 'general' },
    { id: 'payment', label: 'Payment', icon: 'payment' },
    { id: 'system', label: 'System', icon: 'system' }
  ];

  const handleNewChatClick = () => {
    router.push('/');
  };

  const handleHistoryClick = () => {
    setIsHistoryOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header 
        showInfoTabs={false}
        activeInfoSection={activeSection}
        onInfoSectionChange={setActiveSection}
        showNewChatButton={true}
        onNewChatClick={handleNewChatClick}
        showHistoryButton={!!user}
        onHistoryClick={handleHistoryClick}
      />
      
      <div className="info-tabs-container">
        <div className="info-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                const url = new URL(window.location.href);
                url.searchParams.set('section', section.id);
                window.history.pushState({}, '', url.toString());
              }}
              className={`info-tab ${activeSection === section.id ? 'active' : ''}`}
            >
              <Image 
                src={getIconSrc(section.icon, activeSection === section.id)} 
                alt={section.label} 
                width={16} 
                height={16} 
                className="icon" 
              />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '768px', margin: '0 auto', padding: '20px', marginTop: '-20px' }}>
        <div className="settings-content">
          {activeSection === 'accounts' && (
            <div className="settings-section">
              <h2>Account Settings</h2>
              {user ? (
                <>
                  <div className="settings-group">
                    <label className="settings-label">Account Profile</label>
                    <div className="account-info">
                      <div className="account-avatar">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.name || 'User'}
                            width={48}
                            height={48}
                            className="user-avatar-large"
                            style={{ borderRadius: '50%' }}
                          />
                        ) : (
                          <div className="user-avatar-placeholder">
                            {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="account-details">
                        <h4>{user.name || 'User'}</h4>
                        <p>{user.email}</p>
                        <p className="auth-provider-info">
                          Connected via {user.email?.includes('@gmail.com') ? 'Google' : 'Email'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Linked Providers Section */}
                  <div className="settings-group">
                    <label className="settings-label">Linked Accounts</label>
                    <div className="linked-providers-list">
                      <div className="provider-item">
                        <Image 
                          src={getIconSrc('google')} 
                          alt="Google" 
                          width={16} 
                          height={16} 
                          className="provider-icon" 
                        />
                        <span className="provider-name">Google</span>
                        <span className={`provider-status ${getConnectedProvider(user.email) === 'google' ? 'connected' : 'not-connected'}`}>
                          {getConnectedProvider(user.email) === 'google' ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      <div className="provider-item">
                        <Image 
                          src={getIconSrc('github')} 
                          alt="GitHub" 
                          width={16} 
                          height={16} 
                          className="provider-icon" 
                        />
                        <span className="provider-name">GitHub</span>
                        <span className={`provider-status ${getConnectedProvider(user.email) === 'github' ? 'connected' : 'not-connected'}`}>
                          {getConnectedProvider(user.email) === 'github' ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="settings-group">
                    <label className="settings-label">Account Activity</label>
                    <div className="settings-item">
                      <div className="settings-item-content">
                        <h4>Last Login</h4>
                        <p>{new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="settings-item">
                      <div className="settings-item-content">
                        <h4>Account Created</h4>
                        <p>{user.email ? 'Recently' : 'Not available'}</p>
                      </div>
                    </div>
                    <div className="settings-item">
                      <div className="settings-item-content">
                        <h4>Total Conversations</h4>
                        <p>{userStats.totalConversations} conversations</p>
                      </div>
                    </div>
                  </div>

                  <div className="settings-group">
                    <label className="settings-label">Account Actions</label>
                    <div className="settings-item danger-item">
                      <div className="settings-item-content">
                        <h4>Sign Out</h4>
                        <p>Sign out of your account on this device</p>
                      </div>
                      <button 
                        className="settings-btn-secondary-small"
                        onClick={handleSignOut}
                      >
                        Sign Out
                      </button>
                    </div>
                    <div className="settings-item danger-item">
                      <div className="settings-item-content">
                        <h4>Clear All Chats</h4>
                        <p>Delete all your conversations and start fresh. This action cannot be undone.</p>
                      </div>
                      <button 
                        className="settings-btn-danger-small"
                        onClick={() => setShowClearChatsConfirm(true)}
                        title="Clear all conversations"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="settings-item danger-item">
                      <div className="settings-item-content">
                        <h4>Delete Account</h4>
                        <p>Permanently delete your account and all data</p>
                      </div>
                      <button 
                        className="settings-btn-danger-small"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="account-signin-prompt">
                  <p>Sign in to manage your account settings</p>
                  <button className="settings-btn-primary">
                    Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSection === 'general' && (
            <div className="settings-section">
              <h2>General Settings</h2>
              
              <div className="settings-group">
                <div className="settings-item">
                  <div className="settings-item-content">
                    <h4>Theme</h4>
                    <p>Choose your preferred appearance. Auto follows your system settings.</p>
                  </div>
                  <div className="theme-options">
                    {(['auto', 'light', 'dark'] as const).map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => handleThemeChange(themeOption)}
                        className={`theme-btn ${theme === themeOption ? 'active' : ''}`}
                        title={themeOption === 'auto' ? 'Follow system' : themeOption === 'light' ? 'Light theme' : 'Dark theme'}
                      >
                        <Image 
                          src={getIconSrc(`theme-${themeOption}`, theme === themeOption)} 
                          alt={themeOption} 
                          width={14} 
                          height={14} 
                          className="icon-sm" 
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label">Auto-save Conversations</label>
                <p className="settings-description">
                  Automatically save your conversations to your account for future reference and access across devices.
                </p>
                <div className="settings-toggle">
                  <input 
                    type="checkbox" 
                    id="auto-save" 
                    checked={autoSaveConversations}
                    onChange={(e) => setAutoSaveConversations(e.target.checked)}
                  />
                  <label htmlFor="auto-save"></label>
                </div>
                {autoSaveConversations && (
                  <p className="settings-note">
                    ✓ Conversations will be automatically saved and synced across your devices
                  </p>
                )}
              </div>

              <div className="settings-group">
                <label className="settings-label">Language</label>
                <p className="settings-description">
                  Select your preferred language for the interface.
                </p>
                <select 
                  className="settings-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                </select>
              </div>

              <div className="settings-group">
                <div className="settings-item">
                  <div className="settings-item-content">
                    <h4>Settings Sync</h4>
                    <p>
                      {user ? 
                        'Your settings are automatically saved to your account and will sync across all devices.' :
                        'Sign in to save your settings and sync them across all devices.'
                      }
                    </p>
                    {saveStatus === 'saved' && (
                      <p className="settings-success">✓ Settings saved successfully!</p>
                    )}
                    {saveStatus === 'error' && (
                      <p className="settings-error">✗ Failed to save settings. Please try again.</p>
                    )}
                    {user && saveStatus === 'idle' && (
                      <p className="settings-note">Settings will be saved automatically when you make changes.</p>
                    )}
                  </div>
                  {user && (
                    <button 
                      className={`settings-btn-secondary-small ${isSaving ? 'loading' : ''}`}
                      onClick={() => handleSaveSettings(false)}
                      disabled={isSaving}
                      title="Manually save settings"
                    >
                      {isSaving ? 'Saving...' : 'Save Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'payment' && (
            <div className="settings-section">
              <h2>Payment & Billing</h2>
              <div className="settings-group">
                <label className="settings-label">Current Plan</label>
                <div className="account-info">
                  <div className="account-details">
                    <h4>Free Plan</h4>
                    <p>0 messages remaining this month</p>
                  </div>
                  <button className="settings-btn-primary">
                    Upgrade Plan
                  </button>
                </div>
              </div>
              <div className="settings-group">
                <label className="settings-label">Payment Method</label>
                <div className="account-info">
                  <div className="account-details">
                    <h4>No payment method</h4>
                    <p>Add a payment method to upgrade</p>
                  </div>
                  <button className="settings-btn-secondary">
                    Add Payment Method
                  </button>
                </div>
              </div>
              <div className="settings-group">
                <label className="settings-label">Billing History</label>
                <p className="settings-description">No billing history available</p>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="settings-section">
              <h2>System Settings</h2>
              <div className="settings-group">
                <label className="settings-label">Custom System Message</label>
                <p className="settings-description">
                  Set a custom system message that will be sent to the AI at the beginning of each conversation. 
                  This helps define the AI's role, behavior, and context for all your chats.
                </p>
                <textarea 
                  className="settings-textarea"
                  placeholder="You are a helpful AI assistant. You are knowledgeable, friendly, and always try to provide accurate and helpful responses..."
                  rows={6}
                  defaultValue="You are a helpful AI assistant. You are knowledgeable, friendly, and always try to provide accurate and helpful responses."
                />
                <div className="settings-textarea-actions">
                  <button className="settings-btn-secondary-small">
                    Reset
                  </button>
                  <button className="settings-btn-primary-small">
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showDeleteConfirm && (
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
          onClick={() => {
            setShowDeleteConfirm(false);
            setDeleteConfirmation('');
          }}
        >
          <div 
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 8px 32px var(--color-shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#ef4444'
            }}>
              Delete Account
            </h3>
            <p style={{ 
              margin: '0 0 16px 0', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              This will permanently delete your account and all associated data, including:
            </p>
            <ul style={{
              margin: '0 0 20px 20px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              <li>All conversations ({userStats.totalConversations} total)</li>
              <li>Account profile and settings</li>
              <li>Any uploaded files and attachments</li>
            </ul>
            <p style={{ 
              margin: '0 0 24px 0', 
              color: '#ef4444',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              This action cannot be undone.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--color-text)'
              }}>
                Type "DELETE" to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text)',
                  fontSize: '14px'
                }}
                disabled={isDeleting}
              />
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmation('');
                }}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== 'DELETE'}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: deleteConfirmation === 'DELETE' ? '#ef4444' : '#6b7280',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: (isDeleting || deleteConfirmation !== 'DELETE') ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: (isDeleting || deleteConfirmation !== 'DELETE') ? 0.6 : 1
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearChatsConfirm && (
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
          onClick={() => setShowClearChatsConfirm(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 8px 32px var(--color-shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#ef4444'
            }}>
              Clear All Chats
            </h3>
            <p style={{ 
              margin: '0 0 16px 0', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              This will permanently delete all your conversations ({userStats.totalConversations} total) and cannot be undone.
            </p>
            <p style={{ 
              margin: '0 0 16px 0', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              This includes:
            </p>
            <ul style={{
              margin: '0 0 16px 20px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              <li>All conversations and messages</li>
              <li>Any uploaded files and attachments</li>
            </ul>
            <p style={{ 
              margin: '0 0 16px 0', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              Your account and settings will remain intact.
            </p>
            <p style={{ 
              margin: '0 0 24px 0', 
              color: '#ef4444',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              This action cannot be undone.
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => setShowClearChatsConfirm(false)}
                disabled={isClearingChats}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  borderRadius: '6px',
                  cursor: isClearingChats ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isClearingChats ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllChats}
                disabled={isClearingChats}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: isClearingChats ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isClearingChats ? 0.6 : 1
                }}
              >
                {isClearingChats ? 'Clearing...' : 'Clear All Chats'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 