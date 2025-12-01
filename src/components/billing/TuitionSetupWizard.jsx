import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Music2, 
  Clock, 
  Calendar, 
  DollarSign, 
  Percent, 
  Tag, 
  ArrowRight, 
  ArrowLeft,
  Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function TuitionSetupWizard({ onComplete, onCancel }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  
  // Form State
  const [config, setConfig] = useState({
    studioType: 'mixed', // competitive, recreational, mixed
    pricingModel: 'per_class', // hourly, per_class
    hourlyRates: [{ hours: 1, rate: 60 }, { hours: 2, rate: 110 }], // Default example
    fees: [
        { name: 'Registration Fee', amount: 35, frequency: 'annual', enabled: true },
        { name: 'Costume Fee', amount: 85, frequency: 'per_class', enabled: true },
        { name: 'Competition Fee', amount: 150, frequency: 'one_time', enabled: false }
    ],
    discounts: [
        { name: 'Sibling Discount', type: 'percent', value: 10, category: 'sibling', enabled: true },
        { name: 'Multi-Class', type: 'percent', value: 5, category: 'multi_class', enabled: false }
    ]
  });

  const totalSteps = 4;

  const saveMutation = useMutation({
    mutationFn: async () => {
        // 1. Save Settings
        const existingSettings = await base44.entities.StudioSettings.list();
        const settingsData = {
            name: "My Studio", // Should ideally come from user or context
            type: config.studioType,
            pricing_model: config.pricingModel,
            hourly_rate_tiers: config.pricingModel === 'hourly' ? config.hourlyRates : []
        };

        if (existingSettings.length > 0) {
            await base44.entities.StudioSettings.update(existingSettings[0].id, settingsData);
        } else {
            await base44.entities.StudioSettings.create(settingsData);
        }

        // 2. Save Active Fees
        const activeFees = config.fees.filter(f => f.enabled).map(f => ({
            name: f.name,
            amount: Number(f.amount),
            billing_frequency: f.frequency,
            is_mandatory: false // Defaulting to false for wizard created fees unless specific check added
        }));
        if (activeFees.length > 0) await base44.entities.FeeType.bulkCreate(activeFees);

        // 3. Save Active Discounts
        const activeDiscounts = config.discounts.filter(d => d.enabled).map(d => ({
            name: d.name,
            type: d.type,
            value: Number(d.value),
            category: d.category,
            apply_automatically: true,
            active: true
        }));
        if (activeDiscounts.length > 0) await base44.entities.DiscountRule.bulkCreate(activeDiscounts);
    },
    onSuccess: () => {
        queryClient.invalidateQueries();
        onComplete();
    }
  });

  const nextStep = () => {
     if (step < totalSteps) setStep(step + 1);
     else saveMutation.mutate();
  };

  const prevStep = () => {
     if (step > 1) setStep(step - 1);
  };

  // Step Components
  const StepIndicator = () => (
     <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
           <div 
             key={s} 
             className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-[#333333]' : s < step ? 'w-2 bg-green-500' : 'w-2 bg-gray-200'}`}
           />
        ))}
     </div>
  );

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-100 max-w-2xl mx-auto min-h-[600px] flex flex-col">
      
      <div className="flex justify-between items-center mb-6">
         <Button variant="ghost" onClick={onCancel} className="text-gray-400">Cancel</Button>
         <StepIndicator />
         <div className="w-20" /> {/* Spacer */}
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
            
            {/* STEP 1: Studio Type */}
            {step === 1 && (
                <motion.div 
                   key="step1"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-6"
                >
                   <div className="text-center mb-8">
                      <h2 className="font-serif text-3xl text-[#333333] mb-2">Studio Profile</h2>
                      <p className="text-gray-500">What kind of dance programs do you run?</p>
                   </div>

                   <div className="grid grid-cols-1 gap-4">
                      {[
                          { id: 'recreational', title: 'Recreational', desc: 'Focus on fun, learning, and annual recitals.', icon: Music2 },
                          { id: 'competitive', title: 'Competitive', desc: 'Teams, competitions, and intensive training.', icon: Trophy },
                          { id: 'mixed', title: 'Mixed Program', desc: 'Both recreational classes and competitive teams.', icon: null }
                      ].map(type => (
                          <div 
                             key={type.id}
                             onClick={() => setConfig({...config, studioType: type.id})}
                             className={`
                                p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4
                                ${config.studioType === type.id 
                                    ? 'border-[#333333] bg-gray-50' 
                                    : 'border-gray-100 hover:border-gray-200'}
                             `}
                          >
                             <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.studioType === type.id ? 'bg-[#333333] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {type.icon ? <type.icon className="w-6 h-6" /> : <div className="font-bold text-lg">M</div>}
                             </div>
                             <div className="text-left">
                                <h3 className="font-bold text-lg">{type.title}</h3>
                                <p className="text-sm text-gray-500">{type.desc}</p>
                             </div>
                             {config.studioType === type.id && <Check className="w-6 h-6 text-[#333333] ml-auto" />}
                          </div>
                      ))}
                   </div>
                </motion.div>
            )}

            {/* STEP 2: Pricing Model */}
            {step === 2 && (
                <motion.div 
                   key="step2"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-8"
                >
                   <div className="text-center">
                      <h2 className="font-serif text-3xl text-[#333333] mb-2">Pricing Structure</h2>
                      <p className="text-gray-500">How do you calculate tuition?</p>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mb-6">
                      <div 
                         onClick={() => setConfig({...config, pricingModel: 'per_class'})}
                         className={`p-6 rounded-2xl border-2 cursor-pointer text-center ${config.pricingModel === 'per_class' ? 'border-[#333333] bg-gray-50' : 'border-gray-100'}`}
                      >
                         <Calendar className="w-8 h-8 mx-auto mb-3 text-gray-700" />
                         <div className="font-bold">Per Class</div>
                         <div className="text-xs text-gray-400 mt-1">Fee per class enrollment</div>
                      </div>
                      <div 
                         onClick={() => setConfig({...config, pricingModel: 'hourly'})}
                         className={`p-6 rounded-2xl border-2 cursor-pointer text-center ${config.pricingModel === 'hourly' ? 'border-[#333333] bg-gray-50' : 'border-gray-100'}`}
                      >
                         <Clock className="w-8 h-8 mx-auto mb-3 text-gray-700" />
                         <div className="font-bold">Hourly Rate</div>
                         <div className="text-xs text-gray-400 mt-1">Based on total hours/week</div>
                      </div>
                   </div>

                   {config.pricingModel === 'hourly' && (
                      <div className="bg-gray-50 p-6 rounded-2xl">
                         <Label className="mb-4 block">Define Hourly Tiers</Label>
                         <div className="space-y-3">
                            {config.hourlyRates.map((tier, i) => (
                               <div key={i} className="flex items-center gap-3">
                                  <div className="bg-white px-3 py-2 rounded-lg shadow-sm text-sm font-medium w-24">{tier.hours} Hours</div>
                                  <ArrowRight className="w-4 h-4 text-gray-400" />
                                  <div className="relative flex-1">
                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                     <Input 
                                       type="number" 
                                       value={tier.rate} 
                                       onChange={(e) => {
                                          const newRates = [...config.hourlyRates];
                                          newRates[i].rate = Number(e.target.value);
                                          setConfig({...config, hourlyRates: newRates});
                                       }}
                                       className="pl-6 bg-white border-gray-200" 
                                     />
                                  </div>
                               </div>
                            ))}
                            <Button variant="ghost" size="sm" className="text-xs text-indigo-600" onClick={() => setConfig({...config, hourlyRates: [...config.hourlyRates, {hours: config.hourlyRates.length + 1, rate: 0}]})}>
                               + Add Tier
                            </Button>
                         </div>
                      </div>
                   )}
                </motion.div>
            )}

            {/* STEP 3: Discounts */}
            {step === 3 && (
                <motion.div 
                   key="step3"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-6"
                >
                   <div className="text-center mb-6">
                      <h2 className="font-serif text-3xl text-[#333333] mb-2">Smart Discounts</h2>
                      <p className="text-gray-500">Enable standard discounts to apply automatically.</p>
                   </div>

                   <div className="space-y-4">
                      {config.discounts.map((discount, i) => (
                         <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center ${discount.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                                  <Tag className="w-5 h-5" />
                               </div>
                               <div>
                                  <div className="font-bold text-[#333333]">{discount.name}</div>
                                  <div className="text-xs text-gray-500">Category: {discount.category}</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               {discount.enabled && (
                                  <div className="relative w-24">
                                     <Input 
                                        type="number"
                                        value={discount.value}
                                        onChange={(e) => {
                                           const newD = [...config.discounts];
                                           newD[i].value = e.target.value;
                                           setConfig({...config, discounts: newD});
                                        }}
                                        className="h-8 bg-white pr-6 text-right"
                                     />
                                     <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                                  </div>
                               )}
                               <Switch 
                                  checked={discount.enabled}
                                  onCheckedChange={(c) => {
                                     const newD = [...config.discounts];
                                     newD[i].enabled = c;
                                     setConfig({...config, discounts: newD});
                                  }}
                               />
                            </div>
                         </div>
                      ))}
                   </div>
                </motion.div>
            )}

            {/* STEP 4: Fees */}
            {step === 4 && (
                <motion.div 
                   key="step4"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-6"
                >
                   <div className="text-center mb-6">
                      <h2 className="font-serif text-3xl text-[#333333] mb-2">Standard Fees</h2>
                      <p className="text-gray-500">Configure common fees for your studio type.</p>
                   </div>

                   <div className="space-y-4">
                      {config.fees.map((fee, i) => (
                         <div key={i} className="p-4 bg-gray-50 rounded-2xl">
                            <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${fee.enabled ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-400'}`}>
                                     <DollarSign className="w-5 h-5" />
                                  </div>
                                  <div className="font-bold text-[#333333]">{fee.name}</div>
                               </div>
                               <Switch 
                                  checked={fee.enabled}
                                  onCheckedChange={(c) => {
                                     const newF = [...config.fees];
                                     newF[i].enabled = c;
                                     setConfig({...config, fees: newF});
                                  }}
                               />
                            </div>
                            
                            {fee.enabled && (
                               <div className="pl-13 flex gap-3">
                                  <div className="flex-1">
                                     <Label className="text-xs text-gray-400 mb-1 block">Amount</Label>
                                     <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                        <Input 
                                           value={fee.amount}
                                           onChange={(e) => {
                                              const newF = [...config.fees];
                                              newF[i].amount = e.target.value;
                                              setConfig({...config, fees: newF});
                                           }}
                                           className="pl-6 bg-white h-9"
                                        />
                                     </div>
                                  </div>
                                  <div className="flex-1">
                                     <Label className="text-xs text-gray-400 mb-1 block">Frequency</Label>
                                     <Select 
                                        value={fee.frequency}
                                        onValueChange={(v) => {
                                           const newF = [...config.fees];
                                           newF[i].frequency = v;
                                           setConfig({...config, fees: newF});
                                        }}
                                     >
                                        <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                           <SelectItem value="one_time">One Time</SelectItem>
                                           <SelectItem value="annual">Annual</SelectItem>
                                           <SelectItem value="monthly">Monthly</SelectItem>
                                           <SelectItem value="per_class">Per Class</SelectItem>
                                        </SelectContent>
                                     </Select>
                                  </div>
                               </div>
                            )}
                         </div>
                      ))}
                   </div>
                </motion.div>
            )}

        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4">
         {step > 1 && (
            <Button variant="outline" onClick={prevStep} className="rounded-full h-12 px-8">
               Back
            </Button>
         )}
         <Button 
            onClick={nextStep} 
            className="bg-[#333333] text-white hover:bg-black rounded-full h-12 px-10 text-lg shadow-lg"
            disabled={saveMutation.isPending}
         >
            {saveMutation.isPending ? 'Building...' : step === totalSteps ? 'Finish Setup' : 'Next'}
            {!saveMutation.isPending && step !== totalSteps && <ArrowRight className="w-4 h-4 ml-2" />}
         </Button>
      </div>
    </div>
  );
}