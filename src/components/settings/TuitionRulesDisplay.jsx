import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit2, DollarSign, Percent, Tag, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';

const typeConfig = {
  base_pricing: { label: 'Base Pricing', color: 'bg-slate-100 text-slate-700', icon: DollarSign },
  class_exception: { label: 'Class Override', color: 'bg-purple-100 text-purple-700', icon: Tag },
  package: { label: 'Package', color: 'bg-blue-100 text-blue-700', icon: Package },
  discount: { label: 'Discount', color: 'bg-green-100 text-green-700', icon: Percent },
  fee: { label: 'Fee', color: 'bg-amber-100 text-amber-700', icon: DollarSign },
};

function formatRuleValue(rule) {
  const { type, value } = rule;
  
  if (type === 'base_pricing') {
    if (value.method === 'flat') return `$${value.amount} per class`;
    if (value.method === 'hourly') return `$${value.rate}/hour`;
    if (value.method === 'by_duration') {
      return value.rates?.map(r => `≤${r.maxMinutes}min: $${r.amount}`).join(', ') || 'Duration-based';
    }
  }
  
  if (type === 'class_exception') {
    return `$${value.amount || 0}`;
  }
  
  if (type === 'package') {
    return `$${value.amount || 0} package`;
  }
  
  if (type === 'discount') {
    const target = value.target === 'total' ? 'total' : value.target === 'least_expensive' ? 'cheapest class' : 'matching';
    return `${value.percent || 0}% off ${target}`;
  }
  
  if (type === 'fee') {
    const freq = value.frequency === 'annual' ? '/year' : value.frequency === 'monthly' ? '/month' : ' (one-time)';
    const per = value.per === 'family' ? 'per family' : value.per === 'student' ? 'per student' : 'per class';
    return `$${value.amount || 0}${freq} ${per}`;
  }
  
  return JSON.stringify(value);
}

function formatConditions(conditions) {
  if (!conditions || conditions.length === 0) return 'Always applies';
  
  return conditions.map(c => {
    const fieldLabels = {
      class_count: 'classes',
      class_name: 'class name',
      duration: 'duration',
      student_index: 'student #',
    };
    const field = fieldLabels[c.field] || c.field;
    return `${field} ${c.operator} ${c.value}`;
  }).join(' and ');
}

export default function TuitionRulesDisplay({ onEdit }) {
  const queryClient = useQueryClient();
  
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['tuitionRules'],
    queryFn: () => base44.entities.TuitionRule.list(),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }) => {
      await base44.entities.TuitionRule.update(id, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tuitionRules'] });
      toast.success('Rule updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.TuitionRule.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tuitionRules'] });
      toast.success('Rule deleted');
    },
  });

  const sortedRules = [...rules].sort((a, b) => {
    const typeOrder = { base_pricing: 0, class_exception: 1, package: 2, discount: 3, fee: 4 };
    return (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5);
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-[32px] p-8 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/3"></div>
          <div className="h-20 bg-gray-50 rounded-2xl"></div>
          <div className="h-20 bg-gray-50 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No tuition rules yet</h3>
        <p className="text-gray-500 mb-6">Set up your pricing structure to start calculating tuition.</p>
        <Button onClick={onEdit} className="rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" /> Create Rules
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-serif text-gray-900">Tuition Rules</h3>
          <p className="text-gray-500 mt-1">{rules.length} rule{rules.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Button onClick={onEdit} variant="outline" className="rounded-full gap-2">
          <Edit2 className="w-4 h-4" /> Edit Rules
        </Button>
      </div>

      <div className="space-y-3">
        {sortedRules.map((rule) => {
          const config = typeConfig[rule.type] || { label: rule.type, color: 'bg-gray-100 text-gray-700', icon: Tag };
          const Icon = config.icon;
          
          return (
            <div 
              key={rule.id} 
              className={`rounded-2xl p-4 border transition-all ${rule.active !== false ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color.split(' ')[0]}`}>
                  <Icon className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-gray-900">{rule.note || config.label}</span>
                    <Badge variant="secondary" className={`${config.color} text-xs`}>
                      {config.label}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-700 font-medium">{formatRuleValue(rule)}</p>
                  
                  {rule.conditions && rule.conditions.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      When: {formatConditions(rule.conditions)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={rule.active !== false}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, active: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-500 rounded-full"
                    onClick={() => {
                      if (confirm('Delete this rule?')) {
                        deleteMutation.mutate(rule.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}