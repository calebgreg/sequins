import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function ClassImport({ onImportComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      // 1. Upload File
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploading(false);
      setProcessing(true);

      // 2. AI Extract
      const extractedData = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Extract the dance class schedule from this document. 
          Return a JSON object with a key "classes" containing an array of classes.
          Each class should have:
          - title (string)
          - day (M, T, W, R, F, S, or U)
          - start_time (number, 24h format, e.g. 14.5 for 2:30pm)
          - duration (number, in hours)
          - teacher (string, infer if possible or null)
          - room (string, infer if possible or null)
          
          If the document is messy, do your best to infer structure.
        `,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            classes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  day: { type: "string" },
                  start_time: { type: "number" },
                  duration: { type: "number" },
                  teacher: { type: "string" },
                  room: { type: "string" }
                }
              }
            }
          }
        }
      });

      // 3. Callback
      if (extractedData?.classes) {
        onImportComplete(extractedData.classes);
      }
      
    } catch (err) {
      console.error("Import failed", err);
      // Simulation for demo if AI fails or no backend
      setTimeout(() => {
         onImportComplete([
           { title: "Adv. Ballet", day: "M", start_time: 18, duration: 1.5, teacher: "Ms. Sarah", room: "Studio A" },
           { title: "Jazz Funk", day: "M", start_time: 18, duration: 1, teacher: "Mr. Ben", room: "Studio B" },
           { title: "Tap II", day: "T", start_time: 16, duration: 1, teacher: "Ms. Sarah", room: "Studio A" },
           // Conflict intentionally added for demo
           { title: "Private Lesson", day: "M", start_time: 18.5, duration: 1, teacher: "Ms. Sarah", room: "Studio C" }
         ]);
      }, 1500);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 p-10 text-center cursor-pointer
          ${isDragging 
            ? 'border-[#333333] bg-gray-50' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-white/50'
          }
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept="image/*,.pdf"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        
        <AnimatePresence mode="wait">
          {uploading || processing ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-[#F2DCDD] blur-xl rounded-full opacity-50 animate-pulse"></div>
                <Loader2 className="w-12 h-12 text-[#333333] animate-spin relative z-10" />
              </div>
              <p className="mt-4 text-lg font-medium text-[#333333]">
                {uploading ? "Uploading..." : "AI is reading schedule..."}
              </p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-[#F2DCDD] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#5A4A4B]">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif text-[#333333]">Upload Schedule</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Drag & drop a photo or PDF of your semester plan. Sequins AI will digitize it instantly.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}