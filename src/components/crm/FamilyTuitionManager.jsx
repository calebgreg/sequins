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
        <div 
            className="rounded-3xl overflow-hidden flex flex-col h-full"
            style={{
                background: 'linear-gradient(145deg, rgba(253,238,236,0.5) 0%, rgba(250,232,228,0.3) 50%, rgba(252,243,240,0.4) 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
            }}
        >
            {/* Header */}
            <div 
                className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                style={{ borderBottom: '1px solid rgba(200,180,170,0.2)' }}
            >
                <div className="flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                            boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                            color: '#c9a99c',
                        }}
                    >
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold" style={{ color: '#8b7d72' }}>Tuition Manager</h3>
                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#b5a599' }}>For {family.parent_name}</p>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-2 rounded-full text-xs"
                    style={{ background: 'rgba(255,255,255,0.6)', color: '#8b7d72' }}
                >
                    <Share2 className="w-3 h-3" /> Share Estimate
                </Button>
            </div>
            
            {/* Value Cards */}
            <div className="flex flex-col sm:flex-row gap-4 p-6" style={{ borderBottom: '1px solid rgba(200,180,170,0.2)' }}>
                <div 
                    className="flex-1 rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: 'rgba(126,184,154,0.1)', border: '1px solid rgba(126,184,154,0.2)' }}
                >
                    <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(126,184,154,0.2)', color: '#7eb89a' }}
                    >
                        <Percent className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-bold" style={{ color: '#7eb89a' }}>Family Savings</div>
                        <div className="font-bold text-lg" style={{ color: '#7eb89a' }}>${calculation.savings.toFixed(2)}</div>
                    </div>
                </div>
                <div 
                    className="flex-1 rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: 'rgba(164,139,196,0.1)', border: '1px solid rgba(164,139,196,0.2)' }}
                >
                    <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(164,139,196,0.2)', color: '#8b7d9a' }}
                    >
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-bold" style={{ color: '#8b7d9a' }}>Active Plan Value</div>
                        <div className="font-bold text-lg" style={{ color: '#8b7d9a' }}>${calculation.total.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Students Breakdown */}
                <div className="space-y-6">
                    {familyStudents.map(student => {
                        const studentLines = calculation.lines.filter(l => l.student_name === student.name && l.type === 'tuition');
                        const enrolledClasses = classes.filter(c => c.student_names?.includes(student.name));
                        
                        return (
                            <div key={student.id} className="relative">
                                {/* Connector Line */}
                                <div className="absolute left-4 top-8 bottom-0 w-0.5" style={{ background: 'rgba(200,180,170,0.2)' }} />
                                
                                <div className="flex items-center gap-2 mb-2">
                                    <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-4 z-10"
                                        style={{
                                            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                                            boxShadow: '0 2px 8px -2px rgba(180,150,140,0.1), inset 0 1px 1px rgba(255,255,255,0.8)',
                                            borderColor: '#f5f0eb',
                                            color: '#c9a99c',
                                        }}
                                    >
                                        {student.name.charAt(0)}
                                    </div>
                                    <span className="font-bold" style={{ color: '#8b7d72' }}>{student.name}</span>
                                </div>

                                <div 
                                    className="ml-10 rounded-2xl p-4 transition-transform hover:scale-[1.005]"
                                    style={{
                                        background: 'rgba(255,255,255,0.6)',
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                                        border: '1px solid rgba(200,180,170,0.2)',
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-sm font-medium" style={{ color: '#8b7d72' }}>
                                            {studentLines[0]?.description || 'Tuition'}
                                        </div>
                                        <div className="font-bold" style={{ color: '#8b7d72' }}>
                                            ${studentLines.reduce((sum, l) => sum + l.amount, 0).toFixed(2)}
                                        </div>
                                    </div>
                                    
                                    {/* Class/Details List */}
                                    <div className="text-xs space-y-1" style={{ color: '#a8998e' }}>
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

                <Separator style={{ background: 'rgba(200,180,170,0.2)' }} />

                {/* Adjustments Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#b5a599' }}>Adjustments</h4>
                        <div className="flex gap-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => addManualItem('fee')} 
                                className="h-7 text-xs rounded-lg"
                                style={{ color: '#c8aa9c', background: 'rgba(200,170,156,0.1)' }}
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Fee
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => addManualItem('discount')} 
                                className="h-7 text-xs rounded-lg"
                                style={{ color: '#7eb89a', background: 'rgba(126,184,154,0.1)' }}
                            >
                                <Tag className="w-3 h-3 mr-1" /> Add Discount
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Auto-Calculated Discounts */}
                        {calculation.lines.filter(l => l.type === 'discount' && !l.isManual).map((line, idx) => (
                            <div 
                                key={`auto-${idx}`} 
                                className="flex justify-between items-center p-3 rounded-xl text-sm"
                                style={{ background: 'rgba(126,184,154,0.1)', border: '1px solid rgba(126,184,154,0.2)' }}
                            >
                                <div className="flex items-center gap-2">
                                    <Tag className="w-3.5 h-3.5" style={{ color: '#7eb89a' }} />
                                    <span className="font-medium" style={{ color: '#7eb89a' }}>{line.description}</span>
                                    {line.student_name !== 'Family' && <span className="text-xs" style={{ color: '#a8998e' }}>({line.student_name})</span>}
                                </div>
                                <div className="font-bold" style={{ color: '#7eb89a' }}>
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
                                    <SelectTrigger 
                                        className="w-[110px] h-8 text-xs bg-white/60 rounded-lg"
                                        style={{ borderColor: 'rgba(200,180,170,0.3)', color: '#8b7d72' }}
                                    >
                                        <SelectValue placeholder="Student" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="Family">Family</SelectItem>
                                        {familyStudents.map(s => (
                                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input 
                                    value={item.description}
                                    onChange={e => updateManualItem(item.id, 'description', e.target.value)}
                                    className="h-8 text-sm flex-1 bg-white/60 rounded-lg"
                                    style={{ borderColor: 'rgba(200,180,170,0.3)', color: '#8b7d72' }}
                                    placeholder="Description"
                                />
                                <div className="relative w-20">
                                    <Input 
                                        type="number"
                                        value={item.amount}
                                        onChange={e => updateManualItem(item.id, 'amount', e.target.value)}
                                        className="h-8 text-sm pl-2 text-right bg-white/60 rounded-lg"
                                        style={{ 
                                            borderColor: 'rgba(200,180,170,0.3)', 
                                            color: item.type === 'discount' ? '#7eb89a' : '#8b7d72' 
                                        }}
                                    />
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 hover:bg-red-50/50"
                                    style={{ color: '#c8aa9c' }}
                                    onClick={() => removeManualItem(item.id)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        
                        {calculation.lines.filter(l => l.type === 'discount').length === 0 && manualItems.length === 0 && (
                            <div 
                                className="text-center py-6 text-xs border border-dashed rounded-xl"
                                style={{ borderColor: 'rgba(200,180,170,0.3)', color: '#b5a599' }}
                            >
                                No adjustments applied
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Total Footer */}
            <div 
                className="p-6 mt-auto"
                style={{ 
                    background: 'rgba(255,255,255,0.7)',
                    borderTop: '1px solid rgba(200,180,170,0.2)',
                }}
            >
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#b5a599' }}>Estimated Total</div>
                        <div className="text-3xl font-bold" style={{ color: '#8b7d72' }}>
                            ${calculation.total.toFixed(2)}
                        </div>
                    </div>
                    <Button 
                        onClick={() => saveAdjustmentsMutation.mutate()}
                        disabled={saveAdjustmentsMutation.isPending}
                        className="rounded-xl px-6 shadow-lg gap-2 font-bold transition-all hover:scale-[1.02]"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                            boxShadow: '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,0.8)',
                            color: '#8b7d72',
                        }}
                    >
                        {saveAdjustmentsMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Adjustments
                    </Button>
                </div>
                <div className="text-[10px] text-center flex items-center justify-center gap-2" style={{ color: '#b5a599' }}>
                    <Check className="w-3 h-3" /> Adjustments will apply when billing runs
                </div>
            </div>
        </div>
    );
}