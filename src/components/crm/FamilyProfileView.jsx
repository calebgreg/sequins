import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    ArrowLeft, Mail, Phone, Plus, CreditCard, DollarSign, Users, 
    Clock, Calendar, MessageSquare, Star, TrendingUp, AlertCircle, 
    CheckCircle2, MoreHorizontal, FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import StudentCommunicationTab from './StudentCommunicationTab';
import { motion } from 'framer-motion';

export default function FamilyProfileView({ family, onBack }) {
    // family: { email, parent_name, phone, students: [] }
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch Invoices
    const { data: invoices = [] } = useQuery({
        queryKey: ['invoices', family.email],
        queryFn: async () => {
             // In a real app we'd filter on server, but here we filter client side as per established pattern
             const all = await base44.entities.Invoice.list('-issue_date', 100);
             return all.filter(inv => inv.parent_email === family.email);
        }
    });

    // Fetch Transactions
    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions', family.email],
        queryFn: async () => {
            const all = await base44.entities.Transaction.list('-date', 100);
            return all.filter(t => t.parent_email === family.email);
        }
    });

    // Computed Metrics
    const balanceDue = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.balance_due || 0), 0), [invoices]);
    const lifetimeValue = useMemo(() => transactions.filter(t => t.type === 'payment' && t.status === 'succeeded').reduce((acc, t) => acc + t.amount, 0), [transactions]);
    const activeStudentsCount = family.students.filter(s => s.status === 'active').length;

    // Derived "representative" student for the communication tab (it needs a student object to get the parent email)
    // We'll construct a proxy object if needed, or just use the first student.
    const communicationProxyStudent = family.students[0] || { 
        id: 'family-context', 
        name: family.parent_name, 
        parent_email: family.email, 
        parent_name: family.parent_name 
    };

    return (
        <div className="flex flex-col h-full bg-[#F4F4F6] min-h-screen">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-serif text-[#333333] flex items-center gap-2">
                            The {family.parent_name.split(' ').pop()} Family
                            {balanceDue > 0 && (
                                <Badge variant="destructive" className="ml-2 bg-red-100 text-red-600 border-red-200 hover:bg-red-200">
                                    ${balanceDue} Due
                                </Badge>
                            )}
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {family.parent_name} (Primary)</span>
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {family.email}</span>
                            {family.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {family.phone}</span>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <Button variant="outline" className="rounded-full border-dashed border-gray-300 gap-2">
                             <FileText className="w-4 h-4" /> Create Invoice
                         </Button>
                         <Button className="rounded-full bg-[#333333] text-white hover:bg-black gap-2">
                             <MessageSquare className="w-4 h-4" /> Message Family
                         </Button>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-4 gap-4 mt-2">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">LTV</div>
                            <div className="text-lg font-serif font-medium text-[#333333]">${lifetimeValue.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Students</div>
                            <div className="text-lg font-serif font-medium text-[#333333]">{activeStudentsCount} Active / {family.students.length} Total</div>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${balanceDue > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Balance</div>
                            <div className={`text-lg font-serif font-medium ${balanceDue > 0 ? 'text-red-600' : 'text-[#333333]'}`}>
                                ${balanceDue.toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                            <Star className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Engagement</div>
                            <div className="text-lg font-serif font-medium text-[#333333]">High</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="px-6 pt-4 bg-white border-b border-gray-200">
                        <TabsList className="bg-transparent p-0 gap-6 w-full justify-start h-auto">
                            {['overview', 'billing', 'students', 'communication'].map(tab => (
                                <TabsTrigger 
                                    key={tab} 
                                    value={tab}
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-[#333333] data-[state=active]:shadow-none rounded-none px-2 py-3 bg-transparent capitalize font-serif text-base text-gray-400 data-[state=active]:text-[#333333]"
                                >
                                    {tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-6xl mx-auto">
                            
                            {/* OVERVIEW TAB */}
                            <TabsContent value="overview" className="mt-0 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Family Members */}
                                    <div className="md:col-span-2 space-y-6">
                                        <h3 className="text-lg font-serif text-[#333333] mb-4">Family Roster</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {family.students.map(student => (
                                                <Card key={student.id} className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer">
                                                    <CardContent className="p-4 flex items-center gap-4">
                                                        <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                                                            <AvatarFallback className="bg-[#333333] text-white font-serif">{student.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-bold text-[#333333]">{student.name}</div>
                                                            <div className="text-xs text-gray-500">{student.age} yrs • {student.level}</div>
                                                            <div className="mt-1 flex gap-1">
                                                                <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700">{student.status}</Badge>
                                                                {student.billing_method === 'auto_pay' && <Badge variant="outline" className="text-[10px]">Auto-Pay</Badge>}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        {/* Recent Invoices */}
                                        <h3 className="text-lg font-serif text-[#333333] mt-8 mb-4">Recent Invoices</h3>
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                            {invoices.length === 0 ? (
                                                <div className="p-8 text-center text-gray-400">No invoices found.</div>
                                            ) : (
                                                invoices.slice(0, 3).map((inv, i) => (
                                                    <div key={inv.id} className={`p-4 flex items-center justify-between ${i !== 0 ? 'border-t border-gray-100' : ''}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${inv.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-[#333333]">{inv.title}</div>
                                                                <div className="text-xs text-gray-400">{format(new Date(inv.issue_date), 'MMM d, yyyy')}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-[#333333]">${inv.total_amount}</div>
                                                            <div className={`text-xs font-medium uppercase ${inv.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{inv.status}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Sidebar: Notes / Tasks */}
                                    <div className="space-y-6">
                                        <Card className="bg-[#333333] text-white border-none shadow-lg">
                                            <CardHeader>
                                                <CardTitle className="text-lg font-serif">Staff Notes</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div className="bg-white/10 p-3 rounded-xl text-sm">
                                                        <p className="opacity-90 leading-relaxed">"Mom prefers text messages over email. Usually pays tuition around the 5th of the month."</p>
                                                        <div className="mt-2 text-xs opacity-50 font-bold uppercase">- Front Desk, Dec 1</div>
                                                    </div>
                                                    <Button variant="outline" className="w-full border-white/20 hover:bg-white/10 text-white hover:text-white">
                                                        + Add Note
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        
                                        <Card className="border-none shadow-sm">
                                            <CardHeader>
                                                <CardTitle className="text-lg font-serif">Tasks</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                        <div className="w-4 h-4 rounded-full border border-gray-300" />
                                                        <span>Collect waiver for Willamina</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                        <div className="w-4 h-4 rounded-full border border-gray-300" />
                                                        <span>Follow up on Jazz placement</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* BILLING TAB */}
                            <TabsContent value="billing" className="mt-0">
                                <div className="bg-white rounded-[32px] p-6 shadow-sm min-h-[500px]">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-serif text-[#333333]">Financial History</h2>
                                        <Button>Create Invoice</Button>
                                    </div>
                                    <div className="space-y-4">
                                        {invoices.map(inv => (
                                            <div key={inv.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-gray-100 p-3 rounded-xl">
                                                        <FileText className="w-6 h-6 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[#333333] text-lg">{inv.title}</div>
                                                        <div className="text-sm text-gray-500">
                                                            Issued {format(new Date(inv.issue_date), 'MMM d, yyyy')} • Due {format(new Date(inv.due_date), 'MMM d')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <div className="text-xl font-serif font-medium">${inv.total_amount}</div>
                                                        <Badge className={`${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {inv.status}
                                                        </Badge>
                                                    </div>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-5 h-5 text-gray-400" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                        {invoices.length === 0 && (
                                            <div className="text-center py-20 text-gray-400">
                                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                <p>No invoices on file</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* COMMUNICATION TAB */}
                            <TabsContent value="communication" className="mt-0 h-[600px]">
                                <Card className="h-full border-none shadow-sm overflow-hidden rounded-[32px]">
                                    <StudentCommunicationTab student={communicationProxyStudent} />
                                </Card>
                            </TabsContent>

                            {/* STUDENTS TAB */}
                            <TabsContent value="students" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {family.students.map(student => (
                                        <div key={student.id} className="bg-white rounded-[32px] p-8 shadow-sm">
                                            <div className="flex items-center gap-4 mb-6">
                                                <Avatar className="w-16 h-16 border-4 border-[#F4F4F6]">
                                                    <AvatarFallback className="text-2xl font-serif bg-[#333333] text-white">
                                                        {student.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="text-2xl font-serif text-[#333333]">{student.name}</h3>
                                                    <div className="flex gap-2 mt-1">
                                                        <Badge variant="secondary">{student.level}</Badge>
                                                        <Badge variant="secondary">{student.age} yrs</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="p-4 bg-[#F4F4F6] rounded-2xl">
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Interests</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {student.interests?.map(i => <Badge key={i} className="bg-white text-gray-600 hover:bg-white">{i}</Badge>)}
                                                        {!student.interests?.length && <span className="text-gray-400 text-sm">No interests listed</span>}
                                                    </div>
                                                </div>
                                                <Button className="w-full bg-white border border-gray-200 text-[#333333] hover:bg-gray-50">
                                                    View Full Profile
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </div>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}