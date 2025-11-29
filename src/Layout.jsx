import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#F4F4F6] font-sans text-[#333333] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-[1400px] mx-auto">
         {children}
      </div>
    </div>
  );
}