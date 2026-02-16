import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Settings as SettingsIcon, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import GeneralSettings from '../components/settings/GeneralSettings';
import TuitionBillingWizard from '../components/billing/TuitionBillingWizard';
import TuitionRulesDisplay from '../components/settings/TuitionRulesDisplay';
import AppleMusicSettings from '../components/settings/AppleMusicSettings';
import RoomSetupWizard from '../components/settings/RoomSetupWizard';
import RoomList from '../components/settings/RoomList';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearchParams } from 'react-router-dom';
import AdminOnly from '../components/layout/AdminOnly';

function SettingsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showWizard = searchParams.get('wizard') === 'rooms';
  const showBillingWizard = searchParams.get('wizard') === 'billing';

  if (showWizard) {
    return <RoomSetupWizard onComplete={() => setSearchParams({})} />;
  }

  if (showBillingWizard) {
    return <TuitionBillingWizard onSave={() => setSearchParams({})} />;
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
          <div className="flex-1">
            <h1 className="text-4xl font-serif text-[#333333]">Studio Settings</h1>
            <p className="text-gray-500 mt-1">Manage your studio configuration and preferences.</p>
          </div>
          <Link to={createPageUrl('Onboarding')}>
            <Button className="rounded-full bg-[#333333] text-white hover:bg-black gap-2">
              <Upload className="w-4 h-4" />
              Import Data
            </Button>
          </Link>
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
             <RoomList onAddNew={() => setSearchParams({ wizard: 'rooms' })} />
          </TabsContent>

          <TabsContent value="billing">
             <TuitionRulesDisplay onEdit={() => setSearchParams({ wizard: 'billing' })} />
          </TabsContent>

          <TabsContent value="integrations">
             <AppleMusicSettings />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <AdminOnly>
      <SettingsContent />
    </AdminOnly>
  );
}