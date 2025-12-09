import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import TagInput from "@/components/ui/TagInput";

export default function TeacherEditModal({ isOpen, onOpenChange, teacher, onSave, isSaving }) {
    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            name: "",
            bio: "",
            styles: [],
            availability: ""
        }
    });

    const currentStyles = watch("styles");

    useEffect(() => {
        if (teacher) {
            reset({
                name: teacher.name || "",
                bio: teacher.bio || "",
                styles: teacher.styles || [],
                availability: teacher.availability || ""
            });
        }
    }, [teacher, reset]);

    const onSubmit = (data) => {
        onSave({ id: teacher.id, data });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Teacher Profile</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" {...register("name", { required: true })} />
                    </div>

                    <div className="space-y-2">
                        <Label>Dance Styles</Label>
                        <TagInput 
                            tags={currentStyles || []} 
                            onChange={(tags) => setValue("styles", tags)}
                            placeholder="Add style (e.g. Ballet)..."
                            suggestions={['Ballet', 'Jazz', 'Tap', 'Hip Hop', 'Contemporary', 'Lyrical', 'Acro']}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="availability">General Availability</Label>
                        <Input id="availability" {...register("availability")} placeholder="e.g. Mon/Wed Afternoons" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" {...register("bio")} className="h-24" placeholder="Short biography..." />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving} className="bg-[#333333] text-white hover:bg-black">
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}