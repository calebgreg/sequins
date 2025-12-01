import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['studioSettings'],
    queryFn: async () => {
      const res = await base44.entities.StudioSettings.list();
      return res[0] || null;
    }
  });

  if (isLoading) return null;

  // Onboarding View
  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
        <div className="w-20 h-20 bg-[#F2DCDD] rounded-full flex items-center justify-center mb-4 animate-pulse">
          <Sparkles className="w-10 h-10 text-[#333333]" />
        </div>
        <div className="space-y-4 max-w-xl">
          <h1 className="text-5xl font-serif font-medium text-[#333333]">Welcome to Sequins</h1>
          <p className="text-xl text-gray-500 font-light">Let's set up your digital studio. It only takes a moment to create your identity.</p>
        </div>
        
        <Link to={createPageUrl('Settings')}>
          <Button className="bg-[#333333] text-white px-10 py-8 rounded-full text-xl font-serif hover:bg-black hover:scale-105 transition-all shadow-xl">
            Start Studio Setup
          </Button>
        </Link>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      <div className="space-y-4">
        <div className="inline-block px-4 py-1 bg-[#F4F4F6] rounded-full text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          {settings.name}
        </div>
        <h1 className="text-6xl font-serif font-medium tracking-tight text-[#333333]">sequins</h1>
        <p className="text-xl text-gray-500 font-light tracking-wide">The AI-powered heartbeat of {settings.name}</p>
      </div>
      
      <div className="flex flex-wrap justify-center gap-4 max-w-5xl">
        <Link 
          to={createPageUrl('FamilyPortal')}
          className="group bg-[#333333] text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-black transition-all flex items-center gap-2"
        >
          Family Portal
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        
        <Link 
          to={createPageUrl('ClassManager')}
          className="group bg-white text-[#333333] border border-gray-200 px-8 py-4 rounded-full text-lg font-medium hover:bg-gray-50 transition-all flex items-center gap-2"
        >
          Class Admin
        </Link>
        <Link 
          to={createPageUrl('Billing')}
          className="group bg-white text-[#333333] border border-gray-200 px-8 py-4 rounded-full text-lg font-medium hover:bg-gray-50 transition-all flex items-center gap-2"
        >
          Billing Admin
        </Link>
        <Link 
          to={createPageUrl('TeacherStudio')}
          className="group bg-indigo-50 text-indigo-700 border border-indigo-100 px-8 py-4 rounded-full text-lg font-medium hover:bg-indigo-100 transition-all flex items-center gap-2"
        >
          Teacher View
        </Link>

        <Link 
          to={createPageUrl('Settings')}
          className="group bg-white text-[#333333] border border-gray-200 px-6 py-4 rounded-full text-lg font-medium hover:bg-gray-50 transition-all flex items-center gap-2"
        >
          Settings
        </Link>
        </div>
      
      <p className="text-sm text-gray-400 mt-12">
        Experience the magic of perfect recall and seamless management.
      </p>
    </div>
  );
}