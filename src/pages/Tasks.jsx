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

const TaskItem = ({ task, onUpdate, onDelete, onToggleStatus, onTogglePriority, expandedTaskId, setExpandedTaskId, priorityConfig }) => {
    const [localTitle, setLocalTitle] = useState(task.title);
    const [localDescription, setLocalDescription] = useState(task.description || '');
    
    const isExpanded = expandedTaskId === task.id;

    const handleTitleBlur = () => {
        if (localTitle !== task.title) onUpdate(task, 'title', localTitle);
    };

    const handleDescriptionBlur = () => {
        if (localDescription !== (task.description || '')) onUpdate(task, 'description', localDescription);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className={`
                group rounded-xl border transition-all duration-300
                ${isExpanded ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'}
                ${task.status === 'completed' ? 'opacity-60 bg-gray-50/30' : ''}
            `}
        >
            <div className="flex items-center p-3 gap-3">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleStatus(task); }}
                    className={`flex-shrink-0 transition-colors ${task.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
                >
                    {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>

                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <input 
                        className={`
                            flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none font-medium truncate
                            ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-[#333333]'}
                        `}
                        value={localTitle}
                        onChange={(e) => setLocalTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                        onClick={(e) => e.stopPropagation()} 
                    />
                    
                    {/* Related To Badge (if exists) */}
                    {task.parent_email && (
                         <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-[10px] text-gray-500 font-medium truncate max-w-[150px]">
                            <User className="w-3 h-3" />
                            {task.parent_email}
                         </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => onTogglePriority(task, e)}
                        className={`
                            text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border select-none transition-all
                            ${priorityConfig[task.priority].color}
                        `}
                    >
                        {priorityConfig[task.priority].label}
                    </button>

                    <div className={`text-xs text-gray-400 w-20 text-right hidden sm:block ${task.due_date ? '' : 'opacity-0'}`}>
                        {task.due_date && format(new Date(task.due_date), 'MMM d')}
                    </div>

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
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Notes</label>
                                <Textarea 
                                    value={localDescription}
                                    onChange={(e) => setLocalDescription(e.target.value)}
                                    onBlur={handleDescriptionBlur}
                                    placeholder="Add details..."
                                    className="min-h-[80px] bg-gray-50 border-gray-100 focus:bg-white text-xs resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Category</label>
                                    <div className="flex flex-wrap gap-1">
                                        {['admin', 'enrollment', 'billing', 'communication'].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => onUpdate(task, 'category', cat)}
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

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Due Date</label>
                                    <Input 
                                        type="date"
                                        value={task.due_date}
                                        onChange={(e) => onUpdate(task, 'due_date', e.target.value)}
                                        className="h-8 text-xs bg-gray-50 border-gray-100"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <div className="text-xs text-gray-400 italic">
                                    Created {format(new Date(task.created_date), 'MMM d')}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => onDelete(task.id)}
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
};

export default function TasksPage() {
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [filter, setFilter] = useState('active'); // active, completed, all
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);
    
    const queryClient = useQueryClient();
    const { checkAndTriggerAi, isProcessing, aiName } = useAiAssistant();
    
    const { data: tasks = [] } = useQuery({
        queryKey: ['all_tasks'],
        queryFn: async () => {
            const all = await base44.entities.FamilyTask.list();
            return all.sort((a, b) => {
                if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            });
        }
    });

    const createMutation = useMutation({
        mutationFn: (title) => base44.entities.FamilyTask.create({
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

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (t.parent_email && t.parent_email.toLowerCase().includes(searchQuery.toLowerCase()));
        
        if (!matchesSearch) return false;

        if (filter === 'active') return t.status !== 'completed';
        if (filter === 'completed') return t.status === 'completed';
        return true;
    });

    const priorityConfig = {
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