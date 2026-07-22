import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Loader2, ChevronDown } from 'lucide-react';

const C = {
  rose: '#e8b4b8',
  roseBright: '#f4cece',
  roseDark: '#c98f96',
  text: '#f0e4e6',
  textFaint: '#c9b2b8',
  textFainter: '#8f767e',
  sage: '#8fd4ae',
};

const etchedText = {
  color: 'transparent',
  backgroundImage: `linear-gradient(180deg, ${C.roseBright} 0%, ${C.rose} 100%)`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitBoxDecorationBreak: 'clone',
  paddingBottom: '0.15em',
};

const inputStyle = (filled) => ({
  width: '100%',
  padding: '13px 14px',
  borderRadius: 11,
  fontSize: 14,
  border: filled ? '1px solid rgba(232,180,184,0.35)' : '1px solid rgba(232,180,184,0.18)',
  background: 'rgba(255,255,255,0.06)',
  color: C.text,
  outline: 'none',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
});

const pinkButton = {
  background: 'linear-gradient(145deg, #d99aa2, #c9848f)',
  color: '#2a1a1e',
  border: '1px solid rgba(244,206,206,0.35)',
  boxShadow: '0 8px 28px -6px rgba(217,154,162,0.45), inset 0 1px 1px rgba(255,255,255,0.35)',
};

export default function BookDemoForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    studentCount: '<100',
    expectations: '',
    preferPhone: false,
    preferEmail: true,
    subscribeNewsletter: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [step, setStep] = useState(0);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setLoading(true);
    setError(false);
    try {
      const res = await base44.functions.invoke('submitLead', formData);
      if (res.data.success) {
        setSubmitted(true);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error submitting:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ animation: 'fadeIn 0.6s ease', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(143,212,174,0.14)', border: '1px solid rgba(143,212,174,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <CheckCircle2 style={{ width: 28, height: 28, color: C.sage }} />
          </div>
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 8 }}>You're all set!</h3>
        <p style={{ fontSize: 13, color: C.textFaint, lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>Cassia will review your request and reach out within 24 hours to schedule your personalized demo.</p>
      </div>
    );
  }

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.roseDark, marginBottom: 10 };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 660, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48, animation: `fadeIn 0.6s ease` }}>
        <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontFamily: "'Playfair Display', serif", fontWeight: 900, ...etchedText, marginBottom: 10 }}>See Sequins in motion</h2>
        <p style={{ fontSize: 13, color: C.textFaint, lineHeight: 1.6 }}>Tell us about your studio so we can show you exactly what matters most to you.</p>
      </div>

      {/* Form Container */}
      <div style={{
        padding: '40px 36px',
        borderRadius: 24,
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(232,180,184,0.14)',
        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        textAlign: 'left',
      }}>

        {/* Step 1: Contact Info */}
        <div style={{
          animation: step === 0 ? 'slideIn 0.4s ease' : 'slideOut 0.3s ease forwards',
          opacity: step === 0 ? 1 : 0,
          pointerEvents: step === 0 ? 'auto' : 'none',
          position: step === 0 ? 'relative' : 'absolute',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Your Name</label>
              <input
                type="text"
                required
                autoFocus
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Jane Smith"
                style={inputStyle(!!formData.name)}
                onFocus={(e) => e.target.style.borderColor = 'rgba(232,180,184,0.5)'}
                onBlur={(e) => e.target.style.borderColor = formData.name ? 'rgba(232,180,184,0.35)' : 'rgba(232,180,184,0.18)'}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@studio.com"
                style={inputStyle(!!formData.email)}
                onFocus={(e) => e.target.style.borderColor = 'rgba(232,180,184,0.5)'}
                onBlur={(e) => e.target.style.borderColor = formData.email ? 'rgba(232,180,184,0.35)' : 'rgba(232,180,184,0.18)'}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={labelStyle}>Phone (optional)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                style={inputStyle(false)}
                onFocus={(e) => e.target.style.borderColor = 'rgba(232,180,184,0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(232,180,184,0.18)'}
              />
            </div>
            <div>
              <label style={labelStyle}>Student Count</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.studentCount}
                  onChange={(e) => handleChange('studentCount', e.target.value)}
                  style={{ ...inputStyle(false), appearance: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(232,180,184,0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(232,180,184,0.18)'}
                >
                  <option value="<100" style={{ background: '#1c1418' }}>&lt; 100</option>
                  <option value="101-200" style={{ background: '#1c1418' }}>101 – 200</option>
                  <option value=">201" style={{ background: '#1c1418' }}>&gt; 201</option>
                </select>
                <ChevronDown style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: C.textFainter, pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(1)}
            disabled={!formData.name || !formData.email}
            style={{
              width: '100%',
              marginTop: 28,
              padding: '14px 24px',
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              cursor: formData.name && formData.email ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: formData.name && formData.email ? 1 : 0.4,
              ...pinkButton,
            }}
            onMouseEnter={(e) => formData.name && formData.email && (e.target.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => formData.name && formData.email && (e.target.style.transform = 'translateY(0)')}
          >
            Next
          </button>
        </div>

        {/* Step 2: Details */}
        <div style={{
          animation: step === 1 ? 'slideIn 0.4s ease' : 'slideOut 0.3s ease forwards',
          opacity: step === 1 ? 1 : 0,
          pointerEvents: step === 1 ? 'auto' : 'none',
          position: step === 1 ? 'relative' : 'absolute',
        }}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>What are you hoping to see?</label>
            <textarea
              value={formData.expectations}
              onChange={(e) => handleChange('expectations', e.target.value)}
              placeholder="Tell us what's important to your studio..."
              rows={6}
              style={{ ...inputStyle(false), resize: 'none' }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(232,180,184,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(232,180,184,0.18)'}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: C.text, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={formData.preferPhone}
                onChange={(e) => handleChange('preferPhone', e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.rose }}
              />
              <span>Text me for a quick follow-up</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: C.text, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={formData.subscribeNewsletter}
                onChange={(e) => handleChange('subscribeNewsletter', e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.rose }}
              />
              <span>Subscribe to Sequins updates and insights</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => setStep(0)}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'transparent',
                border: '1px solid rgba(232,180,184,0.25)',
                color: C.textFaint,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(232,180,184,0.08)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                ...pinkButton,
              }}
              onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
            >
              {loading && <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>

          {error && <p style={{ fontSize: 12, color: '#e77', marginTop: 16, textAlign: 'center' }}>Something went wrong. Try again?</p>}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-20px); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}