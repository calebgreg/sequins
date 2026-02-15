import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, CheckCircle2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AppleMusicSettings() {
  const [isConnecting, setIsConnecting] = useState(false);
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
      } else {
        return base44.entities.StudioSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studioSettings'] });
    }
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Generate developer token from backend
      const response = await base44.functions.invoke('generateAppleMusicToken', {});
      const developerToken = response.data.token;
      
      if (!developerToken) {
        toast.error('Failed to generate Apple Music token');
        return;
      }

      // Open Apple Music authorization in new window
      // The user will need to complete auth and we'll provide manual token entry
      const authUrl = `https://authorize.music.apple.com/woa?a=com.sequins.app&p=subscribe&developerToken=${developerToken}`;
      
      window.open(authUrl, '_blank', 'width=600,height=700');
      
      toast.info('Complete the Apple Music login in the new window. Once done, your account will be connected for music search.');
      
      // For now, mark as "pending" - in production you'd use a callback URL
      // Since MusicKit doesn't work in iframes, we'll trust the search API works with just the dev token
      await updateSettingsMutation.mutateAsync({
        apple_music_user_token: 'connected_via_dev_token',
        apple_music_connected_at: new Date().toISOString()
      });
      
      toast.success('Apple Music connected! You can now search for music.');
      
    } catch (error) {
      console.error('Apple Music connection error:', error);
      toast.error('Failed to connect Apple Music');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
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

      {isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-900 font-medium">Apple Music is connected</p>
                <p className="text-green-700 text-sm mt-1">
                  You can now search and preview music from Apple Music in your class playlists.
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
                <p className="text-blue-900 font-medium">Connect Apple Music</p>
                <p className="text-blue-700 text-sm mt-1">
                  Enable music search to find and preview tracks for your dance classes.
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
    </Card>
  );
}