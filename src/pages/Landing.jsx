import { useEffect, useState } from 'react';
import BookDemoForm from '@/components/landing/BookDemoForm';
import SequinsLogo from '@/components/landing/SequinsLogo';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  Menu,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

const C = {
  bg: '#171015',
  panel: '#1d151a',
  panelRaised: '#21181e',
  border: 'rgba(238, 194, 201, 0.14)',
  borderStrong: 'rgba(238, 194, 201, 0.24)',
  rose: '#e9b5bc',
  roseBright: '#f5d7da',
  text: '#f3e9eb',
  muted: '#b9a6ab',
  faint: '#806e74',
  sage: '#92d5ae',
  purple: '#b8a2df',
  amber: '#e2bf8d',
  blue: '#9cc8d9',
};

const SEQUINS_URL =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0745a12ebbb83d6190412/d0c8e354b_ChatGPTImageFeb242026at10_46_54AM.png';

const sequinText = {
  color: 'transparent',
  backgroundImage: `url('${SEQUINS_URL}')`,
  backgroundSize: '92px',
  backgroundPosition: 'center',
  backgroundRepeat: 'repeat',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 4px 20px rgba(245, 215, 218, 0.16))',
};

const displayText = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 900,
  letterSpacing: '-0.035em',
};

const mono = "'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const buttonPrimary = {
  height: 44,
  padding: '0 20px',
  borderRadius: 8,
  border: '1px solid rgba(245,215,218,.42)',
  background: 'linear-gradient(180deg, #e9b5bc 0%, #cd8f99 100%)',
  color: '#2a171d',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), 0 8px 24px rgba(0,0,0,.18)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const buttonSecondary = {
  height: 44,
  padding: '0 20px',
  borderRadius: 8,
  border: `1px solid ${C.borderStrong}`,
  background: 'rgba(255,255,255,.025)',
  color: C.text,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const sequinButton = {
  height: 52,
  padding: '0 28px',
  borderRadius: 10,
  border: `1px solid ${C.borderStrong}`,
  background: 'rgba(255,255,255,.025)',
  boxShadow: 'inset 0 1px rgba(255,255,255,.06), 0 12px 32px rgba(0,0,0,.2)',
  cursor: 'pointer',
};

const sequinButtonText = {
  color: 'transparent',
  backgroundImage: `url('${SEQUINS_URL}')`,
  backgroundSize: '90px',
  backgroundPosition: 'center',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontSize: 14,
  fontWeight: 800,
  filter: 'drop-shadow(0 2px 8px rgba(245,215,218,.16))',
};

const stage = {
  width: 'min(1180px, calc(100% - 48px))',
  margin: '0 auto',
};

function Eyebrow({ children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
        fontFamily: mono,
        color: C.rose,
        fontSize: 10,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ width: 18, height: 1, background: C.rose }} />
      {children}
    </div>
  );
}

function StatusDot({ color = C.sage }) {
  return (
    <span style={{ position: 'relative', width: 7, height: 7, display: 'inline-block' }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: 20, background: color }} />
      <span
        style={{
          position: 'absolute',
          inset: -3,
          borderRadius: 20,
          border: `1px solid ${color}`,
          opacity: 0.35,
        }}
      />
    </span>
  );
}

function ProductCell({ icon: Icon, label, title, body, accent, children, className = '' }) {
  return (
    <article className={`sq-product-cell ${className}`}>
      <div className="sq-cell-label">
        <Icon size={14} strokeWidth={1.6} color={accent} />
        <span>{label}</span>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {children}
    </article>
  );
}

function ProductGrid() {
  return (
    <div className="sq-product-grid">
      <ProductCell
        className="sq-cell-wide"
        icon={CalendarDays}
        label="Studio calendar"
        title="The whole studio, in one view."
        body="Classes, rooms, teachers, trials, and conflicts stay synchronized without the spreadsheet archaeology."
        accent={C.rose}
      >
        <div className="sq-calendar">
          <div className="sq-calendar-head">
            <span>Today · Wednesday</span>
            <span>14 classes</span>
          </div>
          {[
            ['04:00', 'Ballet foundations', 'Studio A', C.rose],
            ['05:30', 'Jazz intermediate', 'Studio B', C.purple],
            ['06:00', 'Ballet advanced', 'Studio A', C.blue],
          ].map(([time, name, room, color]) => (
            <div className="sq-calendar-row" key={name}>
              <span className="sq-mono">{time}</span>
              <span className="sq-event-line" style={{ background: color }} />
              <strong>{name}</strong>
              <span>{room}</span>
            </div>
          ))}
        </div>
      </ProductCell>

      <ProductCell
        icon={Sparkles}
        label="Sequins intelligence"
        title="AI that notices—and then helps."
        body="Retention risk, billing friction, and follow-ups surface with a thoughtful next step."
        accent={C.sage}
      >
        <div className="sq-signal">
          <div>
            <StatusDot />
            <span className="sq-mono"> RETENTION SIGNAL</span>
          </div>
          <p>
            Chloe missed three classes. A personal check-in is ready for your review.
          </p>
          <button>Review draft <ArrowRight size={12} /></button>
        </div>
      </ProductCell>

      <ProductCell
        icon={CircleDollarSign}
        label="Billing"
        title="Revenue, without the runaround."
        body="Plans, discounts, autopay, and gentle reminders run quietly in the background."
        accent={C.amber}
      >
        <div className="sq-metric">
          <span>Collected this month</span>
          <strong>$48,920</strong>
          <div><span style={{ width: '82%' }} /></div>
          <small>96.4% collected on time</small>
        </div>
      </ProductCell>

      <ProductCell
        className="sq-cell-wide"
        icon={Users}
        label="Family room"
        title="Every family knows what comes next."
        body="Schedules, balances, progress, messages, and recital details—clear, calm, and always current."
        accent={C.blue}
      >
        <div className="sq-family-row">
          {[
            ['Next class', 'Ballet · Mon 4:00', C.rose],
            ['Balance', '$195 · Autopay on', C.sage],
            ['Progress', 'Ready for pointe', C.purple],
          ].map(([label, value, color]) => (
            <div key={label}>
              <span style={{ color }}>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </ProductCell>
    </div>
  );
}

function Home({ showPage }) {
  return (
    <>
      <main>
        <section className="sq-hero">
          <div className="sq-hero-glow" />
          <div style={stage} className="sq-hero-grid">
            <div>
              <Eyebrow>Operating system for dance studios</Eyebrow>
              <h1 style={sequinText}>
                Run the studio.
                <br />
                Keep the magic.
              </h1>
              <div className="sq-hero-actions">
                <button style={buttonPrimary} onClick={() => showPage('access')}>
                  Book a demo <ArrowRight size={14} />
                </button>
                <button style={buttonSecondary} onClick={() => showPage('product')}>
                  Explore the platform
                </button>
              </div>
            </div>
            <div className="sq-hero-copy">
              <p>
                Sequins brings enrollment, scheduling, billing, family communication,
                and studio intelligence into one beautifully run system.
              </p>
              <div className="sq-proof-line">
                <StatusDot />
                <span>Built for the 6pm rush, not the quarterly demo.</span>
              </div>
            </div>
          </div>
          <div style={stage}>
            <ProductGrid />
          </div>
        </section>

        <section className="sq-statement">
          <div style={stage} className="sq-statement-grid">
            <Eyebrow>One calm system</Eyebrow>
            <div>
              <h2>
                The work disappears.
                <br />
                <span>The craft doesn’t.</span>
              </h2>
              <p>
                Sequins handles the operational choreography so owners can lead,
                teachers can teach, and families can feel cared for.
              </p>
            </div>
          </div>
        </section>

        <section className="sq-flow">
          <div style={stage}>
            <div className="sq-section-head">
              <div>
                <Eyebrow>From first inquiry to final bow</Eyebrow>
                <h2>A single thread through the entire season.</h2>
              </div>
              <p>
                Every handoff stays connected, so no family—or opportunity—falls
                between tools.
              </p>
            </div>
            <div className="sq-flow-list">
              {[
                ['01', 'Inquiry arrives', 'Captured with interests, age, source, and availability.'],
                ['02', 'Trial is booked', 'The right class, teacher, and room are matched automatically.'],
                ['03', 'Teacher gets context', 'A clean dossier appears before class—not another inbox request.'],
                ['04', 'Follow-up is drafted', 'Personal, timely, and ready for a human yes.'],
                ['05', 'Family enrolls', 'Plan, billing, portal, and schedule begin as one connected flow.'],
              ].map(([number, title, copy], i) => (
                <div className="sq-flow-row" key={number}>
                  <span className="sq-mono">{number}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <span className="sq-flow-state">{i === 4 ? 'ENROLLED' : 'AUTOMATED'}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sq-cta">
          <div className="sq-cta-glow" />
          <div style={stage}>
            <div className="sq-cta-eyebrow">
              <span />
              Ready when you are
            </div>
            <h2 style={sequinText}>
              Your studio already has a rhythm.
              <br />
              Let the software find it.
            </h2>
            <button style={sequinButton} onClick={() => showPage('access')}>
              <span style={sequinButtonText}>Book a private demo →</span>
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

function ProductPage({ showPage }) {
  return (
    <main className="sq-inner-page">
      <div style={stage}>
        <Eyebrow>Product</Eyebrow>
        <div className="sq-inner-intro">
          <h1>Everything a studio needs. Nothing it doesn’t.</h1>
          <p>
            A connected operating system for the people running the studio, the
            teachers on the floor, and the families at home.
          </p>
        </div>
        <ProductGrid />
        <div className="sq-principles">
          {[
            ['01', 'Ambient, not demanding', 'The right signal appears at the right moment.'],
            ['02', 'Human in the loop', 'Sequins drafts and flags. You make the call.'],
            ['03', 'Built for the floor', 'Fast, clear, and useful in the middle of a real class day.'],
            ['04', 'One source of truth', 'No gaps between scheduling, billing, and communication.'],
          ].map(([n, title, copy]) => (
            <div key={n}>
              <span className="sq-mono">{n}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
        <button style={buttonPrimary} onClick={() => showPage('access')}>
          See Sequins in action <ArrowRight size={14} />
        </button>
      </div>
    </main>
  );
}

function PricingPage({ showPage }) {
  const plans = [
    ['Under 100 students', '$65', '$50 / mo annual'],
    ['101–500 students', '$125', '$100 / mo annual'],
    ['501+ students', '$215', '$185 / mo annual'],
  ];
  return (
    <main className="sq-inner-page">
      <div style={stage}>
        <Eyebrow>Pricing</Eyebrow>
        <div className="sq-inner-intro">
          <h1>Simple by design. Everything included.</h1>
          <p>One complete product, priced to the size of your studio.</p>
        </div>
        <div className="sq-pricing-table">
          {plans.map(([size, monthly, annual]) => (
            <div className="sq-price-row" key={size}>
              <span>{size}</span>
              <strong>{monthly}<small> / month</small></strong>
              <span>{annual}</span>
              <button style={buttonSecondary} onClick={() => showPage('access')}>Book a demo</button>
            </div>
          ))}
        </div>
        <div className="sq-included">
          {['Free onboarding', 'Unlimited staff', 'All product modules', 'No credit card required'].map(item => (
            <span key={item}><Check size={13} /> {item}</span>
          ))}
        </div>
      </div>
    </main>
  );
}

function CompanyPage() {
  return (
    <main className="sq-inner-page">
      <div style={stage}>
        <Eyebrow>Company</Eyebrow>
        <div className="sq-inner-intro sq-company-intro">
          <h1>Built by people who love the craft.</h1>
          <p>
            A clunky payment flow and a beautiful recital are experienced as the
            same studio. We believe how it’s done matters as much as what gets done.
          </p>
        </div>
        <div className="sq-beliefs">
          {[
            ['Families feel everything.', 'Every operational detail is part of the experience.'],
            ['Software should know its place.', 'Quiet when it can be. Essential when it needs to be.'],
            ['Doing it isn’t doing it.', 'Doing it right is.'],
          ].map(([title, copy]) => (
            <div key={title}><h2>{title}</h2><p>{copy}</p></div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function Landing() {
  const [page, setPage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showPage = (next) => {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="sq-site">
      <nav className={scrolled ? 'sq-nav is-scrolled' : 'sq-nav'}>
        <div style={stage} className="sq-nav-inner">
          <button className="sq-logo-button" onClick={() => showPage('home')}>
            <SequinsLogo size="sm" />
          </button>
          <div className={menuOpen ? 'sq-nav-links is-open' : 'sq-nav-links'}>
            {[
              ['product', 'Product'],
              ['pricing', 'Pricing'],
              ['company', 'Company'],
            ].map(([id, label]) => (
              <button className={page === id ? 'is-active' : ''} onClick={() => showPage(id)} key={id}>{label}</button>
            ))}
            <button className="sq-nav-cta" onClick={() => showPage('access')}>Book a demo</button>
          </div>
          <button className="sq-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {page === 'home' && <Home showPage={showPage} />}
      {page === 'product' && <ProductPage showPage={showPage} />}
      {page === 'pricing' && <PricingPage showPage={showPage} />}
      {page === 'company' && <CompanyPage />}
      {page === 'access' && (
        <main className="sq-access">
          <div className="sq-cta-glow" />
          <div style={stage}><BookDemoForm /></div>
        </main>
      )}

      <footer className="sq-footer">
        <div style={stage} className="sq-footer-inner">
          <SequinsLogo size="sm" />
          <span>Operating system for dance studios.</span>
          <span>© 2026 Sequins</span>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&display=swap');
        * { box-sizing: border-box; }
        html { background: ${C.bg}; }
        body { margin: 0; }
        button { font-family: inherit; }
        .sq-site { min-height: 100vh; overflow: hidden; color: ${C.text}; background: ${C.bg}; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        .sq-nav { position: fixed; inset: 0 0 auto; height: 72px; z-index: 50; transition: .25s ease; border-bottom: 1px solid transparent; }
        .sq-nav.is-scrolled { height: 62px; background: rgba(23,16,21,.88); backdrop-filter: blur(18px); border-color: ${C.border}; }
        .sq-nav-inner { height: 100%; display: flex; align-items: center; justify-content: space-between; }
        .sq-logo-button, .sq-nav-links button, .sq-menu { border: 0; background: none; color: inherit; cursor: pointer; }
        .sq-logo-button { padding: 0; }
        .sq-nav-links { display: flex; align-items: center; gap: 28px; }
        .sq-nav-links button { padding: 8px 0; color: ${C.muted}; font-size: 12px; font-weight: 500; }
        .sq-nav-links button:hover, .sq-nav-links button.is-active { color: ${C.text}; }
        .sq-nav-links .sq-nav-cta { padding: 9px 14px; border: 1px solid ${C.borderStrong}; border-radius: 7px; color: ${C.text}; background: rgba(255,255,255,.035); }
        .sq-menu { display: none; padding: 8px; }
        .sq-hero { min-height: 100vh; padding: 164px 0 96px; position: relative; background: radial-gradient(ellipse 60% 42% at 28% 4%, rgba(233,181,188,.10), transparent 72%), radial-gradient(ellipse 44% 34% at 82% 18%, rgba(184,162,223,.045), transparent 76%), ${C.bg}; }
        .sq-hero:after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, ${C.bg}00 0%, ${C.bg}00 55%, ${C.bg} 100%); }
        .sq-hero-glow, .sq-cta-glow { position: absolute; width: 760px; height: 560px; border-radius: 50%; top: -200px; left: 18%; background: radial-gradient(circle, rgba(233,181,188,.13), transparent 68%); pointer-events: none; }
        .sq-hero-grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1.25fr .75fr; gap: 90px; align-items: end; margin-bottom: 96px !important; }
        .sq-hero h1 { ${Object.entries(displayText).map(([k,v]) => `${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}:${v}`).join(';')}; font-size: clamp(56px, 7.2vw, 104px); line-height: .96; margin: 0; max-width: 850px; }
        .sq-hero-copy { padding-bottom: 6px; }
        .sq-hero-copy > p { color: ${C.muted}; font-size: 17px; line-height: 1.65; margin: 0 0 30px; max-width: 430px; }
        .sq-proof-line { display: flex; align-items: center; gap: 12px; color: ${C.faint}; font-family: ${mono}; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
        .sq-hero-actions { display: flex; gap: 10px; margin-top: 42px; }
        .sq-hero-actions button:first-child, .sq-cta button { display: inline-flex; align-items: center; gap: 10px; }
        .sq-product-grid { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid ${C.borderStrong}; border-left: 1px solid ${C.borderStrong}; border-radius: 12px; overflow: hidden; background: rgba(23,16,21,.86); box-shadow: 0 40px 100px rgba(0,0,0,.26); }
        .sq-product-cell { min-height: 370px; padding: 30px; border-right: 1px solid ${C.borderStrong}; border-bottom: 1px solid ${C.borderStrong}; background: linear-gradient(180deg, rgba(255,255,255,.025), transparent 45%); position: relative; overflow: hidden; }
        .sq-product-cell.sq-cell-wide { grid-column: span 2; }
        .sq-cell-label { display: flex; align-items: center; gap: 10px; color: ${C.muted}; font-family: ${mono}; text-transform: uppercase; letter-spacing: .08em; font-size: 10px; }
        .sq-product-cell h3 { margin: 60px 0 12px; font-size: 22px; letter-spacing: -.025em; }
        .sq-product-cell > p { color: ${C.muted}; line-height: 1.6; font-size: 14px; max-width: 450px; margin: 0; }
        .sq-calendar { margin-top: 34px; border: 1px solid ${C.border}; border-radius: 8px; overflow: hidden; background: ${C.panel}; }
        .sq-calendar-head, .sq-calendar-row { display: grid; align-items: center; padding: 11px 14px; border-bottom: 1px solid ${C.border}; font-size: 11px; }
        .sq-calendar-head { grid-template-columns: 1fr auto; color: ${C.faint}; font-family: ${mono}; }
        .sq-calendar-row { grid-template-columns: 48px 2px 1fr auto; gap: 12px; color: ${C.muted}; }
        .sq-calendar-row:last-child { border: 0; }
        .sq-calendar-row strong { color: ${C.text}; font-size: 12px; }
        .sq-event-line { height: 20px; border-radius: 10px; }
        .sq-mono { font-family: ${mono}; color: ${C.faint}; font-size: 10px; }
        .sq-signal { margin-top: 30px; padding: 16px; border: 1px solid ${C.borderStrong}; border-radius: 8px; background: ${C.panelRaised}; }
        .sq-signal p { color: ${C.text}; font-size: 12px; line-height: 1.55; margin: 14px 0; }
        .sq-signal button { display: flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; color: ${C.sage}; font-size: 11px; cursor: pointer; }
        .sq-metric { margin-top: 36px; }
        .sq-metric > span, .sq-metric small { color: ${C.faint}; font-family: ${mono}; font-size: 10px; }
        .sq-metric strong { display: block; margin: 8px 0 20px; font-size: 34px; font-weight: 500; letter-spacing: -.04em; }
        .sq-metric > div { height: 4px; border-radius: 10px; background: rgba(255,255,255,.06); margin-bottom: 10px; }
        .sq-metric > div span { display: block; height: 100%; border-radius: 10px; background: ${C.amber}; }
        .sq-family-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; margin-top: 40px; border: 1px solid ${C.border}; background: ${C.border}; border-radius: 8px; overflow: hidden; }
        .sq-family-row > div { padding: 18px; background: ${C.panel}; }
        .sq-family-row span { display: block; font-family: ${mono}; text-transform: uppercase; font-size: 9px; margin-bottom: 10px; }
        .sq-family-row strong { font-size: 12px; font-weight: 500; }
        .sq-statement { padding: 160px 0; }
        .sq-statement-grid { display: grid; grid-template-columns: .7fr 1.3fr; gap: 80px; }
        .sq-statement h2, .sq-section-head h2, .sq-cta h2, .sq-inner-intro h1 { ${Object.entries(displayText).map(([k,v]) => `${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}:${v}`).join(';')}; margin: 0; font-size: clamp(42px, 5.5vw, 76px); line-height: 1.04; }
        .sq-statement h2 span { color: ${C.rose}; }
        .sq-statement p { color: ${C.muted}; font-size: 16px; line-height: 1.7; max-width: 540px; margin: 32px 0 0; }
        .sq-flow { padding: 120px 0 150px; border-top: 1px solid ${C.border}; }
        .sq-section-head { display: grid; grid-template-columns: 1.25fr .75fr; gap: 80px; align-items: end; margin-bottom: 70px; }
        .sq-section-head h2 { font-size: clamp(38px, 4.4vw, 62px); max-width: 720px; }
        .sq-section-head > p { color: ${C.muted}; line-height: 1.65; margin: 0; }
        .sq-flow-list { border-top: 1px solid ${C.borderStrong}; }
        .sq-flow-row { display: grid; grid-template-columns: 70px 1fr 1.4fr 100px; gap: 24px; align-items: center; padding: 25px 0; border-bottom: 1px solid ${C.border}; }
        .sq-flow-row h3 { margin: 0; font-size: 15px; }
        .sq-flow-row p { margin: 0; color: ${C.muted}; font-size: 13px; line-height: 1.5; }
        .sq-flow-state { color: ${C.sage}; border: 1px solid rgba(146,213,174,.2); background: rgba(146,213,174,.07); padding: 5px 7px; border-radius: 5px; font-family: ${mono}; font-size: 8px; text-align: center; letter-spacing: .08em; }
        .sq-cta { position: relative; text-align: center; padding: 170px 0; border-top: 1px solid ${C.border}; overflow: hidden; }
        .sq-cta-glow { top: 10%; left: calc(50% - 380px); opacity: .5; }
        .sq-cta > div:last-child { position: relative; z-index: 1; }
        .sq-cta-eyebrow { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 30px; color: ${C.rose}; font-family: ${mono}; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; }
        .sq-cta-eyebrow span { width: 18px; height: 1px; background: ${C.rose}; }
        .sq-cta h2 { max-width: 980px; font-size: clamp(40px, 5.2vw, 70px); margin: 0 auto 42px; color: ${C.text}; }
        .sq-inner-page { padding: 170px 0 140px; min-height: calc(100vh - 90px); }
        .sq-inner-intro { display: grid; grid-template-columns: 1.3fr .7fr; gap: 80px; align-items: end; margin-bottom: 80px; }
        .sq-inner-intro h1 { font-size: clamp(46px, 6vw, 82px); }
        .sq-inner-intro > p { color: ${C.muted}; line-height: 1.7; font-size: 16px; margin: 0; }
        .sq-inner-page .sq-product-grid { margin-bottom: 70px; }
        .sq-principles { display: grid; grid-template-columns: repeat(4,1fr); border-top: 1px solid ${C.border}; margin: 80px 0 50px; }
        .sq-principles > div { padding: 26px 24px 26px 0; border-right: 1px solid ${C.border}; }
        .sq-principles > div + div { padding-left: 24px; }
        .sq-principles h3 { font-size: 14px; margin: 24px 0 8px; }
        .sq-principles p { color: ${C.muted}; font-size: 12px; line-height: 1.6; }
        .sq-pricing-table { border-top: 1px solid ${C.borderStrong}; }
        .sq-price-row { display: grid; grid-template-columns: 1.2fr .55fr .7fr 120px; align-items: center; gap: 30px; padding: 26px 0; border-bottom: 1px solid ${C.border}; }
        .sq-price-row > span { color: ${C.muted}; font-size: 14px; }
        .sq-price-row > span:first-child { color: ${C.text}; font-size: 18px; font-weight: 600; }
        .sq-price-row strong { font-size: 26px; }
        .sq-price-row small { color: ${C.faint}; font-size: 11px; font-weight: 400; }
        .sq-included { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 32px; color: ${C.muted}; font-size: 12px; }
        .sq-included span { display: flex; align-items: center; gap: 7px; }
        .sq-company-intro { grid-template-columns: 1fr 1fr; }
        .sq-beliefs { border-top: 1px solid ${C.borderStrong}; }
        .sq-beliefs > div { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; padding: 50px 0; border-bottom: 1px solid ${C.border}; }
        .sq-beliefs h2 { ${Object.entries(displayText).map(([k,v]) => `${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}:${v}`).join(';')}; font-size: 34px; margin: 0; }
        .sq-beliefs p { color: ${C.muted}; line-height: 1.7; margin: 0; }
        .sq-access { min-height: 100vh; display: grid; place-items: center; position: relative; padding: 120px 0 70px; }
        .sq-access > div:last-child { position: relative; z-index: 1; max-width: 700px; }
        .sq-footer { border-top: 1px solid ${C.border}; padding: 30px 0; }
        .sq-footer-inner { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; color: ${C.faint}; font-size: 11px; }
        .sq-footer-inner span:nth-child(2) { text-align: center; }
        .sq-footer-inner span:last-child { text-align: right; }
        @media (max-width: 820px) {
          .sq-nav-links { display: none; position: absolute; top: 62px; left: 0; right: 0; padding: 18px 24px 24px; flex-direction: column; align-items: stretch; gap: 6px; background: rgba(23,16,21,.98); border-bottom: 1px solid ${C.border}; }
          .sq-nav-links.is-open { display: flex; }
          .sq-nav-links button { text-align: left; padding: 12px; }
          .sq-menu { display: block; }
          .sq-hero { padding-top: 130px; }
          .sq-hero-grid, .sq-statement-grid, .sq-section-head, .sq-inner-intro { grid-template-columns: 1fr; gap: 38px; }
          .sq-hero-grid { margin-bottom: 66px !important; }
          .sq-product-grid { grid-template-columns: 1fr; }
          .sq-product-cell.sq-cell-wide { grid-column: span 1; }
          .sq-product-cell { min-height: auto; }
          .sq-family-row { grid-template-columns: 1fr; }
          .sq-flow-row { grid-template-columns: 44px 1fr; }
          .sq-flow-row p, .sq-flow-state { grid-column: 2; }
          .sq-principles { grid-template-columns: 1fr 1fr; }
          .sq-price-row { grid-template-columns: 1fr 1fr; }
          .sq-price-row button { width: 120px; }
        }
        @media (max-width: 520px) {
          ${''}
          .sq-hero h1 { font-size: 50px; }
          .sq-hero-actions { flex-direction: column; }
          .sq-hero-actions button { justify-content: center; width: 100%; }
          .sq-product-cell { padding: 24px; }
          .sq-product-cell h3 { margin-top: 40px; }
          .sq-statement, .sq-cta { padding: 110px 0; }
          .sq-flow { padding: 90px 0 110px; }
          .sq-principles, .sq-price-row { grid-template-columns: 1fr; }
          .sq-principles > div, .sq-principles > div + div { padding: 24px 0; border-right: 0; border-bottom: 1px solid ${C.border}; }
          .sq-beliefs > div { grid-template-columns: 1fr; gap: 18px; }
          .sq-footer-inner { grid-template-columns: 1fr; gap: 14px; }
          .sq-footer-inner span:nth-child(2), .sq-footer-inner span:last-child { text-align: left; }
        }
      `}</style>
    </div>
  );
}
