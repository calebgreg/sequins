import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    CheckCircle2, Circle, Plus, Calendar, Clock, User, Trash2, 
    Share2, Flag, LayoutList, MoreHorizontal, AlertCircle, CheckSquare,
    Eye, EyeOff, ChevronDown, ChevronRight, X, GripVertical, Search,
    Filter
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { format } from 'date-fns';
import useAiAssistant from '../components/ai/useAiAssistant';
import { Sparkles } from 'lucide-react';
import TaskItem from '../components/tasks/TaskItem';

export default function TasksPage() {
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [filter, setFilter] = useState('active'); // active, completed, all
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);
    
    const queryClient = useQueryClient();
    const { checkAndTriggerAi, isProcessing, aiName } = useAiAssistant();

    const { data: currentUser } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me(),
        retry: false
    });

    const studioId = currentUser?.studio_id;
    
    const { data: tasks = [] } = useQuery({
        queryKey: ['all_tasks', studioId, currentUser?.email],
        queryFn: async () => {
            if (!currentUser) return [];
            
            let all;
            if (currentUser.role === 'admin') {
                all = await base44.entities.FamilyTask.filter({ studio_id: studioId });
            } else {
                // For parents, only show tasks related to them and marked as shared
                const myTasks = await base44.entities.FamilyTask.filter({ studio_id: studioId });
                all = myTasks.filter(t => t.parent_email === currentUser.email && t.is_shared);
            }

            return all.sort((a, b) => {
                if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            });
        },
        enabled: !!currentUser && !!studioId
    });

    const createMutation = useMutation({
        mutationFn: (title) => base44.entities.FamilyTask.create({
            studio_id: studioId,
            title: title,
            status: 'pending',
            priority: 'medium',
            category: 'admin',
            due_date: new Date().toISOString().split('T')[0],
            is_shared: currentUser?.role !== 'admin', // Auto-share if created by parent
            parent_email: currentUser?.role !== 'admin' ? currentUser.email : null, // Auto-link to parent if created by parent
            assigned_to: currentUser?.role === 'admin' ? currentUser.full_name : 'Staff'
        }),
        onSuccess: () => {
            setQuickAddTitle('');
            queryClient.invalidateQueries(['all_tasks']);
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.FamilyTask.update(data.id, data),
        onSuccess: () => queryClient.invalidateQueries(['all_tasks'])
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.FamilyTask.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['all_tasks'])
    });

    const handleQuickAdd = async (e) => {
        if (e.key === 'Enter' && quickAddTitle.trim()) {
            const handledByAi = await checkAndTriggerAi(quickAddTitle);
            if (handledByAi) {
                setQuickAddTitle('');
            } else {
                createMutation.mutate(quickAddTitle);
            }
        }
    };

    const toggleStatus = (task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        updateMutation.mutate({ id: task.id, status: newStatus });
    };

    const togglePriority = (task, e) => {
        e.stopPropagation();
        const map = { low: 'medium', medium: 'high', high: 'low' };
        updateMutation.mutate({ id: task.id, priority: map[task.priority] });
    };

    const handleUpdate = (task, field, value) => {
        updateMutation.mutate({ id: task.id, [field]: value });
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (t.parent_email && t.parent_email.toLowerCase().includes(searchQuery.toLowerCase()));
        
        if (!matchesSearch) return false;

        if (filter === 'active') return t.status !== 'completed';
        if (filter === 'completed') return t.status === 'completed';
        return true;
    });

    const priorityConfig = {
        critical: { color: 'text-rose-600 bg-rose-50 border-rose-100', label: 'Critical' },
        high: { color: 'text-red-600 bg-red-50 border-red-100', label: 'High' },
        medium: { color: 'text-amber-600 bg-amber-50 border-amber-100', label: 'Med' },
        low: { color: 'text-blue-600 bg-blue-50 border-blue-100', label: 'Low' }
    };

    // Etched/embossed text style - 3D effect with highlights and shadows
    const etchedText = {
        color: '#c5b5b2',
        textShadow: '0 1px 1px rgba(255,255,255,0.8), 0 -1px 1px rgba(120,100,100,0.15)',
    };

    const cardStyle = {
        background: 'rgba(255,255,255,0.5)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 16px -8px rgba(180,150,140,0.15)',
    };

    return (
        <div 
            className="min-h-screen relative p-4 md:p-8"
            style={{ 
                fontFamily: "'DM Sans', -apple-system, sans-serif",
                background: '#ffffff',
            }}
        >
            {/* Ambient background shapes */}
            <div 
                className="fixed top-[-20%] right-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
            />
            <div 
                className="fixed bottom-[-30%] left-[-15%] w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
            />

            <div className="max-w-4xl mx-auto space-y-6 relative">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 
                            className="text-2xl md:text-3xl font-bold tracking-tight"
                            style={etchedText}
                        >
                            Tasks
                        </h1>
                        <p className="text-sm mt-1" style={{ color: '#b5a599' }}>
                            Manage reminders and to-dos across the studio.
                        </p>
                    </div>
                    
                    <div 
                        className="flex items-center gap-1 p-1 rounded-xl"
                        style={cardStyle}
                    >
                        {['active', 'completed', 'all'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className="px-4 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all"
                                style={{
                                    background: filter === f 
                                        ? 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)'
                                        : 'transparent',
                                    boxShadow: filter === f 
                                        ? '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)'
                                        : 'none',
                                    color: filter === f ? '#8a7070' : '#b5a599',
                                }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Add Bar */}
                <div 
                    className="relative group rounded-2xl overflow-hidden"
                    style={cardStyle}
                >
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300" style={{ color: '#c9a99c' }}>
                        {isProcessing ? <Sparkles className="w-5 h-5 animate-pulse" style={{ color: '#c4a0a0' }} /> : <Plus className="w-5 h-5" />}
                    </div>
                    <Input 
                        ref={inputRef}
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        onKeyDown={handleQuickAdd}
                        disabled={isProcessing}
                        placeholder={`Add a new task or ask @${aiName}...`}
                        className="pl-12 h-14 border-none bg-transparent text-base focus:ring-0 focus-visible:ring-0"
                        style={{ color: '#8b7d72' }}
                    />
                </div>

                {/* Search */}
                <div 
                    className="relative rounded-xl overflow-hidden"
                    style={cardStyle}
                >
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#c9a99c' }} />
                    <Input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tasks..."
                        className="pl-9 bg-transparent border-none h-10 focus:ring-0 focus-visible:ring-0"
                        style={{ color: '#8b7d72' }}
                    />
                </div>

                {/* Task List */}
                <div className="space-y-3 pb-10">
                    {filteredTasks.length === 0 ? (
                        <div 
                            className="py-20 flex flex-col items-center justify-center text-center rounded-2xl"
                            style={cardStyle}
                        >
                            <CheckSquare className="w-12 h-12 mb-3" style={{ color: '#d4c4ba', opacity: 0.5 }} />
                            <p className="text-sm" style={{ color: '#b5a599' }}>No tasks found.</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredTasks.map(task => (
                                <TaskItem 
                                    key={task.id}
                                    task={task}
                                    currentUser={currentUser}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                    onToggleStatus={toggleStatus}
                                    onTogglePriority={togglePriority}
                                    expandedTaskId={expandedTaskId}
                                    setExpandedTaskId={setExpandedTaskId}
                                    priorityConfig={priorityConfig}
                                />
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}