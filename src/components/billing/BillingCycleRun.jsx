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

  const { data: settingsList = [] } = useQuery({
    queryKey: ['studio_settings'],
    queryFn: () => base44.entities.StudioSettings.list(),
  });

  const settings = settingsList[0] || { pricing_model: 'per_class', hourly_rate_tiers: [] };

  // Calculation Logic
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

      // Calculate per family
      Object.values(families).forEach(family => {
         let familyTotal = 0;
         const familyItems = [];

         // 1. Tuition Calculation (Plans vs Calculated)
         family.students.forEach(student => {
            const plan = plans.find(p => p.id === student.tuition_plan_id);
            let studentTotal = 0;
            let calculationMethod = 'Calculated';

            // Priority 1: Assigned Tuition Plan (Overrides standard calc)
            if (plan) {
               studentTotal += plan.amount;
               calculationMethod = plan.name;
               familyItems.push({
                  description: `${student.name}: ${plan.name}`,
                  amount: plan.amount,
                  student_name: student.name,
                  type: 'tuition_plan'
               });
            } else {
               // Priority 2: Studio Pricing Model
               const studentClasses = classes.filter(c => c.student_names?.includes(student.name));
               
               if (settings.pricing_model === 'hourly') {
                   // Sum hours
                   const totalHours = studentClasses.reduce((sum, c) => sum + (c.duration || 1), 0);
                   
                   // Find Rate Tier
                   // Sort tiers descending by hours to find the highest matching bracket
                   // Assuming tiers are "Up to X hours" or "X hours =" 
                   // Let's assume "X hours = $Y total" structure based on user request context
                   const sortedTiers = [...(settings.hourly_rate_tiers || [])].sort((a, b) => b.hours - a.hours);
                   const tier = sortedTiers.find(t => totalHours >= t.hours) || sortedTiers[sortedTiers.length - 1]; // Fallback to lowest tier or undefined
                   
                   // Fallback logic if no tiers or weird data: $15/hr default
                   const rate = tier ? tier.rate : (totalHours * 15); 
                   
                   if (rate > 0) {
                       studentTotal += rate;
                       calculationMethod = `${totalHours} hrs / wk`;
                       familyItems.push({
                          description: `${student.name}: Hourly Tuition (${totalHours} hrs)`,
                          amount: rate,
                          student_name: student.name,
                          type: 'tuition_calc'
                       });
                   }

               } else {
                   // Default / Per Class Model
                   const classCost = studentClasses.reduce((sum, c) => sum + (c.tuition_cost || 0), 0);
                   if (classCost > 0) {
                      studentTotal += classCost;
                      calculationMethod = `${studentClasses.length} classes`;
                      familyItems.push({
                         description: `${student.name}: Class Tuition (${studentClasses.length} classes)`,
                         amount: classCost,
                         student_name: student.name,
                         type: 'tuition_calc'
                      });
                   }
               }
            }
            familyTotal += studentTotal;
         });

         // 2. Discounts (Sibling & Promo)
         // Sibling Discount Logic
         const siblingDiscount = discounts.find(d => d.category === 'sibling' && d.active);
         if (siblingDiscount && family.students.length > 1) {
             // Apply to total or specific students? 
             // Simplified: Apply to total tuition portion
             const discountAmount = siblingDiscount.type === 'percent' 
                ? familyTotal * (siblingDiscount.value / 100) 
                : siblingDiscount.value;
             
             if (discountAmount > 0) {
                familyTotal -= discountAmount;
                familyItems.push({
                   description: `${siblingDiscount.name}`,
                   amount: -discountAmount,
                   student_name: 'Family',
                   type: 'discount'
                });
             }
         }

         // 3. Fees (Mandatory Monthly + Selected One-Time/Annual)
         const mandatoryMonthly = fees.filter(f => f.billing_frequency === 'monthly' && f.is_mandatory && !selectedFees.includes(f.id));
         const feesToApply = [
             ...mandatoryMonthly,
             ...fees.filter(f => selectedFees.includes(f.id)) // User selected extra fees
         ];

         feesToApply.forEach(fee => {
            // Apply once per family or student? Usually per student for things like Costume/Reg
            // Let's assume per student for safety unless marked otherwise (schema update would be needed for 'per_family')
            family.students.forEach(s => {
               familyTotal += fee.amount;
               familyItems.push({
                  description: `${s.name}: ${fee.name}`,
                  amount: fee.amount,
                  student_name: s.name,
                  type: 'fee'
               });
            });
         });

         family.total = Math.max(0, familyTotal); // No negative invoices
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

  // Optional Fees Selection
  const optionalFees = fees.filter(f => 
     f.billing_frequency === 'annual' || 
     f.billing_frequency === 'one_time' || 
     f.billing_frequency === 'per_session'
  );

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
                  <span className="text-white font-medium capitalize ml-1">{settings.pricing_model.replace('_', ' ')} Model</span>
               </p>
            </div>
            <div className="flex gap-3">
               <div className="bg-white/10 rounded-full px-4 py-2 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Calculator className="w-3 h-3" /> {settings.pricing_model}
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
                                 <div className="font-bold text-[#333333]">{fee.name}</div>
                                 <div className="text-xs text-gray-400 capitalize">{fee.billing_frequency.replace('_', ' ')} • ${fee.amount}</div>
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