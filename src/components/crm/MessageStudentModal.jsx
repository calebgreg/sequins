import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StudentCommunicationTab from './StudentCommunicationTab';
import { Mail } from 'lucide-react';

export default function MessageStudentModal({ isOpen, onOpenChange, student }) {
  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-[#F4F4F6] border-none shadow-2xl rounded-3xl h-[85vh]">
        <div className="flex flex-col h-full">
            <div className="bg-white px-8 py-5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Mail className="w-5 h-5" />
                </div>
                <div>
                    <DialogTitle className="font-serif text-xl text-[#333333]">Message {student.name}</DialogTitle>
                    <div className="text-sm text-gray-400">Communicating with {student.parent_name || 'Parent'}</div>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden p-6">
                {/* 
                   We wrap the tab in a container that handles the height. 
                   StudentCommunicationTab has a fixed h-[600px] in its root div. 
                   We might want to make it h-full if we can, but let's see. 
                */}
                <div className="h-full">
                    <StudentCommunicationTab student={student} />
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}