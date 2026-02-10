import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function EditStaffModal({ isOpen, onClose, teacher, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
  });
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        title: teacher.title || '',
      });
    }
  }, [teacher]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const inputStyle = {
    background: 'rgba(255,255,255,0.6)',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#8b7d72',
    boxShadow: 'inset 0 1px 2px rgba(180,150,140,0.08)',
    outline: 'none',
    width: '100%',
    fontSize: '14px',
  };

  const labelStyle = {
    color: '#b5a599',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-[400px] p-0 border-none"
        style={{
          background: 'linear-gradient(180deg, #fef7f7 0%, #faf5f3 100%)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(200,180,170,0.2)' }}>
          <h2 
            className="text-lg font-semibold"
            style={{ 
              color: 'transparent',
              backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
            }}
          >
            Edit Staff
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.6)',
              color: '#b5a599',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          
          {/* Name */}
          <div>
            <label style={labelStyle}>Name</label>
            <input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Email & Phone Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@example.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Lead Instructor"
              style={inputStyle}
            />
          </div>

          {/* Invite Card */}
          <div 
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(145deg, rgba(164,139,196,0.12) 0%, rgba(180,160,200,0.06) 100%)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm" style={{ color: '#8b7d9a' }}>App Access</p>
                <p className="text-xs mt-0.5" style={{ color: '#a8a0b5' }}>
                  Invite to log into Sequins
                </p>
              </div>
              <button
                onClick={handleInviteToApp}
                disabled={inviting || !formData.email}
                className="px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  color: '#8b7d9a',
                }}
              >
                <Send className="w-3 h-3" />
                {inviting ? 'Sending...' : 'Invite'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="absolute bottom-0 left-0 right-0 px-6 py-4 flex gap-3"
          style={{ 
            background: 'linear-gradient(0deg, #fef7f7 0%, transparent 100%)',
            paddingTop: '24px',
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(255,255,255,0.6)',
              color: '#b5a599',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{
              background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
              boxShadow: '0 4px 12px -2px rgba(180,150,140,0.25), inset 0 1px 2px rgba(255,255,255,0.8)',
              color: '#8a7070',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}