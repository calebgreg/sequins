import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, X, Sparkles, Camera, User, Mail, Phone, MapPin, Heart, CreditCard, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import TagInput from '@/components/ui/TagInput';
import { motion } from 'framer-motion';

const COLORS = ['#F2DCDD', '#E5C0C2', '#D4A5A5', '#C8E7F5', '#E0F2F1', '#FFF9C4', '#F3E5F5'];

export default function StudentFormModal({ isOpen, onOpenChange, studentToEdit = null, initialData = null }) {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['studioSettings'],
    queryFn: async () => {
      const res = await base44.entities.StudioSettings.list();
      return res[0] || { levels: ['Beginner', 'Intermediate', 'Advanced'] };
    }
  });

  const levels = settings?.levels || ['Beginner', 'Intermediate', 'Advanced'];

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    level: levels[0],
    status: 'active',
    billing_method: 'manual',
    parent_name: '',
    parent_email: '',
    phone: '',
    address: '',
    interests: '',
    tags: [],
    color: COLORS[0]
  });

  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        ...studentToEdit,
        interests: studentToEdit.interests ? studentToEdit.interests.join(', ') : '',
        age: studentToEdit.age?.toString() || '',
        tags: studentToEdit.tags || [],
        billing_method: studentToEdit.billing_method || 'manual'
      });
    } else {
      setFormData({
        name: initialData?.name || '',
        age: initialData?.age || '',
        level: initialData?.level || levels[0],
        status: initialData?.status || 'active',
        billing_method: initialData?.billing_method || 'manual',
        parent_name: initialData?.parent_name || '',
        parent_email: initialData?.parent_email || '',
        phone: initialData?.phone || '',
        address: initialData?.address || '',
        interests: initialData?.interests || '',
        tags: initialData?.tags || [],
        color: initialData?.color || COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
  }, [studentToEdit, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const formattedData = {
        ...data,
        age: parseInt(data.age) || 0,
        interests: data.interests.split(',').map(s => s.trim()).filter(Boolean),
        joined_date: studentToEdit?.joined_date || new Date().toISOString().split('T')[0]
      };
      
      if (studentToEdit) {
        return base44.entities.Student.update(studentToEdit.id, formattedData);
      } else {
        return base44.entities.Student.create(formattedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onOpenChange(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-none bg-[#F4F4F6] rounded-[40px] h-[90vh] shadow-2xl flex flex-col md:flex-row">
        
        {/* Left Panel - Visual Identity */}
        <div className="w-full md:w-[320px] bg-white p-8 flex flex-col items-center justify-center border-r border-gray-100 relative overflow-hidden shrink-0">
           <div className="absolute inset-0 bg-[#F2DCDD] opacity-10" />
           <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#F2DCDD] rounded-full blur-3xl opacity-30" />
           
           <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="relative group cursor-pointer">
                 <Avatar className="w-32 h-32 border-8 border-[#F4F4F6] shadow-xl">
                    <AvatarFallback className="bg-[#333333] text-white text-4xl font-serif">
                       {formData.name ? formData.name.charAt(0) : <User className="w-12 h-12 opacity-20" />}
                    </AvatarFallback>
                 </Avatar>
                 <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md text-[#333333] hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                 </div>
              </div>

              <div>
                 <h3 className="font-serif text-2xl text-[#333333] mb-1 min-h-[2rem]">
                    {formData.name || "New Student"}
                 </h3>
                 <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">
                    {formData.level} • {formData.age ? `${formData.age}y` : '--'}
                 </p>
              </div>

              {/* Quick Tags Preview */}
              <div className="flex flex-wrap justify-center gap-2 w-full">
                 {formData.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-[10px] bg-[#F4F4F6] px-2 py-1 rounded-full text-gray-500">{t}</span>
                 ))}
              </div>
           </div>
        </div>

        {/* Right Panel - Form Content */}
        <div className="flex-1 flex flex-col h-full relative bg-[#F4F4F6]">
           {/* Header */}
           <div className="p-8 pb-4 flex justify-between items-center bg-[#F4F4F6] z-20">
              <div>
                 <h2 className="font-serif text-3xl text-[#333333] mb-1">Student Profile</h2>
                 <p className="text-gray-400 text-sm">Complete the details below to enroll.</p>
              </div>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full w-12 h-12 p-0 hover:bg-white">
                 <X className="w-6 h-6 text-gray-400" />
              </Button>
           </div>

           {/* Scrollable Form Area */}
           <div className="flex-1 overflow-y-auto px-8 pb-24 custom-scrollbar">
              <form id="student-form" onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
                 
                 {/* Section: Core Info */}
                 <section className="space-y-6">
                    <div className="bg-white rounded-[32px] p-8 shadow-sm space-y-6">
                       <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-[#F2DCDD] flex items-center justify-center text-[#333333]">
                             <User className="w-4 h-4" />
                          </div>
                          <h3 className="font-serif text-lg text-[#333333]">The Basics</h3>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Full Name</Label>
                             <Input 
                                required 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="h-12 rounded-2xl bg-[#F4F4F6] border-transparent focus:bg-white transition-all px-4 text-lg"
                                placeholder="e.g. Olivia Taylor"
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Age</Label>
                                <Input 
                                   type="number"
                                   required
                                   value={formData.age}
                                   onChange={e => setFormData({...formData, age: e.target.value})}
                                   className="h-12 rounded-2xl bg-[#F4F4F6] border-transparent focus:bg-white text-center font-mono text-lg"
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Level</Label>
                                <Select value={formData.level} onValueChange={v => setFormData({...formData, level: v})}>
                                   <SelectTrigger className="h-12 rounded-2xl bg-[#F4F4F6] border-transparent focus:bg-white">
                                      <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                      {levels.map(lvl => (
                                         <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                                      ))}
                                   </SelectContent>
                                </Select>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Status</Label>
                             <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                                <SelectTrigger className="h-12 rounded-2xl bg-[#F4F4F6] border-transparent focus:bg-white">
                                   <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="active">Active Student</SelectItem>
                                   <SelectItem value="prospect">Prospect / Lead</SelectItem>
                                   <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                          <div className="space-y-2">
                              <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Interests</Label>
                              <Input 
                                 value={formData.interests}
                                 onChange={e => setFormData({...formData, interests: e.target.value})}
                                 className="h-12 rounded-2xl bg-[#F4F4F6] border-transparent focus:bg-white px-4"
                                 placeholder="Ballet, Tap..."
                              />
                          </div>
                       </div>
                    </div>
                 </section>

                 {/* Section: Family & Contact */}
                 <section className="space-y-6">
                    <div className="bg-white rounded-[32px] p-8 shadow-sm space-y-6">
                       <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-[#E0F2F1] flex items-center justify-center text-teal-700">
                             <Heart className="w-4 h-4" />
                          </div>
                          <h3 className="font-serif text-lg text-[#333333]">Family & Billing</h3>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Parent Name</Label>
                             <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input 
                                   value={formData.parent_name}
                                   onChange={e => setFormData({...formData, parent_name: e.target.value})}
                                   className="h-12 rounded-2xl bg-[#F4F4F6] border-transparent focus:bg-white pl-10"
                                />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Contact Email</Label>
                             <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input 
                                   value={formData.parent_email}
                                   onChange={e => setFormData({...formData, parent_email: e.target.value})}
                                   className="h-12 rounded-2xl bg-[#F4F4F6] border-transparent focus:bg-white pl-10"
                                />
                             </div>
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                          <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Billing Preference</Label>
                          <RadioGroup 
                             value={formData.billing_method} 
                             onValueChange={(v) => setFormData({...formData, billing_method: v})}
                             className="flex gap-4"
                          >
                             <div className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${formData.billing_method === 'auto_pay' ? 'border-[#333333] bg-[#333333] text-white' : 'border-[#F4F4F6] hover:border-gray-200'}`}>
                                <RadioGroupItem value="auto_pay" id="auto" className="opacity-0 w-0 h-0" />
                                <CreditCard className="w-5 h-5" />
                                <Label htmlFor="auto" className="cursor-pointer font-medium flex-1">Auto-Pay</Label>
                                {formData.billing_method === 'auto_pay' && <div className="w-2 h-2 bg-[#F2DCDD] rounded-full" />}
                             </div>
                             <div className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${formData.billing_method === 'manual' ? 'border-[#333333] bg-[#333333] text-white' : 'border-[#F4F4F6] hover:border-gray-200'}`}>
                                <RadioGroupItem value="manual" id="manual" className="opacity-0 w-0 h-0" />
                                <FileText className="w-5 h-5" />
                                <Label htmlFor="manual" className="cursor-pointer font-medium flex-1">Manual Invoice</Label>
                                {formData.billing_method === 'manual' && <div className="w-2 h-2 bg-[#F2DCDD] rounded-full" />}
                             </div>
                          </RadioGroup>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Phone</Label>
                             <Input 
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="h-12 rounded-2xl bg-[#F4F4F6] border-transparent focus:bg-white px-4"
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="ml-2 text-xs uppercase tracking-wider text-gray-400 font-bold">Address</Label>
                             <Input 
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                                className="h-12 rounded-2xl bg-[#F4F4F6] border-transparent focus:bg-white px-4"
                             />
                          </div>
                       </div>
                    </div>
                 </section>

                 {/* Section: AI Tags */}
                 <section className="space-y-6">
                    <div className="bg-[#333333] rounded-[32px] p-8 shadow-lg text-white space-y-4 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-[#F2DCDD] opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                       
                       <div className="flex justify-between items-center relative z-10">
                          <div className="flex items-center gap-3">
                             <Sparkles className="w-5 h-5 text-[#F2DCDD]" />
                             <h3 className="font-serif text-lg">Smart Tags</h3>
                          </div>
                          <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full font-bold tracking-wider">AI POWERED</span>
                       </div>
                       
                       <div className="relative z-10">
                          <TagInput 
                             tags={formData.tags}
                             onChange={(newTags) => setFormData({...formData, tags: newTags})}
                             enableAI={true}
                             contextData={{
                                name: formData.name,
                                age: formData.age,
                                level: formData.level,
                                interests: formData.interests
                             }}
                             placeholder="Add tags..."
                             suggestions={['sibling', 'visual_learner', 'needs_transport', 'allergy', 'gifted']}
                          />
                       </div>
                    </div>
                 </section>

              </form>
           </div>

           {/* Floating Action Footer */}
           <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F4F4F6] via-[#F4F4F6] to-transparent pointer-events-none flex justify-end">
              <Button 
                 onClick={handleSubmit}
                 disabled={mutation.isPending}
                 className="pointer-events-auto h-14 px-10 rounded-full bg-[#333333] text-white shadow-xl hover:bg-black hover:scale-105 active:scale-95 transition-all font-serif text-lg"
              >
                 {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (studentToEdit ? 'Save Profile' : 'Enroll Student')}
              </Button>
           </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}