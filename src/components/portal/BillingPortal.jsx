import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Receipt, CreditCard, ArrowRight, CheckCircle2, Clock, Download, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function BillingPortal({ isOpen, onOpenChange, studentEmail }) {
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // In a real app, we'd filter by the logged-in user or the student's parent email
  // Here we fetch all for demo, but filtering logic would be:
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const all = await base44.entities.Invoice.list();
      // Mock filtering: return all for now to ensure data shows up in demo
      return all.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
    }
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
       const all = await base44.entities.Transaction.list();
       return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  });

  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue' || i.status === 'pending');
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const balance = unpaidInvoices.reduce((acc, curr) => acc + curr.balance_due, 0);

  const payMutation = useMutation({
    mutationFn: async (invoice) => {
      // 1. Create transaction
      await base44.entities.Transaction.create({
        invoice_id: invoice.id,
        parent_email: invoice.parent_email,
        amount: invoice.balance_due,
        date: new Date().toISOString(),
        type: 'payment',
        method: 'credit_card',
        status: 'succeeded',
        description: `Payment for ${invoice.title}`
      });

      // 2. Update invoice status
      await base44.entities.Invoice.update(invoice.id, {
        status: 'paid',
        amount_paid: invoice.total_amount,
        balance_due: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setSelectedInvoice(null);
      }, 2000);
    }
  });

  const handlePay = async (invoice) => {
    setIsPaymentProcessing(true);
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      payMutation.mutate(invoice);
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-[#F4F4F6] rounded-[40px] p-0 overflow-hidden border-none h-[85vh] flex flex-col md:flex-row">
        
        {/* Left Sidebar: Summary & Pay */}
        <div className="w-full md:w-1/3 bg-[#333333] p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="font-serif text-3xl mb-2">Billing Portal</h2>
            <p className="text-white/60 text-sm mb-10">Manage tuition and payments securely.</p>
            
            <div className="mb-8">
              <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Current Balance</div>
              <div className="text-5xl font-serif">${balance.toFixed(2)}</div>
              {balance > 0 && (
                 <div className="flex items-center gap-2 text-[#F2DCDD] text-sm mt-2">
                    <Clock className="w-4 h-4" /> Due by {format(new Date(), 'MMM 15')}
                 </div>
              )}
            </div>

            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
               <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 p-2 rounded-full">
                     <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                     <div className="text-sm font-medium">Visa ending in 4242</div>
                     <div className="text-xs text-white/50">Expires 12/28</div>
                  </div>
               </div>
               <Button variant="link" className="text-[#F2DCDD] text-xs p-0 h-auto hover:text-white">
                  Manage Payment Methods
               </Button>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-xs text-white/40 justify-center">
               <ShieldCheck className="w-3 h-3" /> Secure 256-bit SSL Encryption
            </div>
          </div>
        </div>

        {/* Right Content: Invoices & History */}
        <div className="flex-1 flex flex-col h-full bg-white">
          <div className="p-8 border-b border-gray-100">
             <h3 className="font-serif text-2xl text-[#333333]">Invoices</h3>
          </div>
          
          <ScrollArea className="flex-1 p-8">
            {selectedInvoice ? (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }} 
                 animate={{ opacity: 1, x: 0 }}
                 className="h-full flex flex-col"
               >
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedInvoice(null)}
                    className="self-start mb-6 text-gray-400 hover:text-[#333333] pl-0"
                  >
                     ← Back to list
                  </Button>

                  <div className="bg-white border border-gray-100 shadow-lg rounded-[32px] p-8 flex-1 flex flex-col">
                     <div className="flex justify-between items-start mb-8">
                        <div>
                           <h4 className="font-serif text-2xl text-[#333333]">{selectedInvoice.title}</h4>
                           <p className="text-gray-400 text-sm mt-1">Issued {format(new Date(selectedInvoice.issue_date), 'MMM d, yyyy')}</p>
                        </div>
                        <Badge variant="outline" className="text-lg px-4 py-1">
                           {selectedInvoice.status}
                        </Badge>
                     </div>

                     <div className="space-y-4 flex-1">
                        {selectedInvoice.items.map((item, idx) => (
                           <div key={idx} className="flex justify-between py-3 border-b border-gray-50 last:border-0">
                              <div>
                                 <div className="font-medium text-[#333333]">{item.description}</div>
                                 {item.student_name && <div className="text-xs text-gray-400">{item.student_name}</div>}
                              </div>
                              <div className="font-serif">${item.amount.toFixed(2)}</div>
                           </div>
                        ))}
                     </div>

                     <div className="border-t border-gray-100 pt-6 mt-6">
                        <div className="flex justify-between text-xl font-serif font-medium text-[#333333] mb-6">
                           <span>Total Due</span>
                           <span>${selectedInvoice.balance_due.toFixed(2)}</span>
                        </div>

                        {selectedInvoice.status !== 'paid' && (
                           <Button 
                             onClick={() => handlePay(selectedInvoice)}
                             disabled={isPaymentProcessing || paymentSuccess}
                             className={`w-full h-14 rounded-full text-lg transition-all ${paymentSuccess ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-[#333333] hover:bg-black text-white'}`}
                           >
                              {isPaymentProcessing ? (
                                 "Processing..." 
                              ) : paymentSuccess ? (
                                 <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Paid Successfully</span>
                              ) : (
                                 `Pay $${selectedInvoice.balance_due.toFixed(2)}`
                              )}
                           </Button>
                        )}
                     </div>
                  </div>
               </motion.div>
            ) : (
               <div className="space-y-8">
                  {/* Unpaid Section */}
                  {unpaidInvoices.length > 0 && (
                     <div className="space-y-4">
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">Due Now</h4>
                        {unpaidInvoices.map(inv => (
                           <div 
                             key={inv.id} 
                             onClick={() => setSelectedInvoice(inv)}
                             className="group bg-white border border-red-100 rounded-2xl p-6 flex items-center justify-between cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                           >
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400" />
                              <div className="flex items-center gap-4">
                                 <div className="bg-red-50 p-3 rounded-full text-red-500">
                                    <Receipt className="w-6 h-6" />
                                 </div>
                                 <div>
                                    <div className="font-medium text-[#333333] group-hover:text-black">{inv.title}</div>
                                    <div className="text-sm text-red-400">Due {format(new Date(inv.due_date), 'MMM d')}</div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="font-serif text-xl text-[#333333]">${inv.balance_due.toFixed(2)}</div>
                                 <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
                              </div>
                           </div>
                        ))}
                     </div>
                  )}

                  {/* History Section */}
                  <div className="space-y-4">
                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payment History</h4>
                     {paidInvoices.length > 0 ? paidInvoices.map(inv => (
                        <div 
                          key={inv.id} 
                          onClick={() => setSelectedInvoice(inv)}
                          className="group bg-white border border-gray-100 rounded-2xl p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all"
                        >
                           <div className="flex items-center gap-4">
                              <div className="bg-gray-100 p-3 rounded-full text-gray-500 group-hover:bg-white transition-colors">
                                 <CheckCircle2 className="w-6 h-6" />
                              </div>
                              <div>
                                 <div className="font-medium text-[#333333]">{inv.title}</div>
                                 <div className="text-sm text-gray-400">Paid {format(new Date(inv.issue_date), 'MMM d')}</div>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="font-serif text-xl text-gray-400 line-through">${inv.total_amount.toFixed(2)}</div>
                              <Badge variant="secondary" className="bg-green-50 text-green-600 hover:bg-green-100">Paid</Badge>
                           </div>
                        </div>
                     )) : (
                        <div className="text-center py-8 text-gray-400 text-sm">No payment history available.</div>
                     )}
                  </div>
               </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}