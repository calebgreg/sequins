import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Event Title</Label>
                        <Input id="title" placeholder="e.g. Spring Recital 2025" {...register('title', { required: true })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" {...register('date', { required: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">Event Type</Label>
                            <Select 
                                onValueChange={(val) => setValue('type', val)} 
                                defaultValue={watch('type')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recital">Recital</SelectItem>
                                    <SelectItem value="competition">Competition</SelectItem>
                                    <SelectItem value="showcase">Showcase</SelectItem>
                                    <SelectItem value="community_event">Community Event</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="venue">Venue</Label>
                        <Input id="venue" placeholder="e.g. Grand Theater" {...register('venue')} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea id="description" placeholder="Notes about the event..." {...register('description')} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-[#333333]">
                            {isLoading ? 'Creating...' : 'Create Event'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}