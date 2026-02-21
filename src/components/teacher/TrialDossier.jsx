import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { X, Star, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const experienceLabels = { none: 'No experience', a_little: 'A little', some: 'Some experience' };
const sourceLabels = { friend: 'A friend', social_media: 'Social media', google: 'Google', event: 'An event', other: 'Other' };

export default function TrialDossier({ lead, onClose }) {
  if (!lead) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #fffaf9 0%, #fef2ef 50%, #fdf5f3 100%)',
          boxShadow: '0 25px 60px -10px rgba(180,150,140,0.35)',
        }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.6)', color: '#b5a599' }}
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' }}
            >
              Trial Student
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
              style={{
                background: 'linear-gradient(145deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 100%)',
                color: '#d97706',
              }}
            >
              {lead.child_name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#5a4a42' }}>{lead.child_name}</h2>
              <p className="text-sm" style={{ color: '#9a8b80' }}>
                {lead.child_age ? `Age ${lead.child_age}` : 'Age unknown'}
                {lead.dance_experience && ` · ${experienceLabels[lead.dance_experience] || lead.dance_experience}`}
              </p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="px-6 pb-6 space-y-3">
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.7)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}>
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#b5a599' }}>Parent</div>
            <div className="text-sm font-medium" style={{ color: '#6b5d52' }}>{lead.parent_name}</div>
            {lead.parent_phone && <div className="text-xs mt-0.5" style={{ color: '#9a8b80' }}>{lead.parent_phone}</div>}
          </div>

          <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.7)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}>
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#b5a599' }}>How They Found Us</div>
            <div className="text-sm font-medium" style={{ color: '#6b5d52' }}>
              {sourceLabels[lead.how_heard] || lead.source_detail || lead.source || 'Unknown'}
              {lead.referral_name && ` — referred by ${lead.referral_name}`}
            </div>
          </div>

          {lead.child_interests?.length > 0 && (
            <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.7)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}>
              <div className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#b5a599' }}>Interested In</div>
              <div className="flex flex-wrap gap-1.5">
                {lead.child_interests.map(i => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs capitalize font-medium" style={{ background: 'rgba(251,191,36,0.12)', color: '#b45309' }}>
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Teacher Prompt */}
          <div 
            className="rounded-xl p-4 text-center"
            style={{
              background: 'linear-gradient(145deg, rgba(180,160,190,0.12) 0%, rgba(160,140,170,0.08) 100%)',
              border: '1px solid rgba(180,160,190,0.15)',
            }}
          >
            <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: '#9a8aad' }} />
            <p className="text-sm font-medium" style={{ color: '#7a6b8a' }}>
              Make them feel seen today.
            </p>
            <p className="text-xs mt-1" style={{ color: '#a89ab8' }}>
              Note one specific thing they do well.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}