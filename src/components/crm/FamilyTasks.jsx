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
import { cn } from "@/utils"; 

export default function FamilyTasks({ familyEmail }) {
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [filter, setFilter] = useState('all');
    const inputRef = useRef(null);
    
    const queryClient = useQueryClient();

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
    const handleQuickAdd = (e) => {
        if (e.key === 'Enter' && quickAddTitle.trim()) {
            createMutation.mutate(quickAddTitle);
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

    const toggleShared = (task, e) => {
        e.stopPropagation();
        updateMutation.mutate({ id: task.id, is_shared: !task.is_shared });
    };

    const handleUpdate = (task, field, value) => {
        // Debounce could be added here for text inputs if needed, 
        // but for now direct update is fine for simplicity or onBlur
        updateMutation.mutate({ id: task.id, [field]: value });
    };

    // Filter logic
    const filteredTasks = tasks.filter(t => {
        if (filter === 'shared') return t.is_shared;
        if (filter === 'internal') return !t.is_shared;
        return true;
    });

    const priorityConfig = {
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
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">
                        <Plus className="w-5 h-5" />
                    </div>
                    <Input 
                        ref={inputRef}
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        onKeyDown={handleQuickAdd}
                        placeholder="Add a new task... (Press Enter)"
                        className="pl-10 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100 transition-all rounded-xl text-sm"
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
                        {filteredTasks.map(task => {
                            const isExpanded = expandedTaskId === task.id;
                            const isOverdue = task.status !== 'completed' && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
                            
                            return (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`
                                        group rounded-xl border transition-all duration-300
                                        ${isExpanded ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'}
                                        ${task.status === 'completed' ? 'opacity-60 bg-gray-50/30' : ''}
                                    `}
                                >
                                    {/* Primary Row - The "90%" view */}
                                    <div className="flex items-center p-3 gap-3">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleStatus(task); }}
                                            className={`flex-shrink-0 transition-colors ${task.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
                                        >
                                            {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </button>

                                        {/* Inline Title Edit */}
                                        <input 
                                            className={`
                                                flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none font-medium
                                                ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-[#333333]'}
                                            `}
                                            value={task.title}
                                            onChange={(e) => handleUpdate(task, 'title', e.target.value)}
                                            onClick={(e) => e.stopPropagation()} // Allow editing without expanding
                                        />

                                        {/* Right Side Actions/Badges */}
                                        <div className="flex items-center gap-2">
                                            {/* Priority Toggle Badge */}
                                            <button 
                                                onClick={(e) => togglePriority(task, e)}
                                                className={`
                                                    text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border select-none transition-all
                                                    ${priorityConfig[task.priority].color}
                                                `}
                                            >
                                                {priorityConfig[task.priority].label}
                                            </button>

                                            {/* Visibility Toggle */}
                                            <button 
                                                onClick={(e) => toggleShared(task, e)}
                                                className={`
                                                    p-1.5 rounded-md transition-all
                                                    ${task.is_shared ? 'bg-indigo-50 text-indigo-600' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'}
                                                `}
                                                title={task.is_shared ? "Visible to Family" : "Internal Only"}
                                            >
                                                {task.is_shared ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>

                                            {/* Expand/Collapse Trigger */}
                                            <button 
                                                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                                className={`
                                                    p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-[#333333] transition-transform duration-300
                                                    ${isExpanded ? 'rotate-180 bg-gray-100 text-[#333333]' : ''}
                                                `}
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details Area - The "10%" view */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-3 pb-4 pt-0 space-y-4">
                                                    <div className="h-px w-full bg-gray-100 mb-3" />
                                                    
                                                    {/* Description */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Notes</label>
                                                        <Textarea 
                                                            value={task.description || ''}
                                                            onChange={(e) => handleUpdate(task, 'description', e.target.value)}
                                                            placeholder="Add details, links, or notes..."
                                                            className="min-h-[80px] bg-gray-50 border-gray-100 focus:bg-white text-xs resize-none"
                                                        />
                                                    </div>

                                                    {/* Inline Controls Row */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Category Chips */}
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Category</label>
                                                            <div className="flex flex-wrap gap-1">
                                                                {['admin', 'enrollment', 'billing', 'communication'].map(cat => (
                                                                    <button
                                                                        key={cat}
                                                                        onClick={() => handleUpdate(task, 'category', cat)}
                                                                        className={`
                                                                            px-2 py-1 rounded-md text-[10px] border capitalize transition-all
                                                                            ${task.category === cat ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}
                                                                        `}
                                                                    >
                                                                        {cat}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Due Date */}
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Due Date</label>
                                                            <Input 
                                                                type="date"
                                                                value={task.due_date}
                                                                onChange={(e) => handleUpdate(task, 'due_date', e.target.value)}
                                                                className="h-8 text-xs bg-gray-50 border-gray-100"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Footer Actions */}
                                                    <div className="flex justify-between items-center pt-2">
                                                        <div className="text-xs text-gray-400 italic">
                                                            Created {format(new Date(task.created_date), 'MMM d')}
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => deleteMutation.mutate(task.id)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-3 text-xs"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Task
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}