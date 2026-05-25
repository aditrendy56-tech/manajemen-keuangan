'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

export function Header() {
  const [user, setUser] = useState<string>('');

  useEffect(() => {
    async function getUser() {
      try {
        const { data } = await getSupabase().auth.getUser();
        if (data.user) {
          setUser(data.user.email || 'User');
        }
      } catch (error) {
        // Supabase not configured, use mock user
        setUser('Demo User');
      }
    }
    getUser();
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 ml-64">
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user}</p>
          <p className="text-xs text-gray-500">Administrator</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <span className="text-sm font-semibold text-orange-700">
            {user.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
