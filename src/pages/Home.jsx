import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      <div className="space-y-4">
        <h1 className="text-6xl font-serif font-medium tracking-tight text-[#333333]">sequins</h1>
        <p className="text-xl text-gray-500 font-light tracking-wide">The AI-powered heartbeat of your dance studio</p>
      </div>
      
      <div className="flex gap-4">
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
          Manager Engine
        </Link>
      </div>
      
      <p className="text-sm text-gray-400 mt-12">
        Experience the magic of perfect recall and seamless management.
      </p>
    </div>
  );
}