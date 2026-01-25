import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import GeneralSettings from '../components/settings/GeneralSettings';
import TuitionConfiguration from '../components/billing/TuitionConfiguration';
import AppleMusicSettings from '../components/settings/AppleMusicSettings';
import RoomSetupWizard from '../components/settings/RoomSetupWizard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearchParams } from 'react-router-dom';

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showWizard = searchParams.get('wizard') === 'rooms';

  if (showWizard) {
    return <RoomSetupWizard onComplete={() => setSearchParams({})} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12 font-sans text-[#333333]">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-gray-50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-serif text-[#333333]">Studio Settings</h1>
            <p className="text-gray-500 mt-1">Manage your studio configuration and preferences.</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-white p-1 rounded-full border border-gray-100 inline-flex h-auto shadow-sm mb-6">
            <TabsTrigger value="general" className="rounded-full px-8 py-3 text-base gap-2 data-[state=active]:bg-[#333333] data-[state=active]:text-white">
              General
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-8 py-3 text-base gap-2 data-[state=active]:bg-[#333333] data-[state=active]:text-white">
              Studio Spaces
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-full px-8 py-3 text-base gap-2 data-[state=active]:bg-[#333333] data-[state=active]:text-white">
              Billing & Tuition
            </TabsTrigger>
            <TabsTrigger value="integrations" className="rounded-full px-8 py-3 text-base gap-2 data-[state=active]:bg-[#333333] data-[state=active]:text-white">
              Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
             <GeneralSettings />
          </TabsContent>

          <TabsContent value="rooms">
             <div className="space-y-6">
               <div className="bg-white rounded-[32px] p-8 shadow-sm border-0">
                 <h2 className="text-2xl font-serif mb-4">Studio Rooms</h2>
                 <p className="text-gray-500 mb-6">Configure your physical teaching spaces to enable smarter scheduling and room-based recommendations.</p>
                 <Button 
                   onClick={() => setSearchParams({ wizard: 'rooms' })}
                   className="rounded-full px-8 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                 >
                   Set Up Rooms
                 </Button>
               </div>
             </div>
          </TabsContent>

          <TabsContent value="billing">
             <TuitionConfiguration />
          </TabsContent>

          <TabsContent value="integrations">
             <AppleMusicSettings />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}