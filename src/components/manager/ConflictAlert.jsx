import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

export default function ConflictAlert({ conflicts, onDismiss }) {
  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-2xl p-6 flex items-start gap-4">
        <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
        <div>
          <h4 className="font-medium text-green-900">All Clear</h4>
          <p className="text-green-700 text-sm mt-1">Sequins AI didn't find any scheduling conflicts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.map((conflict, idx) => (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3 relative group"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-amber-900 text-sm">Scheduling Conflict Detected</h4>
            <p className="text-amber-800 text-sm mt-1 leading-relaxed">
              {conflict.description}
            </p>
            <div className="flex gap-2 mt-2">
               <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600/70 bg-amber-100/50 px-2 py-0.5 rounded-full">
                 {conflict.type}
               </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}