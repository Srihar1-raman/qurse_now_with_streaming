'use client';

import Link from 'next/link';
import AuthButton from '@/components/AuthButton';

export default function LoginPage() {
  return (
    <div className="auth-container">
      {/* Form Section */}
      <div className="form-section">
        <div className="mobile-bg-image"></div>
        <Link href="/" className="logo" style={{ fontSize: '72px', marginBottom: '40px' }}>
          Qurse
        </Link>
        
        <div className="form-content">
          <h1 className="form-title">
            Log in
          </h1>
          <p className="form-subtitle">
            Log in to your account using your preferred provider
          </p>

          <div className="auth-buttons-container">
            <AuthButton provider="github" />
            <AuthButton provider="google" />
            <AuthButton provider="twitter" />
          </div>

          <div className="form-footer">
            Don&apos;t have an account?{' '}
            <Link href="/signup">
              Sign up
            </Link>
          </div>

          <div className="terms-text">
            By continuing, you agree to our <a href="/info?section=terms">Terms of Service</a> and <a href="/info?section=privacy">Privacy Policy</a>.
          </div>
        </div>
      </div>

      {/* Image Section - Desktop Only */}
      <div 
        className="image-section"
        style={{ backgroundImage: 'url("/images/login-page.jpeg")' }}
      />
    </div>
  );
} 