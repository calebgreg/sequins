import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, CheckCircle2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AppleMusicSettings() {
  const [status, setStatus] = useState('loading'); // loading, ready, connecting, connected, error
  const [errorMessage, setErrorMessage] = useState(null);
  const [developerToken, setDeveloperToken] = useState(null);
  const musicKitRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ['studioSettings'],
    queryFn: () => base44.entities.StudioSettings.list(),
  });

  const currentSettings = settings[0] || {};
  const isConnected = !!currentSettings.apple_music_user_token;

  // Initialize - get developer token and check connection status
  const initializeMusicKit = useCallback(async () => {
    try {
      setStatus('loading');
      setErrorMessage(null);

      // Get developer token from our backend
      const response = await base44.functions.invoke('appleMusicAuth', { action: 'getConfig' });
      
      if (!response.data?.configured) {
        setStatus('error');
        setErrorMessage('Apple Music credentials not configured in settings');
        return;
      }

      const token = response.data.developerToken;
      setDeveloperToken(token);

      // Check if already connected
      if (isConnected) {
        setStatus('connected');
        return;
      }

      // Don't load MusicKit in the main app - it crashes in iframes
      // We'll load it only in the popup window where it works properly
      setStatus('ready');

    } catch (error) {
      console.error('Init error:', error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  }, [isConnected]);

  useEffect(() => {
    initializeMusicKit();
  }, [initializeMusicKit]);

  // Update status when settings change
  useEffect(() => {
    if (isConnected && status !== 'connected') {
      setStatus('connected');
    }
  }, [isConnected, status]);

  const handleConnect = async () => {
    setStatus('connecting');

    try {
      // Open Apple Music auth in new window
      // This creates a popup that handles the OAuth flow
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const authWindow = window.open(
        'about:blank',
        'AppleMusicAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (authWindow) {
        // Write a page that loads MusicKit and authorizes
        authWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Connect Apple Music</title>
            <script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js" crossorigin="anonymous"></script>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0;
                background: linear-gradient(135deg, #fc3c44 0%, #8b5cf6 100%);
                color: white;
              }
              .container { text-align: center; padding: 40px; }
              h1 { font-size: 24px; margin-bottom: 20px; }
              p { opacity: 0.9; margin-bottom: 30px; }
              .spinner { 
                width: 40px; 
                height: 40px; 
                border: 3px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
              .error { background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="spinner"></div>
              <h1>Connecting to Apple Music</h1>
              <p>Please sign in with your Apple ID...</p>
            </div>
            <script>
              const DEVELOPER_TOKEN = '${developerToken}';
              
              document.addEventListener('musickitloaded', async () => {
                try {
                  const music = await MusicKit.configure({
                    developerToken: DEVELOPER_TOKEN,
                    app: { name: 'Sequins Dance Studio', build: '1.0.0' }
                  });
                  
                  const userToken = await music.authorize();
                  
                  if (userToken) {
                    window.opener.postMessage({ type: 'APPLE_MUSIC_TOKEN', token: userToken }, '*');
                    document.body.innerHTML = '<div class="container"><h1>✓ Connected!</h1><p>You can close this window.</p></div>';
                    setTimeout(() => window.close(), 1500);
                  } else {
                    throw new Error('No token received');
                  }
                } catch (error) {
                  document.body.innerHTML = '<div class="container"><div class="error"><h1>Connection Failed</h1><p>' + error.message + '</p></div></div>';
                }
              });
            </script>
          </body>
          </html>
        `);
        authWindow.document.close();

        // Listen for the token from popup
        const handleMessage = async (event) => {
          if (event.data?.type === 'APPLE_MUSIC_TOKEN' && event.data?.token) {
            window.removeEventListener('message', handleMessage);
            
            // Save token
            await base44.functions.invoke('appleMusicAuth', { 
              action: 'saveUserToken',
              musicUserToken: event.data.token
            });
            
            await refetchSettings();
            queryClient.invalidateQueries({ queryKey: ['studioSettings'] });
            setStatus('connected');
            toast.success('Apple Music connected!');
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup was closed without completing
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            if (status === 'connecting') {
              setStatus('ready');
            }
          }
        }, 500);
      }

    } catch (error) {
      console.error('Connect error:', error);
      setStatus('ready');
      toast.error(error.message || 'Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    try {
      if (musicKitRef.current?.unauthorize) {
        await musicKitRef.current.unauthorize();
      }
      
      await base44.functions.invoke('appleMusicAuth', { action: 'disconnect' });
      await refetchSettings();
      queryClient.invalidateQueries({ queryKey: ['studioSettings'] });
      setStatus('ready');
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
              Connect your Apple Music for full playback in classes
            </p>
          </div>
        </div>

        {status === 'connected' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )}
      </div>

      {status === 'loading' && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <p className="text-gray-600">Loading Apple Music...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-900 font-medium">Configuration Error</p>
              <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="flex items-start gap-3">
              <Music className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-900 font-medium">Ready to connect</p>
                <p className="text-blue-700 text-sm mt-1">
                  Sign in with your Apple ID to enable full song playback in your classes.
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleConnect}
            className="w-full rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white h-12 shadow-lg"
          >
            <Music className="w-5 h-5 mr-2" />
            Connect Apple Music
          </Button>
        </div>
      )}

      {status === 'connecting' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-2xl">
            <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
            <p className="text-pink-900">Waiting for Apple Music authorization...</p>
          </div>
          <p className="text-sm text-gray-500 text-center">
            A popup window should have opened. Complete the sign-in there.
          </p>
        </div>
      )}

      {status === 'connected' && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-900 font-medium">Apple Music Connected</p>
                <p className="text-green-700 text-sm mt-1">
                  Full song playback is enabled for your studio classes.
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
      )}
    </Card>
  );
}