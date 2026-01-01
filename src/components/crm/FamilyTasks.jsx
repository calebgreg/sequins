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
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            
            {/* Header / Quick Add Area */}
            <div className="p-6 pb-2 flex-shrink-0 z-10 bg-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <LayoutList className="w-5 h-5" />
                        </div>
                        <h3 className="font-serif text-lg text-[#333333]">Project Manager</h3>
                    </div>
                    
                    {/* Minimal Filter Tabs */}
                    <div className="flex bg-gray-50 p-1 rounded-lg">
                        {['all', 'shared', 'internal'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`
                                    px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all
                                    ${filter === f ? 'bg-white text-[#333333] shadow-sm' : 'text-gray-400 hover:text-gray-600'}
                                `}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Add Input */}
                <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 transition-colors duration-300">
                        {isProcessing ? <Sparkles className="w-5 h-5 animate-pulse text-indigo-500" /> : <Plus className="w-5 h-5" />}
                    </div>
                    <Input 
                        ref={inputRef}
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        onKeyDown={handleQuickAdd}
                        disabled={isProcessing}
                        placeholder={`Add task or ask @${aiName}...`}
                        className={`
                            pl-10 h-12 border-transparent transition-all rounded-xl text-sm
                            ${quickAddTitle.includes('@') ? 'bg-indigo-50/50 text-indigo-900 focus:bg-indigo-50 focus:border-indigo-200' : 'bg-gray-50 focus:bg-white focus:border-indigo-100'}
                        `}
                    />
                </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
                {filteredTasks.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-300 text-center">
                        <CheckSquare className="w-12 h-12 mb-3 opacity-20" />
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