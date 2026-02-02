import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    CheckCircle2, Circle, Plus, Calendar, Clock, User, Trash2, 
    Share2, Flag, LayoutList, MoreHorizontal, AlertCircle, CheckSquare,
    Eye, EyeOff, ChevronDown, ChevronRight, X, GripVertical
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import useAiAssistant from '../ai/useAiAssistant';
import { Sparkles } from 'lucide-react';
import TaskItem from '../tasks/TaskItem';

export default function FamilyTasks({ familyEmail, currentUser }) {
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [filter, setFilter] = useState('all');
    const inputRef = useRef(null);
    
    const queryClient = useQueryClient();
    const { checkAndTriggerAi, isProcessing, aiName } = useAiAssistant();
    
    // -- DATA --
    const { data: tasks = [] } = useQuery({
        queryKey: ['family_tasks', familyEmail],
        queryFn: async () => {
            const all = await base44.entities.FamilyTask.list();
            return all.filter(t => t.parent_email === familyEmail).sort((a, b) => {
                // Sort by status (pending first), then priority (high first), then due date
                if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                if (a.priority !== 'high' && b.priority === 'high') return 1;
                return new Date(a.due_date) - new Date(b.due_date);
            });
        }
    });

    // -- MUTATIONS --
    const createMutation = useMutation({
        mutationFn: (title) => base44.entities.FamilyTask.create({
            parent_email: familyEmail,
            title: title,
            status: 'pending',
            priority: 'medium',
            category: 'admin',
            due_date: new Date().toISOString().split('T')[0],
            is_shared: false,
            assigned_to: 'Staff'
        }),
        onSuccess: () => {
            setQuickAddTitle('');
            queryClient.invalidateQueries(['family_tasks']);
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.FamilyTask.update(data.id, data),
        onSuccess: () => queryClient.invalidateQueries(['family_tasks'])
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.FamilyTask.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['family_tasks'])
    });

    // -- HANDLERS --
    const handleQuickAdd = async (e) => {
        if (e.key === 'Enter' && quickAddTitle.trim()) {
            const handledByAi = await checkAndTriggerAi(quickAddTitle, { familyEmail });
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
        const map = { low: 'medium', medium: 'high', high: 'critical', critical: 'low' };
        updateMutation.mutate({ id: task.id, priority: map[task.priority] || 'medium' });
    };

    const toggleShared = (task, e) => {
        e.stopPropagation();
        updateMutation.mutate({ id: task.id, is_shared: !task.is_shared });
    };

    const handleUpdate = (task, field, value) => {
        updateMutation.mutate({ id: task.id, [field]: value });
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    // Filter logic
    const filteredTasks = tasks.filter(t => {
        if (filter === 'shared') return t.is_shared;
        if (filter === 'internal') return !t.is_shared;
        return true;
    });

    const priorityConfig = {
        critical: { color: 'text-rose-600 bg-rose-50 border-rose-100', label: 'Critical' },
        high: { color: 'text-red-600 bg-red-50 border-red-100', label: 'High' },
        medium: { color: 'text-amber-600 bg-amber-50 border-amber-100', label: 'Med' },
        low: { color: 'text-blue-600 bg-blue-50 border-blue-100', label: 'Low' }
    };

    return (
        <div 
            className="rounded-2xl flex flex-col h-full overflow-hidden"
            style={{
                background: 'rgba(255,255,255,0.4)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
            }}
        >
            
            {/* Header / Quick Add Area */}
            <div className="p-6 pb-2 flex-shrink-0 z-10" style={{ borderBottom: '1px solid rgba(200,180,170,0.2)' }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                                boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                                color: '#c9a99c',
                            }}
                        >
                            <LayoutList className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-medium" style={{ color: '#8b7d72' }}>Project Manager</h3>
                    </div>
                    
                    {/* Minimal Filter Tabs */}
                    <div 
                        className="flex p-1 rounded-xl"
                        style={{ background: 'rgba(240,230,225,0.5)' }}
                    >
                        {['all', 'shared', 'internal'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                style={{
                                    background: filter === f 
                                        ? 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)'
                                        : 'transparent',
                                    color: filter === f ? '#8b7d72' : '#b5a599',
                                    boxShadow: filter === f 
                                        ? '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,0.8)'
                                        : 'none',
                                }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Add Input */}
                <div className="relative group">
                    <div 
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300"
                        style={{ color: isProcessing ? '#8b7d9a' : '#c4b5ab' }}
                    >
                        {isProcessing ? <Sparkles className="w-5 h-5 animate-pulse" /> : <Plus className="w-5 h-5" />}
                    </div>
                    <Input 
                        ref={inputRef}
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        onKeyDown={handleQuickAdd}
                        disabled={isProcessing}
                        placeholder={`Add task or ask @${aiName}...`}
                        className="pl-10 h-12 transition-all rounded-xl text-sm"
                        style={{
                            background: quickAddTitle.includes('@') ? 'rgba(164,139,196,0.1)' : 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(200,180,170,0.2)',
                            color: '#8b7d72',
                        }}
                    />
                </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-2">
                {filteredTasks.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center" style={{ color: '#b5a599' }}>
                        <CheckSquare className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">No tasks yet.</p>
                        <p className="text-xs opacity-60">Type above to get started.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {filteredTasks.map(task => (
                            <TaskItem 
                                key={task.id}
                                task={task}
                                currentUser={currentUser}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                                onToggleStatus={toggleStatus}
                                onTogglePriority={togglePriority}
                                onToggleShared={toggleShared}
                                expandedTaskId={expandedTaskId}
                                setExpandedTaskId={setExpandedTaskId}
                                priorityConfig={priorityConfig}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}