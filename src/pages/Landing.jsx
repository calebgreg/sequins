import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, CheckCircle2, ChevronDown,
  Mic, Music, FileText, UserCheck, Calendar, Users, CreditCard,
  TrendingUp, Heart, Menu, X, BarChart3, Smartphone, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

// ─── Palette ───
const C = {
  bg: '#fdf9f8',
  rose: '#c4a0a0',
  roseDark: '#8a7070',
  roseMid: '#b5a599',
  roseLight: '#e8d8d8',
  sage: '#7eb89a',
  purple: '#a48bc4',
  amber: '#d4a574',
  blue: '#8cb4c8',
  text: '#8b7d72',
  textFaint: '#b5a599',
  textFainter: '#c4b5ab',
};

// ─── Etched text ───
const etchedText = {
  color: 'transparent',
  backgroundImage: `linear-gradient(180deg, ${C.rose} 0%, ${C.roseDark} 100%)`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

// ─── Scroll reveal hook ───
const useReveal = () => {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
};

// ─── Reveal wrapper ───
const Rv = ({ children, delay = 0, y = 16, style }) => {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : `translateY(${y}px)`,
      transition: `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
};

// ─── Staggered list reveal ───
const RvList = ({ items, renderItem, stagger = 0.08, baseDelay = 0 }) => {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref}>
      {items.map((item, i) => (
        <div key={i} style={{
          opacity: vis ? 1 : 0,
          transform: vis ? 'translateY(0)' : 'translateY(14px)',
          transition: `opacity 0.6s ease ${baseDelay + i * stagger}s, transform 0.6s ease ${baseDelay + i * stagger}s`,
        }}>
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  );
};

// ─── Typing hook ───
const useTyper = (prompts) => {
  const [text, setText] = useState('');
  useEffect(() => {
    let pi = 0, ci = 0, typing = true, timer;
    const tick = () => {
      if (typing) {
        ci++;
        setText(prompts[pi].substring(0, ci));
        if (ci >= prompts[pi].length) { typing = false; timer = setTimeout(tick, 2200); return; }
        timer = setTimeout(tick, 38 + Math.random() * 42);
      } else {
        ci--;
        setText(prompts[pi].substring(0, ci) || '\u200B');
        if (ci <= 0) { typing = true; pi = (pi + 1) % prompts.length; timer = setTimeout(tick, 500); return; }
        timer = setTimeout(tick, 18);
      }
    };
    timer = setTimeout(tick, 1200);
    return () => clearTimeout(timer);
  }, []);
  return text;
};

const TEACHER_FEATURES = [
  { icon: CheckCircle2, label: 'One-tap attendance', color: C.sage },
  { icon: Mic, label: 'AI voice notes', color: C.rose },
  { icon: FileText, label: 'Lesson planner', color: C.purple },
  { icon: Music, label: 'Music library', color: C.amber },
  { icon: UserCheck, label: 'Sub request flow', color: C.blue },
  { icon: Star, label: 'Trial dossiers', color: '#d97706' },
];

const FEATURES = [
  { icon: Users, title: 'Family CRM', desc: 'Deep profiles — attendance trends, skill notes, billing history, and communication all in one view.', accent: 'rgba(164,139,196,0.12)', iconColor: C.purple },
  { icon: Calendar, title: 'Smart Scheduling', desc: 'Conflict detection, room management, and sub assignments that actually work.', accent: 'rgba(140,180,200,0.12)', iconColor: C.blue },
  { icon: CreditCard, title: 'Automated Billing', desc: 'Tiered plans, sibling discounts, auto-pay, and invoice generation — billing runs itself.', accent: 'rgba(126,184,154,0.12)', iconColor: C.sage },
  { icon: Heart, title: 'Family Portal', desc: 'A beautiful branded room for each family — schedules, invoices, progress, and messaging.', accent: 'rgba(212,165,116,0.12)', iconColor: C.amber },
  { icon: TrendingUp, title: 'Growth Engine', desc: 'Track leads, trial bookings, conversions, and referrals. Sequins actively helps you grow.', accent: 'rgba(196,160,160,0.12)', iconColor: C.rose },
];

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Teacher Studio', href: '#teacher' },
  { label: 'For Studios', href: '#studios' },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const typerText = useTyper([
    'Who needs a check-in this week?',
    'Which classes are at risk of cancellation?',
    'Draft a re-enrollment message for Sofia Kim...',
    'Show me billing gaps for March...',
    'Which trial students haven\'t enrolled yet?',
  ]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (emailInput) setSubmitted(true);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: C.bg, minHeight: '100vh', overflowX: 'hidden', WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Ambient atmosphere (fixed) ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,206,206,0.45) 0%, transparent 65%)', animation: 'sqBreathe 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-8%', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,218,210,0.35) 0%, transparent 65%)', animation: 'sqBreathe 12s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '45%', left: '35%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(164,139,196,0.08) 0%, transparent 65%)', animation: 'sqBreathe 15s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: scrolled ? '14px 44px' : '24px 44px',
        transition: 'all 0.4s ease',
        backgroundColor: scrolled ? 'rgba(253,249,248,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(200,170,160,0.1)' : 'none',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,244,244,0.9))', boxShadow: '0 4px 12px -4px rgba(180,150,140,0.3), inset 0 1px 1px rgba(255,255,255,1)' }}>
              <span style={{ ...etchedText, fontSize: 14, fontWeight: 700 }}>S</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.roseDark, letterSpacing: -0.3 }}>Sequins</span>
          </div>

          <div className="sq-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {NAV_LINKS.map(link => (
              <a key={link.label} href={link.href} style={{ textDecoration: 'none', fontSize: 13, fontWeight: 400, color: C.textFaint, transition: 'color 0.25s' }}
                onMouseEnter={e => e.target.style.color = C.roseDark}
                onMouseLeave={e => e.target.style.color = C.textFaint}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="sq-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to={createPageUrl('Home')}>
              <button style={{ fontSize: 13, fontWeight: 500, color: C.textFaint, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: 10, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = C.roseDark}
                onMouseLeave={e => e.target.style.color = C.textFaint}>
                Sign in
              </button>
            </Link>
            <a href="#waitlist">
              <button style={{ fontSize: 13, fontWeight: 600, color: C.roseDark, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(220,190,190,0.35)', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', boxShadow: '0 2px 12px -4px rgba(180,150,140,0.25)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,1)'; e.target.style.boxShadow = '0 4px 20px -4px rgba(180,150,140,0.3)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.8)'; e.target.style.boxShadow = '0 2px 12px -4px rgba(180,150,140,0.25)'; }}>
                Get Early Access
              </button>
            </a>
          </div>

          <button className="sq-hamburger" onClick={() => setMenuOpen(o => !o)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint }}>
            {menuOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>
        </div>

        {menuOpen && (
          <div style={{ marginTop: 12, maxWidth: 1000, marginLeft: 'auto', marginRight: 'auto', borderRadius: 16, padding: 16, background: 'rgba(255,255,255,0.97)', boxShadow: '0 8px 40px rgba(180,150,140,0.15)', animation: 'sqFadeDown 0.2s ease' }}>
            {NAV_LINKS.map(link => (
              <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
                style={{ display: 'block', padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500, color: C.textFaint, textDecoration: 'none' }}>
                {link.label}
              </a>
            ))}
            <div style={{ paddingTop: 12, borderTop: '1px solid rgba(200,180,170,0.12)', display: 'flex', gap: 8 }}>
              <Link to={createPageUrl('Home')} style={{ flex: 1 }}>
                <button style={{ width: '100%', fontSize: 13, fontWeight: 500, padding: '10px', borderRadius: 10, background: 'rgba(244,206,206,0.2)', color: C.roseDark, border: 'none', cursor: 'pointer' }}>Sign in</button>
              </Link>
              <a href="#waitlist" style={{ flex: 1 }}>
                <button style={{ width: '100%', fontSize: 13, fontWeight: 600, padding: '10px', borderRadius: 10, background: 'linear-gradient(145deg,#f4e8e8,#ede0dc)', color: C.roseDark, border: 'none', cursor: 'pointer' }}>Get Access</button>
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '140px 44px 80px' }}>

        <div style={{ opacity: 0, animation: 'sqFadeUp 0.8s ease 0.1s forwards' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, marginBottom: 32, background: 'rgba(255,255,255,0.7)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,1), 0 2px 12px rgba(180,150,140,0.12)', border: '1px solid rgba(220,190,190,0.2)' }}>
            <Sparkles style={{ width: 13, height: 13, color: C.rose }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.textFaint }}>Dance Studio Operating System</span>
          </div>
        </div>

        <h1 style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.25s forwards', fontSize: 'clamp(52px, 8vw, 100px)', fontWeight: 700, letterSpacing: -3, lineHeight: 0.95, ...etchedText, marginBottom: 28 }}>
          Run your studio<br />
          <span style={{ ...etchedText, opacity: 0.55 }}>without the chaos.</span>
        </h1>

        <p style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.4s forwards', fontSize: 18, fontWeight: 300, color: C.textFaint, maxWidth: 460, lineHeight: 1.75, marginBottom: 40 }}>
          Sequins is the complete platform for dance studios — enrollment, scheduling, billing, and an AI that actively helps you grow.
        </p>

        <div style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.55s forwards', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
          <a href="#waitlist">
            <button style={{ height: 52, padding: '0 36px', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(145deg, rgba(254,247,247,0.95), rgba(252,231,231,0.9))', boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), inset 0 1px 2px rgba(255,255,255,0.8)', border: '1px solid rgba(255,220,210,0.5)', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <span style={etchedText}>Get Early Access <ArrowRight style={{ display: 'inline', width: 15, height: 15, marginLeft: 4 }} /></span>
            </button>
          </a>
          <a href="#features">
            <button style={{ height: 52, padding: '0 36px', borderRadius: 16, fontSize: 15, fontWeight: 400, cursor: 'pointer', background: 'rgba(255,255,255,0.5)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)', border: 'none', color: C.textFaint, transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.75)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}>
              See how it works <ChevronDown style={{ display: 'inline', width: 15, height: 15, marginLeft: 4 }} />
            </button>
          </a>
        </div>

        <div style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.65s forwards', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: C.textFainter, marginBottom: 72 }}>
          <CheckCircle2 style={{ width: 15, height: 15, color: C.sage }} />
          Free 30-day trial · No credit card required
        </div>

        {/* Hero mock – typing prompt */}
        <div style={{ opacity: 0, animation: 'sqFadeUp 1s ease 0.8s forwards', width: '100%', maxWidth: 620 }}>
          <div style={{ borderRadius: 28, padding: '32px 36px', background: 'linear-gradient(145deg, rgba(254,240,240,0.95), rgba(252,235,235,0.9))', boxShadow: '0 40px 80px -20px rgba(180,150,140,0.25), inset 0 2px 12px rgba(180,120,120,0.05)' }}>

            {/* Window dots */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              {[0.4, 0.25, 0.15].map((o, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: `rgba(196,160,160,${o})` }} />
              ))}
            </div>

            {/* Class header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <p style={{ fontSize: 13, color: C.textFaint, marginBottom: 4 }}>6:00 PM · 60 min</p>
              <h2 style={{ fontSize: 32, fontWeight: 700, ...etchedText }}>Ballet Advanced</h2>
              <p style={{ fontSize: 13, color: C.textFaint, marginTop: 4 }}>14 students enrolled</p>
            </div>

            {/* 6-card grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'ATTENDANCE', icon: CheckCircle2 },
                { label: 'ROSTER', icon: Users },
                { label: 'LESSON PLAN', icon: FileText },
                { label: 'MUSIC', icon: Music },
                { label: 'NOTES', icon: Mic },
                { label: 'REQUEST SUB', icon: Calendar },
              ].map(({ label, icon: Icon }, i) => (
                <div key={label} style={{ borderRadius: 16, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.85)', boxShadow: '0 4px 16px -4px rgba(180,150,140,0.1), inset 0 1px 1px rgba(255,255,255,1)', animation: `sqFadeUp 0.5s ease ${0.9 + i * 0.07}s both` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(196,160,160,0.08)' }}>
                    <Icon style={{ width: 15, height: 15, color: C.rose }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textAlign: 'center', color: '#a89890' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Gene typing prompt */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.6)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.08)', border: '1px solid rgba(220,190,190,0.18)' }}>
              <Sparkles style={{ width: 15, height: 15, color: C.rose, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(196,160,160,0.75)', flex: 1, textAlign: 'left' }}>{typerText}</span>
              <span style={{ width: 2, height: 15, background: C.rose, borderRadius: 1, animation: 'sqBlink 1s step-end infinite' }} />
            </div>

          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: 'sqFadeIn 1s ease 1.5s both' }}>
          <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(196,160,160,0.4), transparent)', animation: 'sqScrollLine 2.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(196,160,160,0.4)' }}>Scroll</span>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '120px 44px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Rv y={20}>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(196,160,160,0.5)' }}>Everything you need</span>
            </div>
          </Rv>
          <Rv delay={0.05} y={20}>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 16 }}>
              One platform.<br /><span style={{ ...etchedText, opacity: 0.55 }}>Every workflow.</span>
            </h2>
          </Rv>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 56 }}>
            <RvList
              items={FEATURES}
              stagger={0.09}
              renderItem={(f, i) => (
                <div style={{ borderRadius: 20, padding: 28, background: 'linear-gradient(145deg, rgba(255,255,255,0.7), rgba(255,252,250,0.5))', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 20px -8px rgba(180,150,140,0.12)', transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.7), 0 12px 32px -8px rgba(180,150,140,0.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 20px -8px rgba(180,150,140,0.12)'; }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.accent, marginBottom: 18 }}>
                    <f.icon style={{ width: 18, height: 18, color: f.iconColor }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textFaint }}>{f.desc}</div>
                </div>
              )}
            />
          </div>
        </div>
      </section>

      {/* ── TEACHER STUDIO ── */}
      <section id="teacher" style={{ position: 'relative', zIndex: 1, padding: '120px 44px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ borderRadius: 32, padding: '64px 56px', background: 'linear-gradient(145deg, rgba(254,240,240,0.8), rgba(252,235,235,0.6))', boxShadow: 'inset 0 2px 12px rgba(180,120,120,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 56, alignItems: 'center' }}>

              <div>
                <Rv y={20}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(196,160,160,0.5)', marginBottom: 20 }}>Teacher Studio</div>
                </Rv>
                <Rv delay={0.05} y={20}>
                  <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, lineHeight: 1.05, ...etchedText, marginBottom: 16 }}>
                    Built for teachers.<br />
                    <span style={{ ...etchedText, opacity: 0.55 }}>Loved by studios.</span>
                  </h2>
                </Rv>
                <Rv delay={0.1} y={20}>
                  <p style={{ fontSize: 15, lineHeight: 1.75, color: C.textFaint, marginBottom: 28 }}>
                    A dedicated mobile-first experience for the studio floor. Everything an instructor needs — nothing they don't.
                  </p>
                </Rv>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <RvList
                    items={TEACHER_FEATURES}
                    stagger={0.07}
                    baseDelay={0.15}
                    renderItem={({ icon: Icon, label, color }) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.7)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}>
                        <Icon style={{ width: 14, height: 14, flexShrink: 0, color }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
                      </div>
                    )}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <RvList
                  items={[
                    { name: 'Emma Sullivan', status: 'present', trial: false },
                    { name: 'Sofia Kim', status: 'trial', trial: true },
                    { name: 'Lily Reyes', status: 'present', trial: false },
                    { name: 'Ava Thompson', status: 'late', trial: false },
                  ]}
                  stagger={0.09}
                  baseDelay={0.2}
                  renderItem={(student) => (
                    <div style={{ borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: student.trial ? 'linear-gradient(145deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04))' : 'rgba(255,255,255,0.7)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)', border: student.trial ? '1px solid rgba(251,191,36,0.15)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, background: student.trial ? 'rgba(251,191,36,0.15)' : 'rgba(196,160,160,0.12)', color: student.trial ? '#d97706' : C.rose }}>
                          {student.name[0]}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{student.name}</span>
                        {student.trial && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>Trial</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['Here', 'Out', 'Late'].map(s => {
                          const colorMap = { Here: C.sage, Out: C.amber, Late: C.purple };
                          const statusMap = { Here: 'present', Out: 'absent', Late: 'late' };
                          const isActive = student.status === statusMap[s] || (s === 'Here' && student.status === 'trial');
                          return (
                            <div key={s} style={{ padding: '4px 9px', borderRadius: 8, fontSize: 10, fontWeight: 500, background: isActive ? `${colorMap[s]}22` : 'transparent', color: isActive ? colorMap[s] : '#d4c4ba' }}>{s}</div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                />

                <Rv delay={0.55} y={12}>
                  <div style={{ borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.5)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'linear-gradient(145deg, rgba(196,160,160,0.2), rgba(196,160,160,0.1))', animation: 'sqPulse 2.5s ease-in-out infinite' }}>
                      <Mic style={{ width: 14, height: 14, color: C.rose }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 7, borderRadius: 4, marginBottom: 6, background: 'rgba(196,160,160,0.15)', width: '78%' }} />
                      <div style={{ height: 7, borderRadius: 4, background: 'rgba(196,160,160,0.1)', width: '52%' }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: C.rose }}>Live</span>
                  </div>
                </Rv>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── AI / DATA SECTION ── */}
      <section id="studios" style={{ position: 'relative', zIndex: 1, padding: '120px 44px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 64, alignItems: 'center' }}>

          <div>
            <Rv y={20}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(196,160,160,0.5)', marginBottom: 20 }}>AI Intelligence</div>
            </Rv>
            <Rv delay={0.05} y={20}>
              <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, lineHeight: 1.05, ...etchedText, marginBottom: 16 }}>
                Data that dances.
              </h2>
            </Rv>
            <Rv delay={0.1} y={20}>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: C.textFaint, marginBottom: 28 }}>
                Sequins AI — called Gene by your studio — doesn't just report data. It actively watches your studio and tells you what to do about it.
              </p>
            </Rv>
            <RvList
              baseDelay={0.15}
              stagger={0.07}
              items={[
                'Retention risk alerts before students drop',
                'Revenue gap identification',
                'Trial-to-enrollment conversion nudges',
                'Class demand forecasting',
                'Teacher performance insights',
              ]}
              renderItem={(item) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', fontSize: 14, color: C.text }}>
                  <CheckCircle2 style={{ width: 15, height: 15, flexShrink: 0, color: C.sage }} />
                  {item}
                </div>
              )}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Rv delay={0.1} y={20}>
              <div style={{ borderRadius: 20, padding: 22, background: 'linear-gradient(145deg, rgba(196,160,160,0.1), rgba(196,160,160,0.05))', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Sparkles style={{ width: 14, height: 14, color: C.rose }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: C.rose }}>Gene · Retention Alert</span>
                  <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: C.sage, animation: 'sqPulse 2s ease-in-out infinite' }} />
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: C.text }}>
                  "3 advanced students have missed 2+ consecutive classes. Based on historical patterns, they're at high risk of dropping. I've drafted an outreach message for your review."
                </p>
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <button style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, fontWeight: 600, background: 'rgba(196,160,160,0.15)', color: C.roseDark, border: 'none', cursor: 'pointer' }}>Review Draft</button>
                  <button style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, fontWeight: 400, background: 'none', color: C.textFainter, border: 'none', cursor: 'pointer' }}>Dismiss</button>
                </div>
              </div>
            </Rv>

            <Rv delay={0.2} y={20}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { icon: TrendingUp, value: '+12%', label: 'Attendance up', color: C.sage, bg: 'rgba(126,184,154,0.1)' },
                  { icon: Heart, value: '94%', label: 'Retention rate', color: C.purple, bg: 'rgba(164,139,196,0.1)' },
                ].map(({ icon: Icon, value, label, color, bg }) => (
                  <div key={label} style={{ borderRadius: 20, padding: 20, background: `linear-gradient(145deg, ${bg}, transparent)`, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)' }}>
                    <Icon style={{ width: 18, height: 18, color, marginBottom: 10 }} />
                    <div style={{ fontSize: 30, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color }}>{label}</div>
                  </div>
                ))}
              </div>
            </Rv>
          </div>
        </div>
      </section>

      {/* ── GENE EXECUTION FLOW ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '120px 44px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          <Rv y={20}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 999, marginBottom: 20, background: 'rgba(255,255,255,0.7)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,1), 0 2px 12px rgba(180,150,140,0.1)', border: '1px solid rgba(220,190,190,0.2)' }}>
              <Sparkles style={{ width: 12, height: 12, color: C.rose }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.textFaint }}>Meet Gene</span>
            </div>
          </Rv>
          <Rv delay={0.05} y={20}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, lineHeight: 1.05, ...etchedText, marginBottom: 12 }}>Not just insights. Action.</h2>
          </Rv>
          <Rv delay={0.1} y={20}>
            <p style={{ fontSize: 15, color: C.textFaint, marginBottom: 72 }}>Gene notices a problem, reasons through it, and takes care of it.</p>
          </Rv>

          <div style={{ position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', left: 20, top: 40, bottom: 40, width: 1, background: 'linear-gradient(180deg, rgba(196,160,160,0.25) 0%, rgba(196,160,160,0.04) 100%)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Gene notices', icon: Sparkles, color: C.rose, bg: 'rgba(196,160,160,0.15)', text: 'Lily Reyes has missed 3 consecutive Ballet classes — unusual for her pattern.', delay: 0 },
                { label: 'Gene reasons', icon: BarChart3, color: C.purple, bg: 'rgba(164,139,196,0.15)', text: 'Checks her history, invoice status, and family communication. Finds an overdue balance and no parent contact in 6 weeks.', delay: 0.1 },
                { label: 'Gene acts', icon: CheckCircle2, color: C.sage, bg: 'rgba(126,184,154,0.15)', text: 'Drafts a warm check-in email + a soft billing reminder. Queues both for your one-click approval.', extra: '"Hi Sarah — we\'ve missed Lily in class! Is everything okay? We\'d love to see her back on the floor…"', delay: 0.2 },
                { label: 'You approve in one click', icon: Heart, color: C.amber, bg: 'rgba(212,165,116,0.15)', text: "Lily's mom replies the same day. She re-enrolls for spring. Invoice paid.", badge: 'Student retained', delay: 0.3 },
              ].map(({ label, icon: Icon, color, bg, text, extra, badge, delay }) => (
                <Rv key={label} delay={delay} y={16}>
                  <div style={{ display: 'flex', gap: 20, paddingLeft: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: bg, zIndex: 1, marginTop: 14 }}>
                      <Icon style={{ width: 13, height: 13, color }} />
                    </div>
                    <div style={{ flex: 1, borderRadius: 20, padding: '18px 22px', background: 'rgba(255,255,255,0.82)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 20px -8px rgba(180,150,140,0.12)', marginBottom: 4 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color, marginBottom: 8 }}>{label}</div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: C.text, lineHeight: 1.6 }}>{text}</p>
                      {extra && (
                        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: `rgba(126,184,154,0.08)`, borderLeft: `2px solid rgba(126,184,154,0.3)`, fontSize: 12, fontStyle: 'italic', color: '#7a9e8a', lineHeight: 1.6 }}>
                          {extra}
                        </div>
                      )}
                      {badge && (
                        <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: 'rgba(212,165,116,0.12)', color: '#b8845a' }}>
                          <TrendingUp style={{ width: 12, height: 12 }} /> {badge}
                        </div>
                      )}
                    </div>
                  </div>
                </Rv>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WAITLIST CTA ── */}
      <section id="waitlist" style={{ position: 'relative', zIndex: 1, padding: '120px 44px 160px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <Rv y={30}>
            <div style={{ borderRadius: 32, padding: '72px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, rgba(254,240,240,0.95), rgba(252,232,232,0.9), rgba(250,238,238,0.85))', boxShadow: 'inset 0 2px 12px rgba(180,120,120,0.07), 0 40px 80px -20px rgba(180,150,140,0.2)' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,160,160,0.3) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 700, lineHeight: 1.0, ...etchedText, marginBottom: 16 }}>
                  Ready to elevate<br />your studio?
                </h2>
                <p style={{ fontSize: 15, color: C.textFaint, lineHeight: 1.7, marginBottom: 36 }}>
                  Join studios on the Sequins waitlist. Get early access and 3 months free.
                </p>

                {!submitted ? (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 420, margin: '0 auto' }}>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="your@studio.com"
                      required
                      style={{ flex: '1 1 200px', padding: '13px 18px', borderRadius: 14, fontSize: 14, border: '1px solid rgba(220,190,190,0.3)', background: 'rgba(255,255,255,0.7)', color: C.text, outline: 'none', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}
                    />
                    <button
                      type="submit"
                      style={{ flexShrink: 0, padding: '13px 28px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(145deg, rgba(254,247,247,0.95), rgba(252,231,231,0.9))', boxShadow: '0 6px 20px -4px rgba(180,150,140,0.3), inset 0 1px 2px rgba(255,255,255,0.8)', border: '1px solid rgba(220,190,190,0.4)', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                      <span style={etchedText}>Get Access →</span>
                    </button>
                  </form>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, maxWidth: 360, margin: '0 auto', background: 'rgba(126,184,154,0.12)', animation: 'sqFadeUp 0.4s ease' }}>
                    <CheckCircle2 style={{ width: 18, height: 18, color: C.sage }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#5a7d6a' }}>You're on the list! We'll be in touch soon.</span>
                  </div>
                )}

                <p style={{ fontSize: 12, color: C.textFainter, marginTop: 20 }}>No credit card required · Cancel anytime</p>

                <div style={{ marginTop: 24 }}>
                  <Link to={createPageUrl('Home')}>
                    <button style={{ fontSize: 13, fontWeight: 500, padding: '10px 22px', borderRadius: 12, background: 'rgba(255,255,255,0.5)', color: C.textFaint, border: 'none', cursor: 'pointer', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.75)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}>
                      Go to Dashboard →
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </Rv>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', zIndex: 1, padding: '36px 44px', borderTop: '1px solid rgba(200,180,170,0.1)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,244,244,0.9))', boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)' }}>
              <span style={{ ...etchedText, fontSize: 12, fontWeight: 700 }}>S</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: C.textFaint }}>Sequins</span>
          </div>
          <p style={{ fontSize: 12, color: C.textFainter }}>© 2026 Sequins. Built for dance.</p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy', 'Terms', 'Contact'].map(link => (
              <a key={link} href="#" style={{ fontSize: 12, color: C.textFainter, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = C.roseDark}
                onMouseLeave={e => e.target.style.color = C.textFainter}>{link}</a>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Global keyframes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes sqFadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sqFadeDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sqFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes sqBreathe { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: 0.8; } }
        @keyframes sqScrollLine { 0%,100% { opacity:0.25; transform: scaleY(1); } 50% { opacity:0.8; transform: scaleY(1.2); } }
        @keyframes sqBlink { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes sqPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(196,160,160,0.2); } 50% { box-shadow: 0 0 0 6px rgba(196,160,160,0); } }
        * { margin:0; padding:0; box-sizing:border-box; }
        .sq-nav-links { display: flex; }
        .sq-hamburger { display: none !important; }
        @media (max-width: 680px) {
          .sq-nav-links { display: none !important; }
          .sq-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  );
}