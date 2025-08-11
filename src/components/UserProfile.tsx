'use client';

import { useAuth } from './SessionProvider';
import Image from 'next/image';

export default function UserProfile() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="user-profile">
      <div className="user-avatar">
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.name || 'User'}
            width={32}
            height={32}
            className="avatar-image"
            style={{ borderRadius: '50%' }}
          />
        ) : (
          <div className="avatar-placeholder">
            {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
        )}
      </div>
      <div className="user-info">
        <div className="user-name">{user.name || 'User'}</div>
        <div className="user-email">{user.email}</div>
      </div>
    </div>
  );
} 