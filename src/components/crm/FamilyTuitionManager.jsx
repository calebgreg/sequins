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
import { calculateTuition } from '../billing/TuitionBillingWizard';

export default function FamilyTuitionManager({ family }) {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    
    // Initialize manual items from family's saved billing_adjustments
    const [manualItems, setManualItems] = useState(() => {
        return (family?.billing_adjustments || []).map(adj => ({
            id: adj.id || Date.now(),
            type: adj.type,
            description: adj.description,
            amount: Math.abs(adj.amount),
            student_name: adj.student_name || 'Family'
        }));
    });

    // Fetch necessary data
    const { data: students = [] } = useQuery({
        queryKey: ['students'],
        queryFn: () => base44.entities.Student.list(),
    });
    
    const familyStudents = useMemo(() => 
        students.filter(s => s.parent_email === family.email), 
    [students, family.email]);

    const { data: classes = [] } = useQuery({
        queryKey: ['classes'],
        queryFn: () => base44.entities.DanceClass.list(),
    });

    // NEW: Fetch TuitionRules (the real billing engine)
    const { data: tuitionRules = [] } = useQuery({
        queryKey: ['tuition_rules'],
        queryFn: () => base44.entities.TuitionRule.list(),
    });



    // --- Calculation Logic using calculateTuition (same as BillingUI) ---
    const calculation = useMemo(() => {
        let lines = [];
        let subtotal = 0;
        let totalSavings = 0;
        let potentialRevenue = 0;

        // Convert rules to the format calculateTuition expects (same as BillingUI)
        const rulesForCalc = tuitionRules.filter(r => r.active !== false).map(r => ({
            ...r,
            condition: r.conditions?.length > 0 ? { type: 'and', conditions: r.conditions.map(c => ({
                type: c.field,
                op: c.operator,
                value: c.field === 'class_count' || c.field === 'duration' || c.field === 'student_index' ? Number(c.value) : c.value,
                contains: c.value,
                equals: c.value,
                has: c.value,
            })) } : { type: 'always' },
        }));

        // Calculate per student using the same engine as BillingUI
        familyStudents.forEach((student, idx) => {
            const studentClasses = classes.filter(c => c.student_names?.includes(student.name));
            
            if (studentClasses.length === 0) return;

            // Build input for calculateTuition
            const input = {
                student: {
                    name: student.name,
                    indexInFamily: idx + 1,
                    gender: student.gender,
                },
                family: {
                    tags: student.tags || [],
                },
                classes: studentClasses.map(c => ({
                    className: c.title,
                    duration: (c.duration || 1) * 60,
                    category: c.style,
                })),
            };

            if (rulesForCalc.length > 0) {
                const result = calculateTuition(input, rulesForCalc);
                
                // Add class line items
                result.classes.forEach(cls => {
                    lines.push({
                        type: 'tuition',
                        student_name: student.name,
                        description: cls.description,
                        amount: cls.amount,
                        standardCost: cls.amount
                    });
                    subtotal += cls.amount;
                    potentialRevenue += cls.amount;
                });

                // Add discounts from the engine
                result.discounts.forEach(d => {
                    lines.push({
                        type: 'discount',
                        student_name: student.name,
                        description: d.description,
                        amount: d.amount
                    });
                    subtotal += d.amount; // d.amount is already negative
                    totalSavings += Math.abs(d.amount);
                });

                // Add fees from the engine
                result.fees.forEach(f => {
                    lines.push({
                        type: 'fee',
                        student_name: student.name,
                        description: f.description,
                        amount: f.amount
                    });
                    subtotal += f.amount;
                });
            }
        });

        // Add Manual Items
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
    }, [familyStudents, classes, tuitionRules, manualItems]);


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

    // Save adjustments to Family entity (not post invoice)
    const saveAdjustmentsMutation = useMutation({
        mutationFn: async () => {
            const adjustments = manualItems.map(item => ({
                id: String(item.id),
                type: item.type,
                description: item.description,
                amount: item.type === 'discount' ? -Math.abs(parseFloat(item.amount) || 0) : Math.abs(parseFloat(item.amount) || 0),
                student_name: item.student_name || 'Family',
                created_date: new Date().toISOString().split('T')[0]
            }));
            
            return base44.entities.Family.update(family.id, {
                billing_adjustments: adjustments
            });
        },
        onSuccess: () => {
            toast.success("Adjustments saved — will apply when billing runs");
            queryClient.invalidateQueries(['families']);
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
                        
                        return (
                            <div key={student.id} className="relative">
                                {/* Connector Line */}
                                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-100 -z-10" />
                                
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-[#333333] text-white flex items-center justify-center font-serif text-sm border-4 border-white shadow-sm z-10">
                                        {student.name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-[#333333]">{student.name}</span>
                                </div>

                                <div className="ml-10 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm group hover:border-indigo-200 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-sm font-medium text-gray-700">
                                            {studentLines[0]?.description || 'Tuition'}
                                        </div>
                                        <div className="font-bold text-[#333333]">
                                            ${studentLines.reduce((sum, l) => sum + l.amount, 0).toFixed(2)}
                                        </div>
                                    </div>
                                    
                                    {/* Class/Details List - uses TuitionRules rates */}
                                    <div className="text-xs text-gray-400 space-y-1">
                                        {studentLines.length > 0 ? (
                                            studentLines.map((line, idx) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span>{line.description}</span>
                                                    <span>${line.amount.toFixed(2)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="italic">No active classes</div>
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