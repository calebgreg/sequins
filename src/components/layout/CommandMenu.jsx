import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Settings, 
  Search,
  User,
  Plus,
  FileText
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function CommandMenu({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');

  // Fetch students for quick search
  const { data: students = [] } = useQuery({
    queryKey: ['students-search'],
    queryFn: () => base44.entities.Student.list(),
    enabled: !!open // Only fetch when open
  });
  
  // Note: Keyboard shortcut handled in Context Provider now

  const runCommand = (command) => {
    command();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden bg-white shadow-2xl border-none max-w-2xl rounded-2xl">
        <Command className="w-full bg-white [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-14 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="flex items-center border-b px-4" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              placeholder="Type a command or search..." 
              className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
              value={inputValue}
              onValueChange={setInputValue}
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-400">No results found.</Command.Empty>
            
            <Command.Group heading="Navigation">
              <Command.Item 
                onSelect={() => runCommand(() => navigate(createPageUrl('Home')))}
                className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate(createPageUrl('ClassManager')))}
                className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>Schedule</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate(createPageUrl('Students')))}
                className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                <span>Students</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate(createPageUrl('Teachers')))}
                className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Staff</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate(createPageUrl('Billing')))}
                className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate(createPageUrl('Settings')))}
                className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Students">
              {students.slice(0, 5).map(student => (
                <Command.Item 
                  key={student.id}
                  onSelect={() => runCommand(() => navigate(createPageUrl('Students')))} // Ideally navigate to specific student
                  className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900"
                >
                  <User className="mr-2 h-4 w-4 text-gray-400" />
                  <span>{student.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{student.status}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Quick Actions">
              <Command.Item 
                 onSelect={() => runCommand(() => navigate(createPageUrl('Students')))} 
                 className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>New Student</span>
              </Command.Item>
              <Command.Item 
                 onSelect={() => runCommand(() => navigate(createPageUrl('Billing')))} 
                 className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Create Invoice</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}