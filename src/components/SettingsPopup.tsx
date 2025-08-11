'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from './SessionProvider';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  const [activeTab, setActiveTab] = useState('general');
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();
  const { user } = useAuth();

  const handleThemeChange = async (theme: string) => {
    setTheme(theme)
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

  if (!isOpen) return null;

  return (
    <div className="settings-popup-overlay" onClick={onClose}>
      <div className="settings-popup" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button onClick={onClose} className="close-btn">
            <Image src={getIconSrc("cross")} alt="Close" width={16} height={16} className="icon" />
          </button>
        </div>

        <div className="settings-content">
          {/* User Profile Section */}
          {user && (
            <div className="settings-user-profile">
              {user.avatar_url && (
                <Image
                  src={user.avatar_url}
                  alt={user.name || 'User'}
                  width={48}
                  height={48}
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

          {/* Other Settings */}
          <div className="settings-section">
            <h3>Preferences</h3>
            <div className="setting-item">
              <label>
                <input type="checkbox" defaultChecked />
                Auto-save conversations
              </label>
            </div>
            <div className="setting-item">
              <label>
                <input type="checkbox" defaultChecked />
                Enable notifications
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 