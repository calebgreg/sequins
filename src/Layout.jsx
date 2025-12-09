import React from 'react';
import { useLocation } from 'react-router-dom';
import AppSidebar from './components/layout/AppSidebar';
import CommandMenu from './components/layout/CommandMenu';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from 'lucide-react';
import { CommandMenuProvider, useCommandMenu } from './components/layout/CommandMenuContext';

function LayoutContent({ children }) {
  const location = useLocation();
  const isTeacherStudio = location.pathname.includes('TeacherStudio');
  const { isOpen, setIsOpen } = useCommandMenu();

  // TeacherStudio has its own internal layout structure, but we wrap it to provide CommandMenu access
  if (isTeacherStudio) {
    return (
      <>
        <CommandMenu open={isOpen} onOpenChange={setIsOpen} />
        {children}
      </>
    );
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
      <main className="flex-1 min-w-0 overflow-y-auto h-screen">
         <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 pt-20 md:pt-8">
            {children}
         </div>
      </main>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <CommandMenuProvider>
      <LayoutContent>{children}</LayoutContent>
    </CommandMenuProvider>
  );
}