import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Circle, Plus, Calendar, Clock, User, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export default function FamilyTasks({ familyEmail }) {
    const [newTask, setNewTask] = useState('');
    const queryClient = useQueryClient();

    const { data: tasks = [] } = useQuery({
        queryKey: ['family_tasks', familyEmail],
        queryFn: async () => {
            const all = await base44.entities.FamilyTask.list();
            return all.filter(t => t.parent_email === familyEmail).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
    });

    const createTaskMutation = useMutation({
        mutationFn: (title) => base44.entities.FamilyTask.create({
            parent_email: familyEmail,
            title,
            status: 'pending',
            priority: 'medium',
            due_date: new Date().toISOString().split('T')[0]
        }),
        onSuccess: () => {
            setNewTask('');
            queryClient.invalidateQueries(['family_tasks']);
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: (task) => base44.entities.FamilyTask.update(task.id, {
            status: task.status === 'pending' ? 'completed' : 'pending'
        }),
        onSuccess: () => queryClient.invalidateQueries(['family_tasks'])
    });

    const deleteTaskMutation = useMutation({
        mutationFn: (id) => base44.entities.FamilyTask.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['family_tasks'])
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        createTaskMutation.mutate(newTask);
    };

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-lg text-[#333333]">Tasks & Follow-ups</h3>
                <Badge variant="secondary" className="bg-gray-100">{pendingTasks.length} Pending</Badge>
            </div>

            <form onSubmit={handleSubmit} className="mb-6 relative">
                <Input 
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a new task..."
                    className="pr-10 bg-[#F4F4F6] border-transparent focus:bg-white transition-all rounded-xl"
                />
                <Button 
                    size="icon" 
                    type="submit" 
                    disabled={!newTask.trim()}
                    className="absolute right-1 top-1 h-8 w-8 rounded-lg bg-white shadow-sm text-indigo-600 hover:bg-indigo-50"
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {tasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No tasks yet. Keep track of to-dos here.
                    </div>
                )}
                
                {pendingTasks.map(task => (
                    <div key={task.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <button 
                            onClick={() => toggleStatusMutation.mutate(task)}
                            className="mt-0.5 text-gray-400 hover:text-green-500 transition-colors"
                        >
                            <Circle className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#333333] leading-snug">{task.title}</div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-gray-100">
                                    <Calendar className="w-3 h-3" /> {format(new Date(task.due_date), 'MMM d')}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {completedTasks.length > 0 && (
                    <>
                        <div className="my-4 flex items-center gap-2">
                            <div className="h-px bg-gray-100 flex-1" />
                            <span className="text-[10px] uppercase font-bold text-gray-300">Completed</span>
                            <div className="h-px bg-gray-100 flex-1" />
                        </div>
                        {completedTasks.map(task => (
                            <div key={task.id} className="group flex items-start gap-3 p-3 rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => toggleStatusMutation.mutate(task)}
                                    className="mt-0.5 text-green-500"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                </button>
                                <div className="flex-1">
                                    <div className="text-sm text-gray-500 line-through">{task.title}</div>
                                </div>
                                <button 
                                    onClick={() => deleteTaskMutation.mutate(task.id)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}