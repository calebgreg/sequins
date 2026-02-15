import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AppleMusicSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [musicKitReady, setMusicKitReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const musicKitInstance = useRef(null);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['studioSettings'],
    queryFn: () => base44.entities.StudioSettings.list(),
  });

  const currentSettings = settings[0] || {};
  const isConnected = !!currentSettings.apple_music_user_token;

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (currentSettings.id) {
        return base44.entities.StudioSettings.update(currentSettings.id, data);
      }
      return base44.entities.StudioSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studioSettings'] });
    }
  });

  // Initialize MusicKit
  useEffect(() => {
    let isMounted = true;
    
    const initMusicKit = async () => {
      try {
        // Get developer token from backend
        const response = await base44.functions.invoke('generateAppleMusicToken', {});
        const developerToken = response.data?.token;
        
        if (!developerToken) {
          throw new Error('Failed to get developer token');
        }

        // Load MusicKit script if not already loaded
        if (!window.MusicKit) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
            script.async = true;
            script.setAttribute('data-web-components', '');
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load MusicKit script'));
            document.head.appendChild(script);
          });
        }

        // Wait for MusicKit to be available
        await new Promise((resolve) => {
          if (window.MusicKit?.configure) {
            resolve();
          } else {
            document.addEventListener('musickitloaded', resolve, { once: true });
          }
        });

        // Configure MusicKit
        const music = await window.MusicKit.configure({
          developerToken: developerToken,
          app: {
            name: 'Sequins Dance Studio',
            build: '1.0.0'
          }
        });

        if (isMounted) {
          musicKitInstance.current = music;
          setMusicKitReady(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('MusicKit init error:', error);
        if (isMounted) {
          setLoadError(error.message);
          setIsLoading(false);
        }
      }
    };

    initMusicKit();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConnect = async () => {
    if (!musicKitInstance.current) {
      toast.error('Apple Music is not ready yet');
      return;
    }

    setIsConnecting(true);
    try {
      // This opens Apple's official login popup
      const userToken = await musicKitInstance.current.authorize();
      
      if (userToken) {
        await updateSettingsMutation.mutateAsync({
          apple_music_user_token: userToken,
          apple_music_connected_at: new Date().toISOString()
        });
        toast.success('Apple Music connected successfully!');
      }
    } catch (error) {
      console.error('Apple Music authorization error:', error);
      if (error.name === 'USER_CANCELLED') {
        toast.info('Authorization cancelled');
      } else {
        toast.error('Failed to connect Apple Music. Try opening in a new tab.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (musicKitInstance.current) {
        await musicKitInstance.current.unauthorize();
      }
      await updateSettingsMutation.mutateAsync({
        apple_music_user_token: null,
        apple_music_connected_at: null
      });
      toast.success('Apple Music disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect');
    }
  };

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
              Search, preview, and play music for your classes
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <p className="text-gray-600">Loading Apple Music...</p>
        </div>
      ) : loadError ? (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-amber-900 font-medium">Could not load Apple Music</p>
              <p className="text-amber-700 text-sm mt-1">
                This may be due to running in a preview. Try opening the app in a new tab or deploying to production.
              </p>
            </div>
          </div>
        </div>
      ) : isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-900 font-medium">Apple Music is connected</p>
                <p className="text-green-700 text-sm mt-1">
                  You can now search, preview, and play full songs from Apple Music.
                </p>
                {currentSettings.apple_music_connected_at && (
                  <p className="text-green-600 text-xs mt-2">
                    Connected {format(new Date(currentSettings.apple_music_connected_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="w-full rounded-full h-12"
          >
            Disconnect Apple Music
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-900 font-medium">Connect your Apple Music</p>
                <p className="text-blue-700 text-sm mt-1">
                  Sign in with your Apple ID to search music, preview tracks, and play full songs in your classes.
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleConnect}
            disabled={isConnecting || !musicKitReady}
            className="w-full rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white h-12 shadow-lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Music className="w-5 h-5 mr-2" />
                Connect Apple Music
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}