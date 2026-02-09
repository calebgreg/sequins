import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { format, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import { calculateTuition } from '../components/billing/TuitionBillingWizard';

// ============================================
// DESIGN TOKENS
// ============================================

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  warm: '#f5f3ef',
  accent: '#e85d04',
  muted: '#8a8478',
  border: '#e8e6e1',
  success: '#2d6a4f',
  successLight: '#dcfce7',
  warning: '#b45309',
  warningLight: '#fef3c7',
  error: '#dc2626',
  errorLight: '#fee2e2',
  blue: '#2563eb',
  blueLight: '#dbeafe',
};

// ============================================
// HELPER COMPONENTS
// ============================================

const Money = ({ amount, size = 'md' }) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-semibold',
    xl: 'text-3xl font-bold',
  };
  return (
    <span className={`${sizes[size]} tabular-nums`}>
      ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
};

const Pill = ({ children, color = 'default' }) => {
  const styles = {
    default: { bg: colors.warm, text: colors.muted },
    success: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    error: { bg: colors.errorLight, text: colors.error },
    blue: { bg: colors.blueLight, text: colors.blue },
  };
  const s = styles[color];
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {children}
    </span>
  );
};

const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const IconX = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconMail = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const IconWarning = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const IconCard = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const Spinner = ({ size = 20 }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ============================================
// HELPERS
// ============================================

function isCardExpired(month, year) {
  if (!month || !year) return false;
  const now = new Date();
  const expiry = new Date(year, month, 0);
  return expiry < now;
}

function buildCalculationInput(student, allStudentsInFamily, classes, studentIndex) {
  const studentClasses = classes.filter(c => c.student_names?.includes(student.name));
  return {
    student: {
      name: student.name,
      indexInFamily: studentIndex,
      gender: student.gender,
    },
    family: {
      tags: student.tags || [],
    },
    classes: studentClasses.map(c => ({
      className: c.title,
      duration: (c.duration || 1) * 60,
      category: c.style,
    })),
  };
}

function convertRuleForCalculation(rule) {
  const conditionMap = {
    'class_count': (c) => ({ type: 'class_count', op: c.operator, value: Number(c.value) }),
    'duration': (c) => ({ type: 'duration', op: c.operator, value: Number(c.value) }),
    'student_index': (c) => ({ type: 'student_index', op: c.operator, value: Number(c.value) }),
    'class_name': (c) => ({ type: 'class_name', contains: c.value }),
    'class_category': (c) => ({ type: 'class_category', equals: c.value }),
    'family_tag': (c) => ({ type: 'family_tag', has: c.value }),
  };

  let condition = { type: 'always' };
  if (rule.conditions?.length > 0) {
    const mappedConditions = rule.conditions.map(c => {
      const mapper = conditionMap[c.field];
      return mapper ? mapper(c) : { type: 'always' };
    });
    condition = mappedConditions.length === 1 
      ? mappedConditions[0] 
      : { type: 'and', conditions: mappedConditions };
  }

  return { ...rule, condition };
}

// ============================================
// PREVIEW STATE
// ============================================

function PreviewState({ data, onConfirm, onCancel }) {
  const [expandedFamily, setExpandedFamily] = useState(null);
  
  const autopayFamilies = data.families.filter(f => f.paymentStatus === 'autopay' && !f.isCardExpired);
  const invoiceFamilies = data.families.filter(f => f.paymentStatus === 'invoice' || f.paymentStatus === 'no_method');
  const expiredCards = data.families.filter(f => f.isCardExpired);
  
  const grandTotal = data.families.reduce((s, f) => s + f.total, 0);
  const hasProblems = expiredCards.length > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-2xl mx-auto p-8">
        
        {/* Header */}
        <div className="mb-10">
          <button 
            onClick={onCancel}
            className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
            style={{ color: colors.muted }}
            onMouseEnter={e => e.currentTarget.style.color = colors.ink}
            onMouseLeave={e => e.currentTarget.style.color = colors.muted}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to billing
          </button>
          
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: colors.accent }}>Run billing</p>
              <h1 className="text-4xl font-bold" style={{ color: colors.ink, letterSpacing: '-0.02em' }}>{data.period}</h1>
            </div>
            <p className="text-sm" style={{ color: colors.muted }}>Bills on {data.billingDate}</p>
          </div>
        </div>

        {/* Summary Card */}
        <div 
          className="rounded-3xl p-8 mb-6"
          style={{ 
            backgroundColor: '#fef7f7',
            boxShadow: 'inset 0 2px 12px rgba(180, 120, 120, 0.08), inset 0 1px 3px rgba(180, 120, 120, 0.05)',
          }}
        >
          <div className="text-center mb-8">
            <p className="text-sm mb-2" style={{ color: colors.muted }}>{data.families.length} families</p>
            <p 
              className="text-5xl font-bold tracking-tight"
              style={{ 
                color: 'transparent',
                backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
                filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
              }}
            >
              ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="flex justify-center gap-3">
            <div 
              className="px-6 py-4 rounded-2xl text-center min-w-[100px]"
              style={{ backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <p className="text-2xl font-bold" style={{ color: colors.ink }}>{autopayFamilies.length}</p>
              <p className="text-xs mt-0.5" style={{ color: colors.muted }}>auto-pay</p>
            </div>
            <div 
              className="px-6 py-4 rounded-2xl text-center min-w-[100px]"
              style={{ backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <p className="text-2xl font-bold" style={{ color: colors.ink }}>{invoiceFamilies.length}</p>
              <p className="text-xs mt-0.5" style={{ color: colors.muted }}>invoice</p>
            </div>
            {hasProblems && (
              <div 
                className="px-6 py-4 rounded-2xl text-center"
                style={{ backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <p className="text-2xl font-bold" style={{ color: colors.error }}>{expiredCards.length}</p>
                <p className="text-xs mt-0.5" style={{ color: colors.error }}>need attention</p>
              </div>
            )}
          </div>
        </div>

        {/* Problems Alert */}
        {hasProblems && (
          <div 
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ backgroundColor: colors.warm, border: `1px solid ${colors.border}` }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.errorLight, color: colors.error }}>
              <IconWarning />
            </div>
            <div className="flex-1">
              <p className="font-medium" style={{ color: colors.ink }}>
                {expiredCards.length} families need attention before billing
              </p>
              <p className="text-sm" style={{ color: colors.muted }}>
                {expiredCards.length} expired card{expiredCards.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Family List */}
        <div className="mb-8">
          <p className="text-sm font-medium mb-3" style={{ color: colors.muted }}>
            Preview all {data.families.length} families
          </p>
          
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {data.families.map((family, i) => (
              <div key={family.parentEmail}>
                <button
                  onClick={() => setExpandedFamily(expandedFamily === family.parentEmail ? null : family.parentEmail)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
                  style={{ borderTop: i > 0 ? `1px solid ${colors.border}` : undefined }}
                >
                  {/* Status icon */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: colors.warm,
                      color: family.isCardExpired || family.paymentStatus === 'no_method' 
                        ? colors.error 
                        : colors.muted,
                    }}
                  >
                    {family.isCardExpired || family.paymentStatus === 'no_method' ? <IconWarning /> : 
                     family.paymentStatus === 'invoice' ? <IconMail /> : <IconCard />}
                  </div>
                  
                  {/* Name & students */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ color: colors.ink }}>{family.parentName}</p>
                    <p className="text-sm truncate" style={{ color: colors.muted }}>
                      {family.students.map(s => s.name).join(', ')}
                    </p>
                  </div>
                  
                  {/* Tags */}
                  {family.isCardExpired && <Pill color="error">Expired</Pill>}
                  {(family.paymentStatus === 'invoice' || family.paymentStatus === 'no_method') && <Pill color="blue">Invoice</Pill>}
                  {family.paymentStatus === 'autopay' && !family.isCardExpired && (
                    <span className="text-xs" style={{ color: colors.muted }}>
                      {family.cardBrand} ····{family.cardLast4}
                    </span>
                  )}
                  
                  {/* Amount */}
                  <p className="font-semibold tabular-nums" style={{ color: colors.ink }}>
                    <Money amount={family.total} />
                  </p>
                  
                  {/* Expand icon */}
                  <svg 
                    className={`w-5 h-5 transition-transform ${expandedFamily === family.parentEmail ? 'rotate-180' : ''}`}
                    style={{ color: colors.muted }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Expanded breakdown */}
                {expandedFamily === family.parentEmail && (
                  <div className="px-5 pb-4" style={{ backgroundColor: colors.warm }}>
                    <div className="py-3">
                      {family.lineItems.map((item, j) => (
                        <div key={j} className="flex justify-between py-1 text-sm">
                          <span style={{ color: item.amount < 0 ? colors.success : colors.ink }}>{item.description}</span>
                          <span style={{ color: item.amount < 0 ? colors.success : colors.ink }}>
                            {item.amount < 0 ? '−' : ''}${Math.abs(item.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 mt-2 font-medium" style={{ borderTop: `1px solid ${colors.border}` }}>
                        <span style={{ color: colors.ink }}>Total</span>
                        <span style={{ color: colors.ink }}>${family.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl font-semibold transition-all"
            style={{ backgroundColor: colors.warm, color: colors.ink }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.border}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.warm}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-[2] py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: colors.ink, color: colors.paper }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Run billing for {autopayFamilies.length + invoiceFamilies.length} families
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
        
      </div>
    </div>
  );
}

// ============================================
// RUNNING STATE
// ============================================

function RunningState({ data, onComplete }) {
  const queryClient = useQueryClient();
  const [results, setResults] = useState(
    data.families.map(f => ({ familyId: f.parentEmail, status: 'pending' }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= data.families.length) {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setTimeout(() => onComplete(results), 800);
      return;
    }

    const family = data.families[currentIndex];
    
    // Mark as processing
    setResults(prev => prev.map(r => 
      r.familyId === family.parentEmail ? { ...r, status: 'processing' } : r
    ));

    // Process family
    const processFamily = async () => {
      let newStatus;
      let message;

      if (family.isCardExpired) {
        newStatus = 'failed';
        message = 'Card expired';
      } else {
        // Create invoice
        try {
          await base44.entities.Invoice.create({
            studio_id: studioId,
            parent_email: family.parentEmail,
            parent_name: family.parentName,
            title: `Tuition - ${data.period}`,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
            status: family.paymentStatus === 'autopay' ? 'paid' : 'sent',
            items: family.lineItems,
            subtotal: family.total,
            total_amount: family.total,
            amount_paid: family.paymentStatus === 'autopay' ? family.total : 0,
            balance_due: family.paymentStatus === 'autopay' ? 0 : family.total,
          });

          if (family.paymentStatus === 'invoice') {
            newStatus = 'invoiced';
            message = 'Invoice sent';
          } else {
            newStatus = 'success';
            message = 'Charged';
          }
        } catch (error) {
          newStatus = 'failed';
          message = 'Error processing';
        }
      }

      setResults(prev => prev.map(r => 
        r.familyId === family.parentEmail ? { ...r, status: newStatus, message } : r
      ));
      setCurrentIndex(i => i + 1);
    };

    const timeout = setTimeout(processFamily, 400 + Math.random() * 300);
    return () => clearTimeout(timeout);
  }, [currentIndex, data.families, queryClient]);

  const processed = results.filter(r => r.status !== 'pending' && r.status !== 'processing').length;
  const progress = (processed / data.families.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-lg w-full p-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.warm }}>
            <Spinner size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.ink }}>Running billing...</h1>
          <p style={{ color: colors.muted }}>{processed} of {data.families.length} families processed</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: colors.success }}
            />
          </div>
        </div>

        {/* Live feed */}
        <div 
          className="rounded-2xl overflow-hidden max-h-80 overflow-y-auto"
          style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          {data.families.map((family, i) => {
            const result = results.find(r => r.familyId === family.parentEmail);
            if (!result || result.status === 'pending') return null;
            
            return (
              <motion.div 
                key={family.parentEmail}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderTop: i > 0 ? `1px solid ${colors.border}` : undefined }}
              >
                {/* Status icon */}
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ 
                    backgroundColor: colors.warm,
                    color: result.status === 'processing' ? colors.muted :
                      result.status === 'success' ? colors.success :
                      result.status === 'invoiced' ? colors.ink : colors.error,
                  }}
                >
                  {result.status === 'processing' ? <Spinner size={14} /> :
                   result.status === 'success' ? <IconCheck /> :
                   result.status === 'invoiced' ? <IconMail /> : <IconX />}
                </div>
                
                {/* Family name */}
                <span className="flex-1 font-medium" style={{ color: colors.ink }}>{family.parentName}</span>
                
                {/* Amount */}
                <span className="tabular-nums" style={{ color: colors.muted }}>${family.total.toFixed(2)}</span>
                
                {/* Status text */}
                <span 
                  className="text-sm font-medium w-24 text-right"
                  style={{ 
                    color: result.status === 'processing' ? colors.muted :
                      result.status === 'success' ? colors.success :
                      result.status === 'invoiced' ? colors.blue : colors.error,
                  }}
                >
                  {result.message || 'Processing...'}
                </span>
              </motion.div>
            );
          })}
        </div>
        
      </div>
    </div>
  );
}

// ============================================
// COMPLETE STATE
// ============================================

function CompleteState({ data, results, onDone }) {
  const successful = results.filter(r => r.status === 'success');
  const invoiced = results.filter(r => r.status === 'invoiced');
  const failed = results.filter(r => r.status === 'failed');
  
  const successAmount = successful.reduce((s, r) => s + (data.families.find(f => f.parentEmail === r.familyId)?.total || 0), 0);
  const invoiceAmount = invoiced.reduce((s, r) => s + (data.families.find(f => f.parentEmail === r.familyId)?.total || 0), 0);
  const failedAmount = failed.reduce((s, r) => s + (data.families.find(f => f.parentEmail === r.familyId)?.total || 0), 0);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-lg w-full p-8">
        
        {/* Success header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.successLight }}
          >
            <svg className="w-10 h-10" style={{ color: colors.success }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.ink }}>Billing complete!</h1>
          <p style={{ color: colors.muted }}>{data.period}</p>
        </div>

        {/* Results summary */}
        <div 
          className="rounded-3xl p-6 mb-6"
          style={{ backgroundColor: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
        >
          {successful.length > 0 && (
            <div className="flex items-center justify-between py-3" style={{ borderBottom: (invoiced.length > 0 || failed.length > 0) ? `1px solid ${colors.border}` : undefined }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.warm, color: colors.success }}>
                  <IconCheck />
                </div>
                <p className="font-medium" style={{ color: colors.ink }}>{successful.length} charged</p>
              </div>
              <p className="text-xl font-semibold" style={{ color: colors.ink }}><Money amount={successAmount} size="lg" /></p>
            </div>
          )}
          
          {invoiced.length > 0 && (
            <div className="flex items-center justify-between py-3" style={{ borderBottom: failed.length > 0 ? `1px solid ${colors.border}` : undefined }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.warm, color: colors.ink }}>
                  <IconMail />
                </div>
                <p className="font-medium" style={{ color: colors.ink }}>{invoiced.length} invoiced</p>
              </div>
              <p className="text-xl font-semibold" style={{ color: colors.ink }}><Money amount={invoiceAmount} size="lg" /></p>
            </div>
          )}
          
          {failed.length > 0 && (
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.warm, color: colors.error }}>
                  <IconWarning />
                </div>
                <div>
                  <p className="font-medium" style={{ color: colors.ink }}>{failed.length} failed</p>
                  <p className="text-sm" style={{ color: colors.muted }}>Will retry in 24hrs</p>
                </div>
              </div>
              <p className="text-xl font-semibold" style={{ color: colors.ink }}><Money amount={failedAmount} size="lg" /></p>
            </div>
          )}
        </div>

        {/* Failed families detail */}
        {failed.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium mb-3" style={{ color: colors.muted }}>Needs attention</p>
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {failed.map((result, i) => {
                const family = data.families.find(f => f.parentEmail === result.familyId);
                if (!family) return null;
                return (
                  <div 
                    key={result.familyId}
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderTop: i > 0 ? `1px solid ${colors.border}` : undefined }}
                  >
                    <div>
                      <p className="font-medium" style={{ color: colors.ink }}>{family.parentName}</p>
                      <p className="text-sm" style={{ color: colors.error }}>{result.message}</p>
                    </div>
                    <button 
                      className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ backgroundColor: colors.warm, color: colors.ink }}
                    >
                      Contact
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Done button */}
        <button
          onClick={onDone}
          className="w-full py-4 rounded-2xl font-semibold transition-all"
          style={{ backgroundColor: colors.ink, color: colors.paper }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Done
        </button>
        
        <p className="text-center text-sm mt-4" style={{ color: colors.muted }}>
          A summary has been sent to your email
        </p>
        
      </div>
    </div>
  );
}

// ============================================
// LOADING STATE
// ============================================

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.paper }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.warm }}>
          <Spinner size={32} />
        </div>
        <p style={{ color: colors.muted }}>Calculating tuition...</p>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function RunBilling() {
  const navigate = useNavigate();
  const [state, setState] = useState('preview');
  const [previewData, setPreviewData] = useState(null);
  const [results, setResults] = useState([]);
  const [isCalculating, setIsCalculating] = useState(true);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  // Data Fetching
  const { data: students = [] } = useQuery({
    queryKey: ['students', studioId],
    queryFn: () => base44.entities.Student.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: families = [] } = useQuery({
    queryKey: ['families', studioId],
    queryFn: () => base44.entities.Family.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', studioId],
    queryFn: () => base44.entities.DanceClass.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: tuitionRules = [] } = useQuery({
    queryKey: ['tuitionRules', studioId],
    queryFn: () => base44.entities.TuitionRule.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  // Calculate preview on mount
  useEffect(() => {
    if (students.length > 0 && studioId && !previewData) {
      calculatePreview();
    }
  }, [students, tuitionRules, studioId]);

  const calculatePreview = () => {
    setIsCalculating(true);
    const rulesForCalc = tuitionRules
      .filter(r => r.active !== false)
      .map(convertRuleForCalculation);

    // Group active students by parent_email
    const studentsByFamily = {};
    students.filter(s => s.status === 'active' && s.parent_email).forEach(s => {
      if (!studentsByFamily[s.parent_email]) {
        studentsByFamily[s.parent_email] = [];
      }
      studentsByFamily[s.parent_email].push(s);
    });

    const familyBills = [];

    Object.entries(studentsByFamily).forEach(([parentEmail, familyStudents]) => {
      const familyRecord = families.find(f => f.parent_email === parentEmail);
      const paymentStatus = familyRecord?.payment_status || 'no_method';
      const cardExpired = isCardExpired(familyRecord?.card_expiry_month, familyRecord?.card_expiry_year);

      let familyTotal = 0;
      const allLineItems = [];

      familyStudents.forEach((student, idx) => {
        const input = buildCalculationInput(student, familyStudents, classes, idx + 1);
        
        if (input.classes.length > 0 && rulesForCalc.length > 0) {
          const result = calculateTuition(input, rulesForCalc);
          
          result.classes.forEach(c => {
            allLineItems.push({
              description: `${student.name} - ${c.description}`,
              amount: c.amount,
              student_name: student.name,
            });
          });

          result.discounts.forEach(d => {
            allLineItems.push({
              description: d.description,
              amount: d.amount,
            });
          });

          result.fees.forEach(f => {
            allLineItems.push({
              description: f.description,
              amount: f.amount,
            });
          });

          familyTotal += result.total;
        }
      });

      if (familyTotal > 0) {
        familyBills.push({
          parentEmail,
          parentName: familyRecord?.parent_name || familyStudents[0]?.parent_name || parentEmail.split('@')[0],
          students: familyStudents,
          paymentStatus,
          cardLast4: familyRecord?.card_last4,
          cardBrand: familyRecord?.card_brand,
          isCardExpired: cardExpired,
          total: familyTotal,
          lineItems: allLineItems,
        });
      }
    });

    const now = new Date();
    setPreviewData({
      period: format(now, 'MMMM yyyy'),
      billingDate: format(now, 'MMMM d, yyyy'),
      families: familyBills,
    });
    setIsCalculating(false);
  };

  const handleBack = () => {
    navigate('/Billing');
  };

  if (isCalculating) {
    return <LoadingState />;
  }

  return (
    <>
      {state === 'preview' && previewData && (
        <PreviewState 
          data={previewData}
          onConfirm={() => setState('running')}
          onCancel={handleBack}
        />
      )}
      
      {state === 'running' && previewData && (
        <RunningState 
          data={previewData}
          onComplete={(r) => {
            setResults(r);
            setState('complete');
          }}
        />
      )}
      
      {state === 'complete' && previewData && (
        <CompleteState 
          data={previewData}
          results={results}
          onDone={handleBack}
        />
      )}
    </>
  );
}