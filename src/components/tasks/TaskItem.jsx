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
                    
                    {/* Related To Badge (if exists and not in family view context usually) */}
                    {task.parent_email && !onToggleShared && (
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

                    {/* Shared Toggle (Only if handler provided) */}
                    {onToggleShared && (
                        <button 
                            onClick={(e) => onToggleShared(task, e)}
                            className={`
                                p-1.5 rounded-md transition-all
                                ${task.is_shared ? 'bg-indigo-50 text-indigo-600' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'}
                            `}
                            title={task.is_shared ? "Visible to Family" : "Internal Only"}
                        >
                            {task.is_shared ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                    )}

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

                            <div className="mt-4 pt-4 border-t border-gray-100">
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