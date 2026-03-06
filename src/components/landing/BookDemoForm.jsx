import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Loader2 } from 'lucide-react';

const C = {
  rose: '#c4a0a0',
  roseDark: '#8a7070',
  text: '#6b5d55',
  textFaint: '#8b7d72',
  textFainter: '#a89890',
  sage: '#7eb89a',
  bg: '#fdf9f8',
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

const SEQUINS_IMG = "url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0745a12ebbb83d6190412/d0c8e354b_ChatGPTImageFeb242026at10_46_54AM.png')";
const seqLabelText = {
  color: 'transparent',
  backgroundImage: SEQUINS_IMG,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, borderRadius: 16, maxWidth: 500, margin: '0 auto', background: 'rgba(126,184,154,0.12)' }}>
        <CheckCircle2 style={{ width: 20, height: 20, color: C.sage, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#5a7d6a', marginBottom: 4 }}>Thanks! We'll be in touch soon.</div>
          <div style={{ fontSize: 12, color: C.textFainter }}>Cassia will reach out within 24 hours.</div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{ fontSize: 24, fontWeight: 500, ...etchedText, marginBottom: 4 }}>see sequins in motion</h2>
        <p style={{ fontSize: 12, color: C.textFainter }}>Tell us about your studio so we can show you exactly what matters to you.</p>
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 8 }}>Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Jane Smith"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, border: '1px solid rgba(220,190,190,0.3)', background: 'rgba(255,255,255,0.7)', color: C.text, outline: 'none', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 8 }}>Cell</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="614-580-7763"
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 14, border: '1px solid rgba(220,190,190,0.3)', background: 'rgba(255,255,255,0.7)', color: C.text, outline: 'none', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', color: C.textFainter, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={formData.preferPhone}
                  onChange={(e) => handleChange('preferPhone', e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                text me
              </label>
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 8 }}>Work Email</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="jane@abcdance.com"
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 14, border: '1px solid rgba(220,190,190,0.3)', background: 'rgba(255,255,255,0.7)', color: C.text, outline: 'none', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', color: C.textFainter, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={formData.preferEmail}
                  onChange={(e) => handleChange('preferEmail', e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                email me
              </label>
            </div>
          </div>

          {/* Student Count */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 10 }}>Student count</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['<100', '101-200', '>201'].map(option => (
                <label key={option} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text, fontSize: 13 }}>
                  <input
                    type="radio"
                    name="studentCount"
                    value={option}
                    checked={formData.studentCount === option}
                    onChange={(e) => handleChange('studentCount', e.target.value)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Expectations */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 8 }}>What are you hoping to see?</label>
            <textarea
              value={formData.expectations}
              onChange={(e) => handleChange('expectations', e.target.value)}
              placeholder="I want..."
              rows={8}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, border: '1px solid rgba(220,190,190,0.3)', background: 'rgba(255,255,255,0.7)', color: C.text, outline: 'none', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)', fontFamily: 'inherit', resize: 'none' }}
            />
          </div>

          {/* Newsletter */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.textFaint, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.subscribeNewsletter}
              onChange={(e) => handleChange('subscribeNewsletter', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            Subscribe to our newsletter
          </label>
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '14px 40px',
            borderRadius: 24,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(145deg, rgba(254,247,247,0.95), rgba(252,231,231,0.9))',
            boxShadow: '0 6px 20px -4px rgba(180,150,140,0.3)',
            border: '1px solid rgba(220,190,190,0.4)',
            transition: 'all 0.2s',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
        >
          {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
          <span style={etchedText}>{loading ? 'Submitting...' : 'send'}</span>
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: '#d9534f', marginTop: 16, textAlign: 'center' }}>Something went wrong. Please try again.</p>}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}