import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EditStaffModal({ isOpen, onClose, teacher, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    bio: '',
    styles: [],
    availability: '',
  });
  const [stylesInput, setStylesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        title: teacher.title || '',
        bio: teacher.bio || '',
        styles: teacher.styles || [],
        availability: teacher.availability || '',
      });
      setStylesInput((teacher.styles || []).join(', '));
    }
  }, [teacher]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStylesChange = (value) => {
    setStylesInput(value);
    const styles = value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, styles }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Staff member updated');
      onClose();
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteToApp = async () => {
    if (!formData.email) {
      toast.error('Please add an email first');
      return;
    }
    setInviting(true);
    try {
      await base44.users.inviteUser(formData.email, 'user');
      toast.success(`Invite sent to ${formData.email}`);
    } catch (error) {
      toast.error('Failed to send invite - they may already have an account');
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle 
            className="text-xl font-semibold"
            style={{ color: '#8b7d72' }}
          >
            Edit Staff Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-sm" style={{ color: '#8a8478' }}>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm" style={{ color: '#8a8478' }}>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="mt-1"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label className="text-sm" style={{ color: '#8a8478' }}>Phone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="mt-1"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-sm" style={{ color: '#8a8478' }}>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="mt-1"
                placeholder="e.g., Lead Instructor"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-sm" style={{ color: '#8a8478' }}>Styles (comma separated)</Label>
              <Input
                value={stylesInput}
                onChange={(e) => handleStylesChange(e.target.value)}
                className="mt-1"
                placeholder="Ballet, Jazz, Contemporary"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-sm" style={{ color: '#8a8478' }}>Availability</Label>
              <Input
                value={formData.availability}
                onChange={(e) => handleChange('availability', e.target.value)}
                className="mt-1"
                placeholder="e.g., Mon-Fri afternoons"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-sm" style={{ color: '#8a8478' }}>Bio</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Short biography..."
              />
            </div>
          </div>

          {/* Invite to App Section */}
          <div 
            className="p-4 rounded-xl mt-4"
            style={{ 
              background: 'linear-gradient(145deg, rgba(164,139,196,0.1) 0%, rgba(180,160,200,0.05) 100%)',
              border: '1px solid rgba(164,139,196,0.2)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm" style={{ color: '#8b7d9a' }}>App Access</p>
                <p className="text-xs" style={{ color: '#a8a0b5' }}>
                  Send invite so they can log into Sequins
                </p>
              </div>
              <Button
                onClick={handleInviteToApp}
                disabled={inviting || !formData.email}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: '#1a1a1a' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}