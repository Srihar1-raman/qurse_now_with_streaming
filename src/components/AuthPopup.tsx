'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/ThemeContext';
import AuthButton from '@/components/AuthButton';

interface AuthPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthPopup({ isOpen, onClose }: AuthPopupProps) {
  const { resolvedTheme, mounted } = useTheme();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Get the correct icon path based on theme
  const getIconSrc = (iconName: string) => {
    if (!mounted) {
      return `/icon/${iconName}.svg`;
    }
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="auth-popup-backdrop"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="auth-popup">
        <div className="auth-popup-content">
          {/* Close Button */}
          <button 
            className="auth-popup-close"
            onClick={onClose}
          >
            <Image 
              src={getIconSrc("cross")} 
              alt="Close" 
              width={16} 
              height={16} 
              className="icon" 
            />
          </button>

          {/* Header */}
          <div className="auth-popup-header">
            <div className="auth-popup-logo">
              Qurse
            </div>
            <h2 className="auth-popup-title">
              {activeTab === 'login' ? 'Welcome Back' : 'Join Qurse'}
            </h2>
            <p className="auth-popup-subtitle">
              {activeTab === 'login' 
                ? 'Sign in to access chat history' 
                : 'Create an account to save your conversations'
              }
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="auth-popup-tabs">
            <button
              className={`auth-popup-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Sign In
            </button>
            <button
              className={`auth-popup-tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => setActiveTab('signup')}
            >
              Sign Up
            </button>
          </div>

          {/* Auth Buttons */}
          <div className="auth-popup-buttons">
            <AuthButton provider="github" />
            <AuthButton provider="google" />
            <AuthButton provider="twitter" />
          </div>

          {/* Footer */}
          <div className="auth-popup-footer">
            <p className="auth-popup-terms">
              By continuing, you agree to our{' '}
              <a href="/info?section=terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/info?section=privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 