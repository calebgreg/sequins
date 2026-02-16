import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { format } from 'date-fns';
import { 
    CheckCircle2, Circle, User, Trash2, 
    ChevronDown, Eye, EyeOff
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TaskComments from './TaskComments';

const TaskItem = ({ 
    task, 
    currentUser, 
    onUpdate, 
    onDelete, 
    onToggleStatus, 
    onTogglePriority, 
    onToggleShared, // Optional, for Family View
    expandedTaskId, 
    setExpandedTaskId, 
    priorityConfig 
}) => {
    const [localTitle, setLocalTitle] = useState(task.title);
    const [localDescription, setLocalDescription] = useState(task.description || '');
    
    // Sync local state if props change
    useEffect(() => {
        setLocalTitle(task.title);
    }, [task.title]);

    useEffect(() => {
        setLocalDescription(task.description || '');
    }, [task.description]);

    const isExpanded = expandedTaskId === task.id;

    const handleTitleBlur = () => {
        if (localTitle !== task.title) onUpdate(task, 'title', localTitle);
    };

    const handleDescriptionBlur = () => {
        if (localDescription !== (task.description || '')) onUpdate(task, 'description', localDescription);
    };

    const cardStyle = {
        background: 'rgba(255,255,255,0.5)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 16px -8px rgba(180,150,140,0.15)',
    };

    const priorityStyles = {
        critical: { background: 'rgba(212,165,116,0.2)', color: '#c9867a' },
        high: { background: 'rgba(212,165,116,0.15)', color: '#d4a574' },
        medium: { background: 'rgba(201,169,156,0.15)', color: '#c9a99c' },
        low: { background: 'rgba(126,184,154,0.15)', color: '#7eb89a' }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-2xl transition-all duration-300 ${task.status === 'completed' ? 'opacity-60' : ''}`}
            style={{
                ...cardStyle,
                boxShadow: isExpanded 
                    ? 'inset 0 1px 1px rgba(255,255,255,0.7), 0 8px 24px -8px rgba(180,150,140,0.25)'
                    : cardStyle.boxShadow,
            }}
        >
            <div className="flex items-center p-4 gap-3">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleStatus(task); }}
                    className="flex-shrink-0 transition-colors"
                    style={{ color: task.status === 'completed' ? '#7eb89a' : '#d4c4ba' }}
                >
                    {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>

                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <input 
                        className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none font-medium truncate"
                        style={{ 
                            color: task.status === 'completed' ? '#b5a599' : '#8b7d72',
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        }}
                        value={localTitle}
                        onChange={(e) => setLocalTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                        onClick={(e) => e.stopPropagation()} 
                    />
                    
                    {/* Related To Badge */}
                    {task.parent_email && !onToggleShared && (
                        <div 
                            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium truncate max-w-[150px]"
                            style={{ 
                                background: 'rgba(255,255,255,0.5)', 
                                color: '#9a8b80',
                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                            }}
                        >
                            <User className="w-3 h-3" />
                            {task.parent_email}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => onTogglePriority(task, e)}
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg select-none transition-all"
                        style={{
                            ...priorityStyles[task.priority || 'medium'],
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
                        }}
                    >
                        {priorityConfig[task.priority || 'medium'].label}
                    </button>

                    {/* Shared Toggle */}
                    {onToggleShared && (
                        <button 
                            onClick={(e) => onToggleShared(task, e)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{
                                background: task.is_shared ? 'rgba(164,139,196,0.15)' : 'transparent',
                                color: task.is_shared ? '#a48bc4' : '#d4c4ba',
                            }}
                            title={task.is_shared ? "Visible to Family" : "Internal Only"}
                        >
                            {task.is_shared ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                    )}

                    <div 
                        className={`text-xs w-20 text-right hidden sm:block ${task.due_date ? '' : 'opacity-0'}`}
                        style={{ color: '#b5a599' }}
                    >
                        {task.due_date && format(new Date(task.due_date), 'MMM d')}
                    </div>

                    <button 
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className="p-1.5 rounded-lg transition-all duration-300"
                        style={{
                            background: isExpanded ? 'rgba(255,255,255,0.5)' : 'transparent',
                            color: isExpanded ? '#8b7d72' : '#d4c4ba',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            boxShadow: isExpanded ? 'inset 0 1px 1px rgba(255,255,255,0.8)' : 'none',
                        }}
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
                        <div className="px-4 pb-4 pt-0 space-y-4">
                            <div className="h-px w-full mb-3" style={{ background: 'rgba(180,150,140,0.1)' }} />
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: '#b5a599' }}>Notes</label>
                                <Textarea 
                                    value={localDescription}
                                    onChange={(e) => setLocalDescription(e.target.value)}
                                    onBlur={handleDescriptionBlur}
                                    placeholder="Add details..."
                                    className="min-h-[80px] border-none text-xs resize-none focus:ring-0"
                                    style={{ 
                                        background: 'rgba(255,255,255,0.5)', 
                                        color: '#8b7d72',
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: '#b5a599' }}>Category</label>
                                    <div className="flex flex-wrap gap-1">
                                        {['admin', 'enrollment', 'billing', 'communication'].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => onUpdate(task, 'category', cat)}
                                                className="px-2.5 py-1 rounded-lg text-[10px] capitalize transition-all"
                                                style={{
                                                    background: task.category === cat 
                                                        ? 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)'
                                                        : 'transparent',
                                                    color: task.category === cat ? '#8a7070' : '#b5a599',
                                                    boxShadow: task.category === cat 
                                                        ? '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)'
                                                        : 'none',
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: '#b5a599' }}>Due Date</label>
                                    <Input 
                                        type="date"
                                        value={task.due_date}
                                        onChange={(e) => onUpdate(task, 'due_date', e.target.value)}
                                        className="h-8 text-xs border-none focus:ring-0"
                                        style={{ 
                                            background: 'rgba(255,255,255,0.5)', 
                                            color: '#8b7d72',
                                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <div className="text-xs italic" style={{ color: '#b5a599' }}>
                                    Created {format(new Date(task.created_date), 'MMM d')}
                                </div>
                                <button 
                                    onClick={() => onDelete(task.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                                    style={{ 
                                        background: 'rgba(212,165,116,0.1)', 
                                        color: '#c9867a',
                                    }}
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>

                            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(180,150,140,0.1)' }}>
                                <TaskComments taskId={task.id} currentUser={currentUser} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TaskItem;