import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    CheckCircle2, Circle, Plus, Calendar, Clock, User, Trash2, 
    Share2, Flag, LayoutList, MoreHorizontal, AlertCircle, CheckSquare,
    Eye, EyeOff
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from 'date-fns';
import { cn } from "@/utils"; 

export default function FamilyTasks({ familyEmail }) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [filter, setFilter] = useState('all'); // all, shared, internal
    
    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        category: 'admin',
        due_date: new Date().toISOString().split('T')[0],
        is_shared: false,
        checklist: []
    });

    const queryClient = useQueryClient();

    const { data: tasks = [] } = useQuery({
        queryKey: ['family_tasks', familyEmail],
        queryFn: async () => {
            const all = await base44.entities.FamilyTask.list();
            return all.filter(t => t.parent_email === familyEmail).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.FamilyTask.create({
            parent_email: familyEmail,
            status: 'pending',
            assigned_to: 'Staff', // ideally get current user
            ...data
        }),
        onSuccess: () => {
            setIsCreateOpen(false);
            resetForm();
            queryClient.invalidateQueries(['family_tasks']);
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.FamilyTask.update(data.id, data),
        onSuccess: () => {
            setEditingTask(null);
            setIsCreateOpen(false);
            queryClient.invalidateQueries(['family_tasks']);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.FamilyTask.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['family_tasks'])
    });

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            priority: 'medium',
            category: 'admin',
            due_date: new Date().toISOString().split('T')[0],
            is_shared: false,
            checklist: []
        });
    };

    const handleSave = () => {
        if (!formData.title) return;
        
        if (editingTask) {
            updateMutation.mutate({ id: editingTask.id, ...formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const openEdit = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            category: task.category || 'admin',
            due_date: task.due_date,
            is_shared: task.is_shared || false,
            checklist: task.checklist || []
        });
        setIsCreateOpen(true);
    };

    const toggleStatus = (task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        updateMutation.mutate({ id: task.id, status: newStatus });
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'shared') return t.is_shared;
        if (filter === 'internal') return !t.is_shared;
        return true;
    });

    const getPriorityColor = (p) => {
        switch(p) {
            case 'high': return 'text-red-500 bg-red-50 border-red-100';
            case 'medium': return 'text-amber-500 bg-amber-50 border-amber-100';
            case 'low': return 'text-blue-500 bg-blue-50 border-blue-100';
            default: return 'text-gray-500 bg-gray-50 border-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col h-full relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <LayoutList className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-serif text-lg text-[#333333] leading-none">Project Manager</h3>
                        <p className="text-xs text-gray-400 mt-1">Track onboarding & tasks</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="h-8 w-[110px] text-xs rounded-full border-gray-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tasks</SelectItem>
                            <SelectItem value="shared">Shared</SelectItem>
                            <SelectItem value="internal">Internal</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button 
                        size="sm" 
                        onClick={() => { resetForm(); setEditingTask(null); setIsCreateOpen(true); }}
                        className="bg-[#333333] text-white hover:bg-black rounded-full h-8 px-3 text-xs"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1" /> New Task
                    </Button>
                </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2">
                {filteredTasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl">
                        <CheckSquare className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No tasks found</p>
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div 
                            key={task.id} 
                            onClick={() => openEdit(task)}
                            className={`
                                group relative p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md
                                ${task.status === 'completed' ? 'bg-gray-50/50 border-gray-100 opacity-70' : 'bg-white border-gray-100 hover:border-indigo-100'}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleStatus(task); }}
                                    className={`mt-0.5 transition-colors ${task.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
                                >
                                    {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className={`text-sm font-semibold text-[#333333] ${task.status === 'completed' && 'line-through text-gray-400'}`}>
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {task.is_shared && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
                                                    <Share2 className="w-3 h-3" /> Shared
                                                </div>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="text-gray-300 hover:text-[#333333] p-1 rounded-md hover:bg-gray-100">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }} className="text-red-600">
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    
                                    {task.description && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                    )}

                                    <div className="flex items-center gap-2 mt-3">
                                        <div className={`text-[10px] px-2 py-0.5 rounded border capitalize ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(task.due_date), 'MMM d')}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 capitalize">
                                            <Flag className="w-3 h-3" />
                                            {task.category}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Input 
                                placeholder="Task Title" 
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="font-semibold"
                            />
                        </div>
                        
                        <div className="grid gap-2">
                            <Textarea 
                                placeholder="Description / Notes..." 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="resize-none h-20"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1.5 block">Priority</label>
                                <Select 
                                    value={formData.priority} 
                                    onValueChange={(val) => setFormData({...formData, priority: val})}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1.5 block">Category</label>
                                <Select 
                                    value={formData.category} 
                                    onValueChange={(val) => setFormData({...formData, category: val})}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="enrollment">Enrollment</SelectItem>
                                        <SelectItem value="billing">Billing</SelectItem>
                                        <SelectItem value="communication">Communication</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1.5 block">Due Date</label>
                                <Input 
                                    type="date" 
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                                />
                            </div>
                            <div className="flex flex-col justify-end pb-2">
                                <div 
                                    onClick={() => setFormData({...formData, is_shared: !formData.is_shared})}
                                    className={`
                                        flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all
                                        ${formData.is_shared ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}
                                    `}
                                >
                                    <div className={`p-1.5 rounded-md ${formData.is_shared ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'}`}>
                                        {formData.is_shared ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-medium ${formData.is_shared ? 'text-indigo-900' : 'text-gray-500'}`}>
                                            {formData.is_shared ? 'Visible to Family' : 'Internal Only'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-[#333333] text-white hover:bg-black">
                            {editingTask ? 'Save Changes' : 'Create Task'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}