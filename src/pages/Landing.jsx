import React, { useState, useEffect, useRef } from 'react';
import SequinsLogo from '@/components/landing/SequinsLogo';
import BookDemoForm from '@/components/landing/BookDemoForm';
import { base44 } from '@/api/base44Client';
import {
  Sparkles, ArrowRight, CheckCircle2, ChevronDown,
  Calendar, DollarSign, TrendingUp, MessageSquare, Menu, X
} from 'lucide-react';

// ─── Dark stage palette ───
const C = {
  bg: '#1c1418',
  rose: '#e8b4b8',
  roseBright: '#f4cece',
  roseDark: '#c98f96',
  text: '#f0e4e6',
  textFaint: '#c9b2b8',
  textFainter: '#8f767e',
  sage: '#8fd4ae',
  purple: '#c4a8e8',
  amber: '#e8c498',
  blue: '#a8ccdf',
};

// ─── Sequins ───
const SEQUINS_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0745a12ebbb83d6190412/d0c8e354b_ChatGPTImageFeb242026at10_46_54AM.png';
const SEQUINS_SIZE = '80px';

const etchedText = {
  color: 'transparent',
  backgroundImage: `linear-gradient(180deg, ${C.roseBright} 0%, ${C.rose} 100%)`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitBoxDecorationBreak: 'clone',
  paddingBottom: '0.15em',
};

const seqFill = {
  color: 'transparent',
  backgroundImage: `url('${SEQUINS_URL}')`,
  backgroundSize: SEQUINS_SIZE,
  backgroundPosition: 'center',
  backgroundRepeat: 'repeat',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  paddingBottom: '0.12em',
};

const serifSeq = {
  fontFamily: "'Playfair Display', serif",
  fontWeight: 900,
  ...seqFill,
  filter: 'drop-shadow(0 3px 16px rgba(244,206,206,0.22))',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.045)',
  border: '1px solid rgba(232,180,184,0.14)',
  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
  backdropFilter: 'blur(12px)',
};

const pinkButton = {
  background: 'linear-gradient(145deg, #d99aa2, #c9848f)',
  color: '#2a1a1e',
  border: '1px solid rgba(244,206,206,0.35)',
  boxShadow: '0 8px 28px -6px rgba(217,154,162,0.45), inset 0 1px 1px rgba(255,255,255,0.35)',
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

const Rv = ({ children, delay = 0, y = 20, style }) => {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : `translateY(${y}px)`, transition: `opacity 0.85s ease ${delay}s, transform 0.85s ease ${delay}s`, ...style }}>
      {children}
    </div>
  );
};

const WaitlistInput = ({ id }) => {
  const [emailInput, setEmailInput] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput) return;
    setLoading(true);
    setError(false);
    try {
      const res = await base44.functions.invoke('submitWaitlist', { email: emailInput, source: id });
      if (res.data.success) {
        setSubmitted(true);
      } else {
        setError(true);
      }
    } catch (error) {
      console.error('Error submitting waitlist:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!submitted ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 440, margin: '0 auto' }}>
          <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="your@studio.com" required
            style={{ flex: '1 1 200px', padding: '14px 18px', borderRadius: 14, fontSize: 14, border: error ? '1px solid #e77' : '1px solid rgba(232,180,184,0.25)', background: 'rgba(255,255,255,0.06)', color: C.text, outline: 'none' }} />
          <button type="submit" disabled={loading} style={{ flexShrink: 0, padding: '14px 28px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: loading ? 0.6 : 1, ...pinkButton }}>
            {loading ? 'Submitting...' : 'Get Access →'}
          </button>
          {error && <span style={{ fontSize: 12, color: '#e77', width: '100%', textAlign: 'center' }}>Something went wrong. Please try again.</span>}
        </form>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, maxWidth: 380, margin: '0 auto', background: 'rgba(143,212,174,0.1)', border: '1px solid rgba(143,212,174,0.2)' }}>
          <CheckCircle2 style={{ width: 18, height: 18, color: C.sage }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: C.sage }}>You're on the list! We'll be in touch soon.</span>
        </div>
      )}
      <p style={{ fontSize: 12, color: C.textFainter, marginTop: 16, textAlign: 'center' }}>No credit card required · Cancel anytime</p>
    </div>
  );
};

// ─── Spotlight cones ───
const Spotlights = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', top: -80, left: '18%', width: 420, height: 720, background: 'linear-gradient(180deg, rgba(244,206,206,0.14), transparent 75%)', transform: 'rotate(16deg)', filter: 'blur(38px)', transformOrigin: 'top center' }} />
    <div style={{ position: 'absolute', top: -80, right: '18%', width: 420, height: 720, background: 'linear-gradient(180deg, rgba(244,206,206,0.12), transparent 75%)', transform: 'rotate(-16deg)', filter: 'blur(38px)', transformOrigin: 'top center' }} />
    <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 560, height: 800, background: 'radial-gradient(ellipse 50% 60% at 50% 0%, rgba(232,180,184,0.16), transparent 70%)', filter: 'blur(20px)' }} />
  </div>
);

const SecLabel = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 24, color: C.roseDark }}>{children}</div>
);

const Dv = () => <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(232,180,184,0.14), transparent)', margin: '0 44px' }} />;

export default function Landing() {
  const [page, setPage] = useState('home');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(true);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const showPage = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'instant' }); };

  const sec = { padding: '130px 44px', maxWidth: 860, margin: '0 auto', position: 'relative' };
  const secWide = { ...sec, maxWidth: 1060 };

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: C.bg, minHeight: '100vh', overflowX: 'hidden', WebkitFontSmoothing: 'antialiased', color: C.text }}>

      {/* ── Ambient glow ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '30%', left: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,168,232,0.05) 0%, transparent 65%)', animation: 'sqBreathe 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-8%', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,180,184,0.06) 0%, transparent 65%)', animation: 'sqBreathe 11s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* ── Nav ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: scrolled ? '14px 44px' : '26px 44px', transition: 'all 0.4s', backgroundColor: scrolled ? 'rgba(28,20,24,0.88)' : 'transparent', backdropFilter: scrolled ? 'blur(24px)' : 'none', borderBottom: scrolled ? '1px solid rgba(232,180,184,0.1)' : 'none' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span onClick={() => showPage('home')} style={{ cursor: 'pointer' }}>
            <SequinsLogo size="sm" />
          </span>

          <div className="sq-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {[['product', 'Product'], ['pricing', 'Pricing'], ['company', 'Company']].map(([id, label]) => (
              <a key={id} onClick={() => showPage(id)} style={{ textDecoration: 'none', fontSize: 13, fontWeight: 400, color: page === id ? C.roseBright : C.textFaint, borderBottom: page === id ? `1px solid ${C.rose}` : '1px solid transparent', paddingBottom: 2, transition: 'color 0.25s', cursor: 'pointer' }}>{label}</a>
            ))}
            <a onClick={() => showPage('access')} style={{ textDecoration: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...seqFill, paddingBottom: 2 }}>Get Access</a>
          </div>

          <button className="sq-hamburger" onClick={() => setMobileMenuOpen(o => !o)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, padding: '10px', margin: '-10px' }}>
            {mobileMenuOpen ? <X style={{ width: 24, height: 24 }} /> : <Menu style={{ width: 24, height: 24 }} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(28,20,24,0.97)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(232,180,184,0.1)' }}>
            {[['product', 'Product'], ['pricing', 'Pricing'], ['company', 'Company']].map(([id, label]) => (
              <a key={id} onClick={() => { showPage(id); setMobileMenuOpen(false); }} style={{ padding: '20px 28px', fontSize: 16, fontWeight: 400, color: page === id ? C.roseBright : C.textFaint, cursor: 'pointer', borderBottom: '1px solid rgba(232,180,184,0.08)', display: 'block' }}>{label}</a>
            ))}
            <a onClick={() => { showPage('access'); setMobileMenuOpen(false); }} style={{ padding: '20px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'block', ...seqFill }}>Get Access</a>
          </div>
        )}
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ════════════ HOME ════════════ */}
        {page === 'home' && (
          <div>
            {/* Hero — the stage */}
            <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '140px 44px 80px', position: 'relative' }}>
              <Spotlights />

              <div style={{ opacity: 0, animation: 'sqFadeUp 0.8s ease 0.1s forwards', position: 'relative' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 999, marginBottom: 36, border: '1px solid rgba(232,180,184,0.2)', background: 'rgba(232,180,184,0.05)' }}>
                  <Sparkles style={{ width: 12, height: 12, color: C.rose }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: C.rose }}>Dance Studio Operating System</span>
                </div>
              </div>

              <h1 style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.2s forwards', fontSize: 'clamp(52px,8.5vw,108px)', letterSpacing: -1, lineHeight: 1.02, ...serifSeq, marginBottom: 28, maxWidth: 900, position: 'relative' }}>
                Run your studio without the chaos.
              </h1>

              <p style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.35s forwards', fontSize: 17, fontWeight: 300, color: C.textFaint, maxWidth: 480, lineHeight: 1.7, marginBottom: 44, position: 'relative' }}>
                The complete operating system for dance studios — enrollment, scheduling, billing, and AI-powered growth.
              </p>

              <div style={{ opacity: 0, animation: 'sqFadeUp 0.9s ease 0.5s forwards', display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 72, position: 'relative' }}>
                <button onClick={() => showPage('access')} style={{ height: 52, padding: '0 38px', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', ...pinkButton }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  Book a Demo <ArrowRight style={{ display: 'inline', width: 15, height: 15, marginLeft: 4, verticalAlign: -2 }} />
                </button>
                <button onClick={() => showPage('product')} style={{ height: 52, padding: '0 32px', borderRadius: 999, fontSize: 15, fontWeight: 400, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(232,180,184,0.2)', color: C.textFaint, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,180,184,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  See how it works <ChevronDown style={{ display: 'inline', width: 15, height: 15, marginLeft: 4, verticalAlign: -2 }} />
                </button>
              </div>

              <div style={{ position: 'absolute', bottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0, animation: 'sqFadeIn 1s ease 1.4s forwards' }}>
                <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(232,180,184,0.5), transparent)', animation: 'sqScrollLine 2.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,180,184,0.4)' }}>Scroll</span>
              </div>
            </section>

            <Dv />

            {/* Act I — the problem, told in big lines */}
            <section style={{ ...sec, textAlign: 'center' }}>
              <Rv><SecLabel>Act I · The old way</SecLabel></Rv>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
                {[
                  ['Billing nightmares.', 'Automated.'],
                  ['Wasted class time.', 'Teachers just teach.'],
                  ['Silent dropouts.', 'Flagged before they leave.'],
                  ['Families in the dark.', 'A room of their own.'],
                ].map(([problem, answer], i) => (
                  <Rv key={i} delay={i * 0.06}>
                    <div>
                      <div style={{ fontSize: 'clamp(22px,3.2vw,34px)', fontWeight: 300, color: C.textFainter, textDecoration: 'line-through', textDecorationColor: 'rgba(196,168,232,0.6)', textDecorationThickness: 2, marginBottom: 10 }}>{problem}</div>
                      <div style={{ fontSize: 'clamp(30px,4.5vw,48px)', letterSpacing: -0.5, ...serifSeq, display: 'inline-block' }}>{answer}</div>
                    </div>
                  </Rv>
                ))}
              </div>
            </section>

            <Dv />

            {/* Act II — the AI, one glowing moment */}
            <section style={sec}>
              <Rv style={{ textAlign: 'center' }}><SecLabel>Act II · Built-in intelligence</SecLabel></Rv>
              <Rv delay={0.05} style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 'clamp(36px,5.5vw,64px)', letterSpacing: -0.5, lineHeight: 1.05, ...serifSeq, marginBottom: 16 }}>
                  AI that acts.
                </h2>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.7, marginBottom: 64, maxWidth: 440, margin: '0 auto 64px' }}>
                  Not reports. Action — drafted, flagged, and ready for your yes.
                </p>
              </Rv>
              <Rv delay={0.12}>
                <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
                  {/* spotlight on card */}
                  <div style={{ position: 'absolute', top: -140, left: '50%', transform: 'translateX(-50%)', width: 500, height: 400, background: 'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(244,206,206,0.14), transparent 70%)', filter: 'blur(16px)', pointerEvents: 'none' }} />
                  <div style={{ ...cardStyle, borderRadius: 22, padding: '28px 30px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.sage, animation: 'sqPulse 2s ease-in-out infinite' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.roseDark }}>Sequins · Just now</span>
                    </div>
                    <p style={{ fontSize: 16, color: C.text, lineHeight: 1.75, marginBottom: 20 }}>
                      Chloe has missed 3 Ballet classes and has an overdue invoice. She's at high risk of not re-enrolling — a personal check-in is drafted for your review.
                    </p>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.sage, cursor: 'pointer' }}>Review draft</span>
                      <span style={{ color: 'rgba(232,180,184,0.3)' }}>·</span>
                      <span style={{ fontSize: 14, color: C.textFaint, cursor: 'pointer' }}>View profile</span>
                    </div>
                  </div>
                </div>
              </Rv>
            </section>

            <Dv />

            {/* Act III — the platform, four visual vignettes */}
            <section style={secWide}>
              <Rv style={{ textAlign: 'center' }}><SecLabel>Act III · One platform</SecLabel></Rv>
              <Rv delay={0.05} style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 'clamp(36px,5.5vw,64px)', letterSpacing: -0.5, lineHeight: 1.05, ...serifSeq, marginBottom: 64 }}>
                  Every workflow. One stage.
                </h2>
              </Rv>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                {[
                  { icon: Calendar, title: 'Scheduling', line: 'Conflicts caught. Subs matched.', color: C.rose },
                  { icon: DollarSign, title: 'Billing', line: 'Invoices, discounts, autopay — on rails.', color: C.sage },
                  { icon: MessageSquare, title: 'Families', line: 'A branded room for every family.', color: C.amber },
                  { icon: TrendingUp, title: 'Growth', line: 'Every lead nudged at the right moment.', color: C.purple },
                ].map(({ icon: Icon, title, line, color }, i) => (
                  <Rv key={title} delay={i * 0.08}>
                    <div style={{ ...cardStyle, borderRadius: 20, padding: '30px 26px', height: '100%', transition: 'transform 0.25s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, background: `${color}1a`, border: `1px solid ${color}30` }}>
                        <Icon style={{ width: 18, height: 18, color }} />
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>{title}</div>
                      <div style={{ fontSize: 14, fontWeight: 300, color: C.textFaint, lineHeight: 1.6 }}>{line}</div>
                    </div>
                  </Rv>
                ))}
              </div>
              <Rv delay={0.2} style={{ textAlign: 'center', marginTop: 40 }}>
                <button onClick={() => showPage('product')} style={{ padding: '13px 30px', borderRadius: 999, fontSize: 14, fontWeight: 500, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(232,180,184,0.25)', color: C.rose, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,180,184,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  See the full platform →
                </button>
              </Rv>
            </section>

            <Dv />

            {/* Finale — CTA */}
            <section style={{ padding: '170px 44px', textAlign: 'center', position: 'relative' }}>
              <Spotlights />
              <Rv style={{ position: 'relative' }}>
                <h2 style={{ fontSize: 'clamp(38px,6vw,68px)', letterSpacing: -0.5, lineHeight: 1.1, ...serifSeq, marginBottom: 20 }}>
                  It's showtime.
                </h2>
              </Rv>
              <Rv delay={0.1} style={{ position: 'relative' }}>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.7, maxWidth: 380, margin: '0 auto 48px' }}>
                  For dance studios ready to do more with less.
                </p>
              </Rv>
              <Rv delay={0.15} style={{ position: 'relative' }}><WaitlistInput id="home" /></Rv>
            </section>
          </div>
        )}

        {/* ════════════ PRODUCT ════════════ */}
        {page === 'product' && (
          <div>
            <section style={{ ...sec, paddingTop: 180, textAlign: 'center', position: 'relative' }}>
              <Spotlights />
              <Rv style={{ position: 'relative' }}><SecLabel>The platform</SecLabel></Rv>
              <Rv delay={0.05} style={{ position: 'relative' }}>
                <h1 style={{ fontSize: 'clamp(42px,6.5vw,80px)', letterSpacing: -1, lineHeight: 1.02, ...serifSeq, marginBottom: 20 }}>
                  One brain. Every workflow.
                </h1>
                <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
                  Scheduling, billing, families, and AI — sharing full context, working as one.
                </p>
              </Rv>
            </section>
            <Dv />

            {/* Teacher Studio */}
            <section style={sec}>
              <Rv><SecLabel>Teacher Studio</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(30px,4.5vw,52px)', letterSpacing: -0.5, lineHeight: 1.05, ...serifSeq, marginBottom: 56 }}>
                  Every class, in your pocket.
                </h2>
              </Rv>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { time: 'Class starts', event: 'Teacher opens Ballet Advanced', meta: '14 students · Room B · 60 min', type: 'neutral' },
                  { time: '2 min in', event: 'Trial student spotted — dossier surfaces automatically', meta: 'Interests: Ballet · 2nd visit', type: 'gold' },
                  { time: '5 min in', event: 'Attendance locked. 12 present, 1 absent, 1 late.', meta: 'Absence auto-flagged for makeup scheduling', type: 'sage' },
                  { time: 'After class', event: 'Voice note: "Isla is ready for pointe"', meta: 'Transcribed · Tagged · Saved to Isla\'s profile', type: 'purple' },
                  { time: 'Sub needed', event: 'Sequins suggests 3 qualified teachers.', meta: 'Matched by style, availability, and room familiarity', type: 'neutral' },
                ].map(({ time, event, meta, type }, i) => (
                  <Rv key={i} delay={i * 0.08}>
                    <div style={{ display: 'flex', gap: 20, padding: '16px 0' }}>
                      <div style={{ fontSize: 11, color: C.textFainter, width: 76, flexShrink: 0, paddingTop: 3, textAlign: 'right' }}>{time}</div>
                      <div style={{ flex: 1, paddingLeft: 20, borderLeft: `2px solid ${type === 'gold' ? 'rgba(232,196,152,0.4)' : type === 'sage' ? 'rgba(143,212,174,0.35)' : type === 'purple' ? 'rgba(196,168,232,0.35)' : 'rgba(232,180,184,0.18)'}` }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: type === 'gold' ? C.amber : type === 'sage' ? C.sage : type === 'purple' ? C.purple : C.text, marginBottom: 3 }}>{event}</div>
                        <div style={{ fontSize: 12, color: C.textFainter }}>{meta}</div>
                      </div>
                    </div>
                  </Rv>
                ))}
              </div>
            </section>
            <Dv />

            {/* Billing */}
            <section style={sec}>
              <Rv><SecLabel>Automated Billing</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(30px,4.5vw,52px)', letterSpacing: -0.5, lineHeight: 1.05, ...serifSeq, marginBottom: 56 }}>
                  Billing that runs itself.
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <div style={{ ...cardStyle, borderRadius: 22, padding: '28px 30px', maxWidth: 560 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.textFainter, marginBottom: 18 }}>March Invoice · Holloway Family</div>
                  {[
                    { label: 'Ballet Advanced · Juno', amount: '$120', note: 'Monthly plan' },
                    { label: 'Hip Hop Beginner · Wren', amount: '$95', note: 'Monthly plan' },
                    { label: 'Sibling discount', amount: '−$20', note: 'Auto-applied', color: C.sage },
                  ].map(({ label, amount, note, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '11px 0', borderBottom: '1px solid rgba(232,180,184,0.1)' }}>
                      <div>
                        <span style={{ fontSize: 14, color: C.text }}>{label}</span>
                        <span style={{ fontSize: 11, color: C.textFainter, marginLeft: 10 }}>{note}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: color || C.text }}>{amount}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0 2px' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Total due</span>
                    <span style={{ fontSize: 22, fontWeight: 700, ...etchedText }}>$195</span>
                  </div>
                </div>
              </Rv>
              <Rv delay={0.16}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '18px 22px', borderRadius: 18, marginTop: 16, maxWidth: 560, ...cardStyle }}>
                  <Sparkles style={{ width: 14, height: 14, color: C.rose, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: C.roseDark, marginBottom: 6 }}>Sequins · Billing Alert</div>
                    <p style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>Marco Delgado is overdue ($185). I've queued a gentle reminder with his family's check-in. Send both together?</p>
                    <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.sage, cursor: 'pointer' }}>Send together</span>
                      <span style={{ fontSize: 13, color: C.textFainter, cursor: 'pointer' }}>Send separately</span>
                    </div>
                  </div>
                </div>
              </Rv>
            </section>
            <Dv />

            {/* Scheduling */}
            <section style={sec}>
              <Rv><SecLabel>Smart Scheduling</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(30px,4.5vw,52px)', letterSpacing: -0.5, lineHeight: 1.05, ...serifSeq, marginBottom: 56 }}>
                  A schedule that thinks ahead.
                </h2>
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
                      <div style={{ fontSize: 11, color: C.textFainter, width: 80, flexShrink: 0, paddingTop: 20, textAlign: 'right' }}>{day}</div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
                        {classes.map(cls => (
                          <div key={cls.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderRadius: 14, borderLeft: `3px solid ${cls.color}`, ...cardStyle }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{cls.title}</div>
                              <div style={{ fontSize: 11, color: C.textFainter }}>{cls.time} · {cls.room} · {cls.teacher}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, color: C.textFainter }}>{cls.students} students</span>
                              {cls.conflict && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, background: 'rgba(232,196,152,0.15)', color: C.amber }}>Sub needed</span>}
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

            {/* Family Portal */}
            <section style={sec}>
              <Rv><SecLabel>Family Portal</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(30px,4.5vw,52px)', letterSpacing: -0.5, lineHeight: 1.05, ...serifSeq, marginBottom: 56 }}>
                  A room of their own.
                </h2>
              </Rv>
              <Rv delay={0.1}>
                <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
                  {[
                    { icon: Calendar, label: 'Juno\'s schedule this week', value: 'Ballet Mon · Hip Hop Thu', color: C.rose },
                    { icon: DollarSign, label: 'March invoice', value: '$195 · Due March 1 · Auto-pay on', color: C.sage },
                    { icon: TrendingUp, label: 'Juno\'s progress', value: '"Ready to move to pointe" — Ms. Chen', color: C.purple },
                    { icon: MessageSquare, label: 'Message from studio', value: 'Spring recital costumes due April 5th', color: C.amber },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 16, ...cardStyle }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${color}1a`, border: `1px solid ${color}30` }}>
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

            {/* Growth */}
            <section style={sec}>
              <Rv><SecLabel>Growth Engine</SecLabel></Rv>
              <Rv delay={0.05}>
                <h2 style={{ fontSize: 'clamp(30px,4.5vw,52px)', letterSpacing: -0.5, lineHeight: 1.05, ...serifSeq, marginBottom: 56 }}>
                  From first inquiry to referral.
                </h2>
              </Rv>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                {[
                  { stage: 'Lead', name: 'Trial booking — Zoe, 8yo, Ballet interest', meta: 'Came from Instagram', color: C.amber },
                  { stage: 'Trial', name: 'Zoe attended — trial dossier created', meta: '"Excellent natural turnout." — Ms. Chen', color: C.rose },
                  { stage: 'AI nudge', name: 'Re-enrollment nudge sent — day 3 post-trial', meta: '"Zoe had a great class! Here\'s how to enroll…"', color: C.sage, gene: true },
                  { stage: 'Enrolled', name: 'Zoe enrolled in Ballet + Hip Hop', meta: 'Auto-pay on · Sibling discount applied', color: C.purple },
                  { stage: 'Referral', name: 'Her family referred the Whitfields', meta: 'Referral credit applied automatically', color: C.blue },
                ].map(({ stage, name, meta, color, gene }, i) => (
                  <React.Fragment key={i}>
                    <Rv delay={i * 0.07} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0' }}>
                        <div style={{ minWidth: 74, textAlign: 'right', paddingTop: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: gene ? C.sage : color, padding: '3px 8px', borderRadius: 6, background: `${gene ? C.sage : color}18` }}>{stage}</span>
                        </div>
                        <div style={{ flex: 1, paddingLeft: 18, borderLeft: `2px solid ${color}35` }}>
                          <div style={{ fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 4 }}>{name}</div>
                          <div style={{ fontSize: 12, color: C.textFainter, fontStyle: gene ? 'italic' : 'normal' }}>{meta}</div>
                        </div>
                      </div>
                    </Rv>
                    {i < 4 && <div style={{ width: 2, height: 12, marginLeft: 90, background: `${color}25` }} />}
                  </React.Fragment>
                ))}
              </div>
            </section>
            <Dv />

            <section style={{ padding: '160px 44px', textAlign: 'center', position: 'relative' }}>
              <Spotlights />
              <Rv style={{ position: 'relative' }}>
                <h2 style={{ fontSize: 'clamp(34px,5.5vw,58px)', letterSpacing: -0.5, lineHeight: 1.1, ...serifSeq, marginBottom: 48 }}>
                  Ready to see it in your studio?
                </h2>
              </Rv>
              <Rv delay={0.15} style={{ position: 'relative' }}><WaitlistInput id="product" /></Rv>
            </section>
          </div>
        )}

        {/* ════════════ COMPANY ════════════ */}
        {page === 'company' && (
          <div>
            <section style={{ ...sec, paddingTop: 180, textAlign: 'center', position: 'relative' }}>
              <Spotlights />
              <Rv style={{ position: 'relative' }}><SecLabel>Our story</SecLabel></Rv>
              <Rv delay={0.05} style={{ position: 'relative' }}>
                <h1 style={{ fontSize: 'clamp(42px,6.5vw,76px)', letterSpacing: -1, lineHeight: 1.02, ...serifSeq, marginBottom: 40 }}>
                  Built by people who love the craft.
                </h1>
              </Rv>
            </section>
            <Dv />
            <section style={{ ...sec, textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 72 }}>
                {[
                  { big: 'How it\'s done matters', small: 'as much as what gets done. Every dancer knows it. Every studio is built on it.' },
                  { big: 'Families feel everything', small: 'A clunky billing process and a beautiful recital are the same studio.' },
                  { big: 'Doing it isn\'t doing it.', small: 'Doing it right is.' },
                ].map(({ big, small }, i) => (
                  <Rv key={i} delay={i * 0.08}>
                    <div style={{ fontSize: 'clamp(28px,4.5vw,46px)', letterSpacing: -0.5, lineHeight: 1.15, ...serifSeq, marginBottom: 14 }}>{big}</div>
                    <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.7, maxWidth: 440, margin: '0 auto' }}>{small}</p>
                  </Rv>
                ))}
                <Rv delay={0.1}>
                  <div style={{ fontSize: 'clamp(30px,5vw,52px)', fontStyle: 'italic', ...serifSeq }}>It's showtime. All the time.</div>
                </Rv>
              </div>
            </section>
            <Dv />
            <section style={secWide}>
              <Rv style={{ textAlign: 'center' }}><SecLabel>Principles</SecLabel></Rv>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 16 }}>
                {[
                  ['Ambient, not demanding', 'What you need to know, right when you need it.'],
                  ['Human in the loop', 'Sequins drafts and flags. You make the call.'],
                  ['Built for the floor', 'If it doesn\'t work at 6pm on a Wednesday, it doesn\'t ship.'],
                  ['One platform', 'Nothing falls through the cracks between tools.'],
                ].map(([title, desc], i) => (
                  <Rv key={i} delay={i * 0.07}>
                    <div style={{ ...cardStyle, borderRadius: 20, padding: '28px 26px', height: '100%' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 10 }}>{title}</div>
                      <div style={{ fontSize: 14, fontWeight: 300, color: C.textFaint, lineHeight: 1.7 }}>{desc}</div>
                    </div>
                  </Rv>
                ))}
              </div>
            </section>
            <Dv />
            <section style={{ padding: '160px 44px', textAlign: 'center', position: 'relative' }}>
              <Spotlights />
              <Rv style={{ position: 'relative' }}>
                <h2 style={{ fontSize: 'clamp(32px,5vw,54px)', letterSpacing: -0.5, lineHeight: 1.1, ...serifSeq, marginBottom: 48 }}>
                  Build the future of dance with us.
                </h2>
              </Rv>
              <Rv delay={0.15} style={{ position: 'relative' }}><WaitlistInput id="company" /></Rv>
            </section>
          </div>
        )}

        {/* ════════════ PRICING ════════════ */}
        {page === 'pricing' && (() => {
          const annual = annualBilling;
          const setAnnual = setAnnualBilling;
          const plans = [
            { tier: 'starting', students: '< 100', monthly: '$65', annual: '$50' },
            { tier: 'growing', students: '101 – 500', monthly: '$125', annual: '$100' },
            { tier: 'grown',   students: '> 501',    monthly: '$215', annual: '$185' },
          ];
          return (
            <div>
              <section style={{ ...sec, paddingTop: 180, textAlign: 'center', position: 'relative' }}>
                <Spotlights />
                <Rv style={{ position: 'relative' }}><SecLabel>Pricing</SecLabel></Rv>
                <Rv delay={0.05} style={{ position: 'relative' }}>
                  <h1 style={{ fontSize: 'clamp(42px,6.5vw,76px)', letterSpacing: -1, lineHeight: 1.02, ...serifSeq, marginBottom: 16 }}>
                    Simple. No surprises.
                  </h1>
                  <p style={{ fontSize: 16, fontWeight: 300, color: C.textFaint, lineHeight: 1.7, maxWidth: 380, margin: '0 auto 40px' }}>
                    One plan per studio size. Everything included.
                  </p>
                </Rv>

                <Rv delay={0.15} style={{ position: 'relative' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '10px 20px', borderRadius: 999, ...cardStyle }}>
                    <span style={{ fontSize: 13, fontWeight: annual ? 700 : 300, color: annual ? C.roseBright : C.textFainter }}>annual</span>
                    <div onClick={() => setAnnual(a => !a)} style={{ width: 44, height: 24, borderRadius: 999, background: 'rgba(232,180,184,0.18)', cursor: 'pointer', position: 'relative', border: '1px solid rgba(232,180,184,0.25)' }}>
                      <div style={{ position: 'absolute', top: 3, left: annual ? 3 : 19, width: 16, height: 16, borderRadius: '50%', background: C.rose, transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: annual ? 300 : 700, color: annual ? C.textFainter : C.roseBright }}>monthly</span>
                    {annual && <span style={{ fontSize: 11, fontWeight: 500, color: C.sage }}>save ~20%</span>}
                  </div>
                </Rv>
              </section>
              <Dv />

              <section style={{ ...secWide, paddingTop: 80, paddingBottom: 80 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                  {plans.map(({ tier, students, monthly, annual: annualPrice }, i) => (
                    <Rv key={tier} delay={i * 0.08}>
                      <div style={{ borderRadius: 24, padding: '40px 32px', textAlign: 'center', ...cardStyle }}>
                        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 28, ...seqFill, display: 'inline-block' }}>{tier}</div>
                        <div style={{ marginBottom: 24 }}>
                          <span style={{ fontSize: 'clamp(34px,4vw,44px)', ...serifSeq }}>{students}</span>
                          <div style={{ fontSize: 12, color: C.textFainter, fontWeight: 300, marginTop: 6 }}>students</div>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginBottom: 36 }}>
                          <span style={{ fontSize: 26, fontWeight: 700, ...etchedText }}>{annual ? annualPrice : monthly}</span>
                          <span style={{ fontSize: 12, color: C.textFainter, fontWeight: 300 }}>/ month</span>
                        </div>
                        <button onClick={() => showPage('access')} style={{ width: '100%', padding: '14px 0', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', ...pinkButton }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
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
                  <p style={{ fontSize: 13, color: C.textFainter, lineHeight: 1.75, fontWeight: 300 }}>
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
            <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 44px 80px', position: 'relative' }}>
              <Spotlights />
              <Rv delay={0.05} style={{ width: '100%', maxWidth: 700, position: 'relative' }}>
                <BookDemoForm />
              </Rv>
            </section>
          </div>
        )}

        {/* Footer */}
        <footer style={{ padding: '36px 44px', borderTop: '1px solid rgba(232,180,184,0.1)' }}>
          <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <SequinsLogo size="sm" />
            <p style={{ fontSize: 12, color: C.textFainter }}>© 2026 Sequins. Built for dance.</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {[['product', 'Product'], ['pricing', 'Pricing'], ['company', 'Company'], [null, 'Privacy'], [null, 'Terms']].map(([id, label], i) => (
                <a key={i} onClick={id ? () => showPage(id) : undefined} style={{ fontSize: 12, color: C.textFainter, textDecoration: 'none', cursor: id ? 'pointer' : 'default', transition: 'color 0.2s' }}
                  onMouseEnter={e => { if (id) e.target.style.color = C.roseBright; }}
                  onMouseLeave={e => { if (id) e.target.style.color = C.textFainter; }}>{label}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&display=swap');
        @keyframes sqFadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sqFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes sqBreathe { 0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:0.8} }
        @keyframes sqScrollLine { 0%,100%{opacity:0.25;transform:scaleY(1)}50%{opacity:0.8;transform:scaleY(1.2)} }
        @keyframes sqPulse { 0%,100%{box-shadow:0 0 0 0 rgba(143,212,174,0.3)}50%{box-shadow:0 0 0 5px rgba(143,212,174,0)} }
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