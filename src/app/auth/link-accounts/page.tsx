'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';

function LinkAccountsPageContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const email = searchParams.get('email');
  const provider = searchParams.get('provider');
  const next = searchParams.get('next') || '/';

  const [existingUser, setExistingUser] = useState<any>(null);

  useEffect(() => {
    if (email) {
      // Get existing user data to show in the confirmation
      const fetchExistingUser = async () => {
        try {
          const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, avatar_url, created_at')
            .eq('email', email)
            .single();

          if (user && !error) {
            setExistingUser(user);
          }
        } catch (error) {
          console.error('Error fetching existing user:', error);
        }
      };

      fetchExistingUser();
    }
  }, [email, supabase]);

  const handleLinkAccounts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the current session to confirm the user is signed in
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session found');
      }

      // The account linking is actually handled automatically by Supabase Auth
      // We just need to ensure the user profile is properly updated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update the user profile with the new provider information
        await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || existingUser?.name,
            avatar_url: user.user_metadata?.avatar_url || existingUser?.avatar_url,
            preferences: existingUser?.preferences || {
              theme: 'auto',
              language: 'en',
              auto_save: true,
              default_model: 'Llama 3.1 70B (Groq)'
            },
          }, {
            onConflict: 'id'
          });
      }

      // Redirect to the intended destination
      router.push(next);
    } catch (error) {
      console.error('Error linking accounts:', error);
      setError('Failed to link accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Sign out and redirect to home
    supabase.auth.signOut();
    router.push('/');
  };

  const getProviderIcon = (providerName: string) => {
    switch (providerName?.toLowerCase()) {
      case 'google':
        return '/icon/google.svg';
      case 'github':
        return '/icon/github.svg';
      case 'twitter':
        return '/icon/x-twitter.svg';
      default:
        return '/icon/profile.svg';
    }
  };

  const getProviderName = (providerName: string) => {
    switch (providerName?.toLowerCase()) {
      case 'google':
        return 'Google';
      case 'github':
        return 'GitHub';
      case 'twitter':
        return 'Twitter';
      default:
        return providerName || 'Unknown';
    }
  };

  if (!email || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Request</h1>
          <p className="text-gray-600">Missing required parameters for account linking.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Image 
              src="/icon/link.svg" 
              alt="Link accounts" 
              width={32} 
              height={32}
              className="text-blue-600"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Your Accounts</h1>
          <p className="text-gray-600">
            We found an existing account with the email <strong>{email}</strong>
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Account Details</h3>
          
          {existingUser && (
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                {existingUser.avatar_url ? (
                  <Image
                    src={existingUser.avatar_url}
                    alt={existingUser.name || 'User'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-gray-600 font-semibold">
                    {existingUser.name?.charAt(0) || email.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{existingUser.name || 'User'}</p>
                <p className="text-sm text-gray-600">{email}</p>
                <p className="text-xs text-gray-500">
                  Account created {new Date(existingUser.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Existing account</span>
            <div className="flex items-center">
              <Image 
                src="/icon/profile.svg" 
                alt="Existing account" 
                width={16} 
                height={16}
                className="mr-2"
              />
              <span className="text-sm font-medium">Email sign-in</span>
            </div>
          </div>

          <div className="flex items-center justify-center my-3">
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <span className="mx-3 text-gray-400">+</span>
            <div className="w-8 h-0.5 bg-gray-300"></div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">New provider</span>
            <div className="flex items-center">
              <Image 
                src={getProviderIcon(provider)} 
                alt={getProviderName(provider)} 
                width={16} 
                height={16}
                className="mr-2"
              />
              <span className="text-sm font-medium">{getProviderName(provider)}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Image 
              src="/icon/info.svg" 
              alt="Info" 
              width={16} 
              height={16}
              className="mr-2 mt-0.5 text-blue-600"
            />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">What happens when you link accounts?</p>
              <ul className="text-xs space-y-1">
                <li>• You can sign in with either method</li>
                <li>• All your data and preferences are preserved</li>
                <li>• Your conversation history remains intact</li>
                <li>• You can unlink accounts later in settings</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleLinkAccounts}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Linking...' : 'Link Accounts'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LinkAccountsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LinkAccountsPageContent />
    </Suspense>
  );
} 