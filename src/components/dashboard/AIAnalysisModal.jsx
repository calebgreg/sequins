import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, TrendingUp, Users, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AIAnalysisModal({ isOpen, onOpenChange }) {
  const data = [
    { name: 'Week 1', attendance: 82 },
    { name: 'Week 2', attendance: 85 },
    { name: 'Week 3', attendance: 89 },
    { name: 'Week 4', attendance: 94 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-[#333333]/20 backdrop-blur-sm z-40"
          />
          
          {/* Side Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-2 bottom-2 right-2 w-full md:w-[480px] bg-white rounded-[32px] shadow-2xl z-50 overflow-hidden flex flex-col border border-gray-100"
          >
             {/* Decorative Header */}
             <div className="bg-[#333333] text-white p-8 pb-12 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#F2DCDD] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                
                <div className="relative z-10">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full">
                         <Sparkles className="w-3 h-3 text-[#F2DCDD]" />
                         <span className="text-[10px] font-bold tracking-widest uppercase">Intelligence</span>
                      </div>
                      <button 
                        onClick={() => onOpenChange(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                         <X className="w-5 h-5 text-white/60" />
                      </button>
                   </div>
                   
                   <h2 className="font-serif text-4xl mb-2">Attendance Surge</h2>
                   <p className="text-white/60 text-lg font-light leading-relaxed">
                      We've detected a significant 12% uptake in Jazz participation over the last month.
                   </p>
                </div>
             </div>

             {/* Content Body */}
             <div className="flex-1 overflow-y-auto p-8 -mt-6 bg-white rounded-t-[32px] relative z-20 custom-scrollbar">
                
                {/* Stats Row */}
                <div className="flex gap-4 mb-10">
                   <div className="flex-1 p-4 bg-[#F4F4F6] rounded-2xl">
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Trend</div>
                      <div className="text-2xl font-serif text-[#333333] flex items-center gap-2">
                         +12% <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                   </div>
                   <div className="flex-1 p-4 bg-[#F4F4F6] rounded-2xl">
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Waitlist</div>
                      <div className="text-2xl font-serif text-[#333333]">8 Students</div>
                   </div>
                </div>

                {/* Chart Section */}
                <div className="mb-10">
                   <h3 className="font-serif text-xl text-[#333333] mb-6 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      4-Week Trajectory
                   </h3>
                   <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                           <Tooltip 
                             cursor={{fill: '#F4F4F6'}}
                             contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                           />
                           <Bar dataKey="attendance" radius={[6, 6, 6, 6]} barSize={40}>
                              {data.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={index === 3 ? '#333333' : '#E5E7EB'} />
                              ))}
                           </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                {/* Recommendation Engine */}
                <div className="space-y-4">
                   <h3 className="font-serif text-xl text-[#333333]">Strategic Recommendation</h3>
                   
                   <div className="p-6 border border-gray-100 rounded-3xl shadow-sm bg-white group hover:border-[#F2DCDD] transition-colors">
                      <div className="flex gap-4">
                         <div className="w-10 h-10 rounded-full bg-[#F2DCDD] flex items-center justify-center text-[#333333] shrink-0">
                            <Sparkles className="w-5 h-5" />
                         </div>
                         <div>
                            <h4 className="font-bold text-[#333333] mb-1">Expand Capacity</h4>
                            <p className="text-gray-500 text-sm leading-relaxed mb-4">
                               Opening a "Jazz Level 2" slot on Tuesdays at 5:30 PM captures the overflow from the waitlist immediately.
                            </p>
                            <Button className="bg-[#333333] text-white rounded-full px-6 hover:bg-black transition-all shadow-lg group-hover:scale-105">
                               Apply Schedule Change <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                         </div>
                      </div>
                   </div>
                </div>

             </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}