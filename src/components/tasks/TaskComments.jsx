import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TaskComments({ taskId, currentUser }) {
    const [newComment, setNewComment] = useState('');
    const queryClient = useQueryClient();

    const { data: comments = [] } = useQuery({
        queryKey: ['task_comments', taskId],
        queryFn: async () => {
            const res = await base44.entities.TaskComment.filter({ task_id: taskId });
            return res.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        }
    });

    const createMutation = useMutation({
        mutationFn: async (content) => {
            // 1. Create Comment
            const comment = await base44.entities.TaskComment.create({
                task_id: taskId,
                content,
                author_email: currentUser.email,
                author_name: currentUser.full_name,
                mentions: [], // Logic handled by backend for simplicity
            });

            // 2. Trigger AI Copilot
            // Fire and forget - don't await response to keep UI snappy
            base44.functions.invoke('taskCopilot', {
                taskId,
                content,
                authorEmail: currentUser.email,
                authorName: currentUser.full_name,
                type: 'comment'
            });

            return comment;
        },
        onSuccess: () => {
            setNewComment('');
            queryClient.invalidateQueries(['task_comments', taskId]);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        createMutation.mutate(newComment);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50 rounded-lg p-4 gap-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Activity & Comments</h3>
            
            <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm italic">
                        No comments yet. Mention @Gene or a colleague to collaborate.
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className={`flex gap-3 ${comment.ai_generated ? 'bg-indigo-50/50 p-3 rounded-lg border border-indigo-100' : ''}`}>
                            <Avatar className="w-8 h-8 shrink-0">
                                <AvatarFallback className={comment.ai_generated ? "bg-indigo-600 text-white" : "bg-gray-200"}>
                                    {comment.ai_generated ? <Bot className="w-4 h-4" /> : comment.author_name?.[0] || <User className="w-4 h-4" />}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold ${comment.ai_generated ? 'text-indigo-700' : 'text-gray-700'}`}>
                                        {comment.author_name}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} className="relative">
                <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment... Use @name to mention or @Gene for AI help."
                    className="min-h-[80px] bg-white pr-12 text-sm resize-none focus:ring-indigo-500/20"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <Button 
                    type="submit" 
                    size="icon"
                    className="absolute right-2 bottom-2 h-8 w-8 bg-black hover:bg-gray-800 rounded-lg transition-all"
                    disabled={!newComment.trim() || createMutation.isPending}
                >
                    {createMutation.isPending ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </form>
        </div>
    );
}