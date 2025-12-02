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
      <DialogContent className="max-w-2xl bg-white rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-r from-[#E0F2F1] to-[#E8EAF6] p-8 relative overflow-hidden">
           <Sparkles className="absolute top-0 right-0 w-64 h-64 text-white opacity-20 -translate-y-1/2 translate-x-1/4" />
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                 <div className="bg-white/30 p-2 rounded-xl backdrop-blur-sm">
                    <Sparkles className="w-5 h-5 text-teal-700" />
                 </div>
                 <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Insight Analysis</span>
              </div>
              <h2 className="font-serif text-3xl text-[#333333] mb-2">Jazz Attendance Surge</h2>
              <p className="text-[#333333]/70 text-lg">Detailed breakdown of the 12% increase in class participation.</p>
           </div>
        </div>

        <div className="p-8 space-y-8">
           {/* Key Metrics Grid */}
           <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#F4F4F6] p-4 rounded-2xl text-center">
                 <div className="text-gray-500 text-xs uppercase font-bold mb-1">Current Cap</div>
                 <div className="text-2xl font-serif text-[#333333]">94%</div>
              </div>
              <div className="bg-[#F4F4F6] p-4 rounded-2xl text-center">
                 <div className="text-gray-500 text-xs uppercase font-bold mb-1">Waitlisted</div>
                 <div className="text-2xl font-serif text-[#333333]">8</div>
              </div>
              <div className="bg-[#F4F4F6] p-4 rounded-2xl text-center">
                 <div className="text-gray-500 text-xs uppercase font-bold mb-1">Revenue Opp</div>
                 <div className="text-2xl font-serif text-green-600">+$420/mo</div>
              </div>
           </div>

           {/* Chart */}
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} dy={10} />
                  <Tooltip 
                    cursor={{fill: '#F4F4F6'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="attendance" fill="#333333" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
           </div>

           {/* Recommendation */}
           <div className="bg-indigo-50 p-6 rounded-2xl flex gap-4 items-start">
              <TrendingUp className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
              <div>
                 <h4 className="font-bold text-indigo-900 mb-1">Recommended Action</h4>
                 <p className="text-indigo-700/80 text-sm leading-relaxed mb-4">
                    Based on waitlist trends and current capacity, opening a "Jazz Level 2" slot on Tuesdays at 5:30 PM has a <strong>High Probability</strong> of filling immediately.
                 </p>
                 <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 text-sm">
                    Create Class Slot <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
              </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}