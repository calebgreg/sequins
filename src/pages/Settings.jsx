import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import LevelManager from '../components/settings/LevelManager';
import TuitionConfiguration from '../components/billing/TuitionConfiguration';

export default function Settings() {
  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12 font-sans text-[#333333]">
      <div className="max-w-4xl mx-auto space-y-8">
        
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

        <div className="grid grid-cols-1 gap-8">
          <LevelManager />
          
          {/* Reuse existing configuration components where appropriate */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#F2DCDD] flex items-center justify-center text-[#333333]">
                   <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-serif text-2xl text-[#333333]">Billing Configuration</h3>
                   <p className="text-sm text-gray-400">Manage discounts, fees, and tuition models.</p>
                </div>
             </div>
             
             <div className="flex justify-end">
                <Link to={createPageUrl('Billing')}>
                   <Button variant="outline" className="rounded-full">Go to Billing Admin</Button>
                </Link>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}