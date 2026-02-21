import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const PUBLIC_FUNCTIONS_BASE = window.location.origin.replace('preview-sandbox--', 'api--') + '/api';

async function callPublicFunction(name, payload) {
  const res = await fetch(`${PUBLIC_FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

const dayNames = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday', S: 'Saturday', U: 'Sunday' };
const dayOrder = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];

// Etched text styles matching the app's design language
const etchedTextStyle = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

const mutedTextStyle = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4b5ab 0%, #a89585 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

function formatTime(startTime) {
  const h = Math.floor(startTime);
  const m = Math.round((startTime % 1) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${dh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function TrialBooking() {
  const urlParams = new URLSearchParams(window.location.search);
  const studioId = urlParams.get('studio_id');

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const [form, setForm] = useState({
    child_name: '',
    child_age: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    how_heard: '',
    referral_name: '',
    dance_experience: 'none',
    interests: [],
    class_id: '',
    trial_date: '',
  });

  const { data: bookingData, isLoading: isLoadingData, error: loadError } = useQuery({
    queryKey: ['trialBookingData', studioId],
    queryFn: async () => {
      return callPublicFunction('getTrialBookingData', { studio_id: studioId });
    },
    enabled: !!studioId,
  });

  const studio = bookingData?.studio;
  const availableClasses = bookingData?.classes || [];

  // Compute next date for a given day code
  const getNextDateForDay = (dayCode) => {
    const today = new Date();
    const currentDay = today.getDay();
    const dayMap = { U: 0, M: 1, T: 2, W: 3, R: 4, F: 5, S: 6 };
    const target = dayMap[dayCode];
    let diff = target - currentDay;
    if (diff <= 0) diff += 7;
    const next = new Date(today);
    next.setDate(today.getDate() + diff);
    return format(next, 'yyyy-MM-dd');
  };

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (style) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(style)
        ? prev.interests.filter(i => i !== style)
        : [...prev.interests, style],
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const selectedClass = availableClasses.find(c => c.id === form.class_id);
    const trialDate = form.trial_date || (selectedClass ? getNextDateForDay(selectedClass.day) : '');

    const response = await callPublicFunction('bookTrial', {
      studio_id: studioId,
      child_name: form.child_name.trim(),
      child_age: form.child_age,
      parent_name: form.parent_name.trim(),
      parent_phone: form.parent_phone.trim(),
      parent_email: form.parent_email.trim(),
      how_heard: form.how_heard,
      referral_name: form.referral_name.trim(),
      dance_experience: form.dance_experience,
      interests: form.interests,
      class_id: form.class_id,
      trial_date: trialDate,
    });

    setSubmittedData({ class: selectedClass, date: trialDate });
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const pageBg = {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #FEF7F7 0%, #FDF4F4 50%, #FEF8F8 100%)',
  };

  const glassCard = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(200,180,170,0.1), 0 20px 60px -20px rgba(180,150,140,0.25)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(255,230,230,0.3)',
  };

  if (!studioId) {
    return (
      <div style={pageBg} className="flex items-center justify-center p-6">
        <p style={mutedTextStyle} className="text-sm font-medium">Missing studio_id parameter.</p>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div style={pageBg} className="flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#c4a0a0' }} />
      </div>
    );
  }

  // Success screen
  if (submitted) {
    return (
      <div style={pageBg} className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md p-10 rounded-3xl"
          style={glassCard}
        >
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)', boxShadow: '0 8px 24px -8px rgba(180,150,140,0.25), inset 0 1px 1px rgba(255,255,255,1)' }}
          >
            <Check className="w-10 h-10" style={{ color: '#8a7070' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={etchedTextStyle}>You're All Set!</h1>
          <p className="mb-6 text-sm" style={{ color: '#a89585' }}>
            {form.child_name} is booked for <strong style={{ color: '#8a7070' }}>{submittedData?.class?.title}</strong>.
            {form.parent_phone && " We sent you a confirmation text."}
          </p>
          <p className="text-sm" style={mutedTextStyle}>See you at {studio?.name}! 💃</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={pageBg}>
      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Studio Header */}
        <div className="text-center mb-8">
          {studio?.logo_url && (
            <img src={studio.logo_url} alt={studio.name} className="h-12 mx-auto mb-3 object-contain" />
          )}
          <h1 className="text-2xl font-bold" style={etchedTextStyle}>{studio?.name || 'Studio'}</h1>
          <p className="mt-1 text-sm font-medium" style={mutedTextStyle}>Book a Free Trial Class</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: s <= step ? 48 : 32,
                background: s <= step 
                  ? 'linear-gradient(90deg, #c4a0a0, #8a7070)' 
                  : 'rgba(200,180,170,0.2)',
              }}
            />
          ))}
        </div>

        {/* Step 1: About Your Child */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5 p-6 rounded-3xl" style={glassCard}>
            <h2 className="text-lg font-bold" style={etchedTextStyle}>About Your Child</h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={mutedTextStyle}>Child's First Name *</label>
              <input className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(200,180,170,0.2)', color: '#8a7070', boxShadow: 'inset 0 2px 4px rgba(200,180,170,0.08)' }} value={form.child_name} onChange={e => handleFieldChange('child_name', e.target.value)} placeholder="Emma" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={mutedTextStyle}>Child's Age</label>
              <input className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(200,180,170,0.2)', color: '#8a7070', boxShadow: 'inset 0 2px 4px rgba(200,180,170,0.08)' }} type="number" value={form.child_age} onChange={e => handleFieldChange('child_age', e.target.value)} placeholder="6" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={mutedTextStyle}>Any dance experience?</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: 'none', l: 'None' }, { v: 'a_little', l: 'A Little' }, { v: 'some', l: 'Some' }].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => handleFieldChange('dance_experience', opt.v)}
                    className="py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: form.dance_experience === opt.v 
                        ? 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)' 
                        : 'rgba(255,255,255,0.4)',
                      boxShadow: form.dance_experience === opt.v 
                        ? '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)' 
                        : 'none',
                      border: form.dance_experience === opt.v ? '1px solid rgba(200,180,170,0.3)' : '1px solid transparent',
                      color: form.dance_experience === opt.v ? '#8a7070' : '#b5a599',
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={mutedTextStyle}>What sounds fun?</label>
              <div className="flex flex-wrap gap-2">
                {['Ballet', 'Tap', 'Hip Hop', 'Jazz', 'Not Sure'].map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleInterest(style.toLowerCase())}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                    style={{
                      background: form.interests.includes(style.toLowerCase())
                        ? 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)'
                        : 'rgba(255,255,255,0.4)',
                      boxShadow: form.interests.includes(style.toLowerCase())
                        ? '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)'
                        : 'none',
                      border: form.interests.includes(style.toLowerCase()) ? '1px solid rgba(200,180,170,0.3)' : '1px solid transparent',
                      color: form.interests.includes(style.toLowerCase()) ? '#8a7070' : '#b5a599',
                    }}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.child_name.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(145deg, #c4a0a0 0%, #8a7070 100%)',
                color: 'white',
                boxShadow: '0 8px 24px -8px rgba(138,112,112,0.4)',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 2: Parent Info */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5 p-6 rounded-3xl" style={glassCard}>
            <h2 className="text-lg font-bold" style={etchedTextStyle}>Your Info</h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={mutedTextStyle}>Your First Name *</label>
              <input className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(200,180,170,0.2)', color: '#8a7070', boxShadow: 'inset 0 2px 4px rgba(200,180,170,0.08)' }} value={form.parent_name} onChange={e => handleFieldChange('parent_name', e.target.value)} placeholder="Sarah" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={mutedTextStyle}>Phone Number *</label>
              <input className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(200,180,170,0.2)', color: '#8a7070', boxShadow: 'inset 0 2px 4px rgba(200,180,170,0.08)' }} type="tel" value={form.parent_phone} onChange={e => handleFieldChange('parent_phone', e.target.value)} placeholder="(555) 123-4567" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={mutedTextStyle}>Email</label>
              <input className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(200,180,170,0.2)', color: '#8a7070', boxShadow: 'inset 0 2px 4px rgba(200,180,170,0.08)' }} type="email" value={form.parent_email} onChange={e => handleFieldChange('parent_email', e.target.value)} placeholder="sarah@email.com" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={mutedTextStyle}>How did you hear about us?</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: 'friend', l: '👫 A Friend' }, { v: 'social_media', l: '📱 Social Media' }, { v: 'google', l: '🔍 Google' }, { v: 'event', l: '🎉 Event' }, { v: 'other', l: '💬 Other' }].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => handleFieldChange('how_heard', opt.v)}
                    className="py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: form.how_heard === opt.v
                        ? 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)'
                        : 'rgba(255,255,255,0.4)',
                      boxShadow: form.how_heard === opt.v
                        ? '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)'
                        : 'none',
                      border: form.how_heard === opt.v ? '1px solid rgba(200,180,170,0.3)' : '1px solid transparent',
                      color: form.how_heard === opt.v ? '#8a7070' : '#b5a599',
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {form.how_heard === 'friend' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={mutedTextStyle}>Who referred you? (optional)</label>
                <input className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(200,180,170,0.2)', color: '#8a7070', boxShadow: 'inset 0 2px 4px rgba(200,180,170,0.08)' }} value={form.referral_name} onChange={e => handleFieldChange('referral_name', e.target.value)} placeholder="Their name" />
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)} 
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(200,180,170,0.2)', color: '#b5a599' }}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!form.parent_name.trim() || !form.parent_phone.trim()}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(145deg, #c4a0a0 0%, #8a7070 100%)',
                  color: 'white',
                  boxShadow: '0 8px 24px -8px rgba(138,112,112,0.4)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Pick a Class */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5 p-6 rounded-3xl" style={glassCard}>
            <h2 className="text-lg font-bold" style={etchedTextStyle}>Pick a Class</h2>

            {/* Group by day */}
            <div className="space-y-4">
              {dayOrder.filter(d => availableClasses.some(c => c.day === d)).map(day => (
                <div key={day}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={mutedTextStyle}>{dayNames[day]}</h3>
                  <div className="space-y-2">
                    {availableClasses.filter(c => c.day === day).sort((a, b) => a.start_time - b.start_time).map(cls => {
                      const selected = form.class_id === cls.id;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleFieldChange('class_id', cls.id)}
                          className="w-full text-left p-4 rounded-xl transition-all"
                          style={{
                            background: selected 
                              ? 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)'
                              : 'rgba(255,255,255,0.4)',
                            boxShadow: selected 
                              ? '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)'
                              : 'none',
                            border: selected ? '2px solid rgba(196,160,160,0.4)' : '2px solid transparent',
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold text-sm" style={{ color: selected ? '#8a7070' : '#b5a599' }}>{cls.title}</div>
                              <div className="text-xs mt-0.5" style={{ color: '#b5a599' }}>
                                {formatTime(cls.start_time)} · {Math.round((cls.duration || 1) * 60)} min
                                {cls.teacher && ` · ${cls.teacher}`}
                              </div>
                            </div>
                            {selected && <Check className="w-5 h-5" style={{ color: '#8a7070' }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setStep(2)} 
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(200,180,170,0.2)', color: '#b5a599' }}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.class_id || isSubmitting}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(145deg, #c4a0a0 0%, #8a7070 100%)',
                  color: 'white',
                  boxShadow: '0 8px 24px -8px rgba(138,112,112,0.4)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Book Trial'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}