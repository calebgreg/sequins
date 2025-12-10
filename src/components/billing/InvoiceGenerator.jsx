import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Sparkles, Zap, Calculator } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function InvoiceGenerator({ isOpen, onOpenChange, family = null }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(family ? 2 : 1); // 1: Select Family, 2: Build Invoice
  const [selectedFamily, setSelectedFamily] = useState(family);

  React.useEffect(() => {
    if (family) {
      setSelectedFamily(family);
      setStep(2);
    }
  }, [family]);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [invoiceData, setInvoiceData] = useState({
    title: 'Tuition Invoice',
    due_date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    items: [{ description: 'Monthly Tuition', amount: 0, student_name: '' }],
    notes: ''
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
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

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const settings = settingsList[0] || { pricing_model: 'per_class', hourly_rate_tiers: [] };

  // Group by parent email for selection
  const families = React.useMemo(() => {
    const groups = {};
    students.forEach(s => {
      if (s.parent_email) {
         if (!groups[s.parent_email]) {
            groups[s.parent_email] = {
               email: s.parent_email,
               name: s.parent_name || 'Parent',
               students: []
            };
         }
         groups[s.parent_email].students.push(s);
      }
    });
    return Object.values(groups);
  }, [students]);

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', amount: 0, student_name: '' }]
    }));
  };

  const removeItem = (idx) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const updateItem = (idx, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[idx][field] = value;
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const calculateTotal = () => {
    return invoiceData.items.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const total = calculateTotal();
      return base44.entities.Invoice.create({
        parent_email: selectedFamily.email,
        parent_name: selectedFamily.name,
        title: invoiceData.title,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: invoiceData.due_date,
        status: 'sent',
        items: invoiceData.items,
        subtotal: total,
        total_amount: total,
        balance_due: total,
        notes: invoiceData.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onOpenChange(false);
      setStep(1);
      setInvoiceData({
        title: 'Tuition Invoice',
        due_date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
        items: [{ description: 'Monthly Tuition', amount: 0, student_name: '' }],
        notes: ''
      });
    }
  });

  const handleAutoPopulate = async () => {
    setIsCalculating(true);
    
    // 1. Basic Tuition (Calculated based on Settings)
    let items = [];
    
    selectedFamily.students.forEach(s => {
        // Check assignments logic or settings
        const studentClasses = classes.filter(c => c.student_names?.includes(s.name));
        let amount = 0;
        let desc = 'Tuition';

        if (settings.pricing_model === 'hourly') {
            const hours = studentClasses.reduce((sum, c) => sum + (c.duration || 1), 0);
            // Find tier
            const tiers = [...(settings.hourly_rate_tiers || [])].sort((a, b) => b.hours - a.hours);
            const tier = tiers.find(t => hours >= t.hours) || tiers[tiers.length - 1];
            amount = tier ? tier.rate : (hours * 15);
            desc = `Hourly Tuition (${hours} hrs)`;
        } else {
            // Per Class
            amount = studentClasses.reduce((sum, c) => sum + (c.tuition_cost || 0), 0);
            desc = `Class Tuition (${studentClasses.length} classes)`;
        }
        
        // Minimal fallback
        if (amount === 0) amount = 120; 

        items.push({
            student_name: s.name,
            description: desc,
            amount: amount,
            type: 'tuition'
        });
    });

    // 2. Apply Sibling Discount (Logic: If more than 1 student, apply to all except the first/highest)
    // Simplified: Apply discount to 2nd+ student
    const siblingDiscount = discounts.find(d => d.category === 'sibling' && d.active);
    if (siblingDiscount && selectedFamily.students.length > 1) {
        // Sort by amount descending, skip first
        items.sort((a, b) => b.amount - a.amount);
        
        for (let i = 1; i < items.length; i++) {
           const originalAmount = items[i].amount;
           const discountAmount = siblingDiscount.type === 'percent' 
              ? (originalAmount * (siblingDiscount.value / 100)) 
              : siblingDiscount.value;
              
           items.push({
              student_name: items[i].student_name,
              description: `${siblingDiscount.name} (${siblingDiscount.type === 'percent' ? siblingDiscount.value + '%' : '$' + siblingDiscount.value} off)`,
              amount: -discountAmount, // Negative for discount
              type: 'discount'
           });
        }
    }

    // 3. Apply Mandatory Fees
    const mandatoryFees = fees.filter(f => f.is_mandatory);
    mandatoryFees.forEach(fee => {
       // Apply once per family or per student based on logic (assuming per student here for simplicity)
       selectedFamily.students.forEach(s => {
          items.push({
             student_name: s.name,
             description: fee.name,
             amount: fee.amount,
             type: 'fee'
          });
       });
    });

    // 4. Apply Auto-Apply Promos
    const promos = discounts.filter(d => d.apply_automatically && d.category === 'promo' && d.active);
    promos.forEach(promo => {
       items.push({
          student_name: 'Family',
          description: promo.name,
          amount: promo.type === 'fixed' ? -promo.value : -(items.reduce((sum, i) => sum + (i.amount > 0 ? i.amount : 0), 0) * (promo.value / 100)),
          type: 'discount'
       });
    });

    setInvoiceData(prev => ({ ...prev, items: items }));
    setIsCalculating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white rounded-[32px] p-0 overflow-hidden border-none h-[80vh] flex flex-col">
        <div className="bg-[#F4F4F6] px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#333333]">
              {step === 1 ? 'Select Family' : 'Draft Invoice'}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-400 font-medium">Step {step} of 2</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 ? (
             <div className="space-y-4">
                <Input placeholder="Search families..." className="bg-gray-50 border-none rounded-xl mb-4" />
                <div className="grid gap-3">
                   {families.map(f => (
                      <button 
                        key={f.email}
                        onClick={() => { setSelectedFamily(f); setStep(2); }}
                        className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-[#333333] hover:bg-gray-50 transition-all flex justify-between items-center group"
                      >
                         <div>
                            <div className="font-medium text-[#333333]">{f.name}</div>
                            <div className="text-xs text-gray-400">{f.email}</div>
                         </div>
                         <div className="text-xs text-gray-400 group-hover:text-[#333333]">
                            {f.students.length} Students
                         </div>
                      </button>
                   ))}
                </div>
             </div>
          ) : (
             <div className="space-y-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-1">Bill To</div>
                      <div className="font-serif text-xl text-[#333333]">{selectedFamily.name}</div>
                      <div className="text-sm text-gray-500">{selectedFamily.email}</div>
                   </div>
                   <div className="text-right">
                      <div className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-1">Due Date</div>
                      <Input 
                        type="date" 
                        value={invoiceData.due_date}
                        onChange={e => setInvoiceData({...invoiceData, due_date: e.target.value})}
                        className="w-40 text-right bg-transparent border-b border-gray-200 rounded-none px-0 py-1 h-auto focus:border-[#333333]" 
                      />
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <Label>Line Items</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleAutoPopulate} 
                        disabled={isCalculating}
                        className="text-indigo-600 hover:bg-indigo-50 gap-1 h-8 bg-indigo-50/50"
                      >
                         {isCalculating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                         {isCalculating ? 'Calculating...' : 'Smart Generate'}
                      </Button>
                   </div>
                   
                   <div className="space-y-3">
                      {invoiceData.items.map((item, idx) => (
                         <div key={idx} className="flex gap-3 items-start group">
                            <div className="flex-1 grid grid-cols-12 gap-3">
                               <div className="col-span-7">
                                  <Input 
                                     placeholder="Description" 
                                     value={item.description}
                                     onChange={e => updateItem(idx, 'description', e.target.value)}
                                     className="bg-gray-50 border-transparent rounded-xl"
                                  />
                               </div>
                               <div className="col-span-3">
                                  <Select 
                                    value={item.student_name} 
                                    onValueChange={v => updateItem(idx, 'student_name', v)}
                                  >
                                     <SelectTrigger className="bg-gray-50 border-transparent rounded-xl text-xs">
                                        <SelectValue placeholder="Student" />
                                     </SelectTrigger>
                                     <SelectContent>
                                        {selectedFamily.students.map(s => (
                                           <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                        ))}
                                     </SelectContent>
                                  </Select>
                               </div>
                               <div className="col-span-2">
                                  <Input 
                                     type="number" 
                                     placeholder="0.00" 
                                     value={item.amount}
                                     onChange={e => updateItem(idx, 'amount', parseFloat(e.target.value))}
                                     className="bg-gray-50 border-transparent rounded-xl text-right font-mono"
                                  />
                               </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-300 hover:text-red-500 hover:bg-red-50">
                               <Trash2 className="w-4 h-4" />
                            </Button>
                         </div>
                      ))}
                   </div>
                   <Button variant="outline" onClick={addItem} className="w-full border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 rounded-xl">
                      <Plus className="w-4 h-4 mr-2" /> Add Item
                   </Button>
                </div>

                <div className="border-t border-gray-100 pt-4 flex justify-end">
                   <div className="w-48">
                      <div className="flex justify-between text-sm mb-2">
                         <span className="text-gray-500">Subtotal</span>
                         <span>${calculateTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-serif font-medium text-[#333333]">
                         <span>Total</span>
                         <span>${calculateTotal().toFixed(2)}</span>
                      </div>
                   </div>
                </div>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-[#F4F4F6] flex justify-end gap-3">
          {step === 2 && <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {step === 1 ? (
             <Button 
               disabled={!selectedFamily} 
               onClick={() => setStep(2)}
               className="bg-[#333333] text-white rounded-full px-8"
             >
               Next
             </Button>
          ) : (
             <Button 
               onClick={() => createMutation.mutate()} 
               disabled={createMutation.isPending}
               className="bg-[#333333] text-white rounded-full px-8"
             >
               {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create & Send'}
             </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}