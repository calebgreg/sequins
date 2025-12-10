import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    ArrowLeft, Mail, Phone, Plus, CreditCard, DollarSign, Users, 
    Clock, Calendar, MessageSquare, Star, TrendingUp, AlertCircle, 
    CheckCircle2, MoreHorizontal, FileText, Send, Paperclip, ChevronRight,
    Wallet, Shield, ArrowRight, PenSquare, StickyNote, Layout, Sparkles, FolderOpen, ListTodo
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
import FamilyTasks from './FamilyTasks';
import FamilyDocuments from './FamilyDocuments';
import FamilySchedule from './FamilySchedule';
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

    const isAutoPay = family.students.some(s => s.billing_method === 'auto_pay');

    const navItems = [
        { id: 'overview', label: 'Overview', icon: Users },
        { id: 'billing', label: 'Financials', icon: Wallet },
        { id: 'documents', label: 'Docs & Files', icon: FolderOpen },
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
            <div className="px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-20 bg-[#F4F4F6]/90 backdrop-blur-xl border-b border-white/50 gap-4">
                <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                    <button 
                        onClick={onBack} 
                        className="group flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm hover:scale-110 transition-all duration-300 flex-shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-[#333333]" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-2xl md:text-3xl font-serif text-[#333333] tracking-tight truncate">
                            The {family.parent_name.split(' ').pop()} Family
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> <span className="hidden sm:inline">Account ID:</span> #{family.students[0]?.id?.slice(0,6) || 'N/A'}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block" />
                            <span className="hidden sm:inline">Since {family.students[0]?.joined_date ? format(new Date(family.students[0].joined_date), 'yyyy') : format(new Date(), 'yyyy')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-3">
                    <div className="flex flex-col items-start md:items-end mr-2 md:mr-4">
                        <span className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">Balance</span>
                        <span className={`text-lg md:text-xl font-serif ${balanceDue > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            ${balanceDue.toLocaleString()}
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="rounded-full bg-[#333333] text-white hover:bg-black px-4 md:px-6 shadow-lg shadow-gray-200 gap-2 text-xs md:text-sm h-10">
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

            <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-8 pt-2 gap-4 md:gap-6 max-w-[1600px] mx-auto w-full">
                
                {/* Header Info & Nav Row */}
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 md:gap-6 pb-2">
                    {/* Compact Parent Info */}
                    <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-2xl md:rounded-full shadow-sm border border-gray-100/50 w-full xl:w-auto">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#333333] flex items-center justify-center text-white text-base md:text-lg font-serif shadow-md flex-shrink-0">
                            {family.parent_name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                             <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-serif text-[#333333] truncate">{family.parent_name}</h2>
                                <Badge variant="secondary" className="text-[10px] h-5 bg-gray-100 text-gray-500 flex-shrink-0">Parent</Badge>
                             </div>
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                                 <a href={`mailto:${family.email}`} className="hover:text-indigo-600 flex items-center gap-1 transition-colors truncate max-w-full">
                                     <Mail className="w-3 h-3 flex-shrink-0" /> {family.email}
                                 </a>
                                 {family.phone && (
                                    <>
                                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300 hidden sm:block" />
                                        <a href={`tel:${family.phone}`} className="hover:text-indigo-600 flex items-center gap-1 transition-colors">
                                            <Phone className="w-3 h-3 flex-shrink-0" /> {family.phone}
                                        </a>
                                    </>
                                 )}
                             </div>
                        </div>
                    </div>

                    {/* Horizontal Nav Tabs */}
                    <nav className="flex items-center bg-white p-1.5 rounded-2xl md:rounded-full shadow-sm border border-gray-100/50 overflow-x-auto max-w-full no-scrollbar">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`
                                    flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-full transition-all duration-300 text-sm font-medium whitespace-nowrap
                                    ${activeSection === item.id 
                                        ? 'bg-[#333333] text-white shadow-md' 
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-[#333333]'}
                                `}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-white rounded-3xl md:rounded-[40px] shadow-sm border border-gray-100/50 overflow-hidden flex flex-col relative w-full">
                    {/* Decorative background blobs */}
                    <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-gradient-to-br from-[#F2DCDD]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
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

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-start">
                                        {/* Financial Health Card - Takes 1 slot in 2-col grid */}
                                        <section 
                                            className="bg-[#333333] rounded-[32px] p-6 text-white relative overflow-hidden group cursor-pointer transition-all hover:shadow-xl h-[500px] flex flex-col" 
                                            onClick={() => setActiveSection('billing')}
                                        >
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-white/10 rounded-lg">
                                                        <Wallet className="w-4 h-4 text-white" />
                                                    </div>
                                                    <span className="text-sm font-bold uppercase tracking-widest text-white/70">Financial Health</span>
                                                </div>
                                                {isAutoPay ? (
                                                    <Badge className="bg-green-500/20 text-green-400 border-none hover:bg-green-500/30 gap-1.5 pl-1.5 pr-2.5">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Pay Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-white/10 text-gray-300 border-none hover:bg-white/20 gap-1.5 pl-1.5 pr-2.5">
                                                        <AlertCircle className="w-3.5 h-3.5" /> Manual Billing
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Main Grid */}
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-6 flex-1 content-start">
                                                {/* Balance Block */}
                                                <div className="col-span-2 sm:col-span-1">
                                                    <div className="text-xs text-white/50 mb-1">Current Balance</div>
                                                    <div className={`text-5xl font-serif mb-2 ${balanceDue > 0 ? 'text-red-400' : 'text-white'}`}>
                                                        ${balanceDue.toLocaleString()}
                                                    </div>
                                                    <div className="text-sm text-white/40">
                                                        {balanceDue > 0 ? 'Payment required' : 'No outstanding dues'}
                                                    </div>
                                                </div>

                                                {/* Stats Column */}
                                                <div className="col-span-2 sm:col-span-1 space-y-6 pt-2">
                                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                                        <span className="text-sm text-white/50">Lifetime Value</span>
                                                        <span className="font-serif text-xl">${lifetimeValue.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                                        <span className="text-sm text-white/50">Last Payment</span>
                                                        <div className="text-right">
                                                            <div className="font-serif text-base">
                                                                {lastPayment ? `$${lastPayment.amount}` : '-'}
                                                            </div>
                                                            {lastPayment && (
                                                                <div className="text-xs text-white/40">
                                                                    {format(new Date(lastPayment.date), 'MMM d')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Footer */}
                                            <div className="flex gap-4 mt-auto">
                                                <Button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveSection('billing');
                                                    }}
                                                    className="flex-1 bg-white text-[#333333] hover:bg-gray-100 rounded-2xl font-bold h-12 text-sm"
                                                >
                                                    View Ledger
                                                </Button>
                                                <Button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsInvoiceModalOpen(true);
                                                    }}
                                                    className="flex-1 bg-white/10 text-white hover:bg-white/20 rounded-2xl font-bold h-12 text-sm border border-white/5"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> New Charge
                                                </Button>
                                            </div>
                                        </section>

                                        {/* Slot 2: Family Schedule */}
                                        <div className="h-[500px]">
                                            <FamilySchedule family={family} />
                                        </div>

                                        {/* Slot 3: Tasks */}
                                        <div className="h-[500px]">
                                            <FamilyTasks familyEmail={family.email} />
                                        </div>

                                        {/* Slot 4: Staff Notes */}
                                        <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex flex-col h-[500px]">
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
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* DOCUMENTS SECTION */}
                            {activeSection === 'documents' && (
                                <motion.div 
                                    key="documents"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col"
                                >
                                    <FamilyDocuments familyEmail={family.email} />
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