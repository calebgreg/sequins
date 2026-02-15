import React from 'react';
import { useLocation } from 'react-router-dom';

// Import Manrope font
const manropeLink = document.createElement('link');
manropeLink.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap';
manropeLink.rel = 'stylesheet';
document.head.appendChild(manropeLink);
import AppSidebar from './components/layout/AppSidebar';
import CommandMenu from './components/layout/CommandMenu';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from 'lucide-react';
import { CommandMenuProvider, useCommandMenu } from './components/layout/CommandMenuContext';
import { Toaster } from 'sonner';
import GlobalAiChat, { GlobalAiChatProvider } from './components/ai/GlobalAiChat';
import UserMenu from './components/layout/UserMenu';

function LayoutContent({ children }) {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  const isTeacherStudio = path.includes('teacherstudio') || path.includes('teacher-studio');
  const isPublicPage = path.includes('familyroom') || path.includes('familyportal');
  const { isOpen, setIsOpen } = useCommandMenu();

  // Public pages (Client Facing) - No Sidebar, No Admin Tools
  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F6] flex font-sans text-[#333333]">
      <CommandMenu open={isOpen} onOpenChange={setIsOpen} />

      {/* Desktop Sidebar */}
      <AppSidebar 
        className="hidden md:flex w-24 flex-shrink-0" 
        onSearchClick={() => setIsOpen(true)}
      />

      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-[#333333] shadow-lg rounded-full text-white hover:bg-black">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-28 border-none bg-transparent shadow-none">
            <AppSidebar 
              className="h-full rounded-r-[32px] shadow-2xl m-0 rounded-l-none h-screen top-0" 
              onSearchClick={() => setIsOpen(true)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto h-[100dvh] p-4 md:p-6 relative">
         <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
           <UserMenu />
         </div>
         <div className="w-full max-w-[1400px] mx-auto">
            {children}
         </div>
      </main>

      <GlobalAiChat />
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <CommandMenuProvider>
      <GlobalAiChatProvider>
        <LayoutContent>{children}</LayoutContent>
        <Toaster />
      </GlobalAiChatProvider>
    </CommandMenuProvider>
  );
}