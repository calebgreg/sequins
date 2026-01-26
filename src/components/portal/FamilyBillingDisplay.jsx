import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { DollarSign } from 'lucide-react';

// ============================================
// DESIGN TOKENS
// ============================================

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  warm: '#f5f3ef',
  muted: '#8a8478',
  border: '#e8e6e1',
  success: '#2d6a4f',
  successLight: '#dcfce7',
  error: '#dc2626',
  accent: '#e85d04',
  frost: '#fef7f7',
  frostShadow: 'rgba(180, 120, 120, 0.08)',
  frostDeep: 'rgba(180, 120, 120, 0.05)',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

// ============================================
// ETCHED TEXT COMPONENT
// ============================================

const EtchedText = ({ children, size = 'lg' }) => {
  const sizes = {
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  };
  
  return (
    <span
      className={`${sizes[size]} font-bold tracking-tight`}
      style={{
        color: 'transparent',
        backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
      }}
    >
      {children}
    </span>
  );
};

// ============================================
// FROSTED CARD COMPONENT
// ============================================

const FrostedCard = ({ children, className = '' }) => (
  <div
    className={`rounded-3xl p-5 ${className}`}
    style={{
      backgroundColor: colors.frost,
      boxShadow: `inset 0 2px 12px ${colors.frostShadow}, inset 0 1px 3px ${colors.frostDeep}`,
    }}
  >
    {children}
  </div>
);

// ============================================
// WHITE CARD COMPONENT
// ============================================

const WhiteCard = ({ children, className = '', onClick }) => (
  <div
    className={`rounded-2xl bg-white ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    onClick={onClick}
  >
    {children}
  </div>
);

// ============================================
// STATUS PILL
// ============================================

const StatusPill = ({ status }) => {
  const config = {
    upcoming: { bg: colors.warm, text: colors.muted, label: 'Upcoming' },
    due: { bg: '#fef3c7', text: '#b45309', label: 'Due' },
    paid: { bg: colors.successLight, text: colors.success, label: 'Paid' },
    overdue: { bg: '#fee2e2', text: colors.error, label: 'Overdue' },
    sent: { bg: '#fef3c7', text: '#b45309', label: 'Pending' },
    pending: { bg: '#fef3c7', text: '#b45309', label: 'Pending' },
    draft: { bg: colors.warm, text: colors.muted, label: 'Draft' },
  };
  const c = config[status] || config.pending;
  
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status === 'paid' && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {c.label}
    </span>
  );
};

// ============================================
// ICONS
// ============================================

const IconChevron = ({ direction = 'right' }) => {
  const rotations = { right: '', down: 'rotate-90', up: '-rotate-90' };
  return (
    <svg className={`w-5 h-5 ${rotations[direction]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
};

const IconCard = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const IconReceipt = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
  </svg>
);

// ============================================
// FULL BILLING COMPONENT
// ============================================

function FamilyBilling({ parentEmail, studioName = 'Dance Studio', isPreview = false }) {
  const [activeTab, setActiveTab] = useState('current');

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['familyBillingInvoices', parentEmail],
    queryFn: async () => {
      if (!parentEmail) return [];
      const all = await base44.entities.Invoice.list('-issue_date', 20);
      return all.filter(inv => inv.parent_email === parentEmail);
    },
    enabled: !!parentEmail && !isPreview,
  });

  // Fetch family info
  const { data: family } = useQuery({
    queryKey: ['familyBillingFamily', parentEmail],
    queryFn: async () => {
      if (!parentEmail) return null;
      const families = await base44.entities.Family.filter({ parent_email: parentEmail });
      return families[0] || null;
    },
    enabled: !!parentEmail && !isPreview,
  });

  // Sample data for preview
  const sampleData = {
    currentBalance: 316.92,
    dueDate: 'Feb 1',
    autopay: true,
    cardBrand: 'Visa',
    cardLast4: '4242',
    currentBill: {
      period: 'February 2026',
      status: 'upcoming',
      items: [
        { student: 'Emma', class: 'Ballet III', duration: '60min', amount: 87.00 },
        { student: 'Emma', class: 'Jazz II', duration: '45min', amount: 75.00 },
        { student: 'Olivia', class: 'Pre-Ballet', duration: '45min', amount: 75.00 },
      ],
      subtotal: 237.00,
      discounts: [
        { name: 'Sibling discount', detail: '10% off 2nd student', amount: -7.50 },
      ],
      fees: [],
      total: 229.50,
    },
    history: [
      { period: 'January 2026', amount: 229.50, status: 'paid', date: 'Jan 3' },
      { period: 'December 2025', amount: 229.50, status: 'paid', date: 'Dec 2' },
    ],
  };

  // Use real data or sample for preview
  const currentInvoice = invoices.find(inv => inv.status === 'sent' || inv.status === 'pending' || inv.status === 'draft');
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');

  const data = isPreview ? sampleData : {
    currentBalance: currentInvoice?.balance_due || currentInvoice?.total_amount || 0,
    dueDate: currentInvoice?.due_date ? new Date(currentInvoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
    autopay: family?.payment_status === 'autopay',
    cardBrand: family?.card_brand || '',
    cardLast4: family?.card_last4 || '',
    currentBill: {
      period: currentInvoice?.title || 'Current Period',
      status: currentInvoice?.status || 'pending',
      items: currentInvoice?.items || [],
      subtotal: currentInvoice?.subtotal || 0,
      discounts: [],
      fees: [],
      total: currentInvoice?.total_amount || 0,
    },
    history: paidInvoices.map(inv => ({
      period: inv.title || 'Payment',
      amount: inv.total_amount,
      status: inv.status,
      date: new Date(inv.updated_date || inv.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
  };

  const bill = data.currentBill;

  return (
    <div 
      className="min-h-[80vh] pb-8 overflow-y-auto max-h-[85vh]"
      style={{ backgroundColor: colors.paper }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-sm font-medium" style={{ color: colors.muted }}>{studioName}</p>
        <h1 className="text-2xl font-bold mt-1" style={{ color: colors.ink }}>Tuition</h1>
      </div>

      {/* Balance Card */}
      <div className="px-4 mb-4">
        <FrostedCard>
          <div className="text-center py-4">
            <p className="text-sm mb-3" style={{ color: colors.muted }}>
              {bill.status === 'paid' ? 'Last payment' : 'Amount due'}
            </p>
            <EtchedText size="xl">
              ${data.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </EtchedText>
            <div className="flex items-center justify-center gap-2 mt-3">
              <StatusPill status={bill.status} />
              {bill.status !== 'paid' && (
                <span className="text-sm" style={{ color: colors.muted }}>· Due {data.dueDate}</span>
              )}
            </div>
          </div>

          {bill.status !== 'paid' && data.currentBalance > 0 && (
            <div className="mt-4">
              {data.autopay ? (
                <div 
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.success }} />
                  <span className="text-sm font-medium" style={{ color: colors.ink }}>
                    Auto-pay on {data.dueDate}
                  </span>
                </div>
              ) : (
                <button
                  className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                  style={{ backgroundColor: colors.ink }}
                >
                  Pay ${data.currentBalance.toFixed(2)}
                </button>
              )}
            </div>
          )}
        </FrostedCard>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 mb-4">
        <div 
          className="flex p-1 rounded-2xl"
          style={{ backgroundColor: colors.warm }}
        >
          {[
            { id: 'current', label: 'Current Bill' },
            { id: 'history', label: 'History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? colors.ink : colors.muted,
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current Bill Tab */}
      {activeTab === 'current' && (
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-semibold" style={{ color: colors.ink }}>{bill.period}</span>
            <StatusPill status={bill.status} />
          </div>

          {bill.items.length > 0 && (
            <WhiteCard className="overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.muted }}>
                  Classes
                </span>
              </div>
              {bill.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < bill.items.length - 1 ? `1px solid ${colors.border}` : undefined }}
                >
                  <div>
                    <p className="font-medium" style={{ color: colors.ink }}>{item.description || item.class}</p>
                    <p className="text-sm" style={{ color: colors.muted }}>{item.student_name || item.student}</p>
                  </div>
                  <span className="font-medium tabular-nums" style={{ color: colors.ink }}>
                    ${(item.amount || 0).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: colors.warm }}>
                <span style={{ color: colors.muted }}>Subtotal</span>
                <span className="font-medium tabular-nums" style={{ color: colors.ink }}>
                  ${bill.subtotal.toFixed(2)}
                </span>
              </div>
            </WhiteCard>
          )}

          {bill.discounts?.length > 0 && (
            <WhiteCard className="overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.success }}>
                  Discounts Applied
                </span>
              </div>
              {bill.discounts.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < bill.discounts.length - 1 ? `1px solid ${colors.border}` : undefined }}
                >
                  <div>
                    <p className="font-medium" style={{ color: colors.success }}>{item.name}</p>
                    <p className="text-sm" style={{ color: colors.muted }}>{item.detail}</p>
                  </div>
                  <span className="font-medium tabular-nums" style={{ color: colors.success }}>
                    −${Math.abs(item.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </WhiteCard>
          )}

          <FrostedCard className="flex items-center justify-between">
            <span className="font-semibold" style={{ color: colors.ink }}>Total</span>
            <EtchedText size="md">${bill.total.toFixed(2)}</EtchedText>
          </FrostedCard>

          {(data.cardBrand || data.cardLast4) && (
            <WhiteCard className="p-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: colors.warm }}
                >
                  <IconCard />
                </div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: colors.ink }}>
                    {data.cardBrand} ····{data.cardLast4}
                  </p>
                  <p className="text-sm" style={{ color: colors.muted }}>
                    {data.autopay ? 'Auto-pay enabled' : 'Payment method on file'}
                  </p>
                </div>
              </div>
            </WhiteCard>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="px-4">
          {data.history.length > 0 ? (
            <WhiteCard className="overflow-hidden">
              {data.history.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-4"
                  style={{ borderBottom: i < data.history.length - 1 ? `1px solid ${colors.border}` : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: colors.successLight }}
                    >
                      <IconReceipt />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: colors.ink }}>{item.period}</p>
                      <p className="text-sm" style={{ color: colors.muted }}>Paid {item.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums" style={{ color: colors.ink }}>
                      ${item.amount.toFixed(2)}
                    </p>
                    <StatusPill status={item.status} />
                  </div>
                </div>
              ))}
            </WhiteCard>
          ) : (
            <div className="text-center py-12" style={{ color: colors.muted }}>
              No payment history yet
            </div>
          )}
        </div>
      )}

      {/* Help Footer */}
      <div className="px-4 mt-8">
        <div 
          className="text-center py-4 rounded-2xl"
          style={{ backgroundColor: colors.warm }}
        >
          <p className="text-sm" style={{ color: colors.muted }}>
            Questions about your bill?
          </p>
          <button 
            className="text-sm font-medium mt-1"
            style={{ color: colors.ink }}
          >
            Contact {studioName}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COLLAPSIBLE BILLING WIDGET (Embedded in Family Room)
// ============================================

export default function FamilyBillingTrigger({ parentEmail, studioName, isPreview = false }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch current balance for collapsed preview
  const { data: invoices = [] } = useQuery({
    queryKey: ['billingWidgetInvoices', parentEmail],
    queryFn: async () => {
      if (!parentEmail) return [];
      const all = await base44.entities.Invoice.list('-issue_date', 5);
      return all.filter(inv => inv.parent_email === parentEmail);
    },
    enabled: !!parentEmail && !isPreview,
  });

  const currentInvoice = invoices.find(inv => inv.status === 'sent' || inv.status === 'pending');
  const balance = isPreview ? 316.92 : (currentInvoice?.balance_due || currentInvoice?.total_amount || 0);
  const dueDate = isPreview ? 'Feb 1' : (currentInvoice?.due_date ? new Date(currentInvoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null);

  return (
    <div
      className="w-full transition-all duration-300 ease-in-out overflow-hidden rounded-3xl"
      style={{
        background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 200, 200, 0.3)',
        boxShadow: '0 8px 32px rgba(180, 120, 120, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
      }}
    >
      {/* Collapsed Header - Always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-3 sm:gap-4">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
            >
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.etchDark }} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium" style={{ color: colors.muted }}>Tuition</p>
              <p className="text-xl sm:text-2xl font-bold" style={{ color: colors.ink }}>
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              {dueDate && (
                <p className="text-xs sm:text-sm mt-1" style={{ color: colors.muted }}>
                  Due {dueDate}
                </p>
              )}
            </div>
          </div>
          
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform flex-shrink-0 mt-1"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            <svg className="w-4 h-4" style={{ color: colors.muted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <div 
        className="overflow-hidden transition-all duration-300"
        style={{ 
          maxHeight: isCollapsed ? '0px' : '600px',
          opacity: isCollapsed ? 0 : 1,
        }}
      >
        <div className="px-2 pb-2">
          <div 
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: colors.paper }}
          >
            <FamilyBillingContent parentEmail={parentEmail} studioName={studioName} isPreview={isPreview} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// BILLING CONTENT (Used inside collapsible)
// ============================================

function FamilyBillingContent({ parentEmail, studioName, isPreview = false }) {
  const [activeTab, setActiveTab] = useState('current');

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['familyBillingInvoices', parentEmail],
    queryFn: async () => {
      if (!parentEmail) return [];
      const all = await base44.entities.Invoice.list('-issue_date', 20);
      return all.filter(inv => inv.parent_email === parentEmail);
    },
    enabled: !!parentEmail && !isPreview,
  });

  // Fetch family info
  const { data: family } = useQuery({
    queryKey: ['familyBillingFamily', parentEmail],
    queryFn: async () => {
      if (!parentEmail) return null;
      const families = await base44.entities.Family.filter({ parent_email: parentEmail });
      return families[0] || null;
    },
    enabled: !!parentEmail && !isPreview,
  });

  // Sample data for preview
  const sampleData = {
    autopay: true,
    cardBrand: 'Visa',
    cardLast4: '4242',
    currentBill: {
      period: 'February 2026',
      status: 'upcoming',
      items: [
        { student: 'Emma', class: 'Ballet III', duration: '60min', amount: 87.00 },
        { student: 'Emma', class: 'Jazz II', duration: '45min', amount: 75.00 },
        { student: 'Olivia', class: 'Pre-Ballet', duration: '45min', amount: 75.00 },
      ],
      subtotal: 237.00,
      discounts: [
        { name: 'Sibling discount', detail: '10% off 2nd student', amount: -7.50 },
      ],
      total: 229.50,
    },
    history: [
      { period: 'January 2026', amount: 229.50, status: 'paid', date: 'Jan 3' },
      { period: 'December 2025', amount: 229.50, status: 'paid', date: 'Dec 2' },
    ],
  };

  const currentInvoice = invoices.find(inv => inv.status === 'sent' || inv.status === 'pending' || inv.status === 'draft');
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');

  const data = isPreview ? sampleData : {
    autopay: family?.payment_status === 'autopay',
    cardBrand: family?.card_brand || '',
    cardLast4: family?.card_last4 || '',
    currentBill: {
      period: currentInvoice?.title || 'Current Period',
      status: currentInvoice?.status || 'pending',
      items: currentInvoice?.items || [],
      subtotal: currentInvoice?.subtotal || 0,
      discounts: [],
      total: currentInvoice?.total_amount || 0,
    },
    history: paidInvoices.map(inv => ({
      period: inv.title || 'Payment',
      amount: inv.total_amount,
      status: inv.status,
      date: new Date(inv.updated_date || inv.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
  };

  const bill = data.currentBill;

  return (
    <div className="p-4">
      {/* Tab Switcher */}
      <div 
        className="flex p-1 rounded-xl mb-4"
        style={{ backgroundColor: colors.warm }}
      >
        {[
          { id: 'current', label: 'Current Bill' },
          { id: 'history', label: 'History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? colors.ink : colors.muted,
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Current Bill Tab */}
      {activeTab === 'current' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm" style={{ color: colors.ink }}>{bill.period}</span>
            <StatusPill status={bill.status} />
          </div>

          {bill.items.length > 0 && (
            <WhiteCard className="overflow-hidden">
              <div className="px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.muted }}>
                  Classes
                </span>
              </div>
              {bill.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderBottom: i < bill.items.length - 1 ? `1px solid ${colors.border}` : undefined }}
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: colors.ink }}>{item.description || item.class}</p>
                    <p className="text-xs" style={{ color: colors.muted }}>{item.student_name || item.student}</p>
                  </div>
                  <span className="font-medium text-sm tabular-nums" style={{ color: colors.ink }}>
                    ${(item.amount || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </WhiteCard>
          )}

          {bill.discounts?.length > 0 && (
            <WhiteCard className="overflow-hidden">
              {bill.discounts.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderBottom: i < bill.discounts.length - 1 ? `1px solid ${colors.border}` : undefined }}
                >
                  <span className="text-sm" style={{ color: colors.success }}>{item.name}</span>
                  <span className="font-medium text-sm tabular-nums" style={{ color: colors.success }}>
                    −${Math.abs(item.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </WhiteCard>
          )}

          <div className="flex items-center justify-between px-1 pt-2">
            <span className="font-semibold" style={{ color: colors.ink }}>Total</span>
            <span className="text-xl font-bold" style={{ color: colors.ink }}>${bill.total.toFixed(2)}</span>
          </div>

          {(data.cardBrand || data.cardLast4) && (
            <div 
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: colors.warm }}
            >
              <IconCard />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: colors.ink }}>
                  {data.cardBrand} ····{data.cardLast4}
                </p>
                <p className="text-xs" style={{ color: colors.muted }}>
                  {data.autopay ? 'Auto-pay enabled' : 'On file'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          {data.history.length > 0 ? (
            <WhiteCard className="overflow-hidden">
              {data.history.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-3"
                  style={{ borderBottom: i < data.history.length - 1 ? `1px solid ${colors.border}` : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: colors.successLight }}
                    >
                      <IconReceipt />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.ink }}>{item.period}</p>
                      <p className="text-xs" style={{ color: colors.muted }}>Paid {item.date}</p>
                    </div>
                  </div>
                  <span className="font-medium text-sm tabular-nums" style={{ color: colors.ink }}>
                    ${item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </WhiteCard>
          ) : (
            <div className="text-center py-8" style={{ color: colors.muted }}>
              <p className="text-sm">No payment history yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}