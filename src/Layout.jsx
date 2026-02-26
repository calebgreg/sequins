import React, { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

// Import Manrope font
const manropeLink = document.createElement('link');
manropeLink.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap';
manropeLink.rel = 'stylesheet';
document.head.appendChild(manropeLink);

// Lazy-load all authenticated components so their modules (which import base44 SDK)
// are NEVER loaded on public pages like TrialBooking
const AuthenticatedLayout = lazy(() => import('@/components/layout/AuthenticatedLayout'));

function isPublicPath(path) {
  const p = path.toLowerCase();
  return p.includes('familyroom') || p.includes('familyportal') || p.includes('trialbooking') || p.includes('landing');
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  if (isPublicPath(location.pathname)) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F6]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    }>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </Suspense>
  );
}