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

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-[#333333]">Tasks</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage reminders and to-dos across the studio.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                    {['active', 'completed', 'all'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`
                                px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                ${filter === f ? 'bg-[#333333] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
                            `}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Add Bar */}
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors duration-300">
                    {isProcessing ? <Sparkles className="w-5 h-5 animate-pulse text-indigo-500" /> : <Plus className="w-5 h-5" />}
                </div>
                <Input 
                    ref={inputRef}
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    onKeyDown={handleQuickAdd}
                    disabled={isProcessing}
                    placeholder={`Add a new task or ask @${aiName}...`}
                    className={`
                        pl-12 h-14 border-transparent shadow-sm rounded-2xl text-base transition-all
                        ${quickAddTitle.includes('@') ? 'bg-indigo-50/50 text-indigo-900 focus:bg-indigo-50 focus:border-indigo-200' : 'bg-white focus:ring-2 focus:ring-[#333333]/5'}
                    `}
                />
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="pl-9 bg-transparent border-gray-200 rounded-xl h-10"
                />
            </div>

            {/* Task List */}
            <div className="space-y-2 pb-10">
                {filteredTasks.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-300 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                        <CheckSquare className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">No tasks found.</p>
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
    );
}