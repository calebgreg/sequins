import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    ArrowLeft, Mail, Phone, Plus, CreditCard, DollarSign, Users, 
    Clock, Calendar, MessageSquare, Star, TrendingUp, AlertCircle, 
    CheckCircle2, MoreHorizontal, FileText, Send, Paperclip, ChevronRight,
    Wallet, Shield, ArrowRight, PenSquare, StickyNote, Layout, Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import FamilyRoomBuilder from './FamilyRoomBuilder';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StudentCommunicationTab from './StudentCommunicationTab';
import StudentFormModal from './StudentFormModal';
import InvoiceGenerator from '../billing/InvoiceGenerator';
import FamilyTuitionManager from './FamilyTuitionManager';
import { motion, AnimatePresence } from 'framer-motion';

export default function FamilyProfileView({ family, onBack }) {
    // family: { email, parent_name, phone, students: [] }
    const [activeSection, setActiveSection] = useState('overview'); // overview, billing, students, communication, sales_room
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState(null);
    const [newNote, setNewNote] = useState('');
    
    const queryClient = useQueryClient();
    
    // Get current user for author name
    const { data: currentUser } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me(),
        retry: false
    });

    // Fetch Invoices
    const { data: invoices = [] } = useQuery({
        queryKey: ['invoices', family.email],
        queryFn: async () => {
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

    // Fetch Staff Notes (FamilyNotes)
    const { data: notes = [] } = useQuery({
        queryKey: ['family_notes', family.email],
        queryFn: async () => {
            const all = await base44.entities.FamilyNote.list('-created_date', 50);
            return all.filter(n => n.parent_email === family.email);
        }
    });

    const createNoteMutation = useMutation({
        mutationFn: (content) => base44.entities.FamilyNote.create({
            parent_email: family.email,
            content,
            author_name: currentUser?.full_name || 'Staff'
        }),
        onSuccess: () => {
            setNewNote('');
            queryClient.invalidateQueries(['family_notes', family.email]);
        }
    });

    const handleAddNote = (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        createNoteMutation.mutate(newNote);
    };

    // Computed Metrics
    const balanceDue = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.balance_due || 0), 0), [invoices]);
    const lifetimeValue = useMemo(() => transactions.filter(t => t.type === 'payment' && t.status === 'succeeded').reduce((acc, t) => acc + t.amount, 0), [transactions]);
    const activeStudentsCount = family.students.filter(s => s.status === 'active').length;
    
    // Find last payment
    const lastPayment = useMemo(() => {
        const payments = transactions.filter(t => t.type === 'payment' && t.status === 'succeeded');
        return payments.length > 0 ? payments[0] : null;
    }, [transactions]);

    // Derived "representative" student for the communication tab
    const communicationProxyStudent = family.students[0] || { 
        id: 'family-context', 
        name: family.parent_name, 
        parent_email: family.email, 
        parent_name: family.parent_name 
    };

    const navItems = [
        { id: 'overview', label: 'Overview', icon: Users },
        { id: 'billing', label: 'Financials', icon: Wallet },
        { id: 'communication', label: 'Messaging', icon: MessageSquare },
        { id: 'sales_room', label: 'Family Room', icon: Layout },
    ];

    const handleAddStudent = () => {
        setStudentToEdit(null); // Ensure we are adding, not editing
        setIsStudentModalOpen(true);
    };

    const handleEditStudent = (student) => {
        setStudentToEdit(student);
        setIsStudentModalOpen(true);
    }

    return (
        <div className="flex flex-col h-full bg-[#F4F4F6] min-h-screen font-sans text-[#333333]">
            {/* Minimalist Top Bar */}
            <div className="px-8 py-6 flex items-center justify-between sticky top-0 z-20 bg-[#F4F4F6]/80 backdrop-blur-xl border-b border-white/50">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={onBack} 
                        className="group flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm hover:scale-110 transition-all duration-300"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-[#333333]" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-serif text-[#333333] tracking-tight">
                            The {family.parent_name.split(' ').pop()} Family
                        </h1>
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Account ID: #{family.students[0]?.id?.slice(0,6) || 'N/A'}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>Since {family.students[0]?.joined_date ? format(new Date(family.students[0].joined_date), 'yyyy') : format(new Date(), 'yyyy')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Balance Due</span>
                        <span className={`text-xl font-serif ${balanceDue > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            ${balanceDue.toLocaleString()}
                        </span>
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="rounded-full bg-[#333333] text-white hover:bg-black px-6 shadow-lg shadow-gray-200 gap-2">
                                Actions <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                            <DropdownMenuLabel className="text-xs text-gray-400 uppercase tracking-wider">Family Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleAddStudent} className="rounded-xl cursor-pointer">
                                <Plus className="w-4 h-4 mr-2" /> Add Sibling
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsInvoiceModalOpen(true)} className="rounded-xl cursor-pointer">
                                <CreditCard className="w-4 h-4 mr-2" /> Create Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveSection('communication')} className="rounded-xl cursor-pointer">
                                <MessageSquare className="w-4 h-4 mr-2" /> Message Family
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-8 pt-2 gap-8 max-w-[1600px] mx-auto w-full">
                
                {/* Left Sidebar Profile Card */}
                <div className="w-full md:w-80 flex-shrink-0 space-y-6">
                    {/* Main Profile Card */}
                    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#F2DCDD]/50 to-transparent" />
                        
                        <div className="relative z-10 w-24 h-24 rounded-full bg-white p-1 shadow-xl mb-4 mt-4">
                            <div className="w-full h-full rounded-full bg-[#333333] flex items-center justify-center text-white text-2xl font-serif">
                                {family.parent_name.charAt(0)}
                            </div>
                        </div>

                        <h2 className="text-xl font-serif text-[#333333] mb-1 relative z-10">{family.parent_name}</h2>
                        <Badge variant="secondary" className="mb-6 relative z-10">Primary Contact</Badge>

                        <div className="w-full space-y-3 relative z-10">
                             <a href={`mailto:${family.email}`} className="flex items-center gap-3 p-3 rounded-2xl bg-[#F4F4F6] hover:bg-[#F2DCDD] transition-colors text-sm group/item">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover/item:text-[#333333]">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <span className="truncate flex-1 text-left">{family.email}</span>
                             </a>
                             {family.phone && (
                                <a href={`tel:${family.phone}`} className="flex items-center gap-3 p-3 rounded-2xl bg-[#F4F4F6] hover:bg-[#F2DCDD] transition-colors text-sm group/item">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover/item:text-[#333333]">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <span className="truncate flex-1 text-left">{family.phone}</span>
                                </a>
                             )}
                        </div>
                    </div>

                    {/* Navigation Pills */}
                    <nav className="space-y-2">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`
                                    w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300
                                    ${activeSection === item.id 
                                        ? 'bg-white shadow-md scale-105 text-[#333333]' 
                                        : 'text-gray-400 hover:bg-white/50 hover:text-[#333333]'}
                                `}
                            >
                                <item.icon className={`w-5 h-5 ${activeSection === item.id ? 'text-[#333333]' : 'opacity-70'}`} />
                                <span className="font-medium text-sm tracking-wide">{item.label}</span>
                                {activeSection === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-30" />}
                            </button>
                        ))}
                    </nav>

                    {/* Quick Stats Mini - Removed as per request */}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-white rounded-[40px] shadow-sm border border-gray-100/50 overflow-hidden flex flex-col relative">
                    {/* Decorative background blobs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#F2DCDD]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="flex-1 overflow-y-auto p-8 relative z-10">
                        <AnimatePresence mode="wait">
                            
                            {/* OVERVIEW SECTION */}
                            {activeSection === 'overview' && (
                                <motion.div 
                                    key="overview"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-10"
                                >
                                    {/* Students Horizontal Scroll */}
                                    <section>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-serif text-[#333333]">Students</h3>
                                            <Button variant="ghost" size="sm" onClick={handleAddStudent} className="text-gray-400 hover:text-[#333333]">
                                                <Plus className="w-4 h-4 mr-1" /> Add
                                            </Button>
                                        </div>
                                        <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                                            {family.students.map((student, i) => (
                                                <div 
                                                    key={student.id} 
                                                    onClick={() => handleEditStudent(student)}
                                                    className="min-w-[280px] bg-white border border-gray-100 rounded-[28px] p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1"
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <Avatar className="w-14 h-14 border-4 border-[#F4F4F6] shadow-inner">
                                                            <AvatarFallback className="bg-[#333333] text-white font-serif">{student.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <Badge className={`${student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} border-none`}>
                                                            {student.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="mb-4">
                                                        <h4 className="font-serif text-lg text-[#333333] group-hover:text-indigo-900 transition-colors">{student.name}</h4>
                                                        <p className="text-sm text-gray-400">{student.age} years • {student.level}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {student.billing_method === 'auto_pay' && (
                                                            <div className="px-2 py-1 bg-indigo-50 rounded-lg text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                                                                Auto Pay
                                                            </div>
                                                        )}
                                                        <div className="w-full h-px bg-gray-100 flex-1" />
                                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#333333] transition-colors" />
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Add Student Card */}
                                            <button 
                                                onClick={handleAddStudent}
                                                className="min-w-[100px] rounded-[28px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:text-[#333333] hover:border-[#333333] transition-all bg-[#F4F4F6]/50"
                                            >
                                                <Plus className="w-6 h-6 mb-2" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Add</span>
                                            </button>
                                        </div>
                                    </section>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Tuition Snapshot Widget */}
                                        <section className="bg-gradient-to-br from-[#333333] to-black rounded-[32px] p-8 text-white relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]" onClick={() => setActiveSection('billing')}>
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/10 transition-colors" />
                                            
                                            <div className="relative z-10 flex flex-col h-full justify-between min-h-[250px]">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Financial Snapshot</div>
                                                        <h3 className="font-serif text-3xl text-white mb-1">
                                                            {balanceDue > 0 ? 'Payment Due' : 'All Clear'}
                                                        </h3>
                                                        <p className="text-white/60 text-sm">
                                                            {balanceDue > 0 ? 'Action required on account' : 'Account is in good standing'}
                                                        </p>
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-sm group-hover:bg-white group-hover:text-[#333333] transition-all">
                                                        <Wallet className="w-6 h-6" />
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="flex items-end gap-2">
                                                        <div className="text-6xl font-serif font-light">${balanceDue.toLocaleString()}</div>
                                                        <div className="text-white/50 mb-2 font-medium">USD</div>
                                                    </div>
                                                    
                                                    <Button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveSection('billing');
                                                        }}
                                                        className="w-full bg-white text-[#333333] hover:bg-gray-100 rounded-xl shadow-lg font-bold h-12 gap-2"
                                                    >
                                                        <Sparkles className="w-4 h-4 text-indigo-500" /> Manage Tuition
                                                    </Button>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Staff Notes Feed */}
                                        <section className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex flex-col h-[500px]">
                                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                                <h3 className="text-lg font-serif text-[#333333]">Staff Notes</h3>
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-500">{notes.length}</Badge>
                                            </div>
                                            
                                            {/* Input Area */}
                                            <div className="mb-6 flex-shrink-0">
                                                <form onSubmit={handleAddNote} className="relative">
                                                    <textarea 
                                                        value={newNote}
                                                        onChange={(e) => setNewNote(e.target.value)}
                                                        placeholder="Add a note about this family..."
                                                        className="w-full bg-[#F4F4F6] rounded-2xl p-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#333333]/10 resize-none min-h-[80px]"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleAddNote(e);
                                                            }
                                                        }}
                                                    />
                                                    <button 
                                                        type="submit"
                                                        disabled={!newNote.trim() || createNoteMutation.isPending}
                                                        className="absolute bottom-3 right-3 p-2 bg-[#333333] text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        {createNoteMutation.isPending ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <Send className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </form>
                                            </div>

                                            {/* Notes Feed */}
                                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
                                                {notes.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                                                        <StickyNote className="w-8 h-8 mb-2 opacity-50" />
                                                        <p className="text-sm">No notes yet</p>
                                                    </div>
                                                ) : (
                                                    notes.map((note) => (
                                                        <div key={note.id} className="group flex gap-4">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <Avatar className="w-8 h-8 border border-gray-100">
                                                                    <AvatarFallback className="bg-gray-100 text-gray-500 text-xs">
                                                                        {note.author_name?.charAt(0) || 'S'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="w-px h-full bg-gray-100 group-last:hidden" />
                                                            </div>
                                                            <div className="flex-1 pb-6">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-bold text-sm text-[#333333]">{note.author_name}</span>
                                                                    <span className="text-xs text-gray-400">• {format(new Date(note.created_date), 'MMM d, h:mm a')}</span>
                                                                </div>
                                                                <div className="bg-gray-50 p-3 rounded-r-2xl rounded-bl-2xl text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                                                    {note.content}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                </motion.div>
                            )}

                            {/* BILLING SECTION */}
                            {activeSection === 'billing' && (
                                <motion.div 
                                    key="billing"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col"
                                >
                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-full">
                                        {/* Main Col: Tuition Manager */}
                                        <div className="xl:col-span-2 h-full min-h-[600px]">
                                            <FamilyTuitionManager family={family} />
                                        </div>

                                        {/* Right Col: History & Stats */}
                                        <div className="xl:col-span-1 flex flex-col gap-6 overflow-hidden">
                                            {/* Key Metrics */}
                                            <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                                                 <div className="p-4 rounded-[24px] bg-white border border-gray-100 shadow-sm">
                                                     <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Open Balance</div>
                                                     <div className="text-2xl font-serif text-[#333333]">${balanceDue.toLocaleString()}</div>
                                                 </div>
                                                 <div className="p-4 rounded-[24px] bg-white border border-gray-100 shadow-sm">
                                                     <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">LTV</div>
                                                     <div className="text-2xl font-serif text-[#333333]">${lifetimeValue.toLocaleString()}</div>
                                                 </div>
                                            </div>

                                            {/* Invoice History List */}
                                            <div className="flex-1 overflow-hidden bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 flex flex-col">
                                                 <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                                     <h3 className="text-lg font-serif text-[#333333]">Invoice History</h3>
                                                     <Badge variant="secondary" className="bg-gray-50 text-gray-500">{invoices.length}</Badge>
                                                 </div>
                                                 <div className="space-y-2 overflow-y-auto flex-1 pr-2 -mr-2">
                                                    {invoices.length === 0 ? (
                                                        <div className="text-center py-10 text-gray-400">No invoices found.</div>
                                                    ) : (
                                                        invoices.map(inv => (
                                                            <div key={inv.id} className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-gray-50 hover:border-gray-100">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inv.status === 'paid' ? 'bg-green-500' : inv.status === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                                                    <div className="min-w-0">
                                                                        <div className="font-medium text-sm text-[#333333] truncate max-w-[120px]">{inv.title}</div>
                                                                        <div className="text-[10px] text-gray-400">
                                                                            {format(new Date(inv.issue_date), 'MMM d')}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    <div className="font-serif font-medium text-sm">${inv.total_amount}</div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* COMMUNICATION SECTION */}
                            {activeSection === 'communication' && (
                                <motion.div 
                                    key="communication"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col -m-8" // Negative margin to fill container
                                >
                                    <StudentCommunicationTab student={communicationProxyStudent} />
                                </motion.div>
                            )}

                            {/* DIGITAL SALES ROOM BUILDER */}
                            {activeSection === 'sales_room' && (
                                <motion.div 
                                    key="sales_room"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="h-full flex flex-col -m-8"
                                >
                                    <FamilyRoomBuilder 
                                        family={family} 
                                        onClose={() => setActiveSection('overview')}
                                    />
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <StudentFormModal 
                isOpen={isStudentModalOpen}
                onOpenChange={setIsStudentModalOpen}
                studentToEdit={studentToEdit}
                initialData={!studentToEdit ? {
                    parent_name: family.parent_name,
                    parent_email: family.email,
                    phone: family.phone
                } : null}
            />

            <InvoiceGenerator 
                isOpen={isInvoiceModalOpen}
                onOpenChange={setIsInvoiceModalOpen}
                family={{
                    email: family.email,
                    name: family.parent_name,
                    students: family.students
                }}
            />
        </div>
    );
}