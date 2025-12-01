import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { motion } from 'framer-motion';
import { UploadCloud, FileText, Loader2, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function TuitionAIImport({ onComplete, onCancel }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('upload'); // upload, processing, review, done
  const [fileUrl, setFileUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loadingText, setLoadingText] = useState('');

  // 1. Upload File
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const res = await base44.integrations.Core.UploadFile({ file });
      return res.file_url;
    },
    onSuccess: (url) => {
      setFileUrl(url);
      setStep('processing');
      analyzeFileMutation.mutate(url);
    }
  });

  // 2. Analyze File with LLM
  const analyzeFileMutation = useMutation({
    mutationFn: async (url) => {
      setLoadingText('Reading document structure...');
      
      // We ask the LLM to infer settings, plans, discounts, and fees from the document
      const prompt = `
        Analyze this tuition document. 
        Extract and infer the following configuration for a dance studio management system:
        1. Studio Settings: Pricing model (hourly vs per_class vs flat_rate), studio type (competitive/recreational).
        2. Tuition Plans: Any standard monthly plans mentioned.
        3. Hourly Rates: If hourly pricing, extract the tiers (hours -> cost).
        4. Discounts: Sibling discounts, multi-class discounts, etc.
        5. Fees: Registration fees, costume fees, competition fees.

        Return a JSON object with keys: "settings", "tuition_plans", "hourly_rates", "discounts", "fees".
        Ensure data matches these schema shapes roughly:
        - settings: { type: enum(competitive, recreational, mixed), pricing_model: enum(hourly, per_class, flat_rate) }
        - tuition_plans: [{ name, amount, billing_frequency }]
        - hourly_rates: [{ hours, rate }]
        - discounts: [{ name, type: enum(percent, fixed), value, category }]
        - fees: [{ name, amount, billing_frequency, is_mandatory }]
      `;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [url],
        response_json_schema: {
          type: "object",
          properties: {
            settings: {
               type: "object",
               properties: {
                 type: { type: "string", enum: ["competitive", "recreational", "mixed"] },
                 pricing_model: { type: "string", enum: ["hourly", "per_class", "flat_rate"] }
               }
            },
            tuition_plans: {
               type: "array", 
               items: { 
                 type: "object",
                 properties: {
                   name: { type: "string" },
                   amount: { type: "number" },
                   billing_frequency: { type: "string" }
                 }
               }
            },
            hourly_rates: {
               type: "array",
               items: {
                  type: "object",
                  properties: {
                     hours: { type: "number" },
                     rate: { type: "number" }
                  }
               }
            },
            discounts: {
               type: "array",
               items: {
                  type: "object",
                  properties: {
                     name: { type: "string" },
                     type: { type: "string", enum: ["percent", "fixed"] },
                     value: { type: "number" },
                     category: { type: "string" }
                  }
               }
            },
            fees: {
               type: "array",
               items: {
                  type: "object",
                  properties: {
                     name: { type: "string" },
                     amount: { type: "number" },
                     billing_frequency: { type: "string" },
                     is_mandatory: { type: "boolean" }
                  }
               }
            }
          }
        }
      });
      return res;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setStep('review');
    },
    onError: () => {
       setStep('error');
    }
  });

  // 3. Save Data
  const saveConfiguration = async () => {
    setLoadingText('Applying configuration...');
    setStep('saving');

    try {
       // Save Settings
       if (analysisResult.settings) {
          // Check if settings exist, update or create. For simplicity, create new record logic here (or update singleton)
          // Assuming singleton pattern for settings usually, but list() will tell us
          const existing = await base44.entities.StudioSettings.list();
          if (existing.length > 0) {
             await base44.entities.StudioSettings.update(existing[0].id, {
                ...analysisResult.settings,
                hourly_rate_tiers: analysisResult.hourly_rates
             });
          } else {
             await base44.entities.StudioSettings.create({
                ...analysisResult.settings,
                name: "My Studio",
                hourly_rate_tiers: analysisResult.hourly_rates
             });
          }
       }

       // Create Plans
       if (analysisResult.tuition_plans?.length) {
          await base44.entities.TuitionPlan.bulkCreate(analysisResult.tuition_plans);
       }

       // Create Discounts
       if (analysisResult.discounts?.length) {
          // Map categories to valid enums if needed, or rely on LLM accuracy (it has schema)
          await base44.entities.DiscountRule.bulkCreate(analysisResult.discounts.map(d => ({
             ...d, active: true, apply_automatically: true
          })));
       }

       // Create Fees
       if (analysisResult.fees?.length) {
          await base44.entities.FeeType.bulkCreate(analysisResult.fees);
       }

       queryClient.invalidateQueries();
       setStep('done');
       setTimeout(onComplete, 2000);
    } catch (err) {
       console.error(err);
       setStep('error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) uploadMutation.mutate(file);
  };

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-lg border border-gray-100 max-w-2xl mx-auto">
      <div className="text-center mb-8">
         <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <SparklesIcon className="w-8 h-8 text-white" />
         </div>
         <h2 className="font-serif text-3xl text-[#333333] mb-2">AI Tuition Import</h2>
         <p className="text-gray-500">Upload your PDF handbook or pricing sheet, and we'll build your billing engine.</p>
      </div>

      {step === 'upload' && (
         <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
            <input 
               type="file" 
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
               onChange={handleFileChange}
               accept=".pdf,.png,.jpg,.jpeg"
            />
            <UploadCloud className="w-12 h-12 text-gray-300 mx-auto mb-4 group-hover:text-indigo-500 transition-colors" />
            <h3 className="font-medium text-gray-900 mb-1">Click to upload or drag and drop</h3>
            <p className="text-sm text-gray-400">PDF, PNG, JPG up to 10MB</p>
         </div>
      )}

      {(step === 'processing' || step === 'saving') && (
         <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
            <h3 className="font-medium text-lg text-[#333333] mb-2">{loadingText}</h3>
            <p className="text-gray-400 text-sm">This usually takes about 10-20 seconds.</p>
         </div>
      )}

      {step === 'review' && analysisResult && (
         <div className="space-y-6">
            <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
               <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Here's what we found:
               </h3>
               <ul className="space-y-3 text-sm">
                  <li className="flex justify-between">
                     <span className="text-indigo-700">Model:</span>
                     <span className="font-medium capitalize">{analysisResult.settings?.pricing_model?.replace('_', ' ') || 'N/A'}</span>
                  </li>
                  <li className="flex justify-between">
                     <span className="text-indigo-700">Type:</span>
                     <span className="font-medium capitalize">{analysisResult.settings?.type || 'N/A'}</span>
                  </li>
                  <li className="flex justify-between">
                     <span className="text-indigo-700">Discounts Found:</span>
                     <span className="font-medium">{analysisResult.discounts?.length || 0}</span>
                  </li>
                  <li className="flex justify-between">
                     <span className="text-indigo-700">Fees Found:</span>
                     <span className="font-medium">{analysisResult.fees?.length || 0}</span>
                  </li>
               </ul>
            </div>
            
            <div className="flex gap-4">
               <Button variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-xl">Cancel</Button>
               <Button onClick={saveConfiguration} className="flex-1 bg-[#333333] text-white h-12 rounded-xl hover:bg-black">
                  Confirm & Build
               </Button>
            </div>
         </div>
      )}

      {step === 'done' && (
         <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
               <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-serif text-2xl text-[#333333] mb-2">Setup Complete!</h3>
            <p className="text-gray-500">Your tuition settings have been applied.</p>
         </div>
      )}
      
      {step === 'error' && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-medium text-lg text-red-600">Something went wrong</h3>
            <p className="text-gray-400 mb-6">We couldn't process that file. Please try again or use the manual builder.</p>
            <Button onClick={() => setStep('upload')} variant="outline">Try Again</Button>
         </div>
      )}
    </div>
  );
}

const SparklesIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.39 8.26L21 9.27L16.36 13.97L17.78 20.48L12 17.64L6.22 20.48L7.64 13.97L3 9.27L9.61 8.26L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);