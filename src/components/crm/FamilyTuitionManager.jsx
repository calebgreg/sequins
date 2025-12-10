import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    Calculator, Plus, Trash2, AlertCircle, Check, 
    DollarSign, Tag, Receipt, Save, RefreshCw, X,
    Crown, Percent, Share2, TrendingUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FamilyTuitionManager({ family }) {
    const queryClient = useQueryClient();
    const [manualItems, setManualItems] = useState([]); // [{ type: 'fee'|'discount', description, amount }]
    const [isPosting, setIsPosting] = useState(false);

    // Fetch necessary data
    const { data: students = [] } = useQuery({
        queryKey: ['students'],
        queryFn: () => base44.entities.Student.list(),
    });
    
    // Filter for this family
    const familyStudents = useMemo(() => 
        students.filter(s => s.parent_email === family.email), 
    [students, family.email]);

    const { data: classes = [] } = useQuery({
        queryKey: ['classes'],
        queryFn: () => base44.entities.DanceClass.list(),
    });

    const { data: settingsList = [] } = useQuery({
        queryKey: ['studio_settings'],
        queryFn: () => base44.entities.StudioSettings.list(),
    });
    const settings = settingsList[0] || { pricing_model: 'per_class' };

    const { data: discountRules = [] } = useQuery({
        queryKey: ['discount_rules'],
        queryFn: () => base44.entities.DiscountRule.list(),
    });

    const { data: tuitionPlans = [] } = useQuery({
        queryKey: ['tuition_plans'],
        queryFn: () => base44.entities.TuitionPlan.list(),
    });

    // Mutation to assign plan
    const updateStudentPlanMutation = useMutation({
        mutationFn: async ({ studentId, planId }) => {
            return base44.entities.Student.update(studentId, { tuition_plan_id: planId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['students']);
            toast.success("Tuition plan updated");
        }
    });

    // --- Calculation Logic ---
    const calculation = useMemo(() => {
        let lines = [];
        let subtotal = 0;
        let totalSavings = 0;
        let potentialRevenue = 0; // Track what it *would* be without discounts/plans

        // 1. Tuition per Student
        familyStudents.forEach(student => {
            const studentClasses = classes.filter(c => c.student_names?.includes(student.name));
            const activePlan = tuitionPlans.find(p => p.id === student.tuition_plan_id);
            
            let amount = 0;
            let standardCost = 0;
            let breakdown = [];
            let description = '';

            // Calculate Standard Cost (a la carte) first for comparison
            if (settings.pricing_model === 'hourly') {
                const totalHours = studentClasses.reduce((sum, c) => sum + (c.duration || 1), 0);
                standardCost = totalHours * 20; // Avg rate assumption for potential comparison
            } else {
                standardCost = studentClasses.reduce((sum, c) => sum + (c.tuition_cost || 0), 0);
            }
            if (standardCost === 0 && studentClasses.length > 0) standardCost = 0; // Keep accurate

            // Determine Actual Amount based on Plan vs Calculated
            if (activePlan) {
                amount = activePlan.amount;
                description = `${activePlan.name} (Membership)`;
                breakdown.push(`Includes ${activePlan.class_limit === 0 ? 'Unlimited' : activePlan.class_limit} classes`);
                
                // Value realized
                if (standardCost > amount) {
                    totalSavings += (standardCost - amount);
                }
            } else {
                // Calculated
                if (settings.pricing_model === 'hourly') {
                    const totalHours = studentClasses.reduce((sum, c) => sum + (c.duration || 1), 0);
                    const tiers = [...(settings.hourly_rate_tiers || [])].sort((a, b) => b.hours - a.hours);
                    const tier = tiers.find(t => totalHours >= t.hours) || tiers[tiers.length - 1];
                    amount = tier ? tier.rate : (totalHours * 15);
                    description = `Hourly Tuition (${totalHours} hrs)`;
                    breakdown.push(`${totalHours} hours enrolled`);
                } else {
                    amount = standardCost;
                    description = `Class Tuition (${studentClasses.length} classes)`;
                    studentClasses.forEach(c => breakdown.push(`${c.title}`));
                }
            }

            lines.push({
                type: 'tuition',
                student_name: student.name,
                description: description,
                details: breakdown.join(', '),
                amount: amount,
                standardCost: standardCost
            });
            subtotal += amount;
            potentialRevenue += Math.max(amount, standardCost);
        });

        // 2. Discounts (Only apply if NOT on a plan generally, or depending on studio rules. 
        // For now, let's assume sibling discount applies to the calculated total of 2nd student even if on plan? 
        // Usually plans exclude further discounts. Let's apply ONLY to non-plan students for safety or strictly 2nd student.)
        
        // Let's filter students eligible for discount (usually studios don't double dip plan + sibling discount, but let's be generous for logic)
        // Simplification: Apply sibling discount to the lowest amounts in the family regardless of plan source
        
        const siblingRule = discountRules.find(d => d.category === 'sibling' && d.active);
        if (siblingRule && familyStudents.length > 1) {
            const studentTuitions = lines.filter(l => l.type === 'tuition');
            studentTuitions.sort((a, b) => b.amount - a.amount);
            
            for (let i = 1; i < studentTuitions.length; i++) {
                const baseAmount = studentTuitions[i].amount;
                const discountAmount = siblingRule.type === 'percent' 
                    ? (baseAmount * (siblingRule.value / 100)) 
                    : siblingRule.value;
                
                if (discountAmount > 0) {
                    lines.push({
                        type: 'discount',
                        student_name: studentTuitions[i].student_name,
                        description: siblingRule.name,
                        amount: -discountAmount
                    });
                    subtotal -= discountAmount;
                    totalSavings += discountAmount;
                }
            }
        }

        // Auto-Apply Promos
        const promos = discountRules.filter(d => d.apply_automatically && d.category === 'promo' && d.active);
        promos.forEach(promo => {
            const discountAmount = promo.type === 'percent' 
                ? (subtotal * (promo.value / 100)) 
                : promo.value;
            
            lines.push({
                type: 'discount',
                student_name: 'Family',
                description: promo.name,
                amount: -discountAmount
            });
            subtotal -= discountAmount;
            totalSavings += discountAmount;
        });

        // 3. Manual Items
        manualItems.forEach(item => {
            const val = parseFloat(item.amount) || 0;
            const signedAmount = item.type === 'discount' ? -Math.abs(val) : Math.abs(val);
            lines.push({
                type: item.type,
                student_name: item.student_name || 'Family',
                description: item.description,
                amount: signedAmount,
                isManual: true,
                id: item.id
            });
            subtotal += signedAmount;
            if (item.type === 'discount') totalSavings += Math.abs(val);
        });

        return { lines, total: subtotal, savings: totalSavings, potential: potentialRevenue };
    }, [familyStudents, classes, settings, discountRules, manualItems, tuitionPlans]);


    // Handlers
    const addManualItem = (type) => {
        setManualItems(prev => [...prev, {
            id: Date.now(),
            type,
            description: type === 'fee' ? 'New Fee' : 'Custom Discount',
            amount: 0,
            student_name: familyStudents[0]?.name || ''
        }]);
    };

    const updateManualItem = (id, field, value) => {
        setManualItems(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const removeManualItem = (id) => {
        setManualItems(prev => prev.filter(item => item.id !== id));
    };

    const postInvoiceMutation = useMutation({
        mutationFn: async () => {
            return base44.entities.Invoice.create({
                parent_email: family.email,
                parent_name: family.parent_name,
                title: `Tuition - ${format(new Date(), 'MMMM yyyy')}`,
                issue_date: new Date().toISOString().split('T')[0],
                due_date: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                status: 'sent',
                items: calculation.lines.map(l => ({
                    description: l.description,
                    amount: l.amount,
                    student_name: l.student_name
                })),
                subtotal: calculation.total,
                total_amount: calculation.total,
                balance_due: calculation.total,
                notes: 'Generated via Tuition Manager'
            });
        },
        onSuccess: () => {
            toast.success("Invoice created successfully");
            setManualItems([]);
            queryClient.invalidateQueries(['invoices']);
        }
    });

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Header with Profitability Stats */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-serif text-[#333333] flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-gray-400" />
                            Tuition Manager
                        </h3>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full text-xs">
                        <Share2 className="w-3 h-3" /> Share Estimate
                    </Button>
                </div>
                
                {/* Value Cards */}
                <div className="flex gap-4">
                    <div className="flex-1 bg-green-50 rounded-2xl p-3 border border-green-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <Percent className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-green-600/60">Family Savings</div>
                            <div className="font-bold text-green-700">${calculation.savings.toFixed(2)}</div>
                        </div>
                    </div>
                    <div className="flex-1 bg-indigo-50 rounded-2xl p-3 border border-indigo-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-indigo-600/60">Active Plan Value</div>
                            <div className="font-bold text-indigo-700">${calculation.total.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Students Breakdown & Plan Selection */}
                <div className="space-y-6">
                    {familyStudents.map(student => {
                        const studentLines = calculation.lines.filter(l => l.student_name === student.name && l.type === 'tuition');
                        const enrolledClasses = classes.filter(c => c.student_names?.includes(student.name));
                        const currentPlan = tuitionPlans.find(p => p.id === student.tuition_plan_id);
                        
                        return (
                            <div key={student.id} className="relative">
                                {/* Connector Line */}
                                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-100 -z-10" />
                                
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#333333] text-white flex items-center justify-center font-serif text-sm border-4 border-white shadow-sm z-10">
                                            {student.name.charAt(0)}
                                        </div>
                                        <span className="font-bold text-[#333333]">{student.name}</span>
                                    </div>
                                    <Select 
                                        value={student.tuition_plan_id || 'none'} 
                                        onValueChange={(val) => updateStudentPlanMutation.mutate({ 
                                            studentId: student.id, 
                                            planId: val === 'none' ? null : val 
                                        })}
                                    >
                                        <SelectTrigger className="h-7 text-xs border-gray-200 bg-white w-[140px] rounded-lg">
                                            <SelectValue placeholder="Select Plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Calculated (Default)</SelectItem>
                                            {tuitionPlans.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    <div className="flex items-center gap-2">
                                                        {p.name} <Badge variant="secondary" className="text-[10px] h-4 px-1">${p.amount}</Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="ml-10 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm group hover:border-indigo-200 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-sm font-medium text-gray-700">
                                            {currentPlan ? (
                                                <div className="flex items-center gap-2 text-indigo-600">
                                                    <Crown className="w-3 h-3" />
                                                    {currentPlan.name}
                                                </div>
                                            ) : (
                                                <span>Standard Calculation</span>
                                            )}
                                        </div>
                                        <div className="font-bold text-[#333333]">
                                            ${studentLines.reduce((sum, l) => sum + l.amount, 0).toFixed(2)}
                                        </div>
                                    </div>
                                    
                                    {/* Class/Details List */}
                                    <div className="text-xs text-gray-400 space-y-1">
                                        {enrolledClasses.length > 0 ? (
                                            enrolledClasses.map(cls => (
                                                <div key={cls.id} className="flex justify-between">
                                                    <span>{cls.title}</span>
                                                    <span className={currentPlan ? "line-through opacity-50" : ""}>
                                                        ${(cls.tuition_cost || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="italic">No active classes</div>
                                        )}
                                        {currentPlan && enrolledClasses.length > 0 && (
                                            <div className="pt-2 mt-2 border-t border-gray-50 text-green-600 flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Covered by membership
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <Separator className="bg-gray-100" />

                {/* Adjustments Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Discounts & Fees</h4>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => addManualItem('fee')} className="text-indigo-600 hover:bg-indigo-50 h-7 text-xs rounded-lg">
                                <Plus className="w-3 h-3 mr-1" /> Add Fee
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => addManualItem('discount')} className="text-green-600 hover:bg-green-50 h-7 text-xs rounded-lg">
                                <Tag className="w-3 h-3 mr-1" /> Add Discount
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Auto-Calculated Discounts */}
                        {calculation.lines.filter(l => l.type === 'discount' && !l.isManual).map((line, idx) => (
                            <div key={`auto-${idx}`} className="flex justify-between items-center p-3 bg-green-50/30 rounded-xl border border-green-100/50 text-sm">
                                <div className="flex items-center gap-2">
                                    <Tag className="w-3.5 h-3.5 text-green-500" />
                                    <span className="text-green-900 font-medium">{line.description}</span>
                                    {line.student_name !== 'Family' && <span className="text-xs text-green-600/70">({line.student_name})</span>}
                                </div>
                                <div className="font-bold text-green-700">
                                    -${Math.abs(line.amount).toFixed(2)}
                                </div>
                            </div>
                        ))}

                        {/* Manual Items */}
                        {manualItems.map((item) => (
                            <div key={item.id} className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1">
                                <Select 
                                    value={item.student_name}
                                    onValueChange={v => updateManualItem(item.id, 'student_name', v)}
                                >
                                    <SelectTrigger className="w-[110px] h-8 text-xs bg-gray-50 border-transparent">
                                        <SelectValue placeholder="Student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Family">Family</SelectItem>
                                        {familyStudents.map(s => (
                                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input 
                                    value={item.description}
                                    onChange={e => updateManualItem(item.id, 'description', e.target.value)}
                                    className="h-8 text-sm flex-1 bg-gray-50 border-transparent"
                                    placeholder="Description"
                                />
                                <div className="relative w-20">
                                    <Input 
                                        type="number"
                                        value={item.amount}
                                        onChange={e => updateManualItem(item.id, 'amount', e.target.value)}
                                        className={`h-8 text-sm pl-2 text-right bg-gray-50 border-transparent ${item.type === 'discount' ? 'text-green-600' : 'text-[#333333]'}`}
                                    />
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                                    onClick={() => removeManualItem(item.id)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        
                        {calculation.lines.filter(l => l.type === 'discount').length === 0 && manualItems.length === 0 && (
                            <div className="text-center py-6 text-xs text-gray-300 border border-dashed border-gray-100 rounded-xl">
                                No adjustments applied
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Total Footer */}
            <div className="p-6 bg-[#333333] text-white mt-auto">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Final Total</div>
                        <div className="text-3xl font-serif text-white">
                            ${calculation.total.toFixed(2)}
                        </div>
                    </div>
                    <Button 
                        onClick={() => postInvoiceMutation.mutate()}
                        disabled={postInvoiceMutation.isPending}
                        className="bg-white text-[#333333] hover:bg-gray-100 rounded-xl px-6 shadow-lg gap-2 font-bold"
                    >
                        {postInvoiceMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                        Post Invoice
                    </Button>
                </div>
                <div className="text-[10px] text-white/30 text-center flex items-center justify-center gap-2">
                    <Check className="w-3 h-3" /> Ready to send to {family.email}
                </div>
            </div>
        </div>
    );
}