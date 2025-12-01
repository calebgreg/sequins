import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from 'date-fns';
import { Loader2, Play, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BillingCycleRun({ isOpen, onOpenChange }) {
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runComplete, setRunComplete] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['tuition_plans'],
    queryFn: () => base44.entities.TuitionPlan.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: discounts = [] } = useQuery({
    queryKey: ['discount_rules'],
    queryFn: () => base44.entities.DiscountRule.list(),
  });

  const { data: fees = [] } = useQuery({
    queryKey: ['fee_types'],
    queryFn: () => base44.entities.FeeType.list(),
  });

  const calculateCycle = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      const families = {};

      // Group students by family
      students.filter(s => s.status === 'active').forEach(s => {
        const familyEmail = s.parent_email;
        if (!familyEmail) return; // Skip students without parent email
        
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

      // Calculate per family
      Object.values(families).forEach(family => {
         let familyTotal = 0;
         const familyItems = [];

         // 1. Tuition Plans & Classes
         family.students.forEach(student => {
            const plan = plans.find(p => p.id === student.tuition_plan_id);
            let studentTotal = 0;

            if (plan) {
               studentTotal += plan.amount;
               familyItems.push({
                  description: `${student.name}: ${plan.name}`,
                  amount: plan.amount,
                  student_name: student.name
               });
            } else {
               // Fallback: Calculate per class if no plan assigned? Or just warn.
               // Let's calculate per-class cost
               const studentClasses = classes.filter(c => c.student_names?.includes(student.name));
               const classCost = studentClasses.reduce((sum, c) => sum + (c.tuition_cost || 0), 0);
               if (classCost > 0) {
                  studentTotal += classCost;
                  familyItems.push({
                     description: `${student.name}: Class Tuition (${studentClasses.length} classes)`,
                     amount: classCost,
                     student_name: student.name
                  });
               }
            }
            familyTotal += studentTotal;
         });

         // 2. Sibling Discount
         const siblingDiscount = discounts.find(d => d.category === 'sibling' && d.active);
         if (siblingDiscount && family.students.length > 1) {
             // Naive implementation: Discount on total or per additional student
             // Let's assume simplified: 10% off total for families with >1 student
             const discountAmount = siblingDiscount.type === 'percent' 
                ? familyTotal * (siblingDiscount.value / 100) 
                : siblingDiscount.value;
             
             if (discountAmount > 0) {
                familyTotal -= discountAmount;
                familyItems.push({
                   description: `${siblingDiscount.name}`,
                   amount: -discountAmount,
                   student_name: 'Family'
                });
             }
         }

         // 3. Mandatory Fees (Monthly)
         const monthlyFees = fees.filter(f => f.billing_frequency === 'monthly' && f.is_mandatory);
         monthlyFees.forEach(fee => {
            family.students.forEach(s => {
               familyTotal += fee.amount;
               familyItems.push({
                  description: `${s.name}: ${fee.name}`,
                  amount: fee.amount,
                  student_name: s.name
               });
            });
         });

         family.total = familyTotal;
         family.lineItems = familyItems;
      });

      // Filter out 0 totals
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
      // Generate invoices for all in previewData
      const promises = previewData.families.map(f => {
         return base44.entities.Invoice.create({
            parent_email: f.email,
            parent_name: f.parent_name,
            title: `Tuition - ${format(new Date(), 'MMMM yyyy')}`,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
            status: 'sent',
            items: f.lineItems,
            subtotal: f.total, // Simplified tax
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

  const handleExecute = () => {
     setIsRunning(true);
     runBatch.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white rounded-[32px] p-0 overflow-hidden border-none h-[80vh] flex flex-col">
         <div className="bg-[#333333] px-8 py-6 border-b border-gray-700 flex justify-between items-center">
            <div>
               <DialogTitle className="font-serif text-2xl text-white">Run Billing Cycle</DialogTitle>
               <p className="text-white/60 text-sm">Generate invoices for {format(new Date(), 'MMMM yyyy')}</p>
            </div>
            <div className="bg-white/10 rounded-full px-4 py-2 text-white text-sm flex items-center gap-2">
               <Calendar className="w-4 h-4" /> {format(new Date(), 'MMM yyyy')}
            </div>
         </div>

         <div className="flex-1 overflow-hidden flex flex-col">
            {!previewData && !runComplete && (
               <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                     <Play className="w-10 h-10 text-[#333333] ml-1" />
                  </div>
                  <h3 className="text-2xl font-serif text-[#333333] mb-2">Ready to calculate?</h3>
                  <p className="text-gray-500 max-w-md mb-8">
                     This will analyze all active students, assigned plans, and applicable discounts to generate a preview.
                  </p>
                  <Button 
                     size="lg" 
                     onClick={calculateCycle}
                     disabled={isCalculating}
                     className="bg-[#333333] text-white hover:bg-black rounded-full px-8 h-14 text-lg"
                  >
                     {isCalculating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                     {isCalculating ? "Analyzing..." : "Calculate Batch"}
                  </Button>
               </div>
            )}

            {previewData && !runComplete && (
               <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-6 bg-[#F4F4F6] flex justify-between items-center border-b border-gray-200">
                     <div className="flex gap-8">
                        <div>
                           <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invoices</div>
                           <div className="text-2xl font-serif text-[#333333]">{previewData.invoiceCount}</div>
                        </div>
                        <div>
                           <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue</div>
                           <div className="text-2xl font-serif text-green-600">${previewData.totalRevenue.toFixed(2)}</div>
                        </div>
                     </div>
                     <Button 
                        size="lg" 
                        onClick={handleExecute}
                        disabled={isRunning}
                        className="bg-green-600 text-white hover:bg-green-700 rounded-full px-8 shadow-lg shadow-green-200"
                     >
                        {isRunning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                        {isRunning ? "Processing..." : "Generate & Send All"}
                     </Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                     {previewData.families.map((f, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                           <div>
                              <div className="font-medium text-[#333333]">{f.parent_name}</div>
                              <div className="text-xs text-gray-400">{f.students.map(s => s.name).join(', ')}</div>
                              <div className="text-xs text-gray-300 mt-1">{f.lineItems.length} line items</div>
                           </div>
                           <div className="text-right">
                              <div className="font-serif text-lg text-[#333333]">${f.total.toFixed(2)}</div>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-[10px]">Draft</Badge>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {runComplete && (
               <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <motion.div 
                     initial={{ scale: 0.5, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
                  >
                     <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  <h3 className="text-3xl font-serif text-[#333333] mb-2">Batch Complete!</h3>
                  <p className="text-gray-500 max-w-md mb-8">
                     {previewData.invoiceCount} invoices have been generated and sent to families.
                  </p>
                  <Button 
                     size="lg" 
                     onClick={() => onOpenChange(false)}
                     className="bg-[#333333] text-white hover:bg-black rounded-full px-8"
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