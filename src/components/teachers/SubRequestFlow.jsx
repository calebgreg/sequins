import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const SubRequestFlow = ({ onClose, classes = [], teacherName }) => {
  const [stage, setStage] = useState('input'); // input, thinking, suggestion, picking, confirmed, sending, error
  const [inputValue, setInputValue] = useState('');
  const [dots, setDots] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);

  // Fetch all teachers
  const { data: allTeachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  // Filter out the requesting teacher and get available subs
  const availableSubs = allTeachers
    .filter(t => t.name !== teacherName && t.email)
    .map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      initials: t.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??',
      styles: t.styles || [],
    }));

  const selectedSub = availableSubs[selectedSubIndex] || availableSubs[0];
  const otherSubsCount = Math.max(0, availableSubs.length - 1);

  // Simulate Gene thinking
  useEffect(() => {
    if (stage === 'thinking') {
      const interval = setInterval(() => {
        setDots(d => d.length >= 3 ? '' : d + '.');
      }, 400);
      
      const timer = setTimeout(() => {
        setStage('suggestion');
      }, 2400);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [stage]);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setStage('thinking');
    }
  };

  const handleConfirm = async () => {
    if (!selectedSub) {
      setEmailError('No available substitute teachers found');
      setStage('error');
      return;
    }

    setStage('sending');
    setEmailError(null);

    const emailSubject = `Sub Request: Can you cover a class?`;
    const emailBody = `
Hi ${selectedSub.name.split(' ')[0]},

${teacherName || 'A teacher'} needs a sub and you've been recommended as the best match.

Request: ${inputValue}

Can you cover this class? Just reply to this email to let us know.

Thanks!
— Gene (Studio Assistant)
    `.trim();

    const response = await base44.functions.invoke('sendNylasEmail', {
      to: selectedSub.email,
      subject: emailSubject,
      body: emailBody,
    });

    if (response.data?.success) {
      setStage('confirmed');
    } else {
      setEmailError(response.data?.error || 'Failed to send email');
      setStage('error');
    }
  };

  const handleSelectSub = (index) => {
    setSelectedSubIndex(index);
    setStage('suggestion');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDone = () => {
    if (onClose) {
      onClose();
    }
    setStage('input');
    setInputValue('');
  };

  // Format classes for quick options
  const quickClasses = classes.slice(0, 3).map(c => {
    const dayMap = { M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat', U: 'Sun' };
    const hour = Math.floor(c.start_time);
    const ampm = hour >= 12 ? 'p' : 'a';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${c.title} — ${dayMap[c.day] || c.day} ${displayHour}${ampm}`;
  });

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: 'rgba(180,170,160,0.3)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div 
        className="relative w-full max-w-lg rounded-[32px] overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, rgba(255,253,252,0.98) 0%, rgba(253,248,246,0.95) 100%)',
          boxShadow: '0 30px 100px -20px rgba(160,140,130,0.25), inset 0 1px 1px rgba(255,255,255,0.9)',
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, rgba(180,160,190,0.2) 0%, rgba(160,140,170,0.15) 100%)',
              }}
            >
              <span style={{ color: '#9a8aad', fontSize: '18px' }}>✦</span>
            </div>
            <div>
              <h2 className="text-lg font-medium" style={{ color: '#8b7d72' }}>Gene</h2>
              <p className="text-xs" style={{ color: '#b5a599' }}>Sub coordinator</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-black/5"
            style={{ color: '#b5a599' }}
          >
            ✕
          </button>
        </div>

        {/* Conversation Area */}
        <div className="px-8 pb-6 min-h-[280px]">
          
          {/* Initial State */}
          {stage === 'input' && (
            <div className="space-y-6">
              <p className="text-lg leading-relaxed" style={{ color: '#8b7d72' }}>
                What do you need covered?
              </p>
              
              {/* Natural input */}
              <div 
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.08)',
                }}
              >
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. I can't make Junior Jazz next Wednesday..."
                  rows={3}
                  className="w-full bg-transparent outline-none resize-none text-base placeholder:text-[#c4b5ab]"
                  style={{ color: '#6b5d52' }}
                  autoFocus
                />
              </div>

              {/* Quick options */}
              {quickClasses.length > 0 && (
                <div>
                  <p className="text-xs mb-3" style={{ color: '#c4b5ab' }}>or pick a class</p>
                  <div className="flex flex-wrap gap-2">
                    {quickClasses.map((cls) => (
                      <button
                        key={cls}
                        onClick={() => setInputValue(`I need a sub for ${cls.split(' — ')[0]} this week`)}
                        className="px-4 py-2 rounded-xl text-sm transition-all hover:scale-[1.02]"
                        style={{
                          background: 'rgba(255,255,255,0.5)',
                          color: '#a8998e',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 1px 3px rgba(180,150,140,0.08)',
                        }}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Thinking State */}
          {stage === 'thinking' && (
            <div className="space-y-6">
              {/* User message */}
              <div className="flex justify-end">
                <div 
                  className="px-5 py-3 rounded-2xl rounded-br-lg max-w-[85%]"
                  style={{
                    background: 'linear-gradient(145deg, rgba(200,170,156,0.25) 0%, rgba(185,155,140,0.2) 100%)',
                    color: '#7a6d62',
                  }}
                >
                  {inputValue}
                </div>
              </div>

              {/* Gene thinking */}
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(145deg, rgba(180,160,190,0.2) 0%, rgba(160,140,170,0.15) 100%)',
                  }}
                >
                  <span style={{ color: '#9a8aad', fontSize: '14px' }}>✦</span>
                </div>
                <div 
                  className="px-5 py-3 rounded-2xl rounded-bl-lg"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    color: '#a8998e',
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    Checking availability
                    <span className="w-8 text-left">{dots}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Suggestion State */}
          {stage === 'suggestion' && selectedSub && (
            <div className="space-y-5">
              {/* User message */}
              <div className="flex justify-end">
                <div 
                  className="px-5 py-3 rounded-2xl rounded-br-lg max-w-[85%]"
                  style={{
                    background: 'linear-gradient(145deg, rgba(200,170,156,0.25) 0%, rgba(185,155,140,0.2) 100%)',
                    color: '#7a6d62',
                  }}
                >
                  {inputValue}
                </div>
              </div>

              {/* Gene response */}
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                  style={{
                    background: 'linear-gradient(145deg, rgba(180,160,190,0.2) 0%, rgba(160,140,170,0.15) 100%)',
                  }}
                >
                  <span style={{ color: '#9a8aad', fontSize: '14px' }}>✦</span>
                </div>
                <div className="flex-1 space-y-4">
                  <div 
                    className="px-5 py-4 rounded-2xl rounded-bl-lg"
                    style={{
                      background: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <p className="leading-relaxed" style={{ color: '#6b5d52' }}>
                      Got it — I found your class.
                    </p>
                    <p className="mt-3 leading-relaxed" style={{ color: '#6b5d52' }}>
                      {availableSubs.length} teacher{availableSubs.length !== 1 ? 's' : ''} can cover this. <strong>{selectedSub.name.split(' ')[0]} {selectedSub.name.split(' ')[1]?.[0] || ''}.</strong> is recommended as the best match.
                    </p>
                  </div>

                  {/* Recommendation card */}
                  <div 
                    className="rounded-2xl p-4"
                    style={{
                      background: 'linear-gradient(145deg, rgba(126,184,154,0.1) 0%, rgba(140,190,165,0.08) 100%)',
                      border: '1px solid rgba(126,184,154,0.2)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: 'rgba(255,255,255,0.8)',
                          boxShadow: '0 2px 8px rgba(126,184,154,0.15)',
                        }}
                      >
                        <span className="text-base font-medium" style={{ color: '#7eb89a' }}>{selectedSub.initials}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: '#5a7d6a' }}>{selectedSub.name}</p>
                        <p className="text-sm" style={{ color: '#7eb89a' }}>
                          Recommended • Available
                        </p>
                      </div>
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(126,184,154,0.2)' }}
                      >
                        <span style={{ color: '#7eb89a', fontSize: '12px' }}>✓</span>
                      </div>
                    </div>
                  </div>

                  {/* Other options hint */}
                  {otherSubsCount > 0 && (
                    <button 
                      onClick={() => setStage('picking')}
                      className="text-sm transition-colors hover:opacity-70"
                      style={{ color: '#b5a599' }}
                    >
                      See {otherSubsCount} other available teacher{otherSubsCount !== 1 ? 's' : ''} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Picking State - Show all available teachers */}
          {stage === 'picking' && (
            <div className="space-y-5">
              {/* User message */}
              <div className="flex justify-end">
                <div 
                  className="px-5 py-3 rounded-2xl rounded-br-lg max-w-[85%]"
                  style={{
                    background: 'linear-gradient(145deg, rgba(200,170,156,0.25) 0%, rgba(185,155,140,0.2) 100%)',
                    color: '#7a6d62',
                  }}
                >
                  {inputValue}
                </div>
              </div>

              {/* Gene response */}
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                  style={{
                    background: 'linear-gradient(145deg, rgba(180,160,190,0.2) 0%, rgba(160,140,170,0.15) 100%)',
                  }}
                >
                  <span style={{ color: '#9a8aad', fontSize: '14px' }}>✦</span>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-sm mb-2" style={{ color: '#8b7d72' }}>
                    Pick a teacher to contact:
                  </p>

                  {/* All available teachers */}
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {availableSubs.map((sub, index) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSelectSub(index)}
                        className="w-full rounded-2xl p-4 transition-all hover:scale-[1.01] text-left"
                        style={{
                          background: index === selectedSubIndex 
                            ? 'linear-gradient(145deg, rgba(126,184,154,0.1) 0%, rgba(140,190,165,0.08) 100%)'
                            : 'rgba(255,255,255,0.5)',
                          border: index === selectedSubIndex 
                            ? '1px solid rgba(126,184,154,0.2)'
                            : '1px solid transparent',
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              background: 'rgba(255,255,255,0.8)',
                              boxShadow: '0 2px 8px rgba(180,150,140,0.1)',
                            }}
                          >
                            <span className="text-sm font-medium" style={{ color: index === selectedSubIndex ? '#7eb89a' : '#a8998e' }}>
                              {sub.initials}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium" style={{ color: index === selectedSubIndex ? '#5a7d6a' : '#6b5d52' }}>
                              {sub.name}
                            </p>
                            {sub.styles.length > 0 && (
                              <p className="text-xs" style={{ color: '#b5a599' }}>
                                {sub.styles.slice(0, 3).join(' • ')}
                              </p>
                            )}
                          </div>
                          {index === selectedSubIndex && (
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(126,184,154,0.2)' }}
                            >
                              <span style={{ color: '#7eb89a', fontSize: '10px' }}>✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmed State */}
          {stage === 'confirmed' && (
            <div className="space-y-5">
              {/* Previous messages condensed */}
              <div className="flex justify-end">
                <div 
                  className="px-5 py-3 rounded-2xl rounded-br-lg max-w-[85%]"
                  style={{
                    background: 'linear-gradient(145deg, rgba(200,170,156,0.25) 0%, rgba(185,155,140,0.2) 100%)',
                    color: '#7a6d62',
                  }}
                >
                  {inputValue}
                </div>
              </div>

              {/* Confirmation */}
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                  style={{
                    background: 'linear-gradient(145deg, rgba(126,184,154,0.25) 0%, rgba(140,190,165,0.2) 100%)',
                  }}
                >
                  <span style={{ color: '#7eb89a', fontSize: '14px' }}>✓</span>
                </div>
                <div 
                  className="px-5 py-4 rounded-2xl rounded-bl-lg flex-1"
                  style={{
                    background: 'linear-gradient(145deg, rgba(126,184,154,0.12) 0%, rgba(140,190,165,0.08) 100%)',
                    border: '1px solid rgba(126,184,154,0.15)',
                  }}
                >
                  <p className="font-medium mb-2" style={{ color: '#5a7d6a' }}>
                    Done. Reaching out to {selectedSub?.name?.split(' ')[0] || 'them'} now.
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: '#7a9a88' }}>
                    I'll email you when she confirms. If she can't do it, I'll automatically ask Emma or James next.
                  </p>
                </div>
              </div>

              {/* What happens next */}
              <div 
                className="rounded-2xl p-5 mt-4"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                }}
              >
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#c4b5ab' }}>
                  What happens next
                </p>
                <div className="space-y-3">
                  {[
                    { status: 'done', text: 'Request submitted' },
                    { status: 'active', text: `${selectedSub?.name?.split(' ')[0] || 'Sub'} notified via email` },
                    { status: 'pending', text: 'Waiting for response' },
                    { status: 'pending', text: 'Schedule updated automatically' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: step.status === 'done' 
                            ? 'rgba(126,184,154,0.2)'
                            : step.status === 'active'
                            ? 'rgba(212,165,116,0.2)'
                            : 'rgba(200,190,180,0.15)',
                        }}
                      >
                        {step.status === 'done' && <span style={{ color: '#7eb89a', fontSize: '10px' }}>✓</span>}
                        {step.status === 'active' && <span style={{ color: '#d4a574', fontSize: '10px' }}>●</span>}
                        {step.status === 'pending' && <span style={{ color: '#c4b5ab', fontSize: '10px' }}>○</span>}
                      </div>
                      <span 
                        className="text-sm"
                        style={{ 
                          color: step.status === 'done' 
                            ? '#7eb89a' 
                            : step.status === 'active'
                            ? '#d4a574'
                            : '#b5a599'
                        }}
                      >
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Area */}
        <div 
          className="px-8 py-6"
          style={{ 
            background: 'rgba(250,245,243,0.5)',
            borderTop: '1px solid rgba(200,180,170,0.1)',
          }}
        >
          {stage === 'input' && (
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="w-full py-4 rounded-2xl text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100"
              style={{
                background: inputValue.trim() 
                  ? 'linear-gradient(145deg, rgba(200,170,156,0.9) 0%, rgba(185,155,140,0.85) 100%)'
                  : 'rgba(200,190,180,0.3)',
                color: inputValue.trim() ? '#fff' : '#b5a599',
                boxShadow: inputValue.trim() 
                  ? '0 8px 24px -8px rgba(180,150,140,0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                  : 'none',
              }}
            >
              Ask Gene
            </button>
          )}

          {(stage === 'suggestion' || stage === 'picking') && selectedSub && (
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                className="w-full py-4 rounded-2xl text-sm font-medium transition-all hover:scale-[1.01]"
                style={{
                  background: 'linear-gradient(145deg, rgba(126,184,154,0.9) 0%, rgba(110,170,140,0.85) 100%)',
                  color: '#fff',
                  boxShadow: '0 8px 24px -8px rgba(126,184,154,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
                }}
              >
                Yes, ask {selectedSub.name.split(' ')[0]} first
              </button>
              {stage === 'picking' && (
                <button
                  onClick={() => setStage('suggestion')}
                  className="w-full py-3 rounded-xl text-sm transition-colors"
                  style={{ color: '#b5a599' }}
                >
                  Back
                </button>
              )}
            </div>
          )}

          {stage === 'sending' && (
            <div className="w-full py-4 rounded-2xl text-sm font-medium text-center" style={{ color: '#a8998e' }}>
              Sending email...
            </div>
          )}

          {stage === 'error' && (
            <div className="space-y-3">
              <div className="text-sm text-center text-red-500 mb-2">
                {emailError}
              </div>
              <button
                onClick={handleConfirm}
                className="w-full py-4 rounded-2xl text-sm font-medium transition-all hover:scale-[1.01]"
                style={{
                  background: 'linear-gradient(145deg, rgba(200,170,156,0.9) 0%, rgba(185,155,140,0.85) 100%)',
                  color: '#fff',
                }}
              >
                Try again
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm transition-colors"
                style={{ color: '#b5a599' }}
              >
                Cancel
              </button>
            </div>
          )}

          {stage === 'confirmed' && (
            <button
              onClick={handleDone}
              className="w-full py-4 rounded-2xl text-sm font-medium transition-all"
              style={{
                background: 'rgba(255,255,255,0.6)',
                color: '#a8998e',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.08)',
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubRequestFlow;