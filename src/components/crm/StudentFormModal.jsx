import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CreditCard, FileText } from 'lucide-react';

const COLORS = ['#F2DCDD', '#E5C0C2', '#D4A5A5', '#C8E7F5', '#E0F2F1', '#FFF9C4', '#F3E5F5'];

export default function StudentFormModal({ isOpen, onOpenChange, studentToEdit = null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    level: 'beginner',
    status: 'active',
    parent_name: '',
    parent_email: '',
    phone: '',
    address: '',
    emergency_contact: '',
    interests: '',
    color: COLORS[0]
  });

  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        ...studentToEdit,
        interests: studentToEdit.interests ? studentToEdit.interests.join(', ') : '',
        age: studentToEdit.age?.toString() || ''
      });
    } else {
      setFormData({
        name: '',
        age: '',
        level: 'beginner',
        status: 'active',
        billing_method: 'manual',
        parent_name: '',
        parent_email: '',
        phone: '',
        address: '',
        emergency_contact: '',
        interests: '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
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
      <DialogContent className="max-w-2xl bg-white rounded-[32px] p-0 overflow-hidden border-none">
        <div className="bg-[#F4F4F6] px-8 py-6 border-b border-gray-100">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#333333]">
              {studentToEdit ? 'Edit Student Profile' : 'Add New Student'}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student Details</h4>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="rounded-xl bg-gray-50 border-transparent focus:bg-white transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input 
                    type="number" 
                    required 
                    value={formData.age} 
                    onChange={e => setFormData({...formData, age: e.target.value})} 
                    className="rounded-xl bg-gray-50 border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={formData.level} onValueChange={v => setFormData({...formData, level: v})}>
                    <SelectTrigger className="rounded-xl bg-gray-50 border-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                  <SelectTrigger className="rounded-xl bg-gray-50 border-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-xl space-y-3">
               <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Billing Preference</Label>
               <RadioGroup 
                  value={formData.billing_method || 'manual'} 
                  onValueChange={(v) => setFormData({...formData, billing_method: v})}
                  className="flex gap-4"
               >
                  <div className={`flex items-center space-x-2 bg-white px-4 py-3 rounded-lg border flex-1 cursor-pointer transition-colors ${formData.billing_method === 'auto_pay' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}>
                     <RadioGroupItem value="auto_pay" id="auto" />
                     <Label htmlFor="auto" className="cursor-pointer flex items-center gap-2 w-full font-medium">
                        <CreditCard className="w-4 h-4 text-indigo-500" /> Auto-Pay
                     </Label>
                  </div>
                  <div className={`flex items-center space-x-2 bg-white px-4 py-3 rounded-lg border flex-1 cursor-pointer transition-colors ${formData.billing_method === 'manual' ? 'border-gray-500 ring-1 ring-gray-500' : 'border-gray-200 hover:border-gray-300'}`}>
                     <RadioGroupItem value="manual" id="manual" />
                     <Label htmlFor="manual" className="cursor-pointer flex items-center gap-2 w-full font-medium">
                        <FileText className="w-4 h-4 text-gray-500" /> Manual Invoice
                     </Label>
                  </div>
               </RadioGroup>
            </div>

            {/* Family Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Family & Contact</h4>
              <div className="space-y-2">
                <Label>Parent Name</Label>
                <Input 
                  value={formData.parent_name} 
                  onChange={e => setFormData({...formData, parent_name: e.target.value})} 
                  className="rounded-xl bg-gray-50 border-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label>Parent Email</Label>
                <Input 
                  type="email" 
                  value={formData.parent_email} 
                  onChange={e => setFormData({...formData, parent_email: e.target.value})} 
                  className="rounded-xl bg-gray-50 border-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="rounded-xl bg-gray-50 border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
               <Label>Interests (comma separated)</Label>
               <Input 
                 value={formData.interests} 
                 onChange={e => setFormData({...formData, interests: e.target.value})} 
                 placeholder="Ballet, Jazz, Tap..."
                 className="rounded-xl bg-gray-50 border-transparent"
               />
            </div>
            <div className="space-y-2">
               <Label>Address</Label>
               <Input 
                 value={formData.address} 
                 onChange={e => setFormData({...formData, address: e.target.value})} 
                 className="rounded-xl bg-gray-50 border-transparent"
               />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">Cancel</Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="rounded-full bg-[#333333] text-white hover:bg-black px-8"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (studentToEdit ? 'Save Changes' : 'Create Student')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}