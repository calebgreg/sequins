import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Sparkles, 
  Shield, 
  Zap, 
  BarChart3, 
  Smartphone,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Features() {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="text-center py-16 md:py-24 max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 mb-4">
             <Sparkles className="w-4 h-4 text-teal-600" />
             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">The Sequins Platform</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif text-[#333333] leading-[0.9]">
            Studio management, <br/>
            <span className="italic text-gray-400">reimagined.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            A complete operating system for modern dance studios. From enrollment to recital, we handle the rhythm of your business.
          </p>
        </motion.div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
        <FeatureCard 
          icon={Users}
          title="Family CRM"
          description="Holistic profiles for students and parents. Track attendance trends, skill progression, and family billing history in one view."
          color="bg-indigo-50 text-indigo-600"
        />
        <FeatureCard 
          icon={Calendar}
          title="Smart Scheduling"
          description="Drag-and-drop class management with conflict detection. Manage room allocation and teacher availability effortlessly."
          color="bg-amber-50 text-amber-600"
        />
        <FeatureCard 
          icon={CreditCard}
          title="Automated Billing"
          description="Set it and forget it. Tuition calculation, invoice generation, and auto-pay processing handling complex family discounts."
          color="bg-emerald-50 text-emerald-600"
        />
        <FeatureCard 
          icon={Smartphone}
          title="Teacher Studio"
          description="A dedicated mobile-first interface for instructors to take attendance, record voice notes, and manage lesson plans."
          color="bg-pink-50 text-pink-600"
        />
        <FeatureCard 
          icon={Sparkles}
          title="AI Insights"
          description="Predictive analytics that alert you to retention risks and revenue opportunities before they happen."
          color="bg-purple-50 text-purple-600"
        />
        <FeatureCard 
          icon={Shield}
          title="Secure Portal"
          description="A beautiful, branded experience for parents to view schedules, pay bills, and communicate with staff."
          color="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Detailed Breakdown Section */}
      <div className="space-y-32">
        
        {/* Section 1: Teacher Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
           <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-[#F2DCDD] rounded-[40px] rotate-3 opacity-50" />
              <div className="bg-white p-8 rounded-[40px] shadow-xl relative border border-gray-100">
                 <div className="flex items-center justify-between mb-8">
                    <h4 className="font-serif text-xl">Class Journal</h4>
                    <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">LIVE PREVIEW</span>
                 </div>
                 <div className="space-y-4">
                    <div className="p-4 bg-[#F4F4F6] rounded-2xl flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Zap className="w-5 h-5 text-yellow-500" />
                       </div>
                       <div>
                          <div className="font-bold text-[#333333]">Voice-to-Text Notes</div>
                          <div className="text-sm text-gray-400">"Sarah nailed her pirouette today..."</div>
                       </div>
                    </div>
                    <div className="p-4 bg-[#F4F4F6] rounded-2xl flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                       </div>
                       <div>
                          <div className="font-bold text-[#333333]">One-Tap Attendance</div>
                          <div className="text-sm text-gray-400">Mark all present in seconds</div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
           <div className="order-1 md:order-2 space-y-6">
              <div className="w-12 h-12 bg-[#333333] rounded-2xl flex items-center justify-center text-white mb-4">
                 <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-4xl font-serif text-[#333333]">Empower your instructors.</h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                 Give your teachers the tools they need without the administrative burden. Our Teacher Studio works perfectly on mobile devices right inside the studio.
              </p>
              <ul className="space-y-3">
                 <li className="flex items-center gap-3 text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500" /> Real-time roster updates
                 </li>
                 <li className="flex items-center gap-3 text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500" /> AI-assisted student feedback
                 </li>
                 <li className="flex items-center gap-3 text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500" /> Lesson plan sharing
                 </li>
              </ul>
           </div>
        </div>

        {/* Section 2: AI Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
           <div className="space-y-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-4">
                 <BarChart3 className="w-6 h-6" />
              </div>
              <h2 className="text-4xl font-serif text-[#333333]">Data that dances.</h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                 Stop guessing about your studio's health. Sequins AI analyzes attendance patterns, revenue trends, and class popularity to give you actionable advice.
              </p>
              <div className="flex gap-4 pt-4">
                 <Button className="bg-[#333333] text-white rounded-full px-8 h-12">
                    See Demo <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
              </div>
           </div>
           <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-[40px] -rotate-3 opacity-50" />
              <div className="bg-white p-8 rounded-[40px] shadow-xl relative border border-gray-100">
                 <div className="bg-[#333333] text-white p-6 rounded-3xl mb-6">
                    <div className="flex items-center gap-2 mb-4 opacity-80">
                       <Sparkles className="w-4 h-4" /> AI Insight
                    </div>
                    <div className="text-2xl font-serif mb-2">Retention Risk</div>
                    <p className="text-white/60 text-sm">
                       "3 advanced students have missed 2 consecutive classes. Reach out now to prevent drop-off."
                    </p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex-1 h-24 bg-gray-50 rounded-2xl" />
                    <div className="flex-1 h-24 bg-gray-50 rounded-2xl" />
                 </div>
              </div>
           </div>
        </div>

      </div>

      {/* CTA Footer */}
      <div className="mt-32 bg-[#333333] rounded-[40px] p-16 text-center relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1504609773096-104ff10387bc?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center" />
         <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-serif text-white">Ready to elevate your studio?</h2>
            <p className="text-white/60 text-lg">Join the waitlist for Sequins and transform how you manage your dance business.</p>
            <div className="flex justify-center gap-4">
               <Link to={createPageUrl('Home')}>
                  <Button variant="outline" className="rounded-full h-14 px-8 border-white/20 text-[#333333] hover:bg-white hover:text-[#333333]">
                     View Dashboard
                  </Button>
               </Link>
               <Button className="bg-white text-[#333333] rounded-full h-14 px-8 hover:bg-gray-100">
                  Get Started Now
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-lg transition-all group"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-serif text-2xl text-[#333333] mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}