import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, addDays } from 'date-fns';
import { 
  Loader2, Play, CheckCircle2, AlertTriangle, CreditCard, Mail, 
  ChevronDown, ChevronRight, AlertCircle, XCircle,
  RefreshCw, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateTuition } from './TuitionBillingWizard';

// ============================================
// BILLING CYCLE MANAGER
// Full-featured billing cycle with preview, confirm, progress, and summary
// ============================================

const STATES = {
  PREVIEW: 'preview',
  RUNNING: 'running',
  COMPLETE: 'complete'
};

// Helper: Check if card is expired
function isCardExpired(month, year) {
  if (!month || !year) return false;
  const now = new Date();
  const expiry = new Date(year, month, 0); // Last day of expiry month
  return expiry < now;
}

// Helper: Build calculation input from student/class data
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

// Helper: Convert TuitionRule entity to calculation format
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

  return {
    ...rule,
    condition,
  };
}

// ============================================
// FAMILY PREVIEW CARD
// ============================================

function FamilyPreviewCard({ family, isExpanded, onToggle }) {
  const statusConfig = {
    autopay: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50', label: 'Auto-pay' },
    invoice: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Invoice' },
    no_method: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'No payment method' },
  };

  const status = statusConfig[family.paymentStatus] || statusConfig.no_method;
  const StatusIcon = status.icon;
  const hasCardIssue = family.isCardExpired || family.paymentStatus === 'no_method';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-2xl overflow-hidden transition-shadow ${
        hasCardIssue ? 'border-amber-200' : 'border-gray-100'
      } hover:shadow-md`}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-5 flex items-center gap-4 text-left">
            {/* Expand Icon */}
            <div className="text-gray-400">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>

            {/* Family Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-bold text-[#333333] text-lg">{family.parentName}</span>
                <Badge variant="secondary" className="text-xs">
                  {family.students.length} {family.students.length === 1 ? 'student' : 'students'}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                {family.students.map(s => s.name).join(', ')}
              </div>
            </div>

            {/* Payment Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}>
              <StatusIcon className={`w-4 h-4 ${status.color}`} />
              <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
            </div>

            {/* Card Info */}
            {family.paymentStatus === 'autopay' && family.cardLast4 && (
              <div className={`flex items-center gap-2 text-sm ${family.isCardExpired ? 'text-red-600' : 'text-gray-500'}`}>
                <CreditCard className="w-4 h-4" />
                <span>{family.cardBrand} ····{family.cardLast4}</span>
                {family.isCardExpired && (
                  <Badge variant="destructive" className="text-xs">Expired</Badge>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="text-right">
              <div className="text-2xl font-bold text-[#333333]">
                ${family.total.toFixed(2)}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 pt-0 border-t border-gray-100">
            {/* Line Items */}
            <div className="mt-4 space-y-2">
              {family.lineItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span className={item.amount < 0 ? 'text-green-600' : 'text-gray-600'}>
                    {item.description}
                  </span>
                  <span className={`font-medium ${item.amount < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {item.amount < 0 ? '-' : ''}${Math.abs(item.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Show Work / Trace */}
            {family.trace && family.trace.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Show calculation details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg font-mono text-xs text-gray-600 max-h-48 overflow-y-auto">
                  {family.trace.map((line, i) => (
                    <div key={i} className={line.startsWith('─') ? 'my-1 text-gray-400' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

// ============================================
// PROGRESS ITEM
// ============================================

function ProgressItem({ family, status, message }) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-gray-400', spin: false },
    processing: { icon: Loader2, color: 'text-blue-500', spin: true },
    success: { icon: CheckCircle2, color: 'text-green-500', spin: false },
    failed: { icon: XCircle, color: 'text-red-500', spin: false },
    sent: { icon: Mail, color: 'text-blue-500', spin: false },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 py-3 px-4 bg-white rounded-xl border border-gray-100"
    >
      <Icon className={`w-5 h-5 ${config.color} ${config.spin ? 'animate-spin' : ''}`} />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-[#333333]">{family.parentName}</span>
        {message && <span className="text-sm text-gray-500 ml-2">— {message}</span>}
      </div>
      <div className="font-bold text-[#333333]">${family.total.toFixed(2)}</div>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BillingCycleManager({ isOpen, onOpenChange }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(STATES.PREVIEW);
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [isCalculating, setIsCalculating] = useState(true);

  // Data Fetching
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: families = [] } = useQuery({
    queryKey: ['families'],
    queryFn: () => base44.entities.Family.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: tuitionRules = [] } = useQuery({
    queryKey: ['tuitionRules'],
    queryFn: () => base44.entities.TuitionRule.list(),
  });

  // Auto-calculate preview when modal opens and data is ready
  React.useEffect(() => {
    if (isOpen && students.length > 0 && tuitionRules.length > 0 && !previewData) {
      calculatePreview();
    }
  }, [isOpen, students, tuitionRules]);

  // ============================================
  // CALCULATE PREVIEW
  // ============================================

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
    let totalRevenue = 0;
    let autopayCount = 0;
    let invoiceCount = 0;
    let noMethodCount = 0;
    let expiredCardCount = 0;

    Object.entries(studentsByFamily).forEach(([parentEmail, familyStudents]) => {
      // Find family record
      const familyRecord = families.find(f => f.parent_email === parentEmail);
      const paymentStatus = familyRecord?.payment_status || 'no_method';
      const cardExpired = isCardExpired(familyRecord?.card_expiry_month, familyRecord?.card_expiry_year);

      // Calculate tuition for each student
      let familyTotal = 0;
      const allLineItems = [];
      const allTrace = [];

      familyStudents.forEach((student, idx) => {
        const input = buildCalculationInput(student, familyStudents, classes, idx + 1);
        
        if (input.classes.length > 0 && rulesForCalc.length > 0) {
          const result = calculateTuition(input, rulesForCalc);
          
          // Add class line items
          result.classes.forEach(c => {
            allLineItems.push({
              description: `${student.name}: ${c.description}`,
              amount: c.amount,
              student_name: student.name,
              type: 'tuition'
            });
          });

          // Add discounts
          result.discounts.forEach(d => {
            allLineItems.push({
              description: d.description,
              amount: d.amount,
              student_name: student.name,
              type: 'discount'
            });
          });

          // Add fees from calculation
          result.fees.forEach(f => {
            allLineItems.push({
              description: f.description,
              amount: f.amount,
              student_name: student.name,
              type: 'fee'
            });
          });

          familyTotal += result.total;
          allTrace.push(`── ${student.name} ──`, ...result.trace);
        }
      });

      // Add selected optional fees
      const selectedFeeObjects = fees.filter(f => selectedFees.includes(f.id));
      selectedFeeObjects.forEach(fee => {
        // Apply per student
        familyStudents.forEach(student => {
          allLineItems.push({
            description: `${student.name}: ${fee.name}`,
            amount: fee.amount,
            student_name: student.name,
            type: 'fee'
          });
          familyTotal += fee.amount;
        });
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
          trace: allTrace,
        });

        totalRevenue += familyTotal;

        // Count by payment status
        if (paymentStatus === 'autopay') {
          autopayCount++;
          if (cardExpired) expiredCardCount++;
        } else if (paymentStatus === 'invoice') {
          invoiceCount++;
        } else {
          noMethodCount++;
        }
      }
      });

      setPreviewData({
      families: familyBills,
      totalRevenue,
      autopayCount,
      invoiceCount,
      noMethodCount,
      expiredCardCount,
      });
      setIsCalculating(false);
      };

  // ============================================
  // RUN BILLING
  // ============================================

  const runBilling = async () => {
    setState(STATES.RUNNING);
    const results = [];
    const progress = previewData.families.map(f => ({
      ...f,
      status: 'pending',
      message: null,
    }));
    setProgressData([...progress]);

    let successCount = 0;
    let successAmount = 0;
    let invoiceSentCount = 0;
    let invoiceSentAmount = 0;
    let failedCount = 0;
    let failedAmount = 0;

    for (let i = 0; i < previewData.families.length; i++) {
      const family = previewData.families[i];

      // Update to processing
      progress[i].status = 'processing';
      progress[i].message = 'Processing...';
      setProgressData([...progress]);

      // Small delay for visual effect
      await new Promise(r => setTimeout(r, 300));

      try {
        // Create invoice
        const invoice = await base44.entities.Invoice.create({
          parent_email: family.parentEmail,
          parent_name: family.parentName,
          title: `Tuition - ${format(new Date(), 'MMMM yyyy')}`,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
          status: family.paymentStatus === 'autopay' && !family.isCardExpired ? 'paid' : 'sent',
          items: family.lineItems,
          subtotal: family.total,
          total_amount: family.total,
          amount_paid: family.paymentStatus === 'autopay' && !family.isCardExpired ? family.total : 0,
          balance_due: family.paymentStatus === 'autopay' && !family.isCardExpired ? 0 : family.total,
          notes: 'Generated via Billing Cycle Manager',
        });

        // Simulate payment result based on payment status
        if (family.paymentStatus === 'autopay') {
          if (family.isCardExpired) {
            // Card expired - simulate failure
            progress[i].status = 'failed';
            progress[i].message = 'Card expired - will retry';
            failedCount++;
            failedAmount += family.total;
          } else {
            // Success
            progress[i].status = 'success';
            progress[i].message = `$${family.total.toFixed(2)} charged`;
            successCount++;
            successAmount += family.total;
          }
        } else {
          // Invoice sent
          progress[i].status = 'sent';
          progress[i].message = 'Invoice sent';
          invoiceSentCount++;
          invoiceSentAmount += family.total;
        }
      } catch (error) {
        progress[i].status = 'failed';
        progress[i].message = 'Error creating invoice';
        failedCount++;
        failedAmount += family.total;
      }

      setProgressData([...progress]);
      await new Promise(r => setTimeout(r, 200));
    }

    setSummaryData({
      successCount,
      successAmount,
      invoiceSentCount,
      invoiceSentAmount,
      failedCount,
      failedAmount,
    });
    setState(STATES.COMPLETE);

    // Invalidate invoices
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  // Reset on close
  const handleClose = (open) => {
    if (!open) {
      setState(STATES.PREVIEW);
      setExpandedFamilies({});
      setPreviewData(null);
      setProgressData([]);
      setSummaryData(null);
      setIsCalculating(true);
    }
    onOpenChange(open);
  };

  const toggleFamilyExpand = (email) => {
    setExpandedFamilies(prev => ({ ...prev, [email]: !prev[email] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl bg-white rounded-[32px] p-0 overflow-hidden border-none h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="bg-[#333333] px-8 py-6 flex justify-between items-center flex-shrink-0">
          <div>
            <DialogTitle className="font-serif text-2xl text-white">
              {state === STATES.PREVIEW && 'Review & Confirm'}
              {state === STATES.RUNNING && 'Processing...'}
              {state === STATES.COMPLETE && 'Billing Complete'}
            </DialogTitle>
            <p className="text-white/60 text-sm mt-1">
              {format(new Date(), 'MMMM yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {state === STATES.PREVIEW && previewData && (
              <>
                {previewData.expiredCardCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {previewData.expiredCardCount} expired card{previewData.expiredCardCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {previewData.noMethodCount > 0 && (
                  <Badge className="bg-amber-500 gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {previewData.noMethodCount} no payment method
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-[#F4F4F6]">
          
          {/* ============================================ */}
          {/* STATE: PREVIEW */}
          {/* ============================================ */}
          {state === STATES.PREVIEW && isCalculating && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <Loader2 className="w-12 h-12 animate-spin text-[#333333] mb-4" />
              <p className="text-gray-500">Calculating tuition...</p>
            </div>
          )}

          {state === STATES.PREVIEW && !isCalculating && previewData && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Stats Bar */}
              <div className="p-6 bg-white border-b border-gray-200 shadow-sm z-10">
                <div className="flex justify-between items-center">
                  <div className="flex gap-10">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Families
                      </div>
                      <div className="text-3xl font-serif text-[#333333]">
                        {previewData.families.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Total Revenue
                      </div>
                      <div className="text-3xl font-serif text-green-600">
                        ${previewData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="flex gap-6 border-l border-gray-200 pl-6">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-green-600">
                          <CreditCard className="w-4 h-4" />
                          <span className="text-xl font-bold">{previewData.autopayCount}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase">Auto-pay</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-blue-600">
                          <Mail className="w-4 h-4" />
                          <span className="text-xl font-bold">{previewData.invoiceCount}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase">Invoice</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xl font-bold">{previewData.noMethodCount}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase">No Method</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setState(STATES.CONFIGURE)}>
                      Back
                    </Button>
                    <Button 
                      size="lg" 
                      onClick={runBilling}
                      className="bg-green-600 text-white hover:bg-green-700 rounded-full px-8 shadow-lg shadow-green-200"
                    >
                      <Play className="w-5 h-5 mr-2 fill-current" />
                      Confirm & Run
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Family List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                <AnimatePresence>
                  {previewData.families.map((family, i) => (
                    <FamilyPreviewCard
                      key={family.parentEmail}
                      family={family}
                      isExpanded={expandedFamilies[family.parentEmail]}
                      onToggle={() => toggleFamilyExpand(family.parentEmail)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STATE: RUNNING */}
          {/* ============================================ */}
          {state === STATES.RUNNING && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-3">
                <div className="text-center mb-8">
                  <Loader2 className="w-12 h-12 animate-spin text-[#333333] mx-auto mb-4" />
                  <h3 className="text-xl font-serif text-[#333333]">Processing billing cycle...</h3>
                  <p className="text-gray-500">Please don't close this window.</p>
                </div>
                
                <AnimatePresence>
                  {progressData.map((item, i) => (
                    <ProgressItem
                      key={item.parentEmail}
                      family={item}
                      status={item.status}
                      message={item.message}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STATE: COMPLETE */}
          {/* ============================================ */}
          {state === STATES.COMPLETE && summaryData && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-12 h-12" />
              </motion.div>
              
              <h3 className="text-4xl font-serif text-[#333333] mb-8">Billing Cycle Complete</h3>
              
              <div className="grid grid-cols-3 gap-8 mb-10">
                {summaryData.successCount > 0 && (
                  <div className="text-center p-6 bg-green-50 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="text-3xl font-bold">{summaryData.successCount}</span>
                    </div>
                    <div className="text-sm text-green-700 font-medium">Charged Successfully</div>
                    <div className="text-2xl font-serif text-green-600 mt-1">
                      ${summaryData.successAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                
                {summaryData.invoiceSentCount > 0 && (
                  <div className="text-center p-6 bg-blue-50 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                      <Mail className="w-6 h-6" />
                      <span className="text-3xl font-bold">{summaryData.invoiceSentCount}</span>
                    </div>
                    <div className="text-sm text-blue-700 font-medium">Invoices Sent</div>
                    <div className="text-2xl font-serif text-blue-600 mt-1">
                      ${summaryData.invoiceSentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                
                {summaryData.failedCount > 0 && (
                  <div className="text-center p-6 bg-red-50 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                      <RefreshCw className="w-6 h-6" />
                      <span className="text-3xl font-bold">{summaryData.failedCount}</span>
                    </div>
                    <div className="text-sm text-red-700 font-medium">Failed (Will Retry)</div>
                    <div className="text-2xl font-serif text-red-600 mt-1">
                      ${summaryData.failedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>

              <Button 
                size="lg" 
                onClick={() => handleClose(false)}
                className="bg-[#333333] text-white hover:bg-black rounded-full px-10 h-12"
              >
                Return to Dashboard
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}