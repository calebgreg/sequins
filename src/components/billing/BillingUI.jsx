import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { calculateTuition } from './TuitionBillingWizard';
import { createPageUrl } from '../../utils';
import { Play } from 'lucide-react';

// ============================================
// SEQUINS BILLING UI
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
};

// ============================================
// STATUS CHIP
// ============================================

const StatusChip = ({ status, detail }) => {
  const config = {
    paid: { bg: colors.successLight, text: colors.success, label: 'Paid' },
    pending: { bg: colors.warningLight, text: colors.warning, label: 'Pending' },
    overdue: { bg: colors.errorLight, text: colors.error, label: 'Overdue' },
    failed: { bg: colors.errorLight, text: colors.error, label: 'Failed' },
    draft: { bg: colors.warm, text: colors.muted, label: 'Draft' },
  };
  const c = config[status] || config.pending;
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status === 'paid' && (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {c.label}
      {detail && <span className="opacity-70">· {detail}</span>}
    </span>
  );
};

// ============================================
// MONEY DISPLAY
// ============================================

const Money = ({ amount, size = 'md', muted = false }) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl font-bold',
  };
  
  return (
    <span className={`${sizes[size]} tabular-nums`} style={{ color: muted ? colors.muted : colors.ink }}>
      ${(amount || 0).toFixed(2)}
    </span>
  );
};

// ============================================
// HELPER: Build calculation input from family data
// ============================================

function buildCalculationInput(familyStudents, classes, studentIndex = 1) {
  return familyStudents.map((student, idx) => {
    const studentClasses = classes.filter(c => c.student_names?.includes(student.name));
    return {
      student: {
        name: student.name,
        indexInFamily: idx + 1,
        gender: student.gender,
      },
      family: {
        tags: student.tags || [],
      },
      classes: studentClasses.map(c => ({
        className: c.title,
        duration: (c.duration || 1) * 60, // Convert hours to minutes
        category: c.style,
      })),
    };
  });
}

// ============================================
// 1. BILLING OVERVIEW (Admin Dashboard)
// ============================================

export function BillingOverview({ onSelectFamily }) {
  const [filter, setFilter] = useState('all');
  
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: tuitionRules = [] } = useQuery({
    queryKey: ['tuitionRules'],
    queryFn: () => base44.entities.TuitionRule.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  // Group students by family and calculate bills
  const families = useMemo(() => {
    const groups = {};
    students.filter(s => s.status === 'active' && s.parent_email).forEach(s => {
      if (!groups[s.parent_email]) {
        groups[s.parent_email] = {
          email: s.parent_email,
          name: s.parent_name || s.parent_email.split('@')[0],
          students: [],
        };
      }
      groups[s.parent_email].students.push(s);
    });

    // Calculate bill for each family
    return Object.values(groups).map(family => {
      const inputs = buildCalculationInput(family.students, classes);
      let totalAmount = 0;
      const calculations = [];

      // Convert rules to the format calculateTuition expects
      const rulesForCalc = tuitionRules.map(r => ({
        ...r,
        condition: r.conditions?.length > 0 ? { type: 'and', conditions: r.conditions.map(c => ({
          type: c.field,
          op: c.operator,
          value: c.field === 'class_count' || c.field === 'duration' || c.field === 'student_index' ? Number(c.value) : c.value,
          contains: c.value,
          equals: c.value,
          has: c.value,
        })) } : { type: 'always' },
      }));

      inputs.forEach(input => {
        if (input.classes.length > 0 && rulesForCalc.length > 0) {
          const result = calculateTuition(input, rulesForCalc);
          totalAmount += result.total;
          calculations.push(result);
        }
      });

      // Check for existing invoice this month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const existingInvoice = invoices.find(inv => 
        inv.parent_email === family.email && 
        inv.issue_date?.startsWith(currentMonth)
      );

      // Calculate days past due for overdue invoices
      let daysPastDue = null;
      let paidDate = null;
      if (existingInvoice?.status === 'overdue' && existingInvoice?.due_date) {
        const dueDate = new Date(existingInvoice.due_date);
        const today = new Date();
        daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      }
      if (existingInvoice?.status === 'paid' && existingInvoice?.updated_date) {
        paidDate = new Date(existingInvoice.updated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      return {
        ...family,
        amount: existingInvoice?.total_amount || totalAmount,
        status: existingInvoice?.status || 'draft',
        autopay: family.students[0]?.billing_method === 'auto_pay',
        calculations,
        invoiceId: existingInvoice?.id,
        daysPastDue,
        paidDate,
      };
    });
  }, [students, classes, tuitionRules, invoices]);

  const stats = {
    collected: families.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
    pending: families.filter(f => f.status === 'pending' || f.status === 'sent' || f.status === 'draft').reduce((s, f) => s + f.amount, 0),
    overdue: families.filter(f => f.status === 'overdue' || f.status === 'failed').reduce((s, f) => s + f.amount, 0),
  };
  
  const total = stats.collected + stats.pending + stats.overdue;
  const collectedPercent = total > 0 ? (stats.collected / total) * 100 : 0;
  
  const filtered = filter === 'all' 
    ? families 
    : families.filter(f => filter === 'overdue' ? (f.status === 'overdue' || f.status === 'failed') : f.status === filter);

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: colors.muted }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-4xl font-bold" style={{ color: colors.ink, letterSpacing: '-0.02em' }}>Billing</h1>
          </div>
          <Link
            to={createPageUrl('RunBilling')}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: colors.ink }}
          >
            <Play className="w-4 h-4 fill-current" />
            Run Billing
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="text-sm font-medium mb-1" style={{ color: colors.success }}>Collected</p>
            <Money amount={stats.collected} size="lg" />
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="text-sm font-medium mb-1" style={{ color: colors.warning }}>Pending</p>
            <Money amount={stats.pending} size="lg" />
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="text-sm font-medium mb-1" style={{ color: colors.error }}>Outstanding</p>
            <Money amount={stats.overdue} size="lg" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: colors.muted }}>{collectedPercent.toFixed(0)}% collected</span>
            <span className="text-sm" style={{ color: colors.muted }}><Money amount={total} size="sm" muted /> expected</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${collectedPercent}%`, backgroundColor: colors.success }}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'all', label: 'All families', count: families.length },
            { id: 'pending', label: 'Pending', count: families.filter(f => f.status === 'pending' || f.status === 'sent').length },
            { id: 'overdue', label: 'Needs attention', count: families.filter(f => f.status === 'overdue' || f.status === 'failed').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{ 
                backgroundColor: filter === tab.id ? colors.ink : colors.warm,
                color: filter === tab.id ? colors.paper : colors.muted,
              }}
            >
              {tab.label}
              {tab.count > 0 && filter !== tab.id && (
                <span className="ml-1.5 opacity-60">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Family List */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {filtered.length === 0 ? (
            <div className="p-12 text-center" style={{ color: colors.muted }}>
              No families found
            </div>
          ) : filtered.map((family, i) => (
            <button
              key={family.email}
              onClick={() => onSelectFamily(family)}
              className="w-full flex items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50"
              style={{ borderTop: i > 0 ? `1px solid ${colors.border}` : undefined }}
            >
              {/* Avatar */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: colors.warm, color: colors.ink }}
              >
                {family.name[0]?.toUpperCase()}
              </div>
              
              {/* Name & Students */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ color: colors.ink }}>{family.name}</p>
                <p className="text-sm truncate" style={{ color: colors.muted }}>
                  {family.students.map(s => s.name).join(', ')}
                </p>
              </div>
              
              {/* Autopay indicator */}
              {family.autopay && (
                <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: colors.warm, color: colors.muted }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Auto
                </div>
              )}
              
              {/* Amount */}
              <Money amount={family.amount} />
              
              {/* Status */}
              <div className="w-32 flex justify-end">
                <StatusChip 
                  status={family.status} 
                  detail={
                    family.status === 'paid' ? family.paidDate :
                    family.status === 'overdue' ? `${family.daysPastDue}d` :
                    family.status === 'failed' ? 'Retry' : undefined
                  }
                />
              </div>
              
              {/* Arrow */}
              <svg className="w-5 h-5" style={{ color: colors.muted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
        
      </div>
    </div>
  );
}

// ============================================
// 2. FAMILY BILLING DETAIL (Admin View)
// ============================================

export function FamilyBillingDetail({ family, onBack }) {
  const [showTrace, setShowTrace] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: tuitionRules = [] } = useQuery({
    queryKey: ['tuitionRules'],
    queryFn: () => base44.entities.TuitionRule.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  // Calculate current bill
  const billData = useMemo(() => {
    if (!family) return null;

    const inputs = buildCalculationInput(family.students, classes);
    const rulesForCalc = tuitionRules.map(r => ({
      ...r,
      condition: r.conditions?.length > 0 ? { type: 'and', conditions: r.conditions.map(c => ({
        type: c.field,
        op: c.operator,
        value: c.field === 'class_count' || c.field === 'duration' || c.field === 'student_index' ? Number(c.value) : c.value,
        contains: c.value,
        equals: c.value,
        has: c.value,
      })) } : { type: 'always' },
    }));

    let allClasses = [];
    let allDiscounts = [];
    let allFees = [];
    let allTrace = [];
    let total = 0;

    inputs.forEach(input => {
      if (input.classes.length > 0 && rulesForCalc.length > 0) {
        const result = calculateTuition(input, rulesForCalc);
        allClasses.push(...result.classes.map(c => ({ ...c, student: input.student.name })));
        allDiscounts.push(...result.discounts);
        allFees.push(...result.fees);
        allTrace.push(...result.trace);
        total += result.total;
      }
    });

    const subtotal = allClasses.reduce((s, c) => s + c.amount, 0);

    return {
      period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      lineItems: allClasses.map(c => ({ 
        description: `${c.student} - ${c.description}`, 
        amount: c.amount 
      })),
      subtotal,
      discounts: allDiscounts,
      fees: allFees,
      total,
      trace: allTrace,
    };
  }, [family, classes, tuitionRules]);

  // Get payment history
  const history = useMemo(() => {
    if (!family) return [];
    return invoices
      .filter(inv => inv.parent_email === family.email)
      .sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date))
      .slice(0, 6)
      .map(inv => ({
        period: new Date(inv.issue_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        amount: inv.total_amount,
        status: inv.status,
        date: new Date(inv.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }));
  }, [family, invoices]);

  if (!family || !billData) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center" style={{ backgroundColor: colors.paper }}>
        <p style={{ color: colors.muted }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-3xl mx-auto">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 mb-8 font-medium transition-colors"
          style={{ color: colors.muted }}
          onMouseEnter={e => e.currentTarget.style.color = colors.ink}
          onMouseLeave={e => e.currentTarget.style.color = colors.muted}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to billing
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: colors.warm, color: colors.ink }}
            >
              {family.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: colors.ink }}>{family.name} family</h1>
              <p style={{ color: colors.muted }}>{family.email}</p>
            </div>
          </div>
        </div>

        {/* Current Bill */}
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <div>
              <p className="text-sm font-medium" style={{ color: colors.muted }}>{billData.period}</p>
              <p className="text-2xl font-bold" style={{ color: colors.ink }}><Money amount={billData.total} size="lg" /></p>
            </div>
            <StatusChip status={family.status || 'draft'} />
          </div>
          
          {/* Line Items */}
          <div className="px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: colors.muted }}>Classes</p>
            {billData.lineItems.map((item, i) => (
              <div key={i} className="flex justify-between py-2">
                <span style={{ color: colors.ink }}>{item.description}</span>
                <Money amount={item.amount} size="sm" />
              </div>
            ))}
            
            <div className="my-4 h-px" style={{ backgroundColor: colors.border }} />
            
            <div className="flex justify-between py-2">
              <span style={{ color: colors.muted }}>Subtotal</span>
              <Money amount={billData.subtotal} size="sm" muted />
            </div>
            
            {billData.discounts.map((item, i) => (
              <div key={i} className="flex justify-between py-2">
                <span style={{ color: colors.success }}>{item.description}</span>
                <span style={{ color: colors.success }}>−${Math.abs(item.amount).toFixed(2)}</span>
              </div>
            ))}
            
            {billData.fees.map((item, i) => (
              <div key={i} className="flex justify-between py-2">
                <span style={{ color: colors.ink }}>{item.description}</span>
                <Money amount={item.amount} size="sm" />
              </div>
            ))}
            
            <div className="my-4 h-px" style={{ backgroundColor: colors.border }} />
            
            <div className="flex justify-between py-2">
              <span className="font-semibold" style={{ color: colors.ink }}>Total</span>
              <span className="font-semibold" style={{ color: colors.ink }}>${billData.total.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Show Your Work */}
          <div style={{ borderTop: `1px solid ${colors.border}` }}>
            <button
              onClick={() => setShowTrace(!showTrace)}
              className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ color: colors.muted }}
            >
              <span>Show calculation</span>
              <svg 
                className={`w-4 h-4 transition-transform ${showTrace ? 'rotate-180' : ''}`} 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showTrace && (
              <div className="px-6 pb-4">
                <div 
                  className="p-4 rounded-xl font-mono text-xs leading-relaxed"
                  style={{ backgroundColor: colors.warm, color: colors.ink }}
                >
                  {billData.trace.map((line, i) => (
                    <div key={i} className={line.startsWith('─') ? 'my-2' : ''}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: colors.muted }}>Payment history</p>
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {history.map((h, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between px-6 py-4"
                  style={{ borderTop: i > 0 ? `1px solid ${colors.border}` : undefined }}
                >
                  <div>
                    <p className="font-medium" style={{ color: colors.ink }}>{h.period}</p>
                    <p className="text-sm" style={{ color: colors.muted }}>{h.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Money amount={h.amount} />
                    <StatusChip status={h.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

// ============================================
// 3. PARENT BILL VIEW
// ============================================

export function ParentBillView({ parentEmail }) {
  const [showTrace, setShowTrace] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: tuitionRules = [] } = useQuery({
    queryKey: ['tuitionRules'],
    queryFn: () => base44.entities.TuitionRule.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['studio_settings'],
    queryFn: () => base44.entities.StudioSettings.list(),
  });

  const settings = settingsList[0] || {};

  // Get family students
  const familyStudents = useMemo(() => 
    students.filter(s => s.parent_email === parentEmail),
  [students, parentEmail]);

  // Calculate bill
  const billData = useMemo(() => {
    if (familyStudents.length === 0) return null;

    const inputs = buildCalculationInput(familyStudents, classes);
    const rulesForCalc = tuitionRules.map(r => ({
      ...r,
      condition: r.conditions?.length > 0 ? { type: 'and', conditions: r.conditions.map(c => ({
        type: c.field,
        op: c.operator,
        value: c.field === 'class_count' || c.field === 'duration' || c.field === 'student_index' ? Number(c.value) : c.value,
        contains: c.value,
        equals: c.value,
        has: c.value,
      })) } : { type: 'always' },
    }));

    const studentBreakdowns = [];
    let allDiscounts = [];
    let allFees = [];
    let allTrace = [];
    let total = 0;

    inputs.forEach((input, idx) => {
      const studentClasses = classes.filter(c => c.student_names?.includes(input.student.name));
      
      if (input.classes.length > 0 && rulesForCalc.length > 0) {
        const result = calculateTuition(input, rulesForCalc);
        studentBreakdowns.push({
          name: input.student.name,
          classes: studentClasses.map(c => ({
            name: c.title,
            duration: (c.duration || 1) * 60,
            day: c.day,
            price: result.classes.find(rc => rc.description.includes(c.title))?.amount || 0,
          })),
        });
        allDiscounts.push(...result.discounts);
        allFees.push(...result.fees);
        allTrace.push(...result.trace);
        total += result.total;
      }
    });

    // Check for existing invoice
    const currentMonth = new Date().toISOString().slice(0, 7);
    const existingInvoice = invoices.find(inv => 
      inv.parent_email === parentEmail && 
      inv.issue_date?.startsWith(currentMonth)
    );

    return {
      period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      students: studentBreakdowns,
      discounts: allDiscounts,
      fees: allFees,
      total: existingInvoice?.total_amount || total,
      trace: allTrace,
      status: existingInvoice?.status || 'pending',
      paidDate: existingInvoice?.status === 'paid' ? new Date(existingInvoice.updated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
    };
  }, [familyStudents, classes, tuitionRules, invoices, parentEmail]);

  if (!billData) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: colors.paper }}>
        <p style={{ color: colors.muted }}>No billing information available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-lg mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8 pt-4">
          <p className="text-sm font-medium mb-1" style={{ color: colors.muted }}>{settings.name || 'Dance Studio'}</p>
          <h1 className="text-3xl font-bold mb-1" style={{ color: colors.ink }}>{billData.period}</h1>
          <StatusChip status={billData.status} detail={billData.paidDate} />
        </div>

        {/* Amount Due */}
        <div 
          className="rounded-3xl p-8 text-center mb-6"
          style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <p className="text-sm mb-2" style={{ color: colors.muted }}>
            {billData.status === 'paid' ? 'Amount paid' : 'Amount due'}
          </p>
          <p className="text-5xl font-bold mb-6" style={{ color: colors.ink, letterSpacing: '-0.02em' }}>
            ${billData.total.toFixed(2)}
          </p>
          {billData.status === 'paid' ? (
            <div 
              className="w-full py-4 rounded-2xl font-semibold text-lg"
              style={{ backgroundColor: colors.successLight, color: colors.success }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Paid on {billData.paidDate}
              </span>
            </div>
          ) : (
            <button 
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all"
              style={{ backgroundColor: colors.ink, color: colors.paper }}
            >
              Pay now
            </button>
          )}
        </div>

        {/* Breakdown */}
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <p className="font-semibold" style={{ color: colors.ink }}>What's included</p>
          </div>
          
          {billData.students.map((student, si) => (
            <div key={si} className="px-5 py-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <p className="font-medium mb-2" style={{ color: colors.ink }}>{student.name}</p>
              {student.classes.map((cls, ci) => (
                <div key={ci} className="flex justify-between py-1.5 text-sm">
                  <span style={{ color: colors.muted }}>{cls.name}</span>
                  <span style={{ color: colors.ink }}>${cls.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ))}
          
          {/* Discounts */}
          {billData.discounts.length > 0 && (
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <p className="font-medium mb-2" style={{ color: colors.success }}>Discounts applied</p>
              {billData.discounts.map((d, i) => (
                <div key={i} className="flex justify-between py-1.5 text-sm">
                  <span style={{ color: colors.success }}>{d.description}</span>
                  <span style={{ color: colors.success }}>−${Math.abs(d.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Total */}
          <div className="px-5 py-4 flex justify-between">
            <span className="font-semibold" style={{ color: colors.ink }}>Total</span>
            <span className="font-semibold" style={{ color: colors.ink }}>${billData.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Show Your Work */}
        <button
          onClick={() => setShowTrace(!showTrace)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
          style={{ color: colors.muted }}
        >
          {showTrace ? 'Hide' : 'Show'} how this was calculated
          <svg 
            className={`w-4 h-4 transition-transform ${showTrace ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showTrace && (
          <div 
            className="mt-4 p-4 rounded-xl font-mono text-xs leading-relaxed"
            style={{ backgroundColor: colors.warm, color: colors.ink }}
          >
            {billData.trace.map((line, i) => (
              <div key={i} className={line.startsWith('─') ? 'my-2' : ''}>{line}</div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
}

// ============================================
// VIEW SWITCHER
// ============================================

const ViewSwitcher = ({ view, onViewChange }) => (
  <div className="fixed top-4 right-4 z-50 flex gap-1 p-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
    {[
      { id: 'overview', label: 'Admin: Overview' },
      { id: 'detail', label: 'Admin: Family' },
      { id: 'parent', label: 'Parent View' },
    ].map(v => (
      <button
        key={v.id}
        onClick={() => onViewChange(v.id)}
        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
        style={{ 
          backgroundColor: view === v.id ? '#fff' : 'transparent',
          color: view === v.id ? '#000' : '#fff',
        }}
      >
        {v.label}
      </button>
    ))}
  </div>
);

// ============================================
// MAIN EXPORT
// ============================================

export default function BillingUI() {
  const [view, setView] = useState('overview');
  const [selectedFamily, setSelectedFamily] = useState(null);

  // For parent view, get first family's email as demo
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const demoParentEmail = students.find(s => s.parent_email)?.parent_email;

  const handleViewChange = (newView) => {
    if (newView === 'detail' && !selectedFamily) {
      // If switching to detail without a family selected, stay on overview
      return;
    }
    setView(newView);
  };
  
  return (
    <div>
      <ViewSwitcher view={view} onViewChange={handleViewChange} />
      
      {view === 'overview' && (
        <BillingOverview onSelectFamily={(family) => { setSelectedFamily(family); setView('detail'); }} />
      )}
      {view === 'detail' && selectedFamily && (
        <FamilyBillingDetail family={selectedFamily} onBack={() => { setView('overview'); setSelectedFamily(null); }} />
      )}
      {view === 'parent' && (
        <ParentBillView parentEmail={demoParentEmail} />
      )}
    </div>
  );
}