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
  Layers 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from 'framer-motion';

export default function TuitionConfiguration() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('discounts');

  const { data: discounts = [] } = useQuery({
    queryKey: ['discount_rules'],
    queryFn: () => base44.entities.DiscountRule.list(),
  });

  const { data: fees = [] } = useQuery({
    queryKey: ['fee_types'],
    queryFn: () => base44.entities.FeeType.list(),
  });

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

  return (
    <div className="space-y-8">
      <div className="bg-[#333333] text-white p-8 rounded-[32px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="font-serif text-3xl mb-2">Tuition Architecture</h2>
            <p className="text-white/60">Configure the rules engine for automated billing.</p>
          </div>
          <Settings className="w-12 h-12 text-white/20" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-1 rounded-full border border-gray-100 inline-flex h-auto shadow-sm mb-6">
          <TabsTrigger value="discounts" className="rounded-full px-6 py-2.5 gap-2 data-[state=active]:bg-[#333333] data-[state=active]:text-white">
            <Percent className="w-4 h-4" /> Discount Rules
          </TabsTrigger>
          <TabsTrigger value="fees" className="rounded-full px-6 py-2.5 gap-2 data-[state=active]:bg-[#333333] data-[state=active]:text-white">
            <DollarSign className="w-4 h-4" /> Fee Structure
          </TabsTrigger>
        </TabsList>

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