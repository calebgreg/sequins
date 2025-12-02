import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AIAnalysisModal from '@/components/dashboard/AIAnalysisModal';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  CreditCard, 
  Settings,
  GraduationCap,
  Clock,
  Bell
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Home() {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['studioSettings'],
    queryFn: async () => {
      const res = await base44.entities.StudioSettings.list();
      return res[0] || null;
    }
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  // Computed Metrics
  const metrics = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'active').length;
    const monthlyRevenue = invoices
      .filter(inv => inv.status === 'paid' && new Date(inv.issue_date).getMonth() === new Date().getMonth())
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    
    const today = new Date().getDay(); // 0 = Sun, 1 = Mon...
    const dayMap = ['U', 'M', 'T', 'W', 'R', 'F', 'S'];
    const todaysClasses = classes
      .filter(c => c.day === dayMap[today])
      .sort((a, b) => a.start_time - b.start_time);

    return { activeStudents, monthlyRevenue, todaysClasses };
  }, [students, invoices, classes]);

  const isLoading = settingsLoading || studentsLoading || classesLoading || invoicesLoading;

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 rounded-[32px]" />
          <Skeleton className="h-40 rounded-[32px]" />
          <Skeleton className="h-40 rounded-[32px]" />
        </div>
      </div>
    );
  }

  // Fallback for onboarding if strictly needed, but dashboard is better even empty
  const studioName = settings?.name || "My Studio";

  return (
    <div className="min-h-screen space-y-8 pb-12">
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400 text-sm font-medium uppercase tracking-wider">
             <span>{format(new Date(), 'EEEE, MMMM do')}</span>
             <span>•</span>
             <span className="flex items-center gap-1 text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Studio Open</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#333333] leading-tight">
            Good afternoon, <br/>
            <span className="text-gray-400">{studioName}</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-gray-200 hover:bg-white hover:shadow-md transition-all relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-[#F2DCDD] rounded-full border border-white"></span>
           </Button>
           <Link to={createPageUrl('Settings')}>
             <Avatar className="w-12 h-12 border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform">
                <AvatarFallback className="bg-[#333333] text-white font-serif text-lg">
                   {studioName.charAt(0)}
                </AvatarFallback>
             </Avatar>
           </Link>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Metrics & Actions (8 cols) */}
        <div className="md:col-span-8 space-y-6">
           
           {/* KPI Cards */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard 
                title="Active Students" 
                value={metrics.activeStudents} 
                trend="+5% this month"
                icon={Users}
                color="bg-[#333333] text-white"
              />
              <MetricCard 
                title="Monthly Revenue" 
                value={`$${metrics.monthlyRevenue.toLocaleString()}`} 
                trend="On track"
                icon={DollarSign}
                color="bg-white text-[#333333]"
              />
              <MetricCard 
                title="Classes Today" 
                value={metrics.todaysClasses.length} 
                trend="Next: 4:30 PM"
                icon={Calendar}
                color="bg-[#F2DCDD] text-[#333333]"
              />
           </div>

           {/* Quick Actions Grid */}
           <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100/50">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-serif text-2xl text-[#333333]">Studio Command</h3>
                 <Settings className="w-5 h-5 text-gray-300" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <ActionCard 
                    to="Students" 
                    icon={GraduationCap} 
                    label="Students" 
                    sub="Directory & Enrolls" 
                 />
                 <ActionCard 
                    to="ClassManager" 
                    icon={Calendar} 
                    label="Classes" 
                    sub="Schedule & Roster" 
                 />
                 <ActionCard 
                    to="Billing" 
                    icon={CreditCard} 
                    label="Billing" 
                    sub="Invoices & Reports" 
                 />
                 <ActionCard 
                    to="TeacherStudio" 
                    icon={Sparkles} 
                    label="Teacher" 
                    sub="Attendance & Notes" 
                    highlight
                 />
              </div>
           </div>

           {/* AI Insight Banner */}
           <div className="bg-gradient-to-r from-[#E0F2F1] to-[#E8EAF6] rounded-[32px] p-8 relative overflow-hidden">
              <div className="relative z-10 flex justify-between items-end">
                 <div className="max-w-md">
                    <div className="flex items-center gap-2 mb-2">
                       <Sparkles className="w-4 h-4 text-teal-600" />
                       <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Sequins AI Insight</span>
                    </div>
                    <p className="font-serif text-xl text-[#333333] leading-relaxed">
                       "Attendance is up 12% in your Jazz classes this month. Consider adding a Level 2 slot next semester."
                    </p>
                 </div>
                 <Button 
                    onClick={() => setIsAnalysisOpen(true)}
                    className="bg-white text-[#333333] hover:bg-white/90 rounded-full px-6 font-medium shadow-sm"
                 >
                    View Analysis
                 </Button>
              </div>
              <Sparkles className="absolute top-[-20px] right-[-20px] w-40 h-40 text-white opacity-40" />
           </div>

        </div>

        <AIAnalysisModal isOpen={isAnalysisOpen} onOpenChange={setIsAnalysisOpen} />

        {/* Right Column: Schedule & Feed (4 cols) */}
        <div className="md:col-span-4 space-y-6">
           
           {/* Today's Schedule */}
           <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100/50 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-serif text-xl text-[#333333]">Today's Rhythm</h3>
                 <div className="text-xs font-bold bg-[#F4F4F6] px-2 py-1 rounded-lg text-gray-500 uppercase">
                    {metrics.todaysClasses.length} Classes
                 </div>
              </div>

              {metrics.todaysClasses.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-4 opacity-60">
                    <Calendar className="w-12 h-12" />
                    <p>No classes scheduled for today.</p>
                 </div>
              ) : (
                 <div className="space-y-3 flex-1">
                    {metrics.todaysClasses.map((cls, i) => (
                       <div key={cls.id} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-[#F4F4F6] transition-colors cursor-pointer">
                          <div className="w-12 h-12 rounded-xl bg-[#F4F4F6] group-hover:bg-white flex flex-col items-center justify-center text-[#333333] font-medium border border-transparent group-hover:border-gray-100 transition-all shadow-sm">
                             <span className="text-xs">{Math.floor(cls.start_time)}:{(cls.start_time % 1 * 60).toString().padStart(2, '0')}</span>
                             <span className="text-[10px] text-gray-400 uppercase">{cls.start_time >= 12 ? 'PM' : 'AM'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="font-serif text-lg truncate text-[#333333]">{cls.title}</div>
                             <div className="text-xs text-gray-400 flex items-center gap-2">
                                <Users className="w-3 h-3" /> {cls.student_names?.length || 0} Students • Room {cls.room || 'A'}
                             </div>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                       </div>
                    ))}
                 </div>
              )}
              
              <Link to={createPageUrl('ClassManager')} className="mt-6">
                 <Button variant="outline" className="w-full rounded-xl border-dashed border-gray-300 hover:border-[#333333] hover:bg-transparent text-gray-400 hover:text-[#333333]">
                    View Full Schedule
                 </Button>
              </Link>
           </div>

        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function MetricCard({ title, value, trend, icon: Icon, color }) {
   return (
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className={`rounded-[32px] p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden ${color}`}
      >
         <div className="flex justify-between items-start relative z-10">
            <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
               <Icon className="w-5 h-5" />
            </div>
            {trend && (
               <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                  {trend}
               </span>
            )}
         </div>
         <div className="relative z-10">
            <div className="text-4xl font-serif font-medium mb-1 tracking-tight">{value}</div>
            <div className="text-sm opacity-80 font-medium uppercase tracking-wide">{title}</div>
         </div>
         
         {/* Decorative Background Element */}
         <Icon className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12" />
      </motion.div>
   );
}

function ActionCard({ to, icon: Icon, label, sub, highlight }) {
   return (
      <Link to={createPageUrl(to)}>
         <motion.div 
            whileHover={{ y: -4 }}
            className={`
               h-full p-6 rounded-[24px] border transition-all cursor-pointer flex flex-col gap-4 group
               ${highlight 
                  ? 'bg-indigo-50 border-indigo-100 hover:border-indigo-200 hover:shadow-indigo-100/50' 
                  : 'bg-[#F4F4F6] border-transparent hover:bg-white hover:border-gray-200 hover:shadow-lg'
               }
            `}
         >
            <div className={`
               w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
               ${highlight ? 'bg-white text-indigo-600' : 'bg-white text-[#333333] group-hover:bg-[#333333] group-hover:text-white'}
            `}>
               <Icon className="w-6 h-6" />
            </div>
            <div>
               <h4 className={`font-serif text-lg mb-1 ${highlight ? 'text-indigo-900' : 'text-[#333333]'}`}>{label}</h4>
               <p className={`text-xs ${highlight ? 'text-indigo-600/70' : 'text-gray-400'}`}>{sub}</p>
            </div>
         </motion.div>
      </Link>
   );
}