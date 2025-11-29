import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { ArrowLeft, Plus, Calendar, Save, Trash2, RefreshCw } from 'lucide-react';
import ClassImport from '../components/manager/ClassImport';
import ConflictAlert from '../components/manager/ConflictAlert';
import { motion, AnimatePresence } from 'framer-motion';

const formatTime = (val) => {
  const hours = Math.floor(val);
  const minutes = Math.round((val - hours) * 60);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes}${period}`;
};

export default function ClassManager() {
  const [importedClasses, setImportedClasses] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const queryClient = useQueryClient();

  // Fetch existing classes
  const { data: existingClasses = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const createClassesMutation = useMutation({
    mutationFn: (newClasses) => base44.entities.DanceClass.bulkCreate(newClasses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setImportedClasses([]);
      setConflicts([]);
    }
  });

  // AI Logic to find overlaps
  const analyzeSchedule = (newClasses, existing) => {
    const all = [...existing, ...newClasses];
    const issues = [];

    // Simple overlap detection logic
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];

        // Must be same day to conflict
        if (a.day !== b.day) continue;

        // Check time overlap
        const aEnd = a.start_time + a.duration;
        const bEnd = b.start_time + b.duration;
        const overlap = (a.start_time < bEnd) && (aEnd > b.start_time);

        if (overlap) {
          // Teacher Conflict
          if (a.teacher && b.teacher && a.teacher === b.teacher) {
             issues.push({
               type: 'TEACHER_OVERLAP',
               description: `${a.teacher} is scheduled for "${a.title}" and "${b.title}" at the same time on ${a.day}.`
             });
          }
          // Room Conflict
          if (a.room && b.room && a.room === b.room) {
             issues.push({
               type: 'ROOM_DOUBLE_BOOKED',
               description: `${a.room} is double booked for "${a.title}" and "${b.title}" on ${a.day}.`
             });
          }
        }
      }
    }
    return issues;
  };

  const handleImport = (data) => {
    const formatted = data.map(c => ({
      ...c,
      student_names: [], // Default empty
      color: ['pink', 'charcoal'][Math.floor(Math.random() * 2)] // Random color for demo
    }));
    setImportedClasses(formatted);
    
    // Auto analyze
    const foundConflicts = analyzeSchedule(formatted, existingClasses);
    setConflicts(foundConflicts);
  };

  const handleSave = () => {
    createClassesMutation.mutate(importedClasses);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-serif text-[#333333]">Class Manager</h1>
              <p className="text-gray-500">AI-powered schedule engine</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Import & Analysis */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Import Card */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
               <ClassImport onImportComplete={handleImport} />
            </div>

            {/* Conflicts Report */}
            <AnimatePresence>
              {(conflicts.length > 0 || importedClasses.length > 0) && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-medium text-[#333333]">Safety Check</h3>
                    {conflicts.length > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                        {conflicts.length} ISSUES
                      </span>
                    )}
                  </div>
                  
                  <ConflictAlert conflicts={conflicts} />

                  {conflicts.length === 0 && importedClasses.length > 0 && (
                     <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-500 mb-4">
                           Your schedule looks perfect. Ready to publish {importedClasses.length} new classes?
                        </p>
                        <button 
                          onClick={handleSave}
                          className="w-full bg-[#333333] text-white py-4 rounded-full font-medium hover:bg-black transition-all flex items-center justify-center gap-2"
                        >
                          <Save className="w-5 h-5" />
                          Publish Schedule
                        </button>
                     </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Preview List */}
          <div className="lg:col-span-7">
             <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 min-h-[600px]">
                <h3 className="text-xl font-medium text-[#333333] mb-6 flex justify-between items-center">
                  <span>Draft Preview</span>
                  <span className="text-sm text-gray-400 font-normal">
                    {importedClasses.length} pending / {existingClasses.length} active
                  </span>
                </h3>

                {importedClasses.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 min-h-[400px]">
                    <Calendar className="w-16 h-16 opacity-20" />
                    <p>Upload a schedule to see preview</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {importedClasses.map((cls, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group hover:bg-[#F4F4F6] transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-serif text-xl text-gray-400 shadow-sm">
                          {cls.day}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#333333]">{cls.title}</h4>
                          <div className="flex gap-4 text-sm text-gray-500 mt-1">
                            <span>
                              {formatTime(cls.start_time)} - {formatTime(cls.start_time + cls.duration)}
                            </span>
                            {cls.teacher && <span className="text-[#5A4A4B]">• {cls.teacher}</span>}
                            {cls.room && <span>• {cls.room}</span>}
                          </div>
                        </div>
                        <button 
                          onClick={() => setImportedClasses(prev => prev.filter((_, i) => i !== idx))}
                          className="p-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}