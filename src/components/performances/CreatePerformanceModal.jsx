import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, AlignLeft, Trophy, Star, Music, Users, X, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CreatePerformanceModal({ open, onOpenChange, onSubmit, isLoading }) {
    const { register, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            title: '',
            date: new Date().toISOString().split('T')[0],
            type: 'recital',
            venue: '',
            description: ''
        }
    });

    const handleFormSubmit = (data) => {
        onSubmit(data);
        reset();
    };

    const selectedType = watch('type');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 gap-0 bg-[#FDFBF7] overflow-hidden border-none shadow-2xl rounded-[32px]">
                <div className="relative">
                    {/* decorative background element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-60" />
                    
                    {/* Header Section */}
                    <div className="p-8 pb-6 relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#333333] rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-200">
                                    <Star className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-serif text-2xl text-[#333333]">New Production</h2>
                                    <p className="text-gray-400 text-sm">Start planning your next big event</p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onOpenChange(false)} 
                                className="rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                            {/* Title Input - Large & Heroic */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Event Title</label>
                                <div className="relative group">
                                    <Input 
                                        {...register('title', { required: true })}
                                        placeholder="e.g. Winter Wonderland 2025" 
                                        className="h-14 pl-4 text-xl font-serif bg-white border-gray-100 shadow-sm rounded-xl transition-all group-hover:border-indigo-200 focus:ring-0 focus:border-indigo-300 placeholder:text-gray-300"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Type Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Production Type</label>
                                    <Select 
                                        onValueChange={(val) => setValue('type', val)} 
                                        defaultValue={selectedType}
                                    >
                                        <SelectTrigger className="h-12 bg-white border-gray-100 rounded-xl shadow-sm hover:border-indigo-100">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="recital">
                                                <div className="flex items-center gap-2">
                                                    <Music className="w-4 h-4 text-pink-400" /> <span>Recital</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="competition">
                                                <div className="flex items-center gap-2">
                                                    <Trophy className="w-4 h-4 text-blue-400" /> <span>Competition</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="showcase">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-amber-400" /> <span>Showcase</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="community_event">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-green-400" /> <span>Community Event</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Date Picker */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Show Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input 
                                            type="date" 
                                            {...register('date', { required: true })}
                                            className="h-12 pl-10 bg-white border-gray-100 rounded-xl shadow-sm hover:border-indigo-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Venue Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Venue Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input 
                                        {...register('venue')}
                                        placeholder="Search or enter venue name..." 
                                        className="h-12 pl-10 bg-white border-gray-100 rounded-xl shadow-sm hover:border-indigo-100"
                                    />
                                </div>
                            </div>

                            {/* Description Textarea */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Notes & Details</label>
                                <div className="relative">
                                    <AlignLeft className="absolute left-3 top-4 w-4 h-4 text-gray-400" />
                                    <Textarea 
                                        {...register('description')}
                                        placeholder="Add any initial notes, theme ideas, or logistical details..." 
                                        className="min-h-[100px] pl-10 pt-3 bg-white border-gray-100 rounded-xl shadow-sm resize-none hover:border-indigo-100 focus:ring-0"
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 mt-2">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => onOpenChange(false)}
                                    className="rounded-full px-6 h-12 hover:bg-white text-gray-500 hover:text-gray-800"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    className="bg-[#333333] hover:bg-black text-white rounded-full px-8 h-12 shadow-lg hover:shadow-xl transition-all group"
                                >
                                    {isLoading ? 'Creating...' : 'Create Production'}
                                    {!isLoading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}