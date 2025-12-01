import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
  Settings, 
  Percent, 
  DollarSign, 
  Plus, 
  Trash2, 
  Save, 
  Shield, 
  Users, 
  Layers,
  Sparkles,
  PenTool,
  RotateCcw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import TuitionAIImport from './TuitionAIImport';
import TuitionSetupWizard from './TuitionSetupWizard';

export default function TuitionConfiguration() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview'); // overview, discounts, fees, advanced
  const [setupMode, setSetupMode] = useState(null); // 'ai', 'wizard', null

  const { data: settings = [] } = useQuery({
    queryKey: ['studio_settings'],
    queryFn: () => base44.entities.StudioSettings.list(),
  });

  const { data: discounts = [] } = useQuery({
    queryKey: ['discount_rules'],
    queryFn: () => base44.entities.DiscountRule.list(),
  });

  const { data: fees = [] } = useQuery({
    queryKey: ['fee_types'],
    queryFn: () => base44.entities.FeeType.list(),
  });

  const studioSettings = settings[0];

  // --- Mutations ---
  const createDiscountMutation = useMutation({
    mutationFn: (data) => base44.entities.DiscountRule.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discount_rules'] })
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: (id) => base44.entities.DiscountRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discount_rules'] })
  });

  const createFeeMutation = useMutation({
    mutationFn: (data) => base44.entities.FeeType.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fee_types'] })
  });

  const deleteFeeMutation = useMutation({
    mutationFn: (id) => base44.entities.FeeType.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fee_types'] })
  });

  // --- Form States ---
  const [newDiscount, setNewDiscount] = useState({
    name: '', type: 'percent', value: '', category: 'promo', apply_automatically: false
  });
  const [newFee, setNewFee] = useState({
    name: '', amount: '', billing_frequency: 'one_time', is_mandatory: false
  });

  const handleAddDiscount = () => {
    if (!newDiscount.name || !newDiscount.value) return;
    createDiscountMutation.mutate({
      ...newDiscount,
      value: parseFloat(newDiscount.value)
    });
    setNewDiscount({ name: '', type: 'percent', value: '', category: 'promo', apply_automatically: false });
  };

  const handleAddFee = () => {
    if (!newFee.name || !newFee.amount) return;
    createFeeMutation.mutate({
      ...newFee,
      amount: parseFloat(newFee.amount)
    });
    setNewFee({ name: '', amount: '', billing_frequency: 'one_time', is_mandatory: false });
  };

  // Render Setup Modes
  if (setupMode === 'ai') {
     return (
        <div className="py-8">
           <Button variant="ghost" onClick={() => setSetupMode(null)} className="mb-4">Back to Settings</Button>
           <TuitionAIImport onComplete={() => setSetupMode(null)} onCancel={() => setSetupMode(null)} />
        </div>
     );
  }

  if (setupMode === 'wizard') {
     return (
        <div className="py-8">
           <TuitionSetupWizard onComplete={() => setSetupMode(null)} onCancel={() => setSetupMode(null)} />
        </div>
     );
  }

  // If no settings exist and we are not in setup mode, show landing choice
  if (settings.length === 0 && !setupMode) {
     return (
       <div className="py-12 max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
             <h2 className="font-serif text-4xl text-[#333333]">Configure Your Studio</h2>
             <p className="text-xl text-gray-500 max-w-lg mx-auto">
                Sequins needs to understand your studio's identity and pricing. How would you like to start?
             </p>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                 whileHover={{ y: -5 }}
                 className="bg-white rounded-[32px] p-8 shadow-lg border border-gray-100 cursor-pointer group relative overflow-hidden"
                 onClick={() => setSetupMode('ai')}
              >
                 <div className="absolute top-0 right-0 bg-gradient-to-bl from-indigo-500 to-purple-600 w-32 h-32 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity" />
                 <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
                    <Sparkles className="w-8 h-8" />
                 </div>
                 <h3 className="font-serif text-2xl text-[#333333] mb-2">AI Import</h3>
                 <p className="text-gray-500 mb-6">Upload your existing tuition PDF or image. Our AI will parse your rates, discounts, and fees automatically.</p>
                 <div className="flex items-center text-indigo-600 font-medium">
                    Start Import <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                 </div>
              </motion.div>

              <motion.div 
                 whileHover={{ y: -5 }}
                 className="bg-white rounded-[32px] p-8 shadow-lg border border-gray-100 cursor-pointer group"
                 onClick={() => setSetupMode('wizard')}
              >
                 <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-700">
                    <PenTool className="w-8 h-8" />
                 </div>
                 <h3 className="font-serif text-2xl text-[#333333] mb-2">Manual Builder</h3>
                 <p className="text-gray-500 mb-6">Walk through our step-by-step wizard to define your pricing model, discounts, and studio fees.</p>
                 <div className="flex items-center text-gray-900 font-medium">
                   Start Builder <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                 </div>
                 </motion.div>
                 </div>
                 </div>
                 );
                 }

                 // Main Configuration Dashboard
                 return (
                 <div className="space-y-8">

                 {/* Setup Actions */}
                 <div className="flex justify-end gap-3 mb-4">
                 <Button variant="ghost" size="sm" className="text-gray-400 hover:text-[#333333] gap-2" onClick={() => setSetupMode('ai')}>
                 <Sparkles className="w-4 h-4" /> AI Re-Import
                 </Button>
                 <Button variant="ghost" size="sm" className="text-gray-400 hover:text-[#333333] gap-2" onClick={() => setSetupMode('wizard')}>
                 <RotateCcw className="w-4 h-4" /> Run Setup Wizard
                 </Button>
                 </div>

                 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                 <TabsList className="bg-white p-1 rounded-full border border-gray-100 inline-flex h-auto shadow-sm mb-6">
                 <TabsTrigger value="overview" className="rounded-full px-6 py-2.5 gap-2 data-[state=active]:bg-[#333333] data-[state=active]:text-white">
                 <Settings className="w-4 h-4" /> Config
                 </TabsTrigger>
                 <TabsTrigger value="discounts" className="rounded-full px-6 py-2.5 gap-2 data-[state=active]:bg-[#333333] data-[state=active]:text-white">
                 <Percent className="w-4 h-4" /> Discounts
                 </TabsTrigger>
                 <TabsTrigger value="fees" className="rounded-full px-6 py-2.5 gap-2 data-[state=active]:bg-[#333333] data-[state=active]:text-white">
                 <DollarSign className="w-4 h-4" /> Fees
                 </TabsTrigger>
                 </TabsList>

                 <TabsContent value="overview" className="space-y-6">
                 <Card className="rounded-[32px] border-none shadow-sm bg-white p-6">
                 <h3 className="font-serif text-xl mb-4">Pricing Architecture</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-gray-50 p-4 rounded-2xl">
                   <Label className="text-gray-500 text-xs uppercase tracking-wider font-bold">Pricing Model</Label>
                   <div className="text-lg font-medium capitalize mt-1">{studioSettings?.pricing_model?.replace('_', ' ') || 'Not set'}</div>
                 </div>
                 {studioSettings?.pricing_model === 'hourly' && (
                   <div className="bg-gray-50 p-4 rounded-2xl">
                       <Label className="text-gray-500 text-xs uppercase tracking-wider font-bold">Rate Tiers</Label>
                       <div className="text-sm mt-2 space-y-1">
                           {studioSettings?.hourly_rate_tiers?.map((tier, i) => (
                               <div key={i} className="flex justify-between">
                                   <span>{tier.hours} hrs</span>
                                   <span className="font-bold">${tier.rate}</span>
                               </div>
                           ))}
                       </div>
                   </div>
                 )}
                 </div>
                 </Card>
                 </TabsContent>

        <TabsContent value="discounts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create New Discount */}
            <Card className="rounded-[32px] border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="font-serif">Add Rule</CardTitle>
                <CardDescription>Create a new logic block</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input 
                    placeholder="e.g. Sibling Discount" 
                    value={newDiscount.name}
                    onChange={e => setNewDiscount({...newDiscount, name: e.target.value})}
                    className="bg-gray-50 border-none rounded-xl"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label>Value</Label>
                    <Input 
                      type="number" 
                      placeholder="10" 
                      value={newDiscount.value}
                      onChange={e => setNewDiscount({...newDiscount, value: e.target.value})}
                      className="bg-gray-50 border-none rounded-xl"
                    />
                  </div>
                  <div className="w-1/3 space-y-2">
                    <Label>Type</Label>
                    <Select value={newDiscount.type} onValueChange={v => setNewDiscount({...newDiscount, type: v})}>
                      <SelectTrigger className="bg-gray-50 border-none rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="fixed">$</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category Logic</Label>
                  <Select value={newDiscount.category} onValueChange={v => setNewDiscount({...newDiscount, category: v})}>
                    <SelectTrigger className="bg-gray-50 border-none rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sibling">Sibling (Multi-Student)</SelectItem>
                      <SelectItem value="multi_class">Multi-Class Bundle</SelectItem>
                      <SelectItem value="scholarship">Scholarship</SelectItem>
                      <SelectItem value="employee">Employee/Staff</SelectItem>
                      <SelectItem value="promo">Marketing Promo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <Label className="cursor-pointer" htmlFor="auto-apply">Auto-Apply?</Label>
                  <Switch 
                    id="auto-apply"
                    checked={newDiscount.apply_automatically}
                    onCheckedChange={c => setNewDiscount({...newDiscount, apply_automatically: c})}
                  />
                </div>
                <Button onClick={handleAddDiscount} className="w-full bg-[#333333] text-white rounded-xl hover:bg-black">
                  <Plus className="w-4 h-4 mr-2" /> Create Rule
                </Button>
              </CardContent>
            </Card>

            {/* List Discounts */}
            <div className="lg:col-span-2 space-y-4">
              {discounts.map((rule) => (
                <motion.div 
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${rule.type === 'percent' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}`}>
                      {rule.type === 'percent' ? <Percent className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#333333]">{rule.name}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-600 capitalize">
                          {rule.category.replace('_', ' ')}
                        </Badge>
                        {rule.apply_automatically && (
                          <Badge variant="outline" className="text-xs font-normal border-blue-200 text-blue-600 bg-blue-50">
                            Auto-Apply
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-serif text-[#333333]">
                        {rule.type === 'fixed' ? '$' : ''}{rule.value}{rule.type === 'percent' ? '%' : ''}
                      </div>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Discount</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteDiscountMutation.mutate(rule.id)}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              {discounts.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                  No discount rules configured.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Create New Fee */}
             <Card className="rounded-[32px] border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="font-serif">Add Fee</CardTitle>
                <CardDescription>Define standard charges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Fee Name</Label>
                  <Input 
                    placeholder="e.g. Registration Fee" 
                    value={newFee.name}
                    onChange={e => setNewFee({...newFee, name: e.target.value})}
                    className="bg-gray-50 border-none rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input 
                    type="number" 
                    placeholder="35.00" 
                    value={newFee.amount}
                    onChange={e => setNewFee({...newFee, amount: e.target.value})}
                    className="bg-gray-50 border-none rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={newFee.billing_frequency} onValueChange={v => setNewFee({...newFee, billing_frequency: v})}>
                    <SelectTrigger className="bg-gray-50 border-none rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One Time</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="per_session">Per Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <Label className="cursor-pointer" htmlFor="mandatory">Mandatory?</Label>
                  <Switch 
                    id="mandatory"
                    checked={newFee.is_mandatory}
                    onCheckedChange={c => setNewFee({...newFee, is_mandatory: c})}
                  />
                </div>
                <Button onClick={handleAddFee} className="w-full bg-[#333333] text-white rounded-xl hover:bg-black">
                  <Plus className="w-4 h-4 mr-2" /> Create Fee
                </Button>
              </CardContent>
            </Card>

            {/* List Fees */}
            <div className="lg:col-span-2 space-y-4">
              {fees.map((fee) => (
                <motion.div 
                  key={fee.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#333333]">{fee.name}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-600 capitalize">
                          {fee.billing_frequency.replace('_', ' ')}
                        </Badge>
                        {fee.is_mandatory && (
                          <Badge variant="outline" className="text-xs font-normal border-red-200 text-red-600 bg-red-50">
                            Mandatory
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-serif text-[#333333]">
                        ${fee.amount}
                      </div>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Fee</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteFeeMutation.mutate(fee.id)}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              {fees.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                  No fees configured.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}