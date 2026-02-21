import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { motion } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const dayNames = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday', S: 'Saturday', U: 'Sunday' };
const dayOrder = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];

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

  const { data: bookingData, isLoading: isLoadingData } = useQuery({
    queryKey: ['trialBookingData', studioId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getTrialBookingData', { studio_id: studioId });
      return res.data;
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

    const response = await base44.functions.invoke('bookTrial', {
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

  if (!studioId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <p className="text-gray-500">Missing studio_id parameter.</p>
      </div>
    );
  }

  const inputStyle = "w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all bg-white";
  const labelStyle = "block text-sm font-medium text-gray-600 mb-1.5";

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">You're All Set!</h1>
          <p className="text-gray-500 mb-6">
            {form.child_name} is booked for <strong>{submittedData?.class?.title}</strong>.
            {form.parent_phone && " We sent you a confirmation text."}
          </p>
          <p className="text-sm text-gray-400">See you at {studio?.name}! 💃</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Studio Header */}
        <div className="text-center mb-8">
          {studio?.logo_url && (
            <img src={studio.logo_url} alt={studio.name} className="h-12 mx-auto mb-3 object-contain" />
          )}
          <h1 className="text-2xl font-bold text-gray-800">{studio?.name || 'Studio'}</h1>
          <p className="text-gray-500 mt-1">Book a Free Trial Class</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${s <= step ? 'w-12 bg-rose-300' : 'w-8 bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Step 1: About Your Child */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">About Your Child</h2>

            <div>
              <label className={labelStyle}>Child's First Name *</label>
              <input className={inputStyle} value={form.child_name} onChange={e => handleFieldChange('child_name', e.target.value)} placeholder="Emma" />
            </div>

            <div>
              <label className={labelStyle}>Child's Age</label>
              <input className={inputStyle} type="number" value={form.child_age} onChange={e => handleFieldChange('child_age', e.target.value)} placeholder="6" />
            </div>

            <div>
              <label className={labelStyle}>Any dance experience?</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: 'none', l: 'None' }, { v: 'a_little', l: 'A Little' }, { v: 'some', l: 'Some' }].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => handleFieldChange('dance_experience', opt.v)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${form.dance_experience === opt.v ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelStyle}>What sounds fun?</label>
              <div className="flex flex-wrap gap-2">
                {['Ballet', 'Tap', 'Hip Hop', 'Jazz', 'Not Sure'].map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleInterest(style.toLowerCase())}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${form.interests.includes(style.toLowerCase()) ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.child_name.trim()}
              className="w-full py-3.5 rounded-xl bg-rose-400 text-white font-semibold text-base hover:bg-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 2: Parent Info */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Your Info</h2>

            <div>
              <label className={labelStyle}>Your First Name *</label>
              <input className={inputStyle} value={form.parent_name} onChange={e => handleFieldChange('parent_name', e.target.value)} placeholder="Sarah" />
            </div>

            <div>
              <label className={labelStyle}>Phone Number *</label>
              <input className={inputStyle} type="tel" value={form.parent_phone} onChange={e => handleFieldChange('parent_phone', e.target.value)} placeholder="(555) 123-4567" />
            </div>

            <div>
              <label className={labelStyle}>Email</label>
              <input className={inputStyle} type="email" value={form.parent_email} onChange={e => handleFieldChange('parent_email', e.target.value)} placeholder="sarah@email.com" />
            </div>

            <div>
              <label className={labelStyle}>How did you hear about us?</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: 'friend', l: '👫 A Friend' }, { v: 'social_media', l: '📱 Social Media' }, { v: 'google', l: '🔍 Google' }, { v: 'event', l: '🎉 Event' }, { v: 'other', l: '💬 Other' }].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => handleFieldChange('how_heard', opt.v)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${form.how_heard === opt.v ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {form.how_heard === 'friend' && (
              <div>
                <label className={labelStyle}>Who referred you? (optional)</label>
                <input className={inputStyle} value={form.referral_name} onChange={e => handleFieldChange('referral_name', e.target.value)} placeholder="Their name" />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-medium flex items-center justify-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!form.parent_name.trim() || !form.parent_phone.trim()}
                className="flex-1 py-3.5 rounded-xl bg-rose-400 text-white font-semibold flex items-center justify-center gap-2 hover:bg-rose-500 transition-all disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Pick a Class */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Pick a Class</h2>

            {/* Group by day */}
            <div className="space-y-4">
              {dayOrder.filter(d => availableClasses.some(c => c.day === d)).map(day => (
                <div key={day}>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">{dayNames[day]}</h3>
                  <div className="space-y-2">
                    {availableClasses.filter(c => c.day === day).sort((a, b) => a.start_time - b.start_time).map(cls => {
                      const selected = form.class_id === cls.id;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleFieldChange('class_id', cls.id)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selected ? 'border-rose-300 bg-rose-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className={`font-semibold ${selected ? 'text-rose-600' : 'text-gray-700'}`}>{cls.title}</div>
                              <div className="text-sm text-gray-500 mt-0.5">
                                {formatTime(cls.start_time)} · {Math.round((cls.duration || 1) * 60)} min
                                {cls.teacher && ` · ${cls.teacher}`}
                              </div>
                            </div>
                            {selected && <Check className="w-5 h-5 text-rose-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-medium flex items-center justify-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.class_id || isSubmitting}
                className="flex-1 py-3.5 rounded-xl bg-rose-400 text-white font-semibold flex items-center justify-center gap-2 hover:bg-rose-500 transition-all disabled:opacity-40"
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