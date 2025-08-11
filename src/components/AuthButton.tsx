'use client';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from './SessionProvider';

interface AuthButtonProps {
  provider: 'github' | 'google' | 'twitter';
  onClick?: () => void;
}

const providerConfig = {
  github: {
    name: 'GitHub',
    icon: 'github'
  },
  google: {
    name: 'Google', 
    icon: 'google'
  },
  twitter: {
    name: 'X (Twitter)',
    icon: 'x-twitter'
  }
};

export default function AuthButton({ provider, onClick }: AuthButtonProps) {
  const config = providerConfig[provider];
  const { resolvedTheme, mounted } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { signIn } = useAuth();

  // Get the correct icon path based on theme
  const getIconSrc = (iconName: string) => {
    // Only use theme-dependent paths after component is mounted to prevent hydration mismatch
    if (!mounted) {
      return `/icon/${iconName}.svg`; // Default to light theme icons during SSR
    }
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  const handleClick = async () => {
    if (onClick) {
      onClick();
    } else {
      // Use Supabase Auth for OAuth authentication
      try {
        await signIn(provider);
      } catch (error) {
        console.error(`Error signing in with ${provider}:`, error);
      }
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="auth-btn"
    >
      <Image 
        src={getIconSrc(config.icon)} 
        alt={config.name} 
        width={20} 
        height={20} 
        className="icon-lg" 
      />
      {config.name}
    </button>
  );
} 