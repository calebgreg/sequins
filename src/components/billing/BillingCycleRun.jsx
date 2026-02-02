import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format, addDays } from 'date-fns';
import { Loader2, Play, CheckCircle2, AlertTriangle, Calendar, Plus, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BillingCycleRun({ isOpen, onOpenChange }) {
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runComplete, setRunComplete] = useState(false);
  const [selectedFees, setSelectedFees] = useState([]); // IDs of one-time/annual fees to include

  // Data Fetching
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: tuitionRules = [] } = useQuery({
    queryKey: ['tuition_rules'],
    queryFn: () => base44.entities.TuitionRule.list(),
  });

  const { data: familyEntities = [] } = useQuery({
    queryKey: ['familyEntities'],
    queryFn: () => base44.entities.Family.list(),
  });

  // Derived rule sets from TuitionRule
  const basePricingRule = tuitionRules.find(r => r.type === 'base_pricing' && r.active !== false);
  const classExceptionRules = tuitionRules.filter(r => r.type === 'class_exception' && r.active !== false);
  const discountRules = tuitionRules.filter(r => r.type === 'discount' && r.active !== false);
  const feeRules = tuitionRules.filter(r => r.type === 'fee' && r.active !== false);

  // Calculation Logic using TuitionRules ONLY
  const calculateCycle = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      const families = {};

      // Group active students by family
      students.filter(s => s.status === 'active').forEach(s => {
        const familyEmail = s.parent_email;
        if (!familyEmail) return;
        
        if (!families[familyEmail]) {
          families[familyEmail] = {
            email: familyEmail,
            parent_name: s.parent_name || 'Parent',
            students: [],
            total: 0,
            lineItems: []
          };
        }
        families[familyEmail].students.push(s);
      });

      // Calculate per family using TuitionRules
      Object.values(families).forEach(family => {
         let familyTotal = 0;
         const familyItems = [];
         const baseRate = basePricingRule?.value?.amount || 0;

         // 1. Tuition Calculation using TuitionRules
         family.students.forEach(student => {
            const studentClasses = classes.filter(c => c.student_names?.includes(student.name));
            let studentTotal = 0;

            studentClasses.forEach(cls => {
               // Check for class-specific exceptions first
               const exception = classExceptionRules.find(r => 
                  r.note?.toLowerCase().includes(cls.title?.toLowerCase())
               );
               
               const classRate = exception?.value?.amount || baseRate || cls.tuition_cost || 0;
               studentTotal += classRate;
            });

            if (studentTotal > 0) {
               familyItems.push({
                  description: `${student.name}: ${studentClasses.length} classes × $${baseRate}`,
                  amount: studentTotal,
                  student_name: student.name,
                  type: 'tuition_calc'
               });
            }
            familyTotal += studentTotal;
         });

         // 2. Apply Discounts from TuitionRules
         discountRules.forEach(rule => {
            let applies = false;
            let discountAmount = 0;

            // Check conditions
            if (rule.conditions?.length > 0) {
               rule.conditions.forEach(cond => {
                  if (cond.field === 'student_count' && cond.operator === '>=' && family.students.length >= parseInt(cond.value)) {
                     applies = true;
                  }
               });
            } else {
               applies = true; // No conditions = always apply
            }

            if (applies && rule.value) {
               if (rule.value.method === 'percent') {
                  discountAmount = familyTotal * (rule.value.amount / 100);
               } else if (rule.value.method === 'fixed') {
                  discountAmount = rule.value.amount;
               }

               if (discountAmount > 0) {
                  familyTotal -= discountAmount;
                  familyItems.push({
                     description: rule.note || 'Discount',
                     amount: -discountAmount,
                     student_name: 'Family',
                     type: 'discount'
                  });
               }
            }
         });

         // 3. Apply Fees from TuitionRules
         const feesToApply = feeRules.filter(f => selectedFees.includes(f.id) || f.value?.mandatory);
         
         feesToApply.forEach(feeRule => {
            const feeAmount = feeRule.value?.amount || 0;
            if (feeAmount > 0) {
               // Apply per student
               family.students.forEach(s => {
                  familyTotal += feeAmount;
                  familyItems.push({
                     description: `${s.name}: ${feeRule.note || 'Fee'}`,
                     amount: feeAmount,
                     student_name: s.name,
                     type: 'fee'
                  });
               });
            }
         });

         // 4. Apply Family Billing Adjustments (from FamilyTuitionManager)
         const familyEntity = familyEntities.find(f => f.parent_email === family.email);
         const adjustments = familyEntity?.billing_adjustments || [];
         adjustments.forEach(adj => {
            familyTotal += adj.amount; // already signed (negative for discounts)
            familyItems.push({
               description: adj.description,
               amount: adj.amount,
               student_name: adj.student_name || 'Family',
               type: adj.type
            });
         });

         family.total = Math.max(0, familyTotal);
         family.lineItems = familyItems;
      });

      const actionableFamilies = Object.values(families).filter(f => f.total > 0);
      
      setPreviewData({
         families: actionableFamilies,
         totalRevenue: actionableFamilies.reduce((sum, f) => sum + f.total, 0),
         invoiceCount: actionableFamilies.length
      });
      setIsCalculating(false);
    }, 800);
  };

  const runBatch = useMutation({
    mutationFn: async () => {
      const promises = previewData.families.map(f => {
         return base44.entities.Invoice.create({
            parent_email: f.email,
            parent_name: f.parent_name,
            title: `Tuition - ${format(new Date(), 'MMMM yyyy')}`,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
            status: 'sent',
            items: f.lineItems,
            subtotal: f.total,
            total_amount: f.total,
            balance_due: f.total,
            notes: 'Generated via Auto-Billing'
         });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['invoices'] });
       setRunComplete(true);
       setIsRunning(false);
    }
  });

  // Optional Fees from TuitionRules (non-mandatory fee rules)
  const optionalFees = feeRules.filter(f => !f.value?.mandatory);

  const toggleFee = (feeId) => {
      if (selectedFees.includes(feeId)) setSelectedFees(selectedFees.filter(id => id !== feeId));
      else setSelectedFees([...selectedFees, feeId]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white rounded-[32px] p-0 overflow-hidden border-none h-[85vh] flex flex-col shadow-2xl">
         {/* Header */}
         <div className="bg-[#333333] px-8 py-6 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
            <div>
               <DialogTitle className="font-serif text-2xl text-white">Run Billing Cycle</DialogTitle>
               <p className="text-white/60 text-sm mt-1">
                  Generating for <span className="text-white font-medium">{format(new Date(), 'MMMM yyyy')}</span> using 
                  <span className="text-white font-medium ml-1">TuitionRules Engine</span>
               </p>
               </div>
               <div className="flex gap-3">
               <div className="bg-white/10 rounded-full px-4 py-2 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Calculator className="w-3 h-3" /> ${basePricingRule?.value?.amount || 0}/class
               </div>
               </div>
         </div>

         <div className="flex-1 overflow-hidden flex flex-col bg-[#F4F4F6]">
            
            {/* STATE 1: CONFIGURATION (Before Calc) */}
            {!previewData && !runComplete && (
               <div className="flex-1 flex flex-col items-center justify-center p-8">
                  
                  <div className="bg-white rounded-[32px] p-8 shadow-sm max-w-2xl w-full mb-8">
                     <h3 className="font-serif text-xl text-[#333333] mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Include Additional Fees
                     </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {optionalFees.length > 0 ? optionalFees.map(fee => (
                           <div 
                              key={fee.id}
                              onClick={() => toggleFee(fee.id)} 
                              className={`
                                 p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between
                                 ${selectedFees.includes(fee.id) ? 'border-[#333333] bg-gray-50' : 'border-gray-100 hover:border-gray-200'}
                              `}
                           >
                              <div>
                                 <div className="font-bold text-[#333333]">{fee.note || 'Fee'}</div>
                                 <div className="text-xs text-gray-400">${fee.value?.amount || 0}</div>
                              </div>
                              <Checkbox checked={selectedFees.includes(fee.id)} className="data-[state=checked]:bg-[#333333]" />
                           </div>
                        )) : (
                           <div className="col-span-2 text-center text-gray-400 text-sm py-4">
                              No optional fees configured (Annual/One-Time).
                           </div>
                        )}
                     </div>
                  </div>

                  <Button 
                     size="lg" 
                     onClick={calculateCycle}
                     disabled={isCalculating}
                     className="bg-[#333333] text-white hover:bg-black rounded-full px-12 h-16 text-lg shadow-xl transform transition-transform active:scale-95"
                  >
                     {isCalculating ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Play className="w-6 h-6 mr-3 fill-current" />}
                     {isCalculating ? "Analyzing Roster..." : "Calculate Batch"}
                  </Button>
               </div>
            )}

            {/* STATE 2: PREVIEW */}
            {previewData && !runComplete && (
               <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-6 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                     <div className="flex gap-10">
                        <div>
                           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoices to Generate</div>
                           <div className="text-3xl font-serif text-[#333333]">{previewData.invoiceCount}</div>
                        </div>
                        <div>
                           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Projected Revenue</div>
                           <div className="text-3xl font-serif text-green-600">${previewData.totalRevenue.toLocaleString()}</div>
                        </div>
                     </div>
                     <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => { setPreviewData(null); setIsCalculating(false); }}>
                           Back
                        </Button>
                        <Button 
                           size="lg" 
                           onClick={() => runBatch.mutate()}
                           disabled={isRunning}
                           className="bg-green-600 text-white hover:bg-green-700 rounded-full px-8 shadow-lg shadow-green-200"
                        >
                           {isRunning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                           {isRunning ? "Processing..." : "Generate & Send All"}
                        </Button>
                     </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                     {previewData.families.map((f, i) => (
                        <motion.div 
                           key={i} 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: i * 0.05 }}
                           className="bg-white border border-gray-100 rounded-2xl p-5 flex justify-between items-start shadow-sm hover:shadow-md transition-shadow"
                        >
                           <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                 <div className="font-bold text-lg text-[#333333]">{f.parent_name}</div>
                                 <Badge variant="secondary" className="text-xs">{f.students.length} Students</Badge>
                              </div>
                              <div className="space-y-1">
                                 {f.lineItems.map((item, idx) => (
                                    <div key={idx} className="text-sm text-gray-500 flex items-center gap-2">
                                       <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                       <span className="flex-1">{item.description}</span>
                                       <span className={`font-medium ${item.amount < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                                          {item.amount < 0 ? '-' : ''}${Math.abs(item.amount).toFixed(2)}
                                       </span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                           <div className="text-right">
                              <div className="font-serif text-2xl text-[#333333]">${f.total.toFixed(2)}</div>
                           </div>
                        </motion.div>
                     ))}
                  </div>
               </div>
            )}

            {/* STATE 3: COMPLETE */}
            {runComplete && (
               <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                  <motion.div 
                     initial={{ scale: 0.5, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
                  >
                     <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  <h3 className="text-4xl font-serif text-[#333333] mb-4">Billing Cycle Complete</h3>
                  <p className="text-gray-500 max-w-md mb-8 text-lg">
                     Success! We generated {previewData.invoiceCount} invoices totaling <span className="font-bold text-[#333333]">${previewData.totalRevenue.toLocaleString()}</span>.
                  </p>
                  <Button 
                     size="lg" 
                     onClick={() => onOpenChange(false)}
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