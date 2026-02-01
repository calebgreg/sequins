import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';

export default function AddStaffModal({
  isOpen,
  onClose,
  onAdd,
  reportsToId,
  staffList,
}) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const reportsTo = staffList.find(s => s.id === reportsToId);
  const isValid = name.trim() && title.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) {
      onAdd({ name, title, email, manager_id: reportsToId });
      setName('');
      setTitle('');
      setEmail('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(253,238,236,0.98) 0%, rgba(250,232,228,0.95) 50%, rgba(252,243,240,0.98) 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), 0 30px 100px -20px rgba(180,150,140,0.5)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Top accent bar */}
        <div 
          className="h-1"
          style={{
            background: 'linear-gradient(90deg, rgba(126,184,154,0.3) 0%, rgba(126,184,154,0.6) 50%, rgba(126,184,154,0.3) 100%)',
          }}
        />

        {/* Inner glow */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 10%, rgba(255,255,255,0.5) 0%, transparent 50%)',
          }}
        />

        <form onSubmit={handleSubmit} className="relative p-8">
          {/* Header with icon */}
          <div className="flex items-center gap-4 mb-6">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, rgba(126,184,154,0.2) 0%, rgba(126,184,154,0.1) 100%)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)',
              }}
            >
              <UserPlus className="w-5 h-5" style={{ color: '#7eb89a' }} />
            </div>
            <div>
              <h2 
                className="text-2xl font-bold tracking-tight"
                style={{ 
                  color: 'transparent',
                  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  textShadow: '0 2px 3px rgba(255,255,255,0.7)',
                  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                }}
              >
                Add Staff Member
              </h2>
              <p className="text-sm mt-0.5" style={{ color: '#b5a599' }}>
                {reportsTo ? `Joining ${reportsTo.name}'s team` : 'Add to your organization'}
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div className="mb-4">
            <label 
              className="block text-xs font-medium mb-2 px-1"
              style={{ color: '#8b7d72' }}
            >
              Full Name
            </label>
            <div 
              className="rounded-2xl p-1"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,252,250,0.5) 100%)',
                boxShadow: 'inset 0 2px 4px rgba(180,150,140,0.08), 0 1px 2px rgba(255,255,255,0.8)',
              }}
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Mitchell"
                className="w-full px-4 py-3 rounded-xl text-base bg-transparent focus:outline-none"
                style={{ color: '#6b5d52' }}
                autoFocus
              />
            </div>
          </div>

          {/* Title / Role */}
          <div className="mb-4">
            <label 
              className="block text-xs font-medium mb-2 px-1"
              style={{ color: '#8b7d72' }}
            >
              Title / Role
            </label>
            <div 
              className="rounded-2xl p-1"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,252,250,0.5) 100%)',
                boxShadow: 'inset 0 2px 4px rgba(180,150,140,0.08), 0 1px 2px rgba(255,255,255,0.8)',
              }}
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lead Instructor - Ballet"
                className="w-full px-4 py-3 rounded-xl text-base bg-transparent focus:outline-none"
                style={{ color: '#6b5d52' }}
              />
            </div>
          </div>

          {/* Email */}
          <div className="mb-2">
            <label 
              className="block text-xs font-medium mb-2 px-1"
              style={{ color: '#8b7d72' }}
            >
              Email
              <span className="font-normal ml-1" style={{ color: '#c4b5ab' }}>(optional)</span>
            </label>
            <div 
              className="rounded-2xl p-1"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,252,250,0.5) 100%)',
                boxShadow: 'inset 0 2px 4px rgba(180,150,140,0.08), 0 1px 2px rgba(255,255,255,0.8)',
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sarah@studio.com"
                className="w-full px-4 py-3 rounded-xl text-base bg-transparent focus:outline-none"
                style={{ color: '#6b5d52' }}
              />
            </div>
          </div>

          {/* Helper text */}
          <p className="text-xs mt-3 px-1 mb-6" style={{ color: '#c4b5ab' }}>
            They'll receive an invite to join the studio app.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/30"
              style={{ color: '#a8998e' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: isValid 
                  ? 'linear-gradient(145deg, #8b7d72 0%, #6b5d52 100%)'
                  : 'rgba(180,170,160,0.3)',
                color: isValid ? '#fff' : '#a8998e',
                boxShadow: isValid 
                  ? '0 8px 24px -4px rgba(107,93,82,0.4), inset 0 1px 1px rgba(255,255,255,0.1)'
                  : 'none',
              }}
            >
              Add Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}