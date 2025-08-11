'use client';

import Link from 'next/link';
import AuthButton from '@/components/AuthButton';

export default function SignupPage() {
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
            Sign up
          </h1>
          <p className="form-subtitle">
            Create your account using your preferred provider
          </p>

          <div className="auth-buttons-container">
            <AuthButton provider="github" />
            <AuthButton provider="google" />
            <AuthButton provider="twitter" />
          </div>

          <div className="form-footer">
            Already have an account?{' '}
            <Link href="/login">
              Log in
            </Link>
          </div>

          <div className="terms-text">
            By creating an account, you agree to our <a href="/info?section=terms">Terms of Service</a> and <a href="/info?section=privacy">Privacy Policy</a>.
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