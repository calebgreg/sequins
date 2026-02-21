import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function RequireAuth({ children }) {
  const [status, setStatus] = useState('loading'); // loading, authenticated, unauthenticated

  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (isAuth) {
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F6]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F6]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <p className="ml-3 text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return children;
}