import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Music, CheckCircle2, Loader2, XCircle } from 'lucide-react';

export default function AppleMusicSettings() {
  const [status, setStatus] = useState('checking'); // 'checking', 'connected', 'error'
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Test if we can generate a developer token (means credentials are configured)
        const response = await base44.functions.invoke('generateAppleMusicToken', {});
        if (response.data?.token) {
          setStatus('connected');
        } else {
          setStatus('error');
          setError('Token generation failed');
        }
      } catch (err) {
        setStatus('error');
        setError('Apple Music credentials not configured');
      }
    };
    checkConnection();
  }, []);

  return (
    <Card className="p-8 bg-white rounded-[32px] shadow-sm border-0">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
            <Music className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-serif text-[#333333]">Apple Music</h2>
            <p className="text-gray-500 text-sm mt-1">
              Search and preview music for your class playlists
            </p>
          </div>
        </div>

        {status === 'connected' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Active</span>
          </div>
        )}
      </div>

      {status === 'checking' && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <p className="text-gray-600">Checking Apple Music connection...</p>
        </div>
      )}

      {status === 'connected' && (
        <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-900 font-medium">Apple Music is ready</p>
              <p className="text-green-700 text-sm mt-1">
                You can search and preview music from Apple Music when building class playlists.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-900 font-medium">Apple Music not configured</p>
              <p className="text-red-700 text-sm mt-1">
                {error || 'Please contact support to set up Apple Music integration.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}