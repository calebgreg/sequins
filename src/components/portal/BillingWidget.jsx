import React from 'react';
import { Mail, MessageSquare } from 'lucide-react';

export default function BillingWidget({ balance }) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-end">
        <span className="text-xs font-serif text-gray-500 mb-1">November</span>
        <div className="bg-white px-8 py-3 rounded-full shadow-sm border border-gray-100">
          <span className="text-xl font-medium text-[#333333]">${balance.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100 flex gap-2 px-4 py-3">
        <button className="p-1 hover:bg-gray-50 rounded-full transition-colors">
          <Mail className="w-6 h-6 text-gray-400" />
        </button>
        <div className="w-px bg-gray-200 h-6 self-center"></div>
        <button className="p-1 hover:bg-gray-50 rounded-full transition-colors">
          <MessageSquare className="w-6 h-6 text-[#F2DCDD]" />
        </button>
      </div>
    </div>
  );
}