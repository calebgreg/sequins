import React, { useState, useEffect, useRef } from 'react';
import SequinsLogo from '@/components/landing/SequinsLogo';
import {
  Sparkles, ArrowRight, CheckCircle2, ChevronDown,
  Mic, Music, FileText, UserCheck, Calendar, Users, CreditCard,
  TrendingUp, Heart, Menu, X, BarChart3, Smartphone, Star, DollarSign, Bell, MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

// ─── Palette ───
const C = {
  bg: '#fdf9f8',
  rose: '#c4a0a0',
  roseDark: '#8a7070',
  roseMid: '#b5a599',
  text: '#6b5d55',
  textFaint: '#8b7d72',
  textFainter: '#a89890',
  sage: '#7eb89a',
  purple: '#a48bc4',
  amber: '#d4a574',
  blue: '#8cb4c8',
};

const etchedText = {
  color: 'transparent',
  backgroundImage: `linear-gradient(180deg, ${C.rose} 0%, ${C.roseDark} 100%)`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitBoxDecorationBreak: 'clone',
  textShadow: '0 2px 3px rgba(255,255,255,0.7)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
  paddingBottom: '0.15em',
};

// ─── Scroll reveal ───
const useReveal = () => {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
};

const Rv = ({ children, delay = 0, y = 16, style }) => {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : `translateY(${y}px)`, transition: `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s`, ...style }}>
      {children}
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

// ─── Shared divider ───
const Dv = () => <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(196,160,160,0.12), transparent)', margin: '0 44px' }} />;

// ─── Label ───
const SEQUINS_IMG = "url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0745a12ebbb83d6190412/d0c8e354b_ChatGPTImageFeb242026at10_46_54AM.png')";
const seqLabelText = {
  color: 'transparent',
  backgroundImage: SEQUINS_IMG,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const SecLabel = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20, ...seqLabelText }}>{children}</div>
);

export default function Landing() {
  const [page, setPage] = useState('home');
  const [scrolled, setScrolled] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(true);

  const typerText = useTyper([
    'Who needs a check-in this week?',
    'Which classes are at risk of cancellation?',
    'Draft a re-enrollment note for Ava Mercer...',
    'Show me billing gaps for March...',
    'Which trial students haven\'t enrolled yet?',
  ]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const showPage = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'instant' }); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (emailInput) setSubmitted(true);
  };

  const WaitlistInput = ({ id }) => (
    <div>
      {!submitted ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 420, margin: '0 auto' }}>
          <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="your@studio.com" required
            style={{ flex: '1 1 200px', padding: '13px 18px', borderRadius: 14, fontSize: 14, border: '1px solid rgba(220,190,190,0.3)', background: 'rgba(255,255,255,0.7)', color: C.text, outline: 'none', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }} />
          <button type="submit" style={{ flexShrink: 0, padding: '13px 28px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(145deg, rgba(254,247,247,0.95), rgba(252,231,231,0.9))', boxShadow: '0 6px 20px -4px rgba(180,150,140,0.3)', border: '1px solid rgba(220,190,190,0.4)', transition: 'all 0.2s' }}>
            <span style={etchedText}>Get Access →</span>
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, maxWidth: 360, margin: '0 auto', background: 'rgba(126,184,154,0.12)' }}>
          <CheckCircle2 style={{ width: 18, height: 18, color: C.sage }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#5a7d6a' }}>You're on the list! We'll be in touch soon.</span>
        </div>
      )}
      <p style={{ fontSize: 12, color: C.textFainter, marginTop: 16, textAlign: 'center' }}>No credit card required · Cancel anytime</p>
    </div>
  );

  const sec = { padding: '140px 44px', maxWidth: 820, margin: '0 auto' };
  const secWide = { ...sec, maxWidth: 1060 };

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: C.bg, minHeight: '100vh', overflowX: 'hidden', WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Atmosphere ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,206,206,0.4) 0%, transparent 65%)', animation: 'sqBreathe 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-8%', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,218,210,0.3) 0%, transparent 65%)', animation: 'sqBreathe 13s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(164,139,196,0.06) 0%, transparent 65%)', animation: 'sqBreathe 16s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.022, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* ── Nav ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: scrolled ? '14px 44px' : '26px 44px', transition: 'all 0.4s', backgroundColor: scrolled ? 'rgba(253,249,248,0.9)' : 'transparent', backdropFilter: scrolled ? 'blur(24px)' : 'none', borderBottom: scrolled ? '1px solid rgba(200,170,160,0.1)' : 'none' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span onClick={() => showPage('home')} style={{ cursor: 'pointer' }}>
            <SequinsLogo size="sm" />
          </span>

          <div className="sq-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {[['product', 'Product'], ['pricing', 'Pricing'], ['company', 'Company']].map(([id, label]) => (
              <a key={id} onClick={() => showPage(id)} style={{ textDecoration: 'none', fontSize: 13, fontWeight: 400, color: page === id ? C.roseDark : C.textFaint, transition: 'color 0.25s', cursor: 'pointer' }}>{label}</a>
            ))}
            <a onClick={() => showPage('access')} style={{
              textDecoration: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: 'transparent',
              backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0745a12ebbb83d6190412/d0c8e354b_ChatGPTImageFeb242026at10_46_54AM.png')`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}>Get Access</a>
          </div>

          <button className="sq-hamburger" onClick={() => setMobileMenuOpen(o => !o)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, padding: '10px', margin: '-10px' }}>
            {mobileMenuOpen ? <X style={{ width: 24, height: 24 }} /> : <Menu style={{ width: 24, height: 24 }} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(253,249,248,0.97)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(200,170,160,0.1)' }}>
            {[['product', 'Product'], ['pricing', 'Pricing'], ['company', 'Company']].map(([id, label]) => (
              <a key={id} onClick={() => { showPage(id); setMobileMenuOpen(false); }} style={{ padding: '20px 28px', fontSize: 16, fontWeight: 400, color: page === id ? C.roseDark : C.textFaint, cursor: 'pointer', borderBottom: '1px solid rgba(200,170,160,0.08)', display: 'block' }}>{label}</a>
            ))}
            <a onClick={() => { showPage('access'); setMobileMenuOpen(false); }} style={{ padding: '20px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'block', color: 'transparent', backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0745a12ebbb83d6190412/d0c8e354b_ChatGPTImageFeb242026at10_46_54AM.png')`, backgroundClip: 'text', WebkitBackgroundClip: 'text', backgroundSize: 'cover' }}>Get Access</a>
          </div>
        )}
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ════════════ HOME ════════════ */}
        {page === 'home' && (
          <div>
            {/* Hero */}
            <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '140px 44px 80px', position: 'relative' }}>

              <div style={{ opacity: 0, animation: 'sqFadeUp 0.8s ease 0.1s forwards' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 999, marginBottom: 32 }}>
                  <Sparkles style={{ width: 12, height: 12, color: C.rose }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', ...seqLabelText }}>Dance Studio Operating System</span>
                </div>
              </div>

              <h1 style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.2s forwards', fontSize: 'clamp(52px,8vw,100px)', fontWeight: 700, letterSpacing: -3, lineHeight: 0.95, ...etchedText, marginBottom: 24, maxWidth: 800 }}>
                Run your studio<br />
                <span style={{ ...etchedText, opacity: 0.5 }}>without the chaos.</span>
              </h1>

              <p style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.35s forwards', fontSize: 18, fontWeight: 300, color: C.textFaint, maxWidth: 460, lineHeight: 1.75, marginBottom: 44 }}>
                Sequins is the complete operating system for dance studios, from enrollment and scheduling to billing and AI-powered growth.
              </p>

              <div style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.5s forwards', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 72 }}>
                <button onClick={() => showPage('access')} style={{ height: 52, padding: '0 36px', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(145deg, rgba(254,247,247,0.95), rgba(252,231,231,0.9))', boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), inset 0 1px 2px rgba(255,255,255,0.8)', border: '1px solid rgba(255,220,210,0.5)', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  <span style={etchedText}>Book a Demo <ArrowRight style={{ display: 'inline', width: 15, height: 15, marginLeft: 4 }} /></span>
                </button>
                <button onClick={() => showPage('product')} style={{ height: 52, padding: '0 36px', borderRadius: 16, fontSize: 15, fontWeight: 400, cursor: 'pointer', background: 'rgba(255,255,255,0.5)', border: 'none', color: C.textFaint, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}>
                  See how it works <ChevronDown style={{ display: 'inline', width: 15, height: 15, marginLeft: 4 }} />
                </button>
              </div>

              {/* Scroll indicator */}
              <div style={{ position: 'absolute', bottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0, animation: 'sqFadeIn 1s ease 1.4s forwards' }}>
                <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(196,160,160,0.4), transparent)', animation: 'sqScrollLine 2.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(196,160,160,0.35)' }}>Scroll</span>
              </div>
            </section>

            <Dv />

            {/* Problem */}
            <section style={sec}>
              <Rv><SecLabel>The problem</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 48 }}>
                  Studios run on passion.<br />
                  <span style={{ ...etchedText, opacity: 0.5 }}>Not spreadsheets.</span>
                </h2>
              </Rv>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {[
                  ['Billing is a nightmare of missed payments and manual invoices.', 'Sequins automates it.'],
                  ['Teachers waste class time on attendance and admin.', 'Sequins puts everything on the studio floor.'],
                  ['You lose students before you know they\'re at risk.', 'Gene tells you before they drop.'],
                  ['Families are left in the dark on schedules and progress.', 'Sequins gives them their own room.'],
                ].map(([problem, answer], i) => (
                  <Rv key={i} delay={i * 0.07}>
                    <div style={{ paddingLeft: 22, borderLeft: '2px solid rgba(196,160,160,0.15)' }}>
                      <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.7 }}>
                        <span style={{ textDecoration: 'line-through', textDecorationColor: 'rgba(196,100,100,0.25)', color: 'rgba(180,150,140,0.5)' }}>{problem}</span>{' '}
                        <span style={{ color: C.text, fontWeight: 500 }}>{answer}</span>
                      </p>
                    </div>
                  </Rv>
                ))}
              </div>
            </section>

            <Dv />

            {/* Gene teaser */}
            <section style={sec}>
              <Rv><SecLabel>Meet Gene</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 20 }}>
                  Your studio's<br /><em style={{ fontStyle: 'italic', ...etchedText }}>AI that acts.</em>
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, marginBottom: 56, maxWidth: 520 }}>
                  Gene doesn't hand you reports. It watches your studio, spots problems, and handles them: drafting messages, flagging billing gaps, and nudging at-risk families before they disappear.
                </p>
              </Rv>
              <Rv delay={0.15}>
                {/* Gene chat moment */}
                <div style={{ paddingLeft: 22, borderLeft: '2px solid rgba(196,160,160,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.sage, animation: 'sqPulse 2s ease-in-out infinite' }} />
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(196,160,160,0.55)' }}>Gene · Just now</span>
                  </div>
                  <p style={{ fontSize: 16, color: C.text, lineHeight: 1.75, maxWidth: 540, marginBottom: 18 }}>
                    Chloe Navarro has missed 3 consecutive Ballet classes and has an overdue invoice. Based on your studio's history, she's at high risk of not re-enrolling. I've drafted a personal check-in for your review.
                  </p>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.sage, cursor: 'pointer' }}>Review draft</span>
                    <span style={{ color: 'rgba(196,160,160,0.3)' }}>·</span>
                    <span style={{ fontSize: 14, color: C.textFaint, cursor: 'pointer' }}>View profile</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(196,160,160,0.4)', marginTop: 10 }}>If she declines → escalate to phone call prompt</p>
                </div>
              </Rv>
            </section>

            <Dv />

            {/* CTA */}
            <section style={{ padding: '160px 44px', textAlign: 'center' }}>
              <Rv>
                <h2 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 700, letterSpacing: -1, lineHeight: 1.3, ...etchedText, marginBottom: 20, paddingBottom: 8 }}>
                  Stop managing.<br /><em style={{ fontStyle: 'italic' }}>Start growing.</em>
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, maxWidth: 420, margin: '0 auto 48px' }}>
                  For dance studios ready to do more with less.
                </p>
              </Rv>
              <Rv delay={0.15}><WaitlistInput id="home" /></Rv>
            </section>
          </div>
        )}

        {/* ════════════ PRODUCT ════════════ */}
        {page === 'product' && (
          <div>
            <section style={{ ...sec, paddingTop: 180 }}>
              <Rv><SecLabel>The platform</SecLabel></Rv>
              <Rv delay={0.05}>
                <h1 style={{ fontSize: 'clamp(40px,6vw,72px)', fontWeight: 700, letterSpacing: -2, lineHeight: 0.95, ...etchedText, marginBottom: 20 }}>
                  One brain.<br /><em style={{ fontStyle: 'italic', ...etchedText, opacity: 0.6 }}>Every workflow.</em>
                </h1>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, maxWidth: 520 }}>
                  Sequins isn't a bundle of features bolted together. It's a single platform where scheduling, billing, family communication, and AI all share context and work together.
                </p>
              </Rv>
            </section>
            <Dv />

            {/* Teacher Studio flow */}
            <section style={sec}>
              <Rv><SecLabel>Teacher Studio</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 16 }}>
                  The studio floor, in your pocket.
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, marginBottom: 56 }}>A dedicated mobile-first teacher experience. Everything needed to run class, nothing else.</p>
              </Rv>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { time: 'Class starts', event: 'Teacher opens Ballet Advanced', meta: '14 students · Room B · 60 min', type: 'neutral' },
                  { time: '2 min in', event: 'Zoe Patel marked as Trial — dossier surfaces automatically', meta: 'Interests: Ballet · Parent: priya@patel.com · 2nd visit', type: 'gold' },
                  { time: '5 min in', event: 'Attendance locked. 12 present, 1 absent, 1 late.', meta: 'Absence auto-flagged for makeup scheduling', type: 'sage' },
                  { time: 'After class', event: 'Voice note: "Isla is ready to level up to pointe"', meta: 'Transcribed · Tagged as progress note · Saved to Isla\'s profile', type: 'purple' },
                  { time: 'Sub needed', event: 'Sub request sent. Gene suggests 3 qualified teachers.', meta: 'Matched by style, availability, and room familiarity', type: 'neutral' },
                ].map(({ time, event, meta, type }, i) => (
                  <Rv key={i} delay={i * 0.08}>
                    <div style={{ display: 'flex', gap: 20, padding: '16px 0' }}>
                      <div style={{ fontSize: 11, color: C.textFainter, width: 72, flexShrink: 0, paddingTop: 3, textAlign: 'right' }}>{time}</div>
                      <div style={{ flex: 1, paddingLeft: 20, borderLeft: `2px solid ${type === 'gold' ? 'rgba(212,165,116,0.35)' : type === 'sage' ? 'rgba(126,184,154,0.25)' : type === 'purple' ? 'rgba(164,139,196,0.25)' : 'rgba(196,160,160,0.15)'}` }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: type === 'gold' ? C.amber : type === 'sage' ? C.sage : type === 'purple' ? C.purple : C.text, marginBottom: 3 }}>{event}</div>
                        <div style={{ fontSize: 12, color: C.textFainter }}>{meta}</div>
                      </div>
                    </div>
                  </Rv>
                ))}
              </div>
            </section>
            <Dv />

            {/* Billing flow */}
            <section style={sec}>
              <Rv><SecLabel>Automated Billing</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 16 }}>
                  Billing that runs itself.
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, marginBottom: 56 }}>Set up once. Sequins handles tuition plans, sibling discounts, autopay, and overdue follow-ups automatically.</p>
              </Rv>
              {/* Billing mock UI */}
              <Rv delay={0.15}>
                <div style={{ paddingLeft: 22, borderLeft: '2px solid rgba(196,160,160,0.15)' }}>

                  {/* Invoice line items */}
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: C.textFainter, marginBottom: 16 }}>March Invoice · Holloway Family</div>
                    {[
                      { label: 'Ballet Advanced · Juno', amount: '$120', note: 'Monthly plan' },
                      { label: 'Hip Hop Beginner · Wren', amount: '$95', note: 'Monthly plan' },
                      { label: 'Sibling discount', amount: '−$20', note: 'Auto-applied', color: C.sage },
                    ].map(({ label, amount, note, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid rgba(196,160,160,0.08)' }}>
                        <div>
                          <span style={{ fontSize: 14, color: C.text }}>{label}</span>
                          <span style={{ fontSize: 11, color: C.textFainter, marginLeft: 10 }}>{note}</span>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: color || C.text }}>{amount}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 0' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Total due</span>
                      <span style={{ fontSize: 20, fontWeight: 700, ...etchedText }}>$195</span>
                    </div>
                  </div>

                  {/* Gene billing nudge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.6)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}>
                    <Sparkles style={{ width: 14, height: 14, color: C.rose, flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: C.rose, marginBottom: 6 }}>Gene · Billing Alert</div>
                      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>Marco Delgado has been overdue since January ($185). I've queued a gentle payment reminder alongside his family's check-in message. Want to send both together?</p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.sage, cursor: 'pointer' }}>Send together</span>
                        <span style={{ fontSize: 13, color: C.textFainter, cursor: 'pointer' }}>Send separately</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Rv>
            </section>
            <Dv />

            {/* Schedule flow */}
            <section style={sec}>
              <Rv><SecLabel>Smart Scheduling</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 16 }}>
                  A schedule that thinks ahead.
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, marginBottom: 56 }}>Conflict detection, room management, teacher availability, and sub assignments. All connected.</p>
              </Rv>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  ['Monday', [{ title: 'Ballet Beginner', time: '4:00 PM', room: 'Studio A', teacher: 'Ms. Chen', students: 8, color: C.rose }]],
                  ['Tuesday', [
                    { title: 'Jazz Intermediate', time: '5:30 PM', room: 'Studio B', teacher: 'Ms. Okafor', students: 11, color: C.purple },
                    { title: 'Hip Hop Advanced', time: '6:30 PM', room: 'Studio A', teacher: 'Mr. Reyes', students: 9, color: C.blue },
                  ]],
                  ['Wednesday', [
                    { title: 'Ballet Advanced', time: '6:00 PM', room: 'Studio A', teacher: 'Ms. Chen', students: 14, color: C.rose, conflict: true },
                  ]],
                ].map(([day, classes]) => (
                  <Rv key={day} delay={0.08}>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div style={{ fontSize: 11, color: C.textFainter, width: 80, flexShrink: 0, paddingTop: 16, textAlign: 'right' }}>{day}</div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
                        {classes.map(cls => (
                          <div key={cls.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderRadius: 14, borderLeft: `3px solid ${cls.color}`, background: 'rgba(255,255,255,0.65)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{cls.title}</div>
                              <div style={{ fontSize: 11, color: C.textFainter }}>{cls.time} · {cls.room} · {cls.teacher}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, color: C.textFainter }}>{cls.students} students</span>
                              {cls.conflict && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, background: 'rgba(212,165,116,0.15)', color: C.amber }}>Sub needed</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Rv>
                ))}
              </div>
            </section>
            <Dv />

            {/* Family Portal flow */}
            <section style={sec}>
              <Rv><SecLabel>Family Portal</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 16 }}>
                  A room of their own.
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, marginBottom: 56 }}>Every family gets a beautiful, branded space: schedule, invoices, student progress, and a direct line to the studio.</p>
              </Rv>
              <Rv delay={0.15}>
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    { icon: Calendar, label: 'Juno\'s schedule this week', value: 'Ballet Mon · Hip Hop Thu', color: C.rose },
                    { icon: DollarSign, label: 'March invoice', value: '$195 · Due March 1 · Auto-pay on', color: C.sage },
                    { icon: TrendingUp, label: 'Juno\'s progress', value: '"Ready to move to pointe" — Ms. Chen', color: C.purple },
                    { icon: MessageSquare, label: 'Message from studio', value: 'Spring recital costumes due April 5th', color: C.amber },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.7)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${color}18` }}>
                        <Icon style={{ width: 16, height: 16, color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.textFainter, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Rv>
            </section>
            <Dv />

            {/* Growth engine flow */}
            <section style={sec}>
              <Rv><SecLabel>Growth Engine</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 16 }}>
                  Sequins grows with you.
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, marginBottom: 56 }}>From the first inquiry to re-enrollment, Gene tracks every lead and nudges at every right moment.</p>
              </Rv>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                {[
                  { stage: 'Lead', name: 'Trial booking — Sofia Kim, 8yo, Ballet interest', meta: 'Came from Instagram · Parent: sarah@kim.com', color: C.amber },
                  { stage: 'Trial', name: 'Sofia attended Ballet Beginner — trial dossier created', meta: '"Excellent natural turnout. Strong candidate for Intermediate." — Ms. Sarah', color: C.rose },
                  { stage: 'Gene', name: 'Re-enrollment nudge sent to Sarah Kim — day 3 post-trial', meta: '"Sofia had a great class! Here\'s how to enroll for spring…"', color: C.sage, gene: true },
                  { stage: 'Enrolled', name: 'Sofia enrolled in Ballet Advanced + Hip Hop', meta: 'Auto-pay set up · $215/month · Sibling discount applied', color: C.purple },
                  { stage: 'Referral', name: 'Sarah Kim referred Emma Thompson', meta: 'Referral credit applied automatically', color: C.blue },
                ].map(({ stage, name, meta, color, gene }, i) => (
                  <React.Fragment key={i}>
                    <Rv delay={i * 0.07} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0 14px 0' }}>
                        <div style={{ minWidth: 70, textAlign: 'right', paddingTop: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: gene ? C.sage : color, padding: '3px 8px', borderRadius: 6, background: `${gene ? C.sage : color}14` }}>{stage}</span>
                        </div>
                        <div style={{ flex: 1, paddingLeft: 18, borderLeft: `2px solid ${color}30` }}>
                          <div style={{ fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 4 }}>{name}</div>
                          <div style={{ fontSize: 12, color: C.textFainter, fontStyle: gene ? 'italic' : 'normal' }}>{meta}</div>
                        </div>
                      </div>
                    </Rv>
                    {i < 4 && <div style={{ width: 2, height: 12, marginLeft: 87, background: `${color}20` }} />}
                  </React.Fragment>
                ))}
              </div>
            </section>
            <Dv />

            <section style={{ padding: '160px 44px', textAlign: 'center' }}>
              <Rv>
                <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 20 }}>
                  Ready to see it<br /><em style={{ fontStyle: 'italic' }}>in your studio?</em>
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, maxWidth: 420, margin: '0 auto 48px' }}>For dance studios ready to leave the chaos behind.</p>
              </Rv>
              <Rv delay={0.15}><WaitlistInput id="product" /></Rv>
            </section>
          </div>
        )}

        {/* ════════════ COMPANY ════════════ */}
        {page === 'company' && (
          <div>
            <section style={{ ...sec, paddingTop: 180 }}>
              <Rv><SecLabel>Our story</SecLabel></Rv>
              <Rv delay={0.05}>
                <h1 style={{ fontSize: 'clamp(40px,6vw,68px)', fontWeight: 700, letterSpacing: -2, lineHeight: 0.95, ...etchedText, marginBottom: 40 }}>
                  Built by people who<br /><em style={{ fontStyle: 'italic', ...etchedText, opacity: 0.7 }}>love the craft.</em>
                </h1>
              </Rv>
            </section>
            <Dv />
            <section style={sec}>
              <Rv>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {[
                    'Dance studios are run by deeply passionate people. Teachers turned owners who built something out of love, not business school.',
                    'But the admin side is brutal. Billing chases, attendance spreadsheets, parent emails at midnight, scheduling puzzles. Every hour on that is an hour not in the studio.',
                    'Sequins exists to give that time back. Not with more dashboards. A platform that actually runs in the background and surfaces only what needs a human decision.',
                  ].map((p, i) => (
                    <Rv key={i} delay={i * 0.08}>
                      <p style={{ fontSize: 17, fontWeight: 300, color: i < 2 ? C.textFaint : 'rgba(126,184,154,0.75)', lineHeight: 1.8 }}>{p}</p>
                    </Rv>
                  ))}
                </div>
              </Rv>
            </section>
            <Dv />
            <section style={sec}>
              <Rv><SecLabel>Principles</SecLabel></Rv>
              <Rv delay={0.05}><h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 48 }}>How Sequins <em style={{ fontStyle: 'italic' }}>thinks.</em></h2></Rv>
              {[
                ['Ambient, not demanding', 'No dashboard overload. Information surfaces through context. What you need to know, right when you need it.'],
                ['Human in the loop', 'Gene plans, drafts, and flags. But you always make the call. Action with oversight, not automation without consent.'],
                ['Built for the floor', 'The teacher experience comes first. If it doesn\'t work at 6pm on a Wednesday in a ballet studio, it doesn\'t ship.'],
                ['One platform', 'Scheduling, billing, families, and growth share full context. Nothing falls through the cracks between disconnected tools.'],
              ].map(([title, desc], i) => (
                <Rv key={i} delay={i * 0.07}>
                  <div style={{ padding: '28px 0 28px 22px', borderLeft: '2px solid rgba(196,160,160,0.12)', marginBottom: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>{title}</div>
                    <div style={{ fontSize: 14, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, maxWidth: 480 }}>{desc}</div>
                  </div>
                </Rv>
              ))}
            </section>
            <Dv />
            <section style={{ padding: '160px 44px', textAlign: 'center' }}>
              <Rv>
                <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.0, ...etchedText, marginBottom: 20 }}>
                  Want to build the future of<br /><em style={{ fontStyle: 'italic' }}>dance education?</em>
                </h2>
              </Rv>
              <Rv delay={0.1}><p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, maxWidth: 420, margin: '0 auto 48px' }}>We're a small team. We move fast. We love dance studios.</p></Rv>
              <Rv delay={0.15}><WaitlistInput id="company" /></Rv>
            </section>
          </div>
        )}

        {/* ════════════ PRICING ════════════ */}
        {page === 'pricing' && (() => {
          const annual = annualBilling;
          const setAnnual = setAnnualBilling;
          const SEQUINS_IMG = "url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0745a12ebbb83d6190412/d0c8e354b_ChatGPTImageFeb242026at10_46_54AM.png')";
          const seqText = {
            color: 'transparent',
            backgroundImage: SEQUINS_IMG,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          };
          const plans = [
            { tier: 'starting', students: '< 100', monthly: '$65', annual: '$50' },
            { tier: 'growing', students: '101 – 500', monthly: '$125', annual: '$100' },
            { tier: 'grown',   students: '> 501',    monthly: '$215', annual: '$185' },
          ];
          return (
            <div>
              <section style={{ ...sec, paddingTop: 180, textAlign: 'center' }}>
                <Rv><SecLabel>Pricing</SecLabel></Rv>
                <Rv delay={0.05}>
                  <h1 style={{ fontSize: 'clamp(40px,6vw,68px)', fontWeight: 700, letterSpacing: -2, lineHeight: 0.95, ...etchedText, marginBottom: 16 }}>
                    Simple pricing.<br /><em style={{ fontStyle: 'italic', ...etchedText, opacity: 0.6 }}>No surprises.</em>
                  </h1>
                </Rv>
                <Rv delay={0.1}>
                  <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, maxWidth: 420, margin: '0 auto 40px' }}>
                    One plan per studio size. Everything included.
                  </p>
                </Rv>

                {/* Toggle */}
                <Rv delay={0.15}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(220,215,225,0.4)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)' }}>
                    <span style={{ fontSize: 13, fontWeight: annual ? 600 : 300, ...( annual ? seqText : { color: '#b0bad0' }) }}>annual</span>
                    <div onClick={() => setAnnual(a => !a)} style={{ width: 44, height: 24, borderRadius: 999, background: annual ? 'rgba(220,210,230,0.5)' : 'rgba(200,210,220,0.4)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', border: '1px solid rgba(220,215,225,0.4)' }}>
                      <div style={{ position: 'absolute', top: 3, left: annual ? 3 : 19, width: 16, height: 16, borderRadius: '50%', background: annual ? 'rgba(210,185,200,0.9)' : 'rgba(180,195,215,0.9)', transition: 'left 0.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: annual ? 300 : 600, ...(!annual ? seqText : { color: '#b0bad0' }) }}>monthly</span>
                    {annual && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#b0bad0' }}>save ~20%</span>
                    )}
                  </div>
                </Rv>
              </section>
              <Dv />

              <section style={{ ...secWide, paddingTop: 80, paddingBottom: 80 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                  {plans.map(({ tier, students, monthly, annual: annualPrice }, i) => (
                    <Rv key={tier} delay={i * 0.08}>
                      <div style={{
                        borderRadius: 24,
                        padding: '40px 32px',
                        background: 'rgba(255,255,255,0.75)',
                        boxShadow: '0 4px 24px -4px rgba(196,160,160,0.1), inset 0 1px 1px rgba(255,255,255,0.9)',
                        border: '1px solid rgba(230,210,215,0.35)',
                        backdropFilter: 'blur(12px)',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 28, ...etchedText }}>{tier}</div>
                        <div style={{ marginBottom: 28, padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(220,215,225,0.3)' }}>
                          <span style={{ fontSize: 28, fontWeight: 300, letterSpacing: -1, ...seqText }}>{students}</span>
                          <div style={{ fontSize: 12, color: '#b0bad0', fontWeight: 300, marginTop: 4 }}>students</div>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, padding: '10px 26px', borderRadius: 999, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(220,215,225,0.4)', marginBottom: 36 }}>
                          <span style={{ fontSize: 20, fontWeight: 600, ...seqText }}>{annual ? annualPrice : monthly}</span>
                          <span style={{ fontSize: 12, color: '#b0bad0', fontWeight: 300 }}>/ month</span>
                        </div>
                        <button onClick={() => showPage('access')} style={{ width: '100%', padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(196,160,160,0.25)', color: C.textFaint, transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(196,160,160,0.4)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(196,160,160,0.25)'; }}>
                          Book a Demo →
                        </button>
                      </div>
                    </Rv>
                  ))}
                </div>
              </section>
              <Dv />
              <section style={{ padding: '100px 44px', textAlign: 'center' }}>
                <Rv>
                  <p style={{ fontSize: 13, color: 'rgba(180,160,175,0.5)', lineHeight: 1.75, fontWeight: 300 }}>
                    All plans include a free onboarding session. No credit card required to start.
                  </p>
                </Rv>
              </section>
            </div>
          );
        })()}

        {/* ════════════ ACCESS ════════════ */}
        {page === 'access' && (
          <div>
            <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 44px' }}>
              <Rv><SecLabel>Book a demo</SecLabel></Rv>
              <Rv delay={0.05}>
                <h1 style={{ fontSize: 'clamp(40px,6vw,68px)', fontWeight: 700, letterSpacing: -2, lineHeight: 0.95, ...etchedText, marginBottom: 20, maxWidth: 600 }}>
                  See Sequins<br /><em style={{ fontStyle: 'italic', ...etchedText, opacity: 0.6 }}>in your studio.</em>
                </h1>
              </Rv>
              <Rv delay={0.1}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.75, maxWidth: 400, margin: '0 auto 48px' }}>
                  Drop your email and we'll be in touch to schedule a walkthrough.
                </p>
              </Rv>
              <Rv delay={0.15} style={{ maxWidth: 460, width: '90%' }}><WaitlistInput id="access" /></Rv>
            </section>
          </div>
        )}

        {/* Footer */}
        <footer style={{ padding: '36px 44px', borderTop: '1px solid rgba(200,180,170,0.1)' }}>
          <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <SequinsLogo size="sm" />
            <p style={{ fontSize: 12, color: C.textFainter }}>© 2026 Sequins. Built for dance.</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {[['product', 'Product'], ['pricing', 'Pricing'], ['company', 'Company'], [null, 'Privacy'], [null, 'Terms']].map(([id, label], i) => (
                <a key={i} onClick={id ? () => showPage(id) : undefined} style={{ fontSize: 12, color: C.textFainter, textDecoration: 'none', cursor: id ? 'pointer' : 'default', transition: 'color 0.2s' }}
                  onMouseEnter={e => { if (id) e.target.style.color = C.roseDark; }}
                  onMouseLeave={e => { if (id) e.target.style.color = C.textFainter; }}>{label}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@900&display=swap');
        @keyframes sqFadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sqFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes sqBreathe { 0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:0.8} }
        @keyframes sqScrollLine { 0%,100%{opacity:0.25;transform:scaleY(1)}50%{opacity:0.8;transform:scaleY(1.2)} }
        @keyframes sqPulse { 0%,100%{box-shadow:0 0 0 0 rgba(126,184,154,0.3)}50%{box-shadow:0 0 0 5px rgba(126,184,154,0)} }
        * { margin:0; padding:0; box-sizing:border-box; }
        .sq-nav-links { display: flex; }
        .sq-hamburger { display: none !important; }
        @media (max-width:680px) {
          .sq-nav-links { display:none!important; }
          .sq-hamburger { display:flex!important; }
        }
      `}</style>
    </div>
  );
}