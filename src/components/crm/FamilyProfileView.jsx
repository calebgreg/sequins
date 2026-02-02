import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    ArrowLeft, Mail, Phone, Plus, CreditCard, DollarSign, Users, 
    Clock, Calendar, MessageSquare, Star, TrendingUp, AlertCircle, 
    CheckCircle2, MoreHorizontal, FileText, Send, Paperclip, ChevronRight,
    Wallet, Shield, ArrowRight, PenSquare, StickyNote, Layout, Sparkles, FolderOpen, ListTodo
} from 'lucide-react';
import useAiAssistant from '../ai/useAiAssistant';
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
    const { checkAndTriggerAi, isProcessing: isAiProcessing, aiName } = useAiAssistant();
    
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

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        const handledByAi = await checkAndTriggerAi(newNote, { familyEmail: family.email, currentUser });
        if (handledByAi) {
            setNewNote('');
        } else {
            createNoteMutation.mutate(newNote);
        }
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
        <div 
            className="flex flex-col h-full min-h-screen relative overflow-hidden"
            style={{ 
                fontFamily: "'DM Sans', -apple-system, sans-serif",
                background: '#ffffff',
            }}
        >
            {/* Ambient background shapes */}
            <div 
                className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
            />
            <div 
                className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
            />

            {/* Header */}
            <div className="relative px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-20 gap-4">
                <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                    <button 
                        onClick={onBack} 
                        className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-105"
                        style={{
                            background: 'rgba(255,255,255,0.6)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                        }}
                    >
                        <ArrowLeft className="w-4 h-4" style={{ color: '#8b7d72' }} />
                    </button>
                    <div className="min-w-0">
                        <h1 
                            className="text-2xl md:text-3xl font-bold tracking-tight truncate"
                            style={{ 
                                color: 'transparent',
                                backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                            }}
                        >
                            The {family.parent_name.split(' ').pop()} Family
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs font-medium mt-1 uppercase tracking-wider" style={{ color: '#b5a599' }}>
                            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> <span className="hidden sm:inline">Account:</span> #{family.students[0]?.id?.slice(0,6) || 'N/A'}</span>
                            <span className="w-1 h-1 rounded-full hidden sm:block" style={{ background: '#d4c4ba' }} />
                            <span className="hidden sm:inline">Since {family.students[0]?.joined_date ? format(new Date(family.students[0].joined_date), 'yyyy') : format(new Date(), 'yyyy')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-3">
                    <div className="flex flex-col items-start md:items-end mr-2 md:mr-4">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: '#b5a599' }}>Balance</span>
                        <span className="text-lg md:text-xl font-light" style={{ color: balanceDue > 0 ? '#c87070' : '#7eb89a' }}>
                            ${balanceDue.toLocaleString()}
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button 
                                className="px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold tracking-tight transition-all hover:scale-[1.02] flex items-center gap-2"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                                    boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                                    border: '1px solid rgba(255, 220, 210, 0.5)',
                                }}
                            >
                                <span style={{ color: '#8a7070' }}>Actions</span>
                                <MoreHorizontal className="w-4 h-4" style={{ color: '#8a7070' }} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                            <DropdownMenuLabel className="text-xs uppercase tracking-wider" style={{ color: '#b5a599' }}>Family Actions</DropdownMenuLabel>
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

            <div className="relative flex-1 overflow-hidden flex flex-col p-4 md:p-8 pt-2 gap-4 md:gap-6 max-w-[1600px] mx-auto w-full">
                
                {/* Header Info & Nav Row */}
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 md:gap-6 pb-2">
                    {/* Compact Parent Info */}
                    <div 
                        className="flex items-center gap-4 p-2 pr-6 rounded-2xl md:rounded-full w-full xl:w-auto"
                        style={{
                            background: 'linear-gradient(145deg, rgba(253,238,236,0.85) 0%, rgba(250,232,228,0.7) 100%)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                        }}
                    >
                        <div 
                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-base md:text-lg flex-shrink-0"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                                boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                                color: '#c9a99c',
                            }}
                        >
                            {family.parent_name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                             <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-medium truncate" style={{ color: '#8b7d72' }}>{family.parent_name}</h2>
                                <span 
                                    className="text-[10px] h-5 px-2 rounded-full flex items-center flex-shrink-0"
                                    style={{ background: 'rgba(255,255,255,0.5)', color: '#9a8b80' }}
                                >
                                    Parent
                                </span>
                             </div>
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: '#a8998e' }}>
                                 <a href={`mailto:${family.email}`} className="hover:opacity-70 flex items-center gap-1 transition-colors truncate max-w-full">
                                     <Mail className="w-3 h-3 flex-shrink-0" /> {family.email}
                                 </a>
                                 {family.phone && (
                                    <>
                                        <span className="w-0.5 h-0.5 rounded-full hidden sm:block" style={{ background: '#d4c4ba' }} />
                                        <a href={`tel:${family.phone}`} className="hover:opacity-70 flex items-center gap-1 transition-colors">
                                            <Phone className="w-3 h-3 flex-shrink-0" /> {family.phone}
                                        </a>
                                    </>
                                 )}
                             </div>
                        </div>
                    </div>

                    {/* Horizontal Nav Tabs - Pill Style */}
                    <nav 
                        className="flex items-center gap-1 p-1.5 rounded-2xl overflow-x-auto max-w-full no-scrollbar"
                        style={{
                            background: 'rgba(240,230,225,0.5)',
                            boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.1)',
                        }}
                    >
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className="flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap"
                                style={{
                                    background: activeSection === item.id 
                                        ? 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)'
                                        : 'transparent',
                                    color: activeSection === item.id ? '#8b7d72' : '#b5a599',
                                    boxShadow: activeSection === item.id 
                                        ? '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,0.8)'
                                        : 'none',
                                }}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content Area */}
                <div 
                    className="flex-1 rounded-3xl overflow-hidden flex flex-col relative w-full"
                    style={{
                        background: 'linear-gradient(145deg, rgba(253,238,236,0.5) 0%, rgba(250,232,228,0.3) 50%, rgba(252,243,240,0.4) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                    }}
                >
                    {/* Inner glow */}
                    <div 
                        className="absolute inset-0 rounded-3xl pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
                        }}
                    />
                    
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
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-lg font-medium" style={{ color: '#8b7d72' }}>Students</h3>
                                            <button 
                                                onClick={handleAddStudent} 
                                                className="flex items-center gap-1 text-xs font-medium transition-all hover:opacity-70"
                                                style={{ color: '#b5a599' }}
                                            >
                                                <Plus className="w-4 h-4" /> Add
                                            </button>
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                            {family.students.map((student, i) => (
                                                <div 
                                                    key={student.id} 
                                                    onClick={() => handleEditStudent(student)}
                                                    className="min-w-[240px] rounded-2xl p-5 transition-all cursor-pointer group hover:scale-[1.02]"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.6)',
                                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div 
                                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg"
                                                            style={{
                                                                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                                                                boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                                                                color: '#c9a99c',
                                                            }}
                                                        >
                                                            {student.name.charAt(0)}
                                                        </div>
                                                        <span 
                                                            className="text-[10px] px-2 py-0.5 rounded-full"
                                                            style={{
                                                                background: student.status === 'active' ? 'rgba(126,184,154,0.15)' : 'rgba(180,181,169,0.15)',
                                                                color: student.status === 'active' ? '#7eb89a' : '#b5a599',
                                                            }}
                                                        >
                                                            {student.status}
                                                        </span>
                                                    </div>
                                                    <div className="mb-3">
                                                        <h4 className="font-medium" style={{ color: '#8b7d72' }}>{student.name}</h4>
                                                        <p className="text-sm" style={{ color: '#b5a599' }}>{student.age} years • {student.level}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {student.billing_method === 'auto_pay' && (
                                                            <span 
                                                                className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                                                                style={{ background: 'rgba(164,139,196,0.15)', color: '#8b7d9a' }}
                                                            >
                                                                Auto Pay
                                                            </span>
                                                        )}
                                                        <div className="flex-1" />
                                                        <ArrowRight className="w-4 h-4" style={{ color: '#d4c4ba' }} />
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Add Student Card */}
                                            <button 
                                                onClick={handleAddStudent}
                                                className="min-w-[80px] rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-105"
                                                style={{
                                                    border: '2px dashed rgba(200,180,170,0.4)',
                                                    color: '#b5a599',
                                                }}
                                            >
                                                <Plus className="w-5 h-5 mb-1" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
                                            </button>
                                        </div>
                                    </section>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
                                        {/* Financial Health Card */}
                                        <section 
                                            className="rounded-2xl p-6 relative overflow-hidden cursor-pointer transition-all hover:scale-[1.01] h-[450px] flex flex-col" 
                                            onClick={() => setActiveSection('billing')}
                                            style={{
                                                background: 'linear-gradient(145deg, rgba(164,139,196,0.15) 0%, rgba(180,160,200,0.1) 100%)',
                                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
                                            }}
                                        >
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                        style={{ background: 'rgba(164,139,196,0.2)' }}
                                                    >
                                                        <Wallet className="w-4 h-4" style={{ color: '#8b7d9a' }} />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8b7d9a' }}>Financial Health</span>
                                                </div>
                                                {isAutoPay ? (
                                                    <span 
                                                        className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                                                        style={{ background: 'rgba(126,184,154,0.2)', color: '#7eb89a' }}
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" /> Auto-Pay
                                                    </span>
                                                ) : (
                                                    <span 
                                                        className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                                                        style={{ background: 'rgba(212,165,116,0.2)', color: '#d4a574' }}
                                                    >
                                                        <AlertCircle className="w-3 h-3" /> Manual
                                                    </span>
                                                )}
                                            </div>

                                            {/* Main Grid */}
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6 flex-1 content-start">
                                                {/* Balance Block */}
                                                <div className="col-span-2 sm:col-span-1">
                                                    <div className="text-xs mb-1" style={{ color: '#a8a0b5' }}>Current Balance</div>
                                                    <div className="text-4xl font-light mb-2" style={{ color: balanceDue > 0 ? '#c87070' : '#8b7d72' }}>
                                                        ${balanceDue.toLocaleString()}
                                                    </div>
                                                    <div className="text-sm" style={{ color: '#a8a0b5' }}>
                                                        {balanceDue > 0 ? 'Payment required' : 'All clear'}
                                                    </div>
                                                </div>

                                                {/* Stats Column */}
                                                <div className="col-span-2 sm:col-span-1 space-y-4 pt-2">
                                                    <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid rgba(164,139,196,0.15)' }}>
                                                        <span className="text-sm" style={{ color: '#a8a0b5' }}>Lifetime Value</span>
                                                        <span className="text-xl font-light" style={{ color: '#8b7d72' }}>${lifetimeValue.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid rgba(164,139,196,0.15)' }}>
                                                        <span className="text-sm" style={{ color: '#a8a0b5' }}>Last Payment</span>
                                                        <div className="text-right">
                                                            <div className="font-light" style={{ color: '#8b7d72' }}>
                                                                {lastPayment ? `$${lastPayment.amount}` : '-'}
                                                            </div>
                                                            {lastPayment && (
                                                                <div className="text-xs" style={{ color: '#a8a0b5' }}>
                                                                    {format(new Date(lastPayment.date), 'MMM d')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Footer */}
                                            <div className="flex gap-3 mt-auto">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveSection('billing');
                                                    }}
                                                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                                                    style={{
                                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                                                        boxShadow: '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,0.8)',
                                                        color: '#8b7d72',
                                                    }}
                                                >
                                                    View Ledger
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsInvoiceModalOpen(true);
                                                    }}
                                                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                                                    style={{
                                                        background: 'rgba(164,139,196,0.15)',
                                                        color: '#8b7d9a',
                                                    }}
                                                >
                                                    <Plus className="w-4 h-4" /> New Charge
                                                </button>
                                            </div>
                                        </section>

                                        {/* Slot 2: Family Schedule */}
                                        <div className="h-[450px]">
                                            <FamilySchedule family={family} />
                                        </div>

                                        {/* Slot 3: Tasks */}
                                        <div className="h-[450px]">
                                            <FamilyTasks familyEmail={family.email} currentUser={currentUser} />
                                        </div>

                                        {/* Slot 4: Staff Notes */}
                                        <div 
                                            className="rounded-2xl p-6 flex flex-col h-[450px]"
                                            style={{
                                                background: 'rgba(255,255,255,0.4)',
                                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                                <h3 className="text-lg font-medium" style={{ color: '#8b7d72' }}>Staff Notes</h3>
                                                <span 
                                                    className="text-xs px-2 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(255,255,255,0.5)', color: '#b5a599' }}
                                                >
                                                    {notes.length}
                                                </span>
                                            </div>

                                            {/* Input Area */}
                                            <div className="mb-4 flex-shrink-0">
                                                <form onSubmit={handleAddNote} className="relative">
                                                    <textarea 
                                                        value={newNote}
                                                        onChange={(e) => setNewNote(e.target.value)}
                                                        placeholder={`Add a note or ask @${aiName}...`}
                                                        className="w-full rounded-xl p-4 pr-12 text-sm focus:outline-none focus:ring-2 resize-none min-h-[70px] transition-colors"
                                                        style={{
                                                            background: newNote.includes('@') ? 'rgba(164,139,196,0.1)' : 'rgba(255,255,255,0.6)',
                                                            border: '1px solid rgba(200,180,170,0.2)',
                                                            color: '#8b7d72',
                                                        }}
                                                        disabled={isAiProcessing}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleAddNote(e);
                                                            }
                                                        }}
                                                    />
                                                    <button 
                                                        type="submit"
                                                        disabled={!newNote.trim() || createNoteMutation.isPending || isAiProcessing}
                                                        className="absolute bottom-3 right-3 p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                        style={{
                                                            background: newNote.includes('@') ? 'rgba(164,139,196,0.3)' : 'rgba(200,170,156,0.3)',
                                                            color: newNote.includes('@') ? '#8b7d9a' : '#c8aa9c',
                                                        }}
                                                    >
                                                        {(createNoteMutation.isPending || isAiProcessing) ? (
                                                            <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                                        ) : (
                                                            newNote.includes('@') ? <Sparkles className="w-4 h-4" /> : <Send className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </form>
                                            </div>

                                            {/* Notes Feed */}
                                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2">
                                                {notes.length === 0 ? (
                                                    <div 
                                                        className="h-full flex flex-col items-center justify-center rounded-xl"
                                                        style={{ border: '2px dashed rgba(200,180,170,0.3)', color: '#b5a599' }}
                                                    >
                                                        <StickyNote className="w-6 h-6 mb-2 opacity-50" />
                                                        <p className="text-sm">No notes yet</p>
                                                    </div>
                                                ) : (
                                                    notes.map((note) => (
                                                        <div 
                                                            key={note.id} 
                                                            className="flex gap-3 p-4 rounded-xl"
                                                            style={{ background: 'rgba(255,255,255,0.5)' }}
                                                        >
                                                            <div 
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                                                                style={{ background: 'rgba(200,170,156,0.15)', color: '#c8aa9c' }}
                                                            >
                                                                {note.author_name?.charAt(0) || 'S'}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-medium text-sm" style={{ color: '#8b7d72' }}>{note.author_name}</span>
                                                                    <span className="text-xs" style={{ color: '#c4b5ab' }}>· {format(new Date(note.created_date), 'MMM d')}</span>
                                                                </div>
                                                                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#8b7d72' }}>
                                                                    {note.content}
                                                                </p>
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
                                                 <div 
                                                     className="p-4 rounded-2xl"
                                                     style={{
                                                         background: 'rgba(255,255,255,0.6)',
                                                         boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                                                         border: '1px solid rgba(200,180,170,0.2)',
                                                     }}
                                                 >
                                                     <div className="text-[10px] uppercase font-bold mb-1" style={{ color: '#b5a599' }}>Open Balance</div>
                                                     <div className="text-2xl font-bold" style={{ color: balanceDue > 0 ? '#c87070' : '#8b7d72' }}>${balanceDue.toLocaleString()}</div>
                                                 </div>
                                                 <div 
                                                     className="p-4 rounded-2xl"
                                                     style={{
                                                         background: 'rgba(255,255,255,0.6)',
                                                         boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                                                         border: '1px solid rgba(200,180,170,0.2)',
                                                     }}
                                                 >
                                                     <div className="text-[10px] uppercase font-bold mb-1" style={{ color: '#b5a599' }}>LTV</div>
                                                     <div className="text-2xl font-bold" style={{ color: '#8b7d72' }}>${lifetimeValue.toLocaleString()}</div>
                                                 </div>
                                            </div>

                                            {/* Invoice History List */}
                                            <div 
                                                className="flex-1 overflow-hidden rounded-2xl p-6 flex flex-col"
                                                style={{
                                                    background: 'rgba(255,255,255,0.6)',
                                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                                                    border: '1px solid rgba(200,180,170,0.2)',
                                                }}
                                            >
                                                 <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                                     <h3 className="text-lg font-bold" style={{ color: '#8b7d72' }}>Invoice History</h3>
                                                     <span 
                                                         className="text-xs px-2 py-0.5 rounded-full"
                                                         style={{ background: 'rgba(255,255,255,0.5)', color: '#b5a599' }}
                                                     >
                                                         {invoices.length}
                                                     </span>
                                                 </div>
                                                 <div className="space-y-2 overflow-y-auto flex-1 pr-2 -mr-2">
                                                    {invoices.length === 0 ? (
                                                        <div className="text-center py-10" style={{ color: '#b5a599' }}>No invoices found.</div>
                                                    ) : (
                                                        invoices.map(inv => (
                                                            <div 
                                                                key={inv.id} 
                                                                className="group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer hover:scale-[1.01]"
                                                                style={{ 
                                                                    background: 'rgba(255,255,255,0.5)',
                                                                    border: '1px solid rgba(200,180,170,0.15)',
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div 
                                                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                                                        style={{ 
                                                                            background: inv.status === 'paid' ? '#7eb89a' : inv.status === 'overdue' ? '#c87070' : '#d4a574'
                                                                        }}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <div className="font-medium text-sm truncate max-w-[120px]" style={{ color: '#8b7d72' }}>{inv.title}</div>
                                                                        <div className="text-[10px]" style={{ color: '#b5a599' }}>
                                                                            {format(new Date(inv.issue_date), 'MMM d')}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    <div className="font-bold text-sm" style={{ color: '#8b7d72' }}>${inv.total_amount}</div>
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