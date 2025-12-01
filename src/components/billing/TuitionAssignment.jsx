import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, Calculator } from 'lucide-react';

export default function TuitionAssignment() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('all');

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['tuition_plans'],
    queryFn: () => base44.entities.TuitionPlan.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['studio_settings'],
    queryFn: () => base44.entities.StudioSettings.list(),
  });

  const settings = settingsList[0] || { pricing_model: 'per_class', hourly_rate_tiers: [] };

  // Assign plan to specific student
  const assignMutation = useMutation({
    mutationFn: async ({ studentId, planId }) => {
      return base44.entities.Student.update(studentId, { tuition_plan_id: planId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });

  // Helper to calculate estimated tuition for unassigned students
  const getEstimatedTuition = (student) => {
      const studentClasses = classes.filter(c => c.student_names?.includes(student.name));
      
      if (settings.pricing_model === 'hourly') {
          const hours = studentClasses.reduce((sum, c) => sum + (c.duration || 1), 0);
          const tiers = [...(settings.hourly_rate_tiers || [])].sort((a, b) => b.hours - a.hours);
          const tier = tiers.find(t => hours >= t.hours) || tiers[tiers.length - 1];
          const rate = tier ? tier.rate : (hours * 15);
          return { amount: rate, details: `${hours} hrs` };
      } else {
          const cost = studentClasses.reduce((sum, c) => sum + (c.tuition_cost || 0), 0);
          return { amount: cost, details: `${studentClasses.length} classes` };
      }
  };

  const filteredStudents = useMemo(() => {
    if (selectedPlanId === 'all') return students;
    if (selectedPlanId === 'unassigned') return students.filter(s => !s.tuition_plan_id);
    return students.filter(s => s.tuition_plan_id === selectedPlanId);
  }, [students, selectedPlanId]);

  const stats = useMemo(() => {
    const s = { total: students.length, unassigned: 0 };
    plans.forEach(p => s[p.id] = 0);
    students.forEach(stu => {
       if (!stu.tuition_plan_id) s.unassigned++;
       else if (s[stu.tuition_plan_id] !== undefined) s[stu.tuition_plan_id]++;
    });
    return s;
  }, [students, plans]);

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
             <div>
                <h2 className="font-serif text-2xl text-[#333333]">Student Billing</h2>
                <p className="text-gray-400 text-sm">
                    Managing billing via <strong className="text-gray-600 capitalize">{settings.pricing_model.replace('_', ' ')}</strong> model.
                </p>
             </div>
             <div className="flex gap-2">
                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                   {students.length} Active Students
                </Badge>
             </div>
          </div>

          <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
             <Button 
                variant={selectedPlanId === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedPlanId('all')}
                className="rounded-full whitespace-nowrap"
             >
                All Students
             </Button>
             <Button 
                variant={selectedPlanId === 'unassigned' ? 'default' : 'outline'}
                onClick={() => setSelectedPlanId('unassigned')}
                className="rounded-full whitespace-nowrap border-dashed border-gray-300"
             >
                Calculated (No Plan)
             </Button>
             {plans.map(p => (
                <Button
                   key={p.id}
                   variant={selectedPlanId === p.id ? 'default' : 'outline'}
                   onClick={() => setSelectedPlanId(p.id)}
                   className="rounded-full whitespace-nowrap"
                >
                   {p.name} ({stats[p.id]})
                </Button>
             ))}
          </div>

          <div className="bg-[#F4F4F6] rounded-[24px] p-1 overflow-hidden">
             <div className="max-h-[500px] overflow-y-auto p-2 space-y-2">
                {filteredStudents.map(student => {
                   const isUnassigned = !student.tuition_plan_id;
                   const estimate = isUnassigned ? getEstimatedTuition(student) : null;
                   
                   return (
                   <div key={student.id} className="bg-white p-4 rounded-xl flex items-center justify-between shadow-sm group">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-[#333333] text-white flex items-center justify-center font-serif">
                            {student.name.charAt(0)}
                         </div>
                         <div>
                            <div className="font-medium text-[#333333]">{student.name}</div>
                            <div className="text-xs text-gray-400 capitalize">{student.level} • {student.status}</div>
                         </div>
                      </div>

                      {isUnassigned && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                             <Calculator className="w-3 h-3" />
                             <span>Est: ${estimate.amount} ({estimate.details})</span>
                          </div>
                      )}
                      
                      <div className="w-64">
                         <Select 
                           value={student.tuition_plan_id || "unassigned"} 
                           onValueChange={(val) => assignMutation.mutate({ studentId: student.id, planId: val === "unassigned" ? null : val })}
                         >
                           <SelectTrigger className={`rounded-lg border-transparent bg-gray-50 focus:bg-white transition-colors ${!student.tuition_plan_id ? 'text-gray-500' : 'text-[#333333]'}`}>
                              <SelectValue placeholder="Select Override Plan" />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="unassigned">Use {settings.pricing_model === 'hourly' ? 'Hourly Rate' : 'Class Pricing'}</SelectItem>
                              {plans.map(p => (
                                 <SelectItem key={p.id} value={p.id}>
                                    {p.name} - ${p.amount}/{p.billing_frequency.charAt(0)}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                         </Select>
                      </div>
                   </div>
                )})}
                {filteredStudents.length === 0 && (
                   <div className="p-12 text-center text-gray-400">No students found.</div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}