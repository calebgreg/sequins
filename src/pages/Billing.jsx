import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  Settings, 
  Plus, 
  Download, 
  Filter, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  Send
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import InvoiceGenerator from '../components/billing/InvoiceGenerator';
import TransactionHistory from '../components/billing/TransactionHistory';
import TuitionConfiguration from '../components/billing/TuitionConfiguration';
import TuitionAssignment from '../components/billing/TuitionAssignment';
import BillingCycleRun from '../components/billing/BillingCycleRun';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function BillingManager() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isBillingRunOpen, setIsBillingRunOpen] = useState(false);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list(),
  });

  // Dashboard Calculations
  const totalRevenue = transactions
    .filter(t => t.type === 'payment' && t.status === 'succeeded')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const outstandingBalance = invoices
    .filter(i => i.status !== 'void' && i.status !== 'paid')
    .reduce((acc, curr) => acc + (curr.balance_due || 0), 0);

  const overdueAmount = invoices
    .filter(i => i.status === 'overdue')
    .reduce((acc, curr) => acc + (curr.balance_due || 0), 0);

  const recentActivity = transactions.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-8 font-sans text-[#333333]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
             <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link to={createPageUrl('Home')} className="hover:text-[#333333]">Dashboard</Link>
                <span>/</span>
                <span className="text-[#333333]">Billing & Finance</span>
             </div>
            <h1 className="text-4xl font-serif text-[#333333]">Financial Overview</h1>
          </div>
          <div className="flex gap-3">
            <Button 
              variant={activeTab === 'settings' ? 'default' : 'outline'}
              className="rounded-full border-gray-200 hover:bg-white gap-2"
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="w-4 h-4" /> Config
            </Button>
            <Button 
              onClick={() => setIsBillingRunOpen(true)}
              className="rounded-full bg-[#333333] text-white hover:bg-black gap-2 shadow-lg hover:scale-105 transition-transform"
            >
              <Wallet className="w-4 h-4" /> Run Billing Cycle
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white p-1 rounded-full border border-gray-100 inline-flex h-auto shadow-sm mb-8">
            {[
              { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
              { id: 'assignments', label: 'Assignments', icon: Users },
              { id: 'invoices', label: 'History', icon: Receipt },
              { id: 'settings', label: 'Configuration', icon: Settings },
            ].map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-[#333333] data-[state=active]:text-white gap-2 transition-all"
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="assignments">
             <TuitionAssignment />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-8 focus:outline-none">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-[32px] border-none shadow-sm hover:shadow-md transition-all group">
                <CardHeader className="pb-2">
                   <CardDescription className="uppercase tracking-wider font-bold text-[10px] flex items-center gap-2">
                      <Wallet className="w-3 h-3" /> Total Revenue (YTD)
                   </CardDescription>
                   <CardTitle className="text-4xl font-serif text-[#333333] group-hover:text-green-600 transition-colors">
                      ${totalRevenue.toLocaleString()}
                   </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-green-600 text-sm font-medium gap-1">
                    <ArrowUpRight className="w-4 h-4" /> +12% from last month
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-none shadow-sm hover:shadow-md transition-all group">
                <CardHeader className="pb-2">
                   <CardDescription className="uppercase tracking-wider font-bold text-[10px] flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Outstanding Balance
                   </CardDescription>
                   <CardTitle className="text-4xl font-serif text-[#333333] group-hover:text-blue-600 transition-colors">
                      ${outstandingBalance.toLocaleString()}
                   </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-400 text-sm">
                    Across {invoices.filter(i => i.status === 'sent').length} active invoices
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-none shadow-sm hover:shadow-md transition-all group">
                <CardHeader className="pb-2">
                   <CardDescription className="uppercase tracking-wider font-bold text-[10px] flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-3 h-3" /> Overdue
                   </CardDescription>
                   <CardTitle className="text-4xl font-serif text-[#333333] group-hover:text-red-500 transition-colors">
                      ${overdueAmount.toLocaleString()}
                   </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="link" className="p-0 h-auto text-red-400 text-sm hover:text-red-600">
                    View {invoices.filter(i => i.status === 'overdue').length} overdue invoices
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Charts & Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-serif text-2xl text-[#333333]">Recent Transactions</h3>
                   <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>View All</Button>
                </div>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? recentActivity.map((t, i) => (
                    <div key={t.id || i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-[#F4F4F6] transition-colors group cursor-pointer">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'payment' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                             {t.type === 'payment' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div>
                             <div className="font-medium text-[#333333]">{t.parent_email}</div>
                             <div className="text-xs text-gray-400">{format(new Date(t.date), 'MMM d, h:mm a')} • {t.method}</div>
                          </div>
                       </div>
                       <div className="font-serif font-medium text-lg">
                          {t.type === 'payment' ? '+' : '-'}${t.amount.toFixed(2)}
                       </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-gray-400">No transactions yet.</div>
                  )}
                </div>
              </div>

              {/* Quick Actions / Integrations */}
              <div className="space-y-6">
                 <div className="bg-[#333333] rounded-[32px] p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <h3 className="font-serif text-2xl mb-2">Auto-Billing</h3>
                    <p className="text-white/60 text-sm mb-6">Run monthly tuition for all active students.</p>
                    <Button 
                      onClick={() => setIsBillingRunOpen(true)}
                      className="w-full bg-white text-[#333333] hover:bg-gray-100 rounded-full"
                    >
                       Run Batch Process
                    </Button>
                 </div>

                 <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                    <h3 className="font-serif text-lg mb-4 text-[#333333]">Integration Status</h3>
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium">
                             <div className="w-2 h-2 rounded-full bg-green-500" /> Stripe
                          </div>
                          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-100">Connected</Badge>
                       </div>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium">
                             <div className="w-2 h-2 rounded-full bg-gray-300" /> QuickBooks
                          </div>
                          <Button variant="link" className="h-auto p-0 text-xs text-gray-400">Connect</Button>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="focus:outline-none">
             <div className="bg-white rounded-[32px] shadow-sm overflow-hidden min-h-[600px]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
                   <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input placeholder="Search invoices..." className="pl-10 rounded-xl bg-[#F4F4F6] border-none" />
                   </div>
                   <div className="flex gap-2">
                      <Button variant="ghost" size="icon"><Filter className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                   </div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-[#F4F4F6] text-xs uppercase text-gray-500 font-bold tracking-wider">
                         <tr>
                            <th className="p-6">Invoice</th>
                            <th className="p-6">Family</th>
                            <th className="p-6">Date</th>
                            <th className="p-6">Amount</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {invoices.length > 0 ? invoices.map(inv => (
                            <tr key={inv.id} className="group hover:bg-gray-50 transition-colors">
                               <td className="p-6 font-medium text-[#333333]">#{inv.id.slice(-6).toUpperCase()}</td>
                               <td className="p-6">
                                  <div className="font-medium">{inv.parent_name}</div>
                                  <div className="text-xs text-gray-400">{inv.parent_email}</div>
                               </td>
                               <td className="p-6 text-sm text-gray-500">{format(new Date(inv.due_date), 'MMM d, yyyy')}</td>
                               <td className="p-6 font-serif text-lg">${inv.total_amount.toFixed(2)}</td>
                               <td className="p-6">
                                  <Badge className={`
                                     capitalize font-normal rounded-lg px-3 py-1
                                     ${inv.status === 'paid' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 
                                       inv.status === 'overdue' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 
                                       inv.status === 'sent' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 
                                       'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                  `}>
                                     {inv.status}
                                  </Badge>
                               </td>
                               <td className="p-6 text-right">
                                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                     <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                               </td>
                            </tr>
                         )) : (
                            <tr>
                               <td colSpan="6" className="p-12 text-center text-gray-400">No invoices found. Create your first one!</td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="transactions">
             <TransactionHistory transactions={transactions} />
          </TabsContent>

          <TabsContent value="settings">
             <TuitionConfiguration />
          </TabsContent>
        </Tabs>
      </div>

      <InvoiceGenerator 
         isOpen={isGeneratorOpen} 
         onOpenChange={setIsGeneratorOpen} 
      />

      <BillingCycleRun 
         isOpen={isBillingRunOpen} 
         onOpenChange={setIsBillingRunOpen} 
      />
    </div>
  );
}