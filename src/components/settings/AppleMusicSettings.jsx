import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AppleMusicSettings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [musicKit, setMusicKit] = useState(null);
  const [developerToken, setDeveloperToken] = useState(null);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['studioSettings'],
    queryFn: () => base44.entities.StudioSettings.list(),
  });

  const currentSettings = settings[0] || {};
  const isConnected = !!currentSettings.apple_music_user_token;

  // Fetch developer token from backend
  useEffect(() => {
    const fetchDeveloperToken = async () => {
      try {
        const response = await base44.functions.invoke('generateAppleMusicToken', {});
        setDeveloperToken(response.data.token);
      } catch (error) {
        console.error('Failed to fetch Apple Music developer token:', error);
        toast.error('Failed to initialize Apple Music');
      }
    };

    fetchDeveloperToken();
  }, []);

  // Initialize MusicKit when developer token is available
  useEffect(() => {
    if (!developerToken) return;

    const initMusicKit = async () => {
      try {
        // Remove any existing MusicKit scripts first
        const existingScript = document.querySelector('script[src*="musickit"]');
        if (existingScript) {
          existingScript.remove();
        }

        // Create and load fresh script
        const script = document.createElement('script');
        script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
        script.setAttribute('data-web-components', '');
        script.async = true;
        
        document.head.appendChild(script);

        // Wait for script to load and MusicKit to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('MusicKit load timeout - try opening in a new tab'));
          }, 10000);
          
          script.onload = async () => {
            // Give MusicKit time to initialize
            let attempts = 0;
            const checkReady = setInterval(() => {
              attempts++;
              if (window.MusicKit && typeof window.MusicKit.configure === 'function') {
                clearInterval(checkReady);
                clearTimeout(timeout);
                resolve();
              } else if (attempts > 50) {
                clearInterval(checkReady);
                clearTimeout(timeout);
                reject(new Error('MusicKit failed to initialize'));
              }
            }, 100);
          };
          
          script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load MusicKit script'));
          };
        });

        // Configure MusicKit
        const music = await window.MusicKit.configure({
          developerToken: developerToken,
          app: {
            name: 'Sequins',
            build: '1.0.0'
          }
        });

        setMusicKit(music);
        console.log('MusicKit initialized successfully');

      } catch (error) {
        console.error('MusicKit initialization error:', error);
        // Don't show toast for every error - the UI already shows "initializing" state
      }
    };

    initMusicKit();
  }, [developerToken]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (currentSettings.id) {
        return base44.entities.StudioSettings.update(currentSettings.id, data);
      } else {
        return base44.entities.StudioSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studioSettings'] });
    }
  });

  const handleConnect = async () => {
    if (!musicKit) {
      toast.error('Apple Music is still initializing. Please try again.');
      return;
    }

    setIsConnecting(true);
    try {
      // Authorize user with Apple Music - this should open a popup automatically
      const userToken = await musicKit.authorize();

      if (userToken) {
        // Save user token to settings
        await updateSettingsMutation.mutateAsync({
          apple_music_user_token: userToken,
          apple_music_connected_at: new Date().toISOString()
        });

        toast.success('Apple Music connected successfully!');
      }
    } catch (error) {
      console.error('Apple Music authorization error:', error);
      toast.error('Failed to connect Apple Music. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (musicKit) {
        await musicKit.unauthorize();
      }

      await updateSettingsMutation.mutateAsync({
        apple_music_user_token: null,
        apple_music_connected_at: null
      });

      toast.success('Apple Music disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect Apple Music');
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
              Search, preview, and manage music for your performances
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

      {!developerToken ? (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <p className="text-gray-600">Initializing Apple Music...</p>
        </div>
      ) : (
        <>
          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-green-900 font-medium">Apple Music is connected</p>
                    <p className="text-green-700 text-sm mt-1">
                      You can now search, preview, and add music to your library from Backstage.
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
                    <p className="text-blue-900 font-medium">Connect your Apple Music account</p>
                    <p className="text-blue-700 text-sm mt-1">
                      Sign in with your Apple ID to search music, preview tracks, and add songs to your library directly from Sequins.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={isConnecting}
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
        </>
      )}
    </Card>
  );
}