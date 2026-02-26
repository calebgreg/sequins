import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, CreditCard, Sparkles, Shield, Zap, BarChart3, Smartphone,
  CheckCircle2, ArrowRight, Mic, Music, FileText, UserCheck, Star, ChevronDown,
  Play, Bell, Clock, TrendingUp, Heart, MessageCircle, Menu, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Teacher Studio', href: '#teacher' },
  { label: 'AI Insights', href: '#ai' },
  { label: 'Pricing', href: '#pricing' },
];

const FEATURES = [
  {
    icon: Users,
    title: 'Family CRM',
    description: 'Holistic profiles for every student and parent. Track skill progression, attendance history, and family billing — all in one beautiful view.',
    color: 'from-violet-100 to-violet-50',
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Drag-and-drop class management with conflict detection. Manage rooms, teachers, and waitlists effortlessly.',
    color: 'from-amber-100 to-amber-50',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  {
    icon: CreditCard,
    title: 'Automated Billing',
    description: 'Tuition calculation, invoice generation, and auto-pay processing — handling complex family discounts automatically.',
    color: 'from-emerald-100 to-emerald-50',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
  {
    icon: Smartphone,
    title: 'Teacher Studio',
    description: 'A dedicated mobile-first interface for instructors. Attendance, voice notes, lesson plans, and sub requests in one tap.',
    color: 'from-rose-100 to-rose-50',
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100',
  },
  {
    icon: Sparkles,
    title: 'AI Insights',
    description: 'Predictive analytics that surface retention risks and revenue opportunities before they become problems.',
    color: 'from-purple-100 to-purple-50',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
  },
  {
    icon: Shield,
    title: 'Family Portal',
    description: 'A beautiful, branded experience for parents — view schedules, pay bills, track their dancer\'s progress.',
    color: 'from-sky-100 to-sky-50',
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-100',
  },
];

const TESTIMONIALS = [
  {
    name: 'Sarah Mitchell',
    role: 'Studio Director, Brooklyn Dance Arts',
    avatar: 'S',
    quote: 'Sequins cut our admin time in half. The teacher app alone was worth switching — my instructors actually love it.',
    stars: 5,
  },
  {
    name: 'Marcus Chen',
    role: 'Owner, Pacific Movement Studio',
    avatar: 'M',
    quote: 'The AI insights caught a retention problem before I even noticed it. Three families almost left — now they\'re enrolled for another year.',
    stars: 5,
  },
  {
    name: 'Priya Kapoor',
    role: 'Director, The Dance Collective',
    avatar: 'P',
    quote: 'Finally a platform that understands the rhythm of a dance studio. Everything from billing to recital planning in one place.',
    stars: 5,
  },
];

const TEACHER_FEATURES = [
  { icon: CheckCircle2, label: 'One-tap attendance', color: 'text-emerald-500' },
  { icon: Mic, label: 'AI voice-to-note', color: 'text-rose-400' },
  { icon: FileText, label: 'Lesson plan builder', color: 'text-violet-500' },
  { icon: Music, label: 'Music library manager', color: 'text-amber-500' },
  { icon: UserCheck, label: 'Sub request flow', color: 'text-sky-500' },
  { icon: Star, label: 'Trial student dossiers', color: 'text-orange-400' },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (emailInput) setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div
          className="max-w-6xl mx-auto rounded-2xl px-6 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 2px 40px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#333333] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[#333333] text-lg tracking-tight">Sequins</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <a key={link.label} href={link.href} className="text-sm text-gray-500 hover:text-[#333333] transition-colors font-medium">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" className="text-sm font-medium text-gray-600 hover:text-[#333333]">Sign in</Button>
            </Link>
            <a href="#waitlist">
              <Button className="bg-[#333333] text-white rounded-xl text-sm px-5 hover:bg-black">Get Early Access</Button>
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden mt-2 max-w-6xl mx-auto rounded-2xl p-4 space-y-1"
              style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}
            >
              {NAV_LINKS.map(link => (
                <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-[#333333]">
                  {link.label}
                </a>
              ))}
              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <Link to={createPageUrl('Home')} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl text-sm">Sign in</Button>
                </Link>
                <a href="#waitlist" className="flex-1">
                  <Button className="w-full bg-[#333333] text-white rounded-xl text-sm">Get Access</Button>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #F2DCDD 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #E0F2F1 0%, transparent 70%)' }} />
        <div className="absolute top-[30%] left-[10%] w-[300px] h-[300px] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #E8EAF6 0%, transparent 70%)' }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 mb-8"
          >
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">The Modern Dance Studio OS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-serif text-[#333333] leading-[0.92] mb-8 tracking-tight"
          >
            Studio management,<br />
            <span className="italic text-gray-400">reimagined.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-12"
          >
            From enrollment to recital — Sequins is the complete operating system for dance studios that want to spend more time dancing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="#waitlist">
              <Button className="bg-[#333333] text-white rounded-2xl h-14 px-10 text-base font-semibold hover:bg-black shadow-lg shadow-gray-200">
                Get Early Access <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
            <a href="#features">
              <Button variant="outline" className="rounded-2xl h-14 px-10 text-base font-medium border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50">
                See How It Works <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-sm text-gray-400 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required &nbsp;·&nbsp; Free 30-day trial
          </motion.p>
        </motion.div>

        {/* Hero mock UI */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative z-10 mt-20 w-full max-w-5xl mx-auto"
        >
          <div
            className="rounded-[32px] p-6 md:p-10 shadow-2xl shadow-gray-200/80"
            style={{
              background: 'linear-gradient(145deg, #faf9f8 0%, #f7f4f3 100%)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-yellow-300" />
              <div className="w-3 h-3 rounded-full bg-green-300" />
              <div className="flex-1 mx-4 h-7 rounded-lg bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* KPI Cards */}
              <div className="rounded-2xl p-5 bg-[#333333] text-white">
                <Users className="w-5 h-5 mb-3 opacity-60" />
                <div className="text-4xl font-serif mb-1">142</div>
                <div className="text-xs opacity-60 uppercase tracking-wide">Active Students</div>
              </div>
              <div className="rounded-2xl p-5 bg-white shadow-sm">
                <CreditCard className="w-5 h-5 mb-3 text-gray-300" />
                <div className="text-4xl font-serif text-[#333333] mb-1">$18.4k</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Monthly Revenue</div>
              </div>
              <div className="rounded-2xl p-5" style={{ background: '#F2DCDD' }}>
                <Calendar className="w-5 h-5 mb-3 text-[#c9a99c]" />
                <div className="text-4xl font-serif text-[#333333] mb-1">7</div>
                <div className="text-xs text-[#a88a88] uppercase tracking-wide">Classes Today</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Students', Icon: Users },
                { label: 'Classes', Icon: Calendar },
                { label: 'Billing', Icon: CreditCard },
                { label: 'Teacher Studio', Icon: Sparkles },
              ].map(({ label, Icon }) => (
                <div key={label} className="rounded-xl p-4 bg-white shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Social Proof Bar ── */}
      <section className="py-10 border-y border-gray-100 bg-[#fafaf9]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm text-gray-400 font-medium uppercase tracking-widest">Trusted by studios nationwide</div>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {['Brooklyn Dance Arts', 'Pacific Movement', 'The Dance Collective', 'Rhythm House', 'Studio Nova'].map(name => (
              <span key={name} className="text-gray-400 font-serif text-sm">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#F4F4F6] px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Everything You Need</span>
          </div>
          <h2 className="text-5xl font-serif text-[#333333] mb-4">One platform.<br /><span className="italic text-gray-400">Every workflow.</span></h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Stop juggling spreadsheets, email chains, and fragmented tools. Sequins handles every layer of your studio.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-[28px] p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className={`w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <f.icon className={`w-6 h-6 ${f.iconColor}`} />
              </div>
              <h3 className="font-serif text-xl text-[#333333] mb-2">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Teacher Studio Deep Dive ── */}
      <section id="teacher" className="py-24 px-6 bg-[#fafaf9]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="w-12 h-12 bg-[#333333] rounded-2xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-5xl font-serif text-[#333333] leading-tight">Built for teachers,<br /><span className="italic text-gray-400">loved by studios.</span></h2>
            <p className="text-lg text-gray-500 leading-relaxed">
              The Teacher Studio is a dedicated mobile-first experience built for the studio floor — not a boardroom. Instructors can manage everything without leaving the room.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {TEACHER_FEATURES.map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-gray-50">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-[40px] rotate-2 opacity-30" style={{ background: '#F2DCDD' }} />
            <div className="relative bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
              {/* Mock Teacher Studio UI */}
              <div className="p-6 pb-0" style={{ background: 'linear-gradient(145deg, #fde8e8 0%, #fdf0ef 100%)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-[#b5a599]">4:30 PM · 60 min</p>
                    <h4 className="text-2xl font-serif" style={{ color: '#8a7070' }}>Jazz Intermediate</h4>
                  </div>
                  <div className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: 'rgba(255,255,255,0.7)', color: '#c4a0a0' }}>12 Students</div>
                </div>
                <div className="grid grid-cols-3 gap-2 pb-6">
                  {['Attendance', 'Roster', 'Lesson Plan', 'Music', 'Notes', 'Request Sub'].map((item) => (
                    <div key={item} className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.85)' }}>
                      <div className="text-[10px] font-bold tracking-wider text-center" style={{ color: '#a89890' }}>{item}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Today's Roster</p>
                {['Emma S.', 'Lily R.', 'Sofia K.', 'Ava T.'].map((name, i) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F2DCDD] flex items-center justify-center">
                        <span className="text-xs font-bold text-[#c4a0a0]">{name[0]}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{name}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: i === 2 ? 'rgba(245,158,11,0.1)' : 'rgba(126,184,154,0.15)', color: i === 2 ? '#d97706' : '#7eb89a' }}>
                      {i === 2 ? 'Trial' : 'Present'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── AI Section ── */}
      <section id="ai" className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative order-2 md:order-1"
          >
            <div className="absolute inset-0 rounded-[40px] -rotate-2 opacity-30" style={{ background: 'linear-gradient(135deg, #E8EAF6, #E0F2F1)' }} />
            <div className="relative bg-white rounded-[40px] shadow-xl border border-gray-100 p-8 space-y-4">
              <div className="bg-[#333333] text-white p-6 rounded-3xl">
                <div className="flex items-center gap-2 mb-3 opacity-70">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Sequins AI Insight</span>
                </div>
                <div className="text-2xl font-serif mb-2">Retention Risk Alert</div>
                <p className="text-white/60 text-sm leading-relaxed">
                  "3 advanced students have missed 2+ consecutive classes. Reach out now to prevent drop-off before next semester."
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="px-4 py-2 rounded-xl bg-white/10 text-xs font-medium hover:bg-white/20 transition-colors">Send Message</button>
                  <button className="px-4 py-2 rounded-xl bg-white/10 text-xs font-medium hover:bg-white/20 transition-colors">View Students</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl">
                  <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
                  <div className="text-2xl font-serif text-gray-800">+12%</div>
                  <div className="text-xs text-emerald-700 font-medium">Attendance Up</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl">
                  <Heart className="w-5 h-5 text-violet-600 mb-2" />
                  <div className="text-2xl font-serif text-gray-800">94%</div>
                  <div className="text-xs text-violet-700 font-medium">Retention Rate</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6 order-1 md:order-2"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-5xl font-serif text-[#333333] leading-tight">Data that<br /><span className="italic text-gray-400">dances.</span></h2>
            <p className="text-lg text-gray-500 leading-relaxed">
              Stop guessing about your studio's health. Sequins AI analyzes attendance patterns, revenue trends, and class popularity to surface insights you can actually act on.
            </p>
            <ul className="space-y-3">
              {[
                'Retention risk alerts before students leave',
                'Revenue optimization recommendations',
                'Class demand forecasting',
                'Teacher performance analytics',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-gray-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-6 bg-[#fafaf9]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-serif text-[#333333] mb-4">Studios love Sequins.</h2>
            <p className="text-lg text-gray-500">Don't take our word for it.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-[28px] p-8 border border-gray-100 shadow-sm"
              >
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 font-medium text-sm">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center text-white font-serif font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-serif text-[#333333] mb-4">Simple, honest pricing.</h2>
            <p className="text-lg text-gray-500">Grow without worrying about per-seat fees or surprise charges.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter', price: '$49', period: '/mo',
                description: 'Perfect for small studios just getting started.',
                features: ['Up to 50 students', 'Class scheduling', 'Basic billing', 'Parent portal', '1 teacher login'],
                cta: 'Start Free Trial', highlight: false,
              },
              {
                name: 'Studio', price: '$99', period: '/mo',
                description: 'Everything a growing studio needs.',
                features: ['Up to 200 students', 'Everything in Starter', 'AI insights', 'Teacher Studio app', 'Sub request system', 'Lesson planner', 'Voice notes'],
                cta: 'Start Free Trial', highlight: true,
              },
              {
                name: 'Enterprise', price: 'Custom', period: '',
                description: 'For multi-location studios and academies.',
                features: ['Unlimited students', 'Multiple locations', 'Custom integrations', 'Dedicated support', 'Advanced analytics', 'White-label portal'],
                cta: 'Contact Us', highlight: false,
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-[28px] p-8 border flex flex-col ${plan.highlight
                  ? 'bg-[#333333] text-white border-transparent shadow-2xl shadow-gray-300 scale-[1.03]'
                  : 'bg-white border-gray-100 shadow-sm'}`}
              >
                {plan.highlight && (
                  <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-4 w-fit">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}
                <div className={`text-sm font-bold uppercase tracking-widest mb-2 ${plan.highlight ? 'text-white/60' : 'text-gray-400'}`}>{plan.name}</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-5xl font-serif">{plan.price}</span>
                  <span className={`text-sm mb-2 ${plan.highlight ? 'text-white/60' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-white/60' : 'text-gray-500'}`}>{plan.description}</p>
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-emerald-400' : 'text-emerald-500'}`} />
                      <span className={plan.highlight ? 'text-white/80' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#waitlist">
                  <Button
                    className={`w-full rounded-xl h-11 font-semibold ${plan.highlight
                      ? 'bg-white text-[#333333] hover:bg-gray-100'
                      : 'bg-[#333333] text-white hover:bg-black'}`}
                  >
                    {plan.cta}
                  </Button>
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist CTA ── */}
      <section id="waitlist" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#333333] rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'url(https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=20) center/cover no-repeat', opacity: 0.06 }} />
            <Sparkles className="absolute top-8 right-8 w-32 h-32 text-white/10" />
            <Sparkles className="absolute bottom-8 left-8 w-24 h-24 text-white/10" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-5xl md:text-6xl font-serif text-white leading-tight">Ready to elevate<br />your studio?</h2>
              <p className="text-white/60 text-lg">Join hundreds of studios on the Sequins waitlist. Get early access and 3 months free.</p>
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                  >
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="your@studio.com"
                      required
                      className="flex-1 h-14 px-5 rounded-2xl text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:bg-white/15"
                    />
                    <Button
                      type="submit"
                      className="h-14 px-8 rounded-2xl bg-white text-[#333333] font-bold hover:bg-gray-100 flex-shrink-0"
                    >
                      Get Access <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-3 p-4 bg-white/10 rounded-2xl max-w-md mx-auto"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span className="text-white font-medium">You're on the list! We'll be in touch soon.</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-white/40 text-xs">No credit card required · Cancel anytime</p>
              <div className="flex justify-center gap-8 pt-4">
                <Link to={createPageUrl('Home')}>
                  <Button variant="outline" className="rounded-full h-12 px-8 border-white/20 text-white hover:bg-white/10">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#333333] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[#333333] tracking-tight">Sequins</span>
          </div>
          <p className="text-sm text-gray-400">© 2026 Sequins. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}