'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from './SessionProvider';
import type { Theme } from '@/lib/ThemeContext';

interface HeaderProps {
  onSettingsClick?: () => void;
  showAuthButtons?: boolean;
  showInfoTabs?: boolean;
  activeInfoSection?: string;
  onInfoSectionChange?: (section: string) => void;
  showHistoryButton?: boolean;
  onHistoryClick?: () => void;
  showNewChatButton?: boolean;
  onNewChatClick?: () => void;
  infoTabs?: Array<{ id: string; label: string; icon: string }>;
}

export default function Header({ onSettingsClick, showAuthButtons = true, showInfoTabs = false, activeInfoSection = 'about', onInfoSectionChange, showHistoryButton = false, onHistoryClick, showNewChatButton = false, onNewChatClick, infoTabs }: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
    if (onSettingsClick) onSettingsClick();
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleThemeChange = async (theme: Theme) => {
    setTheme(theme);
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: { theme }
        })
      })
    } catch (error) {
      // Silently handle error
    }
  }

  const showAbout = () => {
    router.push('/info?section=about');
    closeSettings();
  };

  const openGithub = () => {
    window.open('https://github.com', '_blank');
  };

  const openTwitter = () => {
    window.open('https://x.com', '_blank');
  };

  const handleSignOut = async () => {
    await signOut();
    closeSettings();
  };

  // Close settings when clicking outside
  const handleBackdropClick = () => {
    if (isSettingsOpen) {
      closeSettings();
    }
  };

  // Get the correct icon path based on theme
  const getIconSrc = (iconName: string, isActive: boolean = false) => {
    if (!mounted) {
      return `/icon/${iconName}.svg`;
    }
    
    // For active tabs, always use light icons for contrast against green background
    if (isActive) {
      return `/icon_light/${iconName}.svg`;
    }
    
    // For inactive tabs, use theme-appropriate icons
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  // Get the correct icon path for buttons with inverted backgrounds (like history and profile buttons)
  const getInvertedIconSrc = (iconName: string) => {
    // Only use theme-dependent paths after component is mounted to prevent hydration mismatch
    if (!mounted) {
      return `/icon/${iconName}.svg`; // Default to light theme icons during SSR
    }
    // Inverted logic: dark theme uses dark icons, light theme uses light icons
    const iconFolder = resolvedTheme === 'dark' ? 'icon' : 'icon_light';
    return `/${iconFolder}/${iconName}.svg`;
  };

  // Get user's first initial
  const getUserInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Create redirect URL for auth pages
  const getAuthUrl = (authType: 'login' | 'signup') => {
    // During SSR, only use pathname to prevent hydration mismatch
    if (!mounted) {
      const currentUrl = encodeURIComponent(pathname);
      return `/${authType}?redirect=${currentUrl}`;
    }
    // After mounting, include search params
    const currentUrl = encodeURIComponent(pathname + (typeof window !== 'undefined' ? window.location.search : ''));
    return `/${authType}?redirect=${currentUrl}`;
  };

  return (
    <>
      {/* Backdrop for closing settings */}
      {isSettingsOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40
          }}
          onClick={handleBackdropClick}
        />
      )}
      
      <header className="header">
        <div className="header-left">
          <Link href="/" className="logo">
            {'{Qurse}'}
          </Link>
          
          {showInfoTabs && (
            <div className="header-info-tabs">
              {(infoTabs || ['about', 'terms', 'privacy', 'cookies']).map((section) => {
                const sectionId = typeof section === 'string' ? section : section.id;
                const sectionLabel = typeof section === 'string' ? section.charAt(0).toUpperCase() + section.slice(1) : section.label;
                const sectionIcon = typeof section === 'string' ? null : section.icon;
                
                return (
                  <button
                    key={sectionId}
                    onClick={() => onInfoSectionChange?.(sectionId)}
                    className={`header-info-tab ${activeInfoSection === sectionId ? 'active' : ''}`}
                  >
                    {sectionIcon && (
                      <Image 
                        src={getIconSrc(sectionIcon)} 
                        alt={sectionLabel} 
                        width={14} 
                        height={14} 
                        className="icon-sm" 
                      />
                    )}
                    <span>{sectionLabel}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="auth-buttons">
          {!user && showAuthButtons && (
            // Show auth buttons when not authenticated
            <>
              <div className="desktop-auth">
                <Link href={getAuthUrl('login')}>
                  <button className="btn-primary">
                    Log in
                  </button>
                </Link>
                <Link href={getAuthUrl('signup')}>
                  <button className="btn-secondary">
                    Sign up
                  </button>
                </Link>
              </div>
              <Link href={getAuthUrl('login')} className="mobile-profile">
                <button className="btn-profile">
                  <Image 
                    src={getIconSrc("profile")} 
                    alt="Profile" 
                    width={16} 
                    height={16} 
                    className="icon" 
                  />
                </button>
              </Link>
            </>
          )}
          
          {showNewChatButton && (
            <button
              onClick={onNewChatClick}
              className="btn-new-chat"
              title="New Chat"
            >
              <Image 
                src={getInvertedIconSrc("plus")} 
                alt="New Chat" 
                width={16} 
                height={16} 
                className="icon" 
              />
            </button>
          )}
          
          {showHistoryButton && (
            <button
              onClick={onHistoryClick}
              className="btn-history"
              title="Chat History"
            >
              <Image 
                src={getInvertedIconSrc("history")} 
                alt="History" 
                width={16} 
                height={16} 
                className="icon" 
              />
            </button>
          )}
          
          <div className="settings-dropdown">
            <button
              onClick={toggleSettings}
              className={authLoading ? "btn-settings" : (user ? "btn-user-avatar" : "btn-settings")}
              disabled={authLoading}
            >
              {authLoading ? (
                // Show loading state while auth is being determined
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--color-text-secondary)', 
                  opacity: 0.5 
                }}></div>
              ) : user ? (
                // Show user initial when authenticated
                <span className="user-initial">
                  {getUserInitial()}
                </span>
              ) : (
                // Show profile icon when not authenticated
                <Image 
                  src={getInvertedIconSrc("profile")} 
                  alt="Profile" 
                  width={16} 
                  height={16} 
                  className="icon" 
                />
              )}
            </button>
            
            {isSettingsOpen && (
              <div className={`settings-menu ${isSettingsOpen ? 'show' : ''}`}>
                {/* User Profile Section - Only show when authenticated */}
                {user && (
                  <div className="settings-user-profile">
                    {user.avatar_url && (
                      <Image
                        src={user.avatar_url}
                        alt={user.name || 'User'}
                        width={32}
                        height={32}
                        className="user-avatar"
                        style={{ borderRadius: '50%' }}
                      />
                    )}
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                )}

                {/* Theme Selector */}
                <div className="settings-theme-selector">
                  <div className="theme-label">
                    <Image 
                      src={getIconSrc("theme")} 
                      alt="Theme" 
                      width={16} 
                      height={16} 
                      className="icon" 
                    />
                    <span>Theme</span>
                  </div>
                  <div className="theme-options">
                    {(['auto', 'light', 'dark'] as const).map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => handleThemeChange(themeOption)}
                        className={`theme-btn ${theme === themeOption ? 'active' : ''}`}
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

                {/* Settings Section */}
                <div className="settings-section">
                  {user && (
                    <div className="settings-menu-item" onClick={() => { router.push('/settings'); closeSettings(); }}>
                      <Image 
                        src={getIconSrc("settings")} 
                        alt="Settings" 
                        width={16} 
                        height={16} 
                        className="icon" 
                      />
                      <span className="label">Settings</span>
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="settings-section">
                  <div className="settings-menu-item" onClick={showAbout}>
                    <Image 
                      src={getIconSrc("about")} 
                      alt="About" 
                      width={16} 
                      height={16} 
                      className="icon" 
                    />
                    <span className="label">About</span>
                  </div>

                  <div className="settings-menu-item" onClick={() => { router.push('/info?section=terms'); closeSettings(); }}>
                    <Image 
                      src={getIconSrc("terms")} 
                      alt="Terms" 
                      width={16} 
                      height={16} 
                      className="icon" 
                    />
                    <span className="label">Terms</span>
                  </div>

                  <div className="settings-menu-item" onClick={() => { router.push('/info?section=privacy'); closeSettings(); }}>
                    <Image 
                      src={getIconSrc("privacy")} 
                      alt="Privacy" 
                      width={16} 
                      height={16} 
                      className="icon" 
                    />
                    <span className="label">Privacy</span>
                  </div>
                </div>

                {/* Social Section */}
                <div className="settings-section">
                  <div className="settings-menu-item" onClick={openGithub}>
                    <Image 
                      src={getIconSrc("github")} 
                      alt="GitHub" 
                      width={16} 
                      height={16} 
                      className="icon" 
                    />
                    <span className="label">GitHub</span>
                  </div>

                  <div className="settings-menu-item" onClick={openTwitter}>
                    <Image 
                      src={getIconSrc("x-twitter")} 
                      alt="X" 
                      width={16} 
                      height={16} 
                      className="icon" 
                    />
                    <span className="label">X</span>
                  </div>
                </div>

                {/* Sign Out/Sign In Section */}
                <div className="settings-section">
                  {user ? (
                    <div className="settings-menu-item" onClick={handleSignOut}>
                      <Image 
                        src={getIconSrc("signout")} 
                        alt="Sign out" 
                        width={16} 
                        height={16} 
                        className="icon" 
                      />
                      <span className="label">Sign out</span>
                    </div>
                  ) : (
                    <div className="settings-menu-item" onClick={() => { router.push(getAuthUrl('login')); closeSettings(); }}>
                      <Image 
                        src={getIconSrc("profile")} 
                        alt="Sign in" 
                        width={16} 
                        height={16} 
                        className="icon" 
                      />
                      <span className="label">Sign in / Sign up</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
} 