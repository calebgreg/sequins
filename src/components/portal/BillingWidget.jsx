import React from 'react';
import { Wallet, ChevronRight } from 'lucide-react';

export default function BillingWidget({ balance, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="group flex items-center gap-6 bg-white rounded-full p-2 pr-8 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
    >
      <div className="bg-[#333333] text-white p-4 rounded-full">
        <Wallet className="w-6 h-6" />
      </div>
      
      <div className="flex flex-col items-start mr-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Balance</span>
        <span className="text-2xl font-serif text-[#333333]">${balance.toFixed(2)}</span>
      </div>

      <div className="h-8 w-px bg-gray-100" />

      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 group-hover:text-[#333333] transition-colors">
        Manage Billing
        <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
}