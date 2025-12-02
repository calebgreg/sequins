import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AIAnalysisModal({ isOpen, onOpenChange }) {
  // Mock data for the visualization
  const data = [
    { name: 'Week 1', attendance: 82 },
    { name: 'Week 2', attendance: 85 },
    { name: 'Week 3', attendance: 89 },
    { name: 'Week 4', attendance: 94 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white rounded-[32px] p-0 overflow-hidden border-none shadow-2xl max-h-[85vh] flex flex-col">
        
        {/* Header - Fixed */}
        <div className="bg-[#333333] p-6 md:p-8 relative overflow-hidden shrink-0">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm text-white">
                       <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Sequins AI</span>
                 </div>
                 <span className="text-xs font-serif text-white/40 italic">Generated just now</span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl text-white mb-2 leading-tight">Jazz Attendance Surge</h2>
              <p className="text-white/60 text-sm md:text-base font-light">Analyzing the 12% participation increase.</p>
           </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
           
           {/* Elegant Metrics Row */}
           <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-8">
              <div className="text-center px-2">
                 <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Capacity</div>
                 <div className="text-3xl font-serif text-[#333333]">94<span className="text-sm text-gray-400 ml-0.5">%</span></div>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="text-center px-2">
                 <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Waitlist</div>
                 <div className="text-3xl font-serif text-[#333333]">8</div>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="text-center px-2">
                 <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Opportunity</div>
                 <div className="text-3xl font-serif text-green-600">+$420</div>
              </div>
           </div>

           {/* Simplified Chart */}
           <div className="h-48 w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f7f7f7" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#999', fontFamily: 'var(--font-sans)'}} 
                    dy={10} 
                  />
                  <Tooltip 
                    cursor={{fill: '#F4F4F6', radius: 4}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '8px 12px'}}
                    itemStyle={{fontSize: '12px', color: '#333'}}
                  />
                  <Bar dataKey="attendance" fill="#333333" radius={[4, 4, 4, 4]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
           </div>

           {/* Action Card */}
           <div className="bg-gradient-to-br from-[#F4F4F6] to-white border border-gray-100 p-6 rounded-2xl relative overflow-hidden">
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-[#333333]" />
                    <h4 className="font-serif text-lg text-[#333333]">Recommendation</h4>
                 </div>
                 <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    Open a <strong>Jazz Level 2</strong> slot on Tuesdays at 5:30 PM. Our model predicts high fill rate based on current waitlist overlap.
                 </p>
                 <Button className="w-full bg-[#333333] hover:bg-black text-white rounded-xl h-12 font-medium shadow-lg shadow-gray-200">
                    Create Class Slot <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-[#F2DCDD] opacity-30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}