import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function AdminOnly({ children }) {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F6]">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  // Allow access for admin users only
  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F6] p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Access Restricted</h1>
          <p className="text-gray-500 mb-6">
            This page is only accessible to studio administrators.
          </p>
          <Link to={createPageUrl('Home')}>
            <Button className="rounded-full bg-[#333333] text-white hover:bg-black gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}