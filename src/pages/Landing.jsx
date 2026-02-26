import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, CheckCircle2, ChevronDown, Star,
  Mic, Music, FileText, UserCheck, Calendar, Users, CreditCard,
  TrendingUp, Heart, Menu, X, BarChart3, Smartphone
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import CloudHero from '@/components/landing/CloudHero';

// ── Etched text style (matches app sidebar/Teacher Studio) ──
const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

const etchedTextDark = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #e8c8c8 0%, #c4a0a0 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
};

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Teacher Studio', href: '#teacher' },
  { label: 'For Studios', href: '#studios' },
];

const TEACHER_FEATURES = [
  { icon: CheckCircle2, label: 'One-tap attendance', color: '#7eb89a' },
  { icon: Mic, label: 'AI voice notes', color: '#c4a0a0' },
  { icon: FileText, label: 'Lesson planner', color: '#a48bc4' },
  { icon: Music, label: 'Music library', color: '#d4a574' },
  { icon: UserCheck, label: 'Sub request flow', color: '#8cb4c8' },
  { icon: Star, label: 'Trial dossiers', color: '#d97706' },
];

const FEATURES = [
  {
    icon: Users,
    title: 'Family CRM',
    desc: 'Deep profiles for every student and family — attendance trends, skill notes, billing history, and communication all in one view.',
    accent: 'rgba(164,139,196,0.15)',
    iconColor: '#a48bc4',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    desc: 'Build your weekly schedule with conflict detection, room management, and sub assignments that actually work.',
    accent: 'rgba(140,180,200,0.15)',
    iconColor: '#8cb4c8',
  },
  {
    icon: CreditCard,
    title: 'Automated Billing',
    desc: 'Tiered tuition plans, sibling discounts, auto-pay, and invoice generation — your billing runs itself.',
    accent: 'rgba(126,184,154,0.15)',
    iconColor: '#7eb89a',
  },
  {
    icon: Heart,
    title: 'Family Portal',
    desc: 'A beautiful, branded room for each family — schedules, invoices, student progress, and direct messaging.',
    accent: 'rgba(212,165,116,0.15)',
    iconColor: '#d4a574',
  },
  {
    icon: TrendingUp,
    title: 'Growth Engine',
    desc: 'Track leads, trial bookings, conversions, and referrals. Sequins actively helps you grow your studio.',
    accent: 'rgba(126,184,154,0.15)',
    iconColor: '#7eb89a',
  },
];



export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (emailInput) setSubmitted(true);
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >

      {/* ── Ambient blobs ── */}
      <div className="fixed top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.6) 0%, transparent 70%)' }} />
      <div className="fixed bottom-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.7) 0%, transparent 70%)' }} />
      <div className="fixed top-[40%] left-[30%] w-[400px] h-[400px] rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(164,139,196,0.4) 0%, transparent 70%)' }} />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div
          className="max-w-5xl mx-auto rounded-2xl px-5 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 2px 40px rgba(180,150,140,0.08), 0 0 0 1px rgba(200,170,160,0.1)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                boxShadow: '0 4px 12px -4px rgba(180,150,140,0.3), inset 0 1px 1px rgba(255,255,255,1)',
              }}
            >
              <span className="text-base font-bold" style={etchedText}>S</span>
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: '#8a7070' }}>Sequins</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(link => (
              <a key={link.label} href={link.href}
                className="text-sm font-medium transition-colors"
                style={{ color: '#b5a599' }}
                onMouseEnter={e => e.target.style.color = '#8a7070'}
                onMouseLeave={e => e.target.style.color = '#b5a599'}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <button className="text-sm font-medium px-4 py-2 rounded-xl transition-all" style={{ color: '#b5a599' }}>
                Sign in
              </button>
            </Link>
            <a href="#waitlist">
              <button
                className="text-sm font-semibold px-5 py-2 rounded-xl transition-all"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,244,244,0.9) 100%)',
                  boxShadow: '0 4px 16px -4px rgba(180,150,140,0.3), inset 0 1px 1px rgba(255,255,255,1)',
                  color: '#8a7070',
                  border: '1px solid rgba(220,190,190,0.3)',
                }}
              >
                Get Early Access
              </button>
            </a>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(o => !o)} style={{ color: '#b5a599' }}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="md:hidden mt-2 max-w-5xl mx-auto rounded-2xl p-4 space-y-1"
              style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 8px 40px rgba(180,150,140,0.15)' }}
            >
              {NAV_LINKS.map(link => (
                <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ color: '#b5a599' }}>
                  {link.label}
                </a>
              ))}
              <div className="pt-2 border-t flex gap-2" style={{ borderColor: 'rgba(200,180,170,0.15)' }}>
                <Link to={createPageUrl('Home')} className="flex-1">
                  <button className="w-full text-sm font-medium py-2.5 rounded-xl" style={{ background: 'rgba(244,206,206,0.2)', color: '#8a7070' }}>Sign in</button>
                </Link>
                <a href="#waitlist" className="flex-1">
                  <button className="w-full text-sm font-semibold py-2.5 rounded-xl" style={{ background: 'linear-gradient(145deg, #f4e8e8, #ede0dc)', color: '#8a7070' }}>Get Access</button>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{
              background: 'rgba(255,255,255,0.7)',
              boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
              border: '1px solid rgba(220,190,190,0.2)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#c4a0a0' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#b5a599' }}>Dance Studio Operating System</span>
          </motion.div>

          <h1
            className="text-6xl md:text-8xl font-bold tracking-tight leading-[0.9] mb-8"
            style={etchedText}
          >
            Run your studio<br />
            <span style={{ ...etchedText, opacity: 0.6 }}>without the chaos.</span>
          </h1>

          <p className="text-lg md:text-xl max-w-xl mx-auto leading-relaxed mb-10" style={{ color: '#b5a599' }}>
            Sequins is the complete platform for dance studios — from enrollment and scheduling to AI-powered insights and a dedicated teacher app.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#waitlist">
              <button
                className="h-14 px-10 rounded-2xl text-base font-bold transition-all active:scale-[0.98] hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                  boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255, 220, 210, 0.5)',
                  color: 'transparent',
                  backgroundImage: 'linear-gradient(145deg, rgba(254,247,247,0.95) 0%, rgba(252,231,231,0.9) 100%)',
                }}
              >
                <span style={etchedText}>Get Early Access <ArrowRight className="inline w-4 h-4 ml-1" /></span>
              </button>
            </a>
            <a href="#features">
              <button
                className="h-14 px-10 rounded-2xl text-base font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                  color: '#b5a599',
                }}
              >
                See how it works <ChevronDown className="inline w-4 h-4 ml-1" />
              </button>
            </a>
          </div>

          <p className="mt-6 text-sm flex items-center justify-center gap-2" style={{ color: '#c4b5ab' }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: '#7eb89a' }} />
            Free 30-day trial · No credit card required
          </p>
        </motion.div>

        {/* Hero mock – Teacher Studio aesthetic */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="relative z-10 mt-20 w-full max-w-3xl mx-auto"
        >
          <div
            className="rounded-3xl p-6 md:p-10"
            style={{
              background: 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 50%, rgba(250,242,240,0.85) 100%)',
              boxShadow: '0 40px 80px -20px rgba(180,150,140,0.25), inset 0 2px 12px rgba(180,120,120,0.06)',
            }}
          >
            {/* Window dots */}
            <div className="flex items-center gap-1.5 mb-6">
              <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(196,160,160,0.4)' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(196,160,160,0.3)' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(196,160,160,0.2)' }} />
            </div>

            {/* Class header */}
            <div className="text-center mb-8">
              <p className="text-sm mb-1" style={{ color: '#b5a599' }}>6:00 PM · 60 min</p>
              <h2 className="text-4xl font-bold" style={etchedText}>Ballet Advanced</h2>
              <p className="text-sm mt-1" style={{ color: '#b5a599' }}>14 students enrolled</p>
            </div>

            {/* 6-card grid */}
            <div className="grid grid-cols-3 gap-3">
              {['ATTENDANCE', 'ROSTER', 'LESSON PLAN', 'MUSIC', 'NOTES', 'REQUEST SUB'].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center gap-2"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    boxShadow: '0 4px 16px -4px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
                  }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(196,160,160,0.08)' }}>
                    {label === 'ATTENDANCE' && <CheckCircle2 className="w-4 h-4" style={{ color: '#c4a0a0' }} />}
                    {label === 'ROSTER' && <Users className="w-4 h-4" style={{ color: '#c4a0a0' }} />}
                    {label === 'LESSON PLAN' && <FileText className="w-4 h-4" style={{ color: '#c4a0a0' }} />}
                    {label === 'MUSIC' && <Music className="w-4 h-4" style={{ color: '#c4a0a0' }} />}
                    {label === 'NOTES' && <Mic className="w-4 h-4" style={{ color: '#c4a0a0' }} />}
                    {label === 'REQUEST SUB' && <Calendar className="w-4 h-4" style={{ color: '#c4a0a0' }} />}
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-center" style={{ color: '#a89890' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4" style={etchedText}>Everything your studio needs.</h2>
            <p className="text-lg" style={{ color: '#b5a599' }}>One platform. Every workflow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="rounded-2xl p-7"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,252,250,0.5) 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 20px -8px rgba(180,150,140,0.15)',
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: f.accent }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.iconColor }} />
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: '#8b7d72' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#b5a599' }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Teacher Studio Deep Dive ── */}
      <section id="teacher" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-3xl p-10 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
            style={{
              background: 'linear-gradient(145deg, rgba(254,240,240,0.8) 0%, rgba(252,235,235,0.6) 100%)',
              boxShadow: 'inset 0 2px 12px rgba(180,120,120,0.06)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-5"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,244,244,0.9) 100%)',
                  boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                }}
              >
                <Smartphone className="w-5 h-5" style={{ color: '#c4a0a0' }} />
              </div>
              <h2 className="text-4xl font-bold leading-tight" style={etchedText}>
                Built for teachers.<br />
                <span style={{ ...etchedText, opacity: 0.6 }}>Loved by studios.</span>
              </h2>
              <p className="text-base leading-relaxed" style={{ color: '#b5a599' }}>
                The Teacher Studio is a dedicated mobile-first experience for the studio floor. Everything an instructor needs — nothing they don't.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {TEACHER_FEATURES.map(({ icon: Icon, label, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.7)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
                    <span className="text-xs font-semibold" style={{ color: '#8b7d72' }}>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-3"
            >
              {/* Roster mock */}
              {[
                { name: 'Emma Sullivan', status: 'present', trial: false },
                { name: 'Sofia Kim', status: 'trial', trial: true },
                { name: 'Lily Reyes', status: 'present', trial: false },
                { name: 'Ava Thompson', status: 'late', trial: false },
              ].map((student) => (
                <div
                  key={student.name}
                  className="rounded-xl p-3.5 flex items-center justify-between"
                  style={{
                    background: student.trial
                      ? 'linear-gradient(145deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.04) 100%)'
                      : 'rgba(255,255,255,0.7)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                    border: student.trial ? '1px solid rgba(251,191,36,0.15)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm"
                      style={{
                        background: student.trial ? 'rgba(251,191,36,0.15)' : 'rgba(196,160,160,0.12)',
                        color: student.trial ? '#d97706' : '#c4a0a0',
                      }}
                    >
                      {student.name[0]}
                    </div>
                    <span className="text-sm font-medium" style={{ color: '#8b7d72' }}>{student.name}</span>
                    {student.trial && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' }}>
                        Trial
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {['Here', 'Out', 'Late'].map(s => {
                      const colorMap = { Here: '#7eb89a', Out: '#d4a574', Late: '#a48bc4' };
                      const statusMap = { Here: 'present', Out: 'absent', Late: 'late' };
                      const isActive = student.status === statusMap[s] || (s === 'Here' && student.status === 'trial');
                      return (
                        <div
                          key={s}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                          style={{
                            background: isActive ? `${colorMap[s]}22` : 'transparent',
                            color: isActive ? colorMap[s] : '#d4c4ba',
                          }}
                        >
                          {s}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Voice note input mock */}
              <div
                className="rounded-xl p-4 mt-2 flex items-center gap-3"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(145deg, rgba(196,160,160,0.2), rgba(196,160,160,0.1))' }}
                >
                  <Mic className="w-4 h-4" style={{ color: '#c4a0a0' }} />
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full mb-1.5" style={{ background: 'rgba(196,160,160,0.15)', width: '80%' }} />
                  <div className="h-2 rounded-full" style={{ background: 'rgba(196,160,160,0.1)', width: '55%' }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#c4a0a0' }}>Live</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── AI Section ── */}
      <section id="studios" className="py-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-5"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, rgba(164,139,196,0.2), rgba(164,139,196,0.1))',
              }}
            >
              <BarChart3 className="w-5 h-5" style={{ color: '#a48bc4' }} />
            </div>
            <h2 className="text-4xl font-bold leading-tight" style={etchedText}>
              Data that dances.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: '#b5a599' }}>
              Sequins AI — called Gene by your studio — doesn't just report data. It actively watches your studio and tells you what to do about it.
            </p>
            <ul className="space-y-3">
              {[
                'Retention risk alerts before students drop',
                'Revenue gap identification',
                'Trial-to-enrollment conversion nudges',
                'Class demand forecasting',
                'Teacher performance insights',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm" style={{ color: '#8b7d72' }}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#7eb89a' }} />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {/* AI insight cards */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(196,160,160,0.12) 0%, rgba(196,160,160,0.06) 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" style={{ color: '#c4a0a0' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#c4a0a0' }}>Gene · Retention Alert</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#8b7d72' }}>
                "3 advanced students have missed 2+ consecutive classes. Based on historical patterns, they're at high risk of dropping. I've drafted an outreach message for your review."
              </p>
              <div className="mt-3 flex gap-2">
                <button className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all" style={{ background: 'rgba(196,160,160,0.15)', color: '#8a7070' }}>Review Draft</button>
                <button className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ color: '#c4b5ab' }}>Dismiss</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(126,184,154,0.12) 0%, rgba(126,184,154,0.06) 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                }}
              >
                <TrendingUp className="w-5 h-5 mb-3" style={{ color: '#7eb89a' }} />
                <div className="text-3xl font-bold mb-1" style={{ color: '#5a7d6a' }}>+12%</div>
                <div className="text-xs font-medium" style={{ color: '#7eb89a' }}>Attendance up</div>
              </div>
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(164,139,196,0.12) 0%, rgba(164,139,196,0.06) 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                }}
              >
                <Heart className="w-5 h-5 mb-3" style={{ color: '#a48bc4' }} />
                <div className="text-3xl font-bold mb-1" style={{ color: '#6a5a8a' }}>94%</div>
                <div className="text-xs font-medium" style={{ color: '#a48bc4' }}>Retention rate</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Gene AI Execution Flow ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: 'rgba(255,255,255,0.7)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                border: '1px solid rgba(220,190,190,0.2)',
              }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#c4a0a0' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#b5a599' }}>Meet Gene</span>
            </div>
            <h2 className="text-4xl font-bold mb-3" style={etchedText}>Not just insights. Action.</h2>
            <p className="text-base" style={{ color: '#b5a599' }}>Gene notices a problem, reasons through it, and takes care of it.</p>
          </div>

          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[22px] top-12 bottom-12 w-px md:left-1/2 md:-translate-x-px hidden md:block"
              style={{ background: 'linear-gradient(180deg, rgba(196,160,160,0.3) 0%, rgba(196,160,160,0.08) 100%)' }} />

            <div className="space-y-4">

              {/* Step 0: Trigger */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}
                className="flex items-start gap-4 md:justify-center"
              >
                <div
                  className="relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(145deg, rgba(196,160,160,0.2), rgba(196,160,160,0.1))',
                    boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
                  }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: '#c4a0a0' }} />
                </div>
                <div
                  className="rounded-2xl px-5 py-4 max-w-sm"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 16px -8px rgba(180,150,140,0.15)',
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#c4a0a0' }}>Gene notices</div>
                  <p className="text-sm font-medium" style={{ color: '#8b7d72' }}>
                    Lily Reyes has missed 3 consecutive Ballet classes — unusual for her pattern.
                  </p>
                </div>
              </motion.div>

              {/* Step 1: Reasoning */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="flex items-start gap-4 md:flex-row-reverse md:justify-center"
              >
                <div
                  className="relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(145deg, rgba(164,139,196,0.2), rgba(164,139,196,0.1))',
                    boxShadow: '0 4px 12px -4px rgba(164,139,196,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
                  }}
                >
                  <BarChart3 className="w-5 h-5" style={{ color: '#a48bc4' }} />
                </div>
                <div
                  className="rounded-2xl px-5 py-4 max-w-sm"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 16px -8px rgba(164,139,196,0.12)',
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#a48bc4' }}>Gene reasons</div>
                  <p className="text-sm font-medium" style={{ color: '#8b7d72' }}>
                    Checks her history, invoice status, and family communication. Finds an overdue balance and no parent contact in 6 weeks.
                  </p>
                </div>
              </motion.div>

              {/* Step 2: Acts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                className="flex items-start gap-4 md:justify-center"
              >
                <div
                  className="relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(145deg, rgba(126,184,154,0.2), rgba(126,184,154,0.1))',
                    boxShadow: '0 4px 12px -4px rgba(126,184,154,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
                  }}
                >
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#7eb89a' }} />
                </div>
                <div
                  className="rounded-2xl px-5 py-4 max-w-sm"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 16px -8px rgba(126,184,154,0.12)',
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#7eb89a' }}>Gene acts</div>
                  <p className="text-sm font-medium mb-3" style={{ color: '#8b7d72' }}>
                    Drafts a warm personal check-in email + a soft billing reminder. Queues both for your one-click approval.
                  </p>
                  <div
                    className="rounded-xl p-3 text-xs italic leading-relaxed"
                    style={{ background: 'rgba(126,184,154,0.08)', color: '#7a9e8a', borderLeft: '2px solid rgba(126,184,154,0.3)' }}
                  >
                    "Hi Sarah — we've missed Lily in class! Is everything okay? We'd love to see her back on the floor. Also wanted to touch base about February's balance…"
                  </div>
                </div>
              </motion.div>

              {/* Step 3: Outcome */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                className="flex items-start gap-4 md:flex-row-reverse md:justify-center"
              >
                <div
                  className="relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(145deg, rgba(212,165,116,0.2), rgba(212,165,116,0.1))',
                    boxShadow: '0 4px 12px -4px rgba(212,165,116,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
                  }}
                >
                  <Heart className="w-5 h-5" style={{ color: '#d4a574' }} />
                </div>
                <div
                  className="rounded-2xl px-5 py-4 max-w-sm"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 16px -8px rgba(212,165,116,0.12)',
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#d4a574' }}>You approve in one click</div>
                  <p className="text-sm font-medium" style={{ color: '#8b7d72' }}>
                    Lily's mom replies the same day. She re-enrolls for spring. Invoice paid.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(212,165,116,0.12)', color: '#b8845a' }}>
                    <TrendingUp className="w-3.5 h-3.5" /> Student retained
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>

      {/* ── Waitlist CTA ── */}
      <section id="waitlist" className="py-24 px-6 pb-32">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-12 md:p-20 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,232,232,0.9) 50%, rgba(250,238,238,0.85) 100%)',
              boxShadow: 'inset 0 2px 12px rgba(180,120,120,0.08), 0 40px 80px -20px rgba(180,150,140,0.2)',
            }}
          >
            <div className="absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full blur-3xl opacity-40 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(196,160,160,0.4) 0%, transparent 70%)' }} />

            <div className="relative z-10 space-y-5">
              <h2 className="text-5xl font-bold leading-tight" style={etchedText}>
                Ready to elevate<br />your studio?
              </h2>
              <p className="text-base" style={{ color: '#b5a599' }}>
                Join studios on the Sequins waitlist. Get early access and 3 months free.
              </p>

              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.form
                    key="form"
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-3"
                  >
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="your@studio.com"
                      required
                      className="flex-1 h-13 px-5 py-3.5 rounded-xl text-sm focus:outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                        border: '1px solid rgba(220,190,190,0.3)',
                        color: '#8b7d72',
                      }}
                    />
                    <button
                      type="submit"
                      className="px-7 py-3.5 rounded-xl text-sm font-bold flex-shrink-0 transition-all active:scale-[0.98] hover:scale-[1.02]"
                      style={{
                        background: 'linear-gradient(145deg, rgba(254,247,247,0.95) 0%, rgba(252,231,231,0.9) 100%)',
                        boxShadow: '0 8px 24px -4px rgba(180,150,140,0.3), inset 0 1px 2px rgba(255,255,255,0.8)',
                        border: '1px solid rgba(220,190,190,0.4)',
                        color: 'transparent',
                        backgroundClip: 'unset',
                      }}
                    >
                      <span style={etchedText}>Get Access →</span>
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-3 p-4 rounded-2xl max-w-md mx-auto"
                    style={{ background: 'rgba(126,184,154,0.12)' }}
                  >
                    <CheckCircle2 className="w-5 h-5" style={{ color: '#7eb89a' }} />
                    <span className="text-sm font-medium" style={{ color: '#5a7d6a' }}>You're on the list! We'll be in touch soon.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-xs" style={{ color: '#c4b5ab' }}>No credit card required · Cancel anytime</p>

              <div className="pt-2">
                <Link to={createPageUrl('Home')}>
                  <button
                    className="text-sm font-medium px-6 py-2.5 rounded-xl transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.5)',
                      color: '#b5a599',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                    }}
                  >
                    Go to Dashboard →
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t" style={{ borderColor: 'rgba(200,180,170,0.12)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,244,244,0.9) 100%)',
                boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
              }}
            >
              <span className="text-sm font-bold" style={etchedText}>S</span>
            </div>
            <span className="font-bold text-sm" style={{ color: '#b5a599' }}>Sequins</span>
          </div>
          <p className="text-sm" style={{ color: '#c4b5ab' }}>© 2026 Sequins. Built for dance.</p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Contact'].map(link => (
              <a key={link} href="#" className="text-sm transition-colors" style={{ color: '#c4b5ab' }}>{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}