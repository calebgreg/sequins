import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================
// SEQUINS TUITION BILLING - COMPLETE
// ============================================

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  warm: '#f5f3ef',
  accent: '#e85d04',
  muted: '#8a8478',
  border: '#e8e6e1',
  success: '#2d6a4f',
};

// ============================================
// CALCULATION ENGINE
// ============================================

function compare(a, op, b) {
  switch (op) {
    case '>': return a > b;
    case '>=': return a >= b;
    case '<': return a < b;
    case '<=': return a <= b;
    case '=': return a === b;
    default: return false;
  }
}

function evaluateCondition(condition, ctx) {
  if (!condition || condition.type === 'always') return true;

  switch (condition.type) {
    case 'class_count':
      return compare(ctx.classes.length, condition.op, condition.value);
    case 'duration':
      if (!ctx.currentClass) return false;
      return compare(ctx.currentClass.duration, condition.op, condition.value);
    case 'all_durations':
      return ctx.classes.every((c) => compare(c.duration, condition.op, condition.value));
    case 'any_duration':
      return ctx.classes.some((c) => compare(c.duration, condition.op, condition.value));
    case 'class_name':
      if (ctx.currentClass) return ctx.currentClass.className.toLowerCase().includes(condition.contains.toLowerCase());
      return ctx.classes.some((c) => c.className.toLowerCase().includes(condition.contains.toLowerCase()));
    case 'class_category':
      if (ctx.currentClass) return ctx.currentClass.category?.toLowerCase() === condition.equals.toLowerCase();
      return ctx.classes.some((c) => c.category?.toLowerCase() === condition.equals.toLowerCase());
    case 'student_index':
      return compare(ctx.student.indexInFamily, condition.op, condition.value);
    case 'family_tag':
      return ctx.family.tags?.includes(condition.has) || false;
    case 'gender':
      return ctx.student.gender === condition.equals;
    case 'and':
      return condition.conditions.every(c => evaluateCondition(c, ctx));
    case 'or':
      return condition.conditions.some(c => evaluateCondition(c, ctx));
    default:
      return false;
  }
}

export function calculateTuition(input, rules) {
  const trace = [];
  const ctx = { student: input.student, family: input.family, classes: input.classes, currentClass: null };

  trace.push(`Calculating for ${input.student.name}`);
  trace.push(`Classes: ${input.classes.map(c => `${c.className} (${c.duration}min)`).join(', ')}`);

  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const basePricingRule = sortedRules.find(r => r.type === 'base_pricing');
  const classExceptions = sortedRules.filter(r => r.type === 'class_exception');

  const classLineItems = [];
  for (const cls of input.classes) {
    ctx.currentClass = cls;
    let price = 0;
    let exceptionApplied = false;

    for (const rule of classExceptions) {
      if (evaluateCondition(rule.condition, ctx) && rule.value.method === 'override_price') {
        price = rule.value.amount;
        exceptionApplied = true;
        trace.push(`✓ ${cls.className}: $${price} (${rule.note})`);
        break;
      }
    }

    if (!exceptionApplied && basePricingRule) {
      const val = basePricingRule.value;
      if (val.method === 'flat') {
        price = val.amount;
        trace.push(`✓ ${cls.className}: $${price} (base rate)`);
      } else if (val.method === 'by_duration') {
        const rates = [...val.rates].sort((a, b) => a.maxMinutes - b.maxMinutes);
        for (const tier of rates) {
          if (cls.duration <= tier.maxMinutes) {
            price = tier.amount;
            trace.push(`✓ ${cls.className}: $${price} (${cls.duration}min tier)`);
            break;
          }
        }
      } else if (val.method === 'hourly') {
        price = (cls.duration / 60) * val.rate;
        trace.push(`✓ ${cls.className}: $${price.toFixed(2)} (hourly)`);
      }
    }

    classLineItems.push({ description: `${cls.className} (${cls.duration}min)`, amount: price });
  }
  ctx.currentClass = null;

  const classSubtotal = classLineItems.reduce((sum, li) => sum + li.amount, 0);
  trace.push(`Subtotal: $${classSubtotal}`);

  const packages = [];
  let usePackage = false;
  let packageTotal = 0;

  for (const rule of sortedRules.filter(r => r.type === 'package')) {
    if (evaluateCondition(rule.condition, ctx) && rule.value.method === 'package_price') {
      usePackage = true;
      packageTotal = rule.value.amount;
      packages.push({ description: rule.note || 'Package', amount: packageTotal });
      trace.push(`✓ Package: $${packageTotal}`);
      break;
    }
  }

  const tuitionSubtotal = usePackage ? packageTotal : classSubtotal;

  const discounts = [];
  const discounted = new Array(classLineItems.length).fill(false);

  if (!usePackage) {
    for (const rule of sortedRules.filter(r => r.type === 'discount')) {
      if (!evaluateCondition(rule.condition, ctx)) continue;
      const val = rule.value;
      let amt = 0;

      if (val.target === 'total') {
        amt = val.method === 'percent_off' ? tuitionSubtotal * (val.percent / 100) : val.amount || 0;
      } else if (val.target === 'least_expensive') {
        const sorted = classLineItems.map((li, i) => ({ li, i })).filter(({ i }) => !discounted[i]).sort((a, b) => a.li.amount - b.li.amount);
        if (sorted.length > 0) {
          const { li, i } = sorted[0];
          amt = val.method === 'percent_off' ? li.amount * (val.percent / 100) : val.method === 'free' ? li.amount : val.amount || 0;
          discounted[i] = true;
        }
      } else if (val.target === 'matching_classes') {
        for (let i = 0; i < classLineItems.length; i++) {
          if (discounted[i]) continue;
          ctx.currentClass = input.classes[i];
          if (evaluateCondition(rule.condition, ctx) && val.method === 'free') {
            amt += classLineItems[i].amount;
            discounted[i] = true;
          }
        }
        ctx.currentClass = null;
      }

      if (amt > 0) {
        discounts.push({ description: rule.note || 'Discount', amount: -amt });
        trace.push(`✓ Discount: -$${amt.toFixed(2)}`);
      }
    }
  }

  const fees = [];
  for (const rule of sortedRules.filter(r => r.type === 'fee')) {
    if (!evaluateCondition(rule.condition, ctx)) continue;
    const val = rule.value;
    let amt = val.method === 'fee_tiered' 
      ? (input.student.indexInFamily === 1 ? val.first : val.additional) 
      : val.amount;
    if (val.frequency === 'annual') amt /= 12;
    if (val.per === 'class') amt *= input.classes.length;
    if (val.frequency === 'once') continue;
    fees.push({ description: val.name, amount: amt });
    trace.push(`✓ Fee: ${val.name} $${amt.toFixed(2)}/mo`);
  }

  const total = tuitionSubtotal + discounts.reduce((s, d) => s + d.amount, 0) + fees.reduce((s, f) => s + f.amount, 0);
  trace.push(`─────────────`);
  trace.push(`Total: $${total.toFixed(2)}`);

  return { student: input.student.name, classes: classLineItems, classSubtotal, packages, discounts, fees, total, trace };
}

// ============================================
// WIZARD: CONDITION OPTIONS
// ============================================

const conditionFields = [
  { id: 'class_count', label: 'Number of classes', type: 'number' },
  { id: 'class_name', label: 'Class name contains', type: 'text' },
  { id: 'class_category', label: 'Class category', type: 'text' },
  { id: 'duration', label: 'Class duration', type: 'number', suffix: 'min' },
  { id: 'all_durations', label: 'All class durations', type: 'number', suffix: 'min' },
  { id: 'student_index', label: 'Student # in family', type: 'number' },
  { id: 'gender', label: 'Gender', type: 'select', options: ['male', 'female'] },
  { id: 'family_name', label: 'Family name', type: 'text' },
  { id: 'family_tag', label: 'Family has tag', type: 'text' },
];

const operators = {
  number: [
    { id: '=', label: 'is' },
    { id: '>=', label: '≥' },
    { id: '>', label: '>' },
    { id: '<=', label: '≤' },
    { id: '<', label: '<' },
  ],
  text: [
    { id: 'contains', label: 'contains' },
    { id: 'equals', label: 'is' },
  ],
  select: [{ id: '=', label: 'is' }],
};

// ============================================
// WIZARD: UI COMPONENTS
// ============================================

const PillSelector = ({ options, value, onChange, size = 'md' }) => (
  <div className="inline-flex rounded-full p-1" style={{ backgroundColor: colors.warm }}>
    {options.map((opt) => (
      <button
        key={opt.id}
        onClick={() => onChange(opt.id)}
        className={`relative rounded-full font-medium transition-all duration-200 ${size === 'sm' ? 'px-4 py-1.5 text-sm' : 'px-5 py-2'}`}
        style={{ backgroundColor: value === opt.id ? colors.ink : 'transparent', color: value === opt.id ? colors.paper : colors.muted }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const StyledInput = ({ value, onChange, prefix, suffix, type = 'text', wide = false }) => (
  <div className={`relative inline-flex items-center ${wide ? 'w-full' : ''}`}>
    {prefix && <span className="absolute left-4 text-lg font-medium" style={{ color: colors.muted }}>{prefix}</span>}
    <input
      type="text"
      inputMode={type === 'number' ? 'numeric' : undefined}
      value={value}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 : e.target.value)}
      className={`${wide ? 'w-full' : 'w-28'} ${prefix ? 'pl-9' : 'pl-4'} ${suffix ? 'pr-14' : 'pr-4'} py-3.5 text-lg font-medium rounded-2xl border-2 transition-all duration-200 focus:outline-none`}
      style={{ backgroundColor: colors.paper, borderColor: colors.border, color: colors.ink }}
      onFocus={(e) => e.target.style.borderColor = colors.ink}
      onBlur={(e) => e.target.style.borderColor = colors.border}
    />
    {suffix && <span className="absolute right-4 text-sm font-medium" style={{ color: colors.muted }}>{suffix}</span>}
  </div>
);

const ConditionPill = ({ condition, onUpdate, onRemove }) => {
  const field = conditionFields.find(f => f.id === condition.field);
  const fieldType = field?.type || 'text';
  const availableOperators = operators[fieldType] || operators.text;
  
  const [fieldOpen, setFieldOpen] = useState(false);
  const [opOpen, setOpOpen] = useState(false);
  const [valueOpen, setValueOpen] = useState(false);

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full" style={{ backgroundColor: colors.warm }}>
      <div className="relative">
        <button onClick={() => setFieldOpen(!fieldOpen)} className="px-3 py-1 rounded-full font-medium text-sm transition-colors hover:bg-white/50" style={{ color: colors.ink }}>
          {field?.label || condition.field}
        </button>
        {fieldOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setFieldOpen(false)} />
            <div className="absolute top-full left-0 mt-1 py-1 rounded-xl shadow-lg z-20 min-w-[180px]" style={{ backgroundColor: '#fff', border: `1px solid ${colors.border}` }}>
              {conditionFields.map(f => (
                <button key={f.id} onClick={() => { onUpdate({ field: f.id, value: '' }); setFieldOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors" style={{ color: condition.field === f.id ? colors.accent : colors.ink }}>
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      
      <div className="relative">
        <button onClick={() => setOpOpen(!opOpen)} className="px-2 py-1 rounded-full text-sm font-medium transition-colors hover:bg-white/50" style={{ color: colors.accent }}>
          {availableOperators.find(o => o.id === condition.operator)?.label || condition.operator}
        </button>
        {opOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpOpen(false)} />
            <div className="absolute top-full left-0 mt-1 py-1 rounded-xl shadow-lg z-20 min-w-[80px]" style={{ backgroundColor: '#fff', border: `1px solid ${colors.border}` }}>
              {availableOperators.map(op => (
                <button key={op.id} onClick={() => { onUpdate({ operator: op.id }); setOpOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors" style={{ color: condition.operator === op.id ? colors.accent : colors.ink }}>
                  {op.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {fieldType === 'select' ? (
        <div className="relative">
          <button onClick={() => setValueOpen(!valueOpen)} className="px-3 py-1 rounded-full font-medium text-sm transition-colors hover:bg-white/50" style={{ color: condition.value ? colors.ink : colors.muted }}>
            {condition.value || '...'}
          </button>
          {valueOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setValueOpen(false)} />
              <div className="absolute top-full left-0 mt-1 py-1 rounded-xl shadow-lg z-20 min-w-[100px]" style={{ backgroundColor: '#fff', border: `1px solid ${colors.border}` }}>
                {field?.options?.map(opt => (
                  <button key={opt} onClick={() => { onUpdate({ value: opt }); setValueOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors capitalize" style={{ color: condition.value === opt ? colors.accent : colors.ink }}>
                    {opt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <input
          type="text"
          inputMode={fieldType === 'number' ? 'numeric' : undefined}
          value={condition.value}
          onChange={(e) => onUpdate({ value: fieldType === 'number' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value })}
          placeholder="..."
          className="w-16 px-2 py-1 bg-transparent font-medium text-sm focus:outline-none text-center"
          style={{ color: colors.ink }}
        />
      )}
      
      <button onClick={onRemove} className="p-1 rounded-full opacity-40 hover:opacity-100 hover:bg-white/50 transition-all">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

const ConditionBuilder = ({ conditions, onChange }) => {
  const addCondition = () => onChange([...conditions, { id: `c_${Date.now()}`, field: 'class_count', operator: '>=', value: '' }]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {conditions.map((cond, i) => (
        <React.Fragment key={cond.id}>
          {i > 0 && <span className="text-sm font-medium" style={{ color: colors.muted }}>and</span>}
          <ConditionPill condition={cond} onUpdate={(updates) => onChange(conditions.map(c => c.id === cond.id ? { ...c, ...updates } : c))} onRemove={() => onChange(conditions.filter(c => c.id !== cond.id))} />
        </React.Fragment>
      ))}
      <button
        onClick={addCondition}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        style={{ color: colors.muted, border: `1px dashed ${colors.border}` }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.ink; e.currentTarget.style.color = colors.ink; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted; }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        {conditions.length === 0 ? 'Add condition' : 'and'}
      </button>
    </div>
  );
};

const RuleCard = ({ rule, onUpdate, onRemove, children }) => (
  <div className="rounded-3xl p-6 transition-shadow duration-200" style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }}>
    <div className="flex items-start justify-between mb-5">
      <input
        type="text"
        value={rule.note}
        onChange={(e) => onUpdate({ note: e.target.value })}
        placeholder="Name this rule..."
        className="text-xl font-semibold bg-transparent border-0 focus:outline-none w-full placeholder:font-normal"
        style={{ color: colors.ink, caretColor: colors.accent }}
      />
      <button onClick={onRemove} className="p-2 -mr-2 rounded-full transition-colors" style={{ color: colors.muted }} onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'} onMouseLeave={(e) => e.currentTarget.style.color = colors.muted}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
    <div className="mb-5">{children}</div>
    <div className="pt-5" style={{ borderTop: `1px solid ${colors.border}` }}>
      <p className="text-sm font-medium mb-3" style={{ color: colors.muted }}>Apply when...</p>
      <ConditionBuilder conditions={rule.conditions} onChange={(conditions) => onUpdate({ conditions })} />
    </div>
  </div>
);

// ============================================
// WIZARD: STEPS
// ============================================

const BasePricingStep = ({ method, setMethod, flatRate, setFlatRate, hourlyRate, setHourlyRate, tiers, setTiers }) => (
  <div className="max-w-xl mx-auto">
    <div className="text-center mb-10">
      <h1 className="text-4xl font-bold mb-3" style={{ color: colors.ink, letterSpacing: '-0.02em' }}>How do you price classes?</h1>
      <p style={{ color: colors.muted }} className="text-lg">This is your default. You'll add exceptions next.</p>
    </div>
    <div className="flex justify-center mb-10">
      <PillSelector options={[{ id: 'flat', label: 'Flat rate' }, { id: 'duration', label: 'By duration' }, { id: 'hourly', label: 'Hourly' }]} value={method} onChange={setMethod} />
    </div>
    <div className="rounded-3xl p-8" style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }}>
      {method === 'flat' && (
        <div className="text-center">
          <p className="text-lg mb-4" style={{ color: colors.muted }}>Every class costs</p>
          <div className="inline-flex items-baseline gap-2">
            <span className="text-5xl font-bold" style={{ color: colors.ink }}>$</span>
            <input type="text" inputMode="numeric" value={flatRate || ''} onChange={(e) => setFlatRate(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="text-6xl font-bold w-40 text-center bg-transparent border-b-4 focus:outline-none transition-colors" style={{ color: colors.ink, borderColor: colors.border, caretColor: colors.accent }} onFocus={(e) => e.target.style.borderColor = colors.accent} onBlur={(e) => e.target.style.borderColor = colors.border} />
          </div>
        </div>
      )}
      {method === 'hourly' && (
        <div className="text-center">
          <p className="text-lg mb-4" style={{ color: colors.muted }}>Your hourly rate</p>
          <div className="inline-flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-bold" style={{ color: colors.ink }}>$</span>
            <input type="text" inputMode="numeric" value={hourlyRate || ''} onChange={(e) => setHourlyRate(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="text-6xl font-bold w-40 text-center bg-transparent border-b-4 focus:outline-none transition-colors" style={{ color: colors.ink, borderColor: colors.border, caretColor: colors.accent }} onFocus={(e) => e.target.style.borderColor = colors.accent} onBlur={(e) => e.target.style.borderColor = colors.border} />
            <span className="text-2xl" style={{ color: colors.muted }}>/hr</span>
          </div>
          <p className="text-sm" style={{ color: colors.muted }}>A 45-minute class → <strong style={{ color: colors.ink }}>${((hourlyRate || 0) * 0.75).toFixed(0)}</strong></p>
        </div>
      )}
      {method === 'duration' && (
        <div>
          <div className="space-y-4">
            {tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <span style={{ color: colors.muted }}>Up to</span>
                  <input type="text" inputMode="numeric" value={tier.min} onChange={(e) => { const updated = [...tiers]; updated[i].min = Number(e.target.value.replace(/[^0-9]/g, '')) || 0; setTiers(updated); }} className="w-20 px-4 py-3.5 text-lg font-medium rounded-2xl border-2 text-center transition-all duration-200 focus:outline-none" style={{ backgroundColor: colors.paper, borderColor: colors.border, color: colors.ink }} onFocus={(e) => e.target.style.borderColor = colors.ink} onBlur={(e) => e.target.style.borderColor = colors.border} />
                  <span style={{ color: colors.muted }}>min</span>
                </div>
                <div className="w-12 h-px" style={{ backgroundColor: colors.border }} />
                <StyledInput type="number" value={tier.amount} onChange={(v) => { const updated = [...tiers]; updated[i].amount = v; setTiers(updated); }} prefix="$" />
                {tiers.length > 1 && (
                  <button onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="p-2 rounded-full transition-colors" style={{ color: colors.muted }} onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'} onMouseLeave={(e) => e.currentTarget.style.color = colors.muted}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setTiers([...tiers, { min: 60, amount: 85 }])} className="mt-6 text-sm font-medium transition-colors" style={{ color: colors.muted }} onMouseEnter={(e) => e.currentTarget.style.color = colors.ink} onMouseLeave={(e) => e.currentTarget.style.color = colors.muted}>+ Add another tier</button>
        </div>
      )}
    </div>
  </div>
);

const RulesListStep = ({ title, subtitle, rules, onAdd, onUpdate, onRemove, renderForm }) => (
  <div className="max-w-xl mx-auto">
    <div className="text-center mb-10">
      <h1 className="text-4xl font-bold mb-3" style={{ color: colors.ink, letterSpacing: '-0.02em' }}>{title}</h1>
      <p style={{ color: colors.muted }} className="text-lg">{subtitle}</p>
    </div>
    {rules.length === 0 ? (
      <button onClick={onAdd} className="w-full py-16 rounded-3xl border-2 border-dashed transition-all duration-200 group" style={{ borderColor: colors.border }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.ink; e.currentTarget.style.backgroundColor = colors.warm; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.backgroundColor = 'transparent'; }}>
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: colors.warm }}>
            <svg className="w-7 h-7" style={{ color: colors.muted }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
          <span className="font-medium" style={{ color: colors.muted }}>Add one</span>
        </div>
      </button>
    ) : (
      <div className="space-y-4">
        {rules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} onUpdate={(updates) => onUpdate(rule.id, updates)} onRemove={() => onRemove(rule.id)}>
            {renderForm(rule, (updates) => onUpdate(rule.id, updates))}
          </RuleCard>
        ))}
        <button onClick={onAdd} className="w-full py-5 rounded-2xl border-2 border-dashed transition-all duration-200 font-medium" style={{ borderColor: colors.border, color: colors.muted }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.ink; e.currentTarget.style.color = colors.ink; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted; }}>+ Add another</button>
      </div>
    )}
  </div>
);

const ReviewStep = ({ rules }) => {
  const typeColors = { base_pricing: colors.ink, class_exception: '#7c3aed', package: '#2563eb', discount: colors.success, fee: '#d97706' };
  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
          <svg className="w-10 h-10" style={{ color: colors.success }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-4xl font-bold mb-3" style={{ color: colors.ink, letterSpacing: '-0.02em' }}>Looking good!</h1>
        <p style={{ color: colors.muted }} className="text-lg">{rules.length} rule{rules.length !== 1 ? 's' : ''} ready to go</p>
      </div>
      <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }}>
        {rules.map((rule, i) => (
          <div key={rule.id} className="flex items-center gap-4 px-6 py-4" style={{ borderTop: i > 0 ? `1px solid ${colors.border}` : undefined }}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: typeColors[rule.type] }} />
            <span className="font-medium" style={{ color: colors.ink }}>{rule.note}</span>
            {rule.conditions.length > 0 && <span className="text-sm px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.warm, color: colors.muted }}>{rule.conditions.length} condition{rule.conditions.length > 1 ? 's' : ''}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgressBar = ({ current, total }) => (
  <div className="flex items-center justify-center gap-1 mb-12">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className="h-1.5 rounded-full transition-all duration-500" style={{ width: i === current ? 32 : i < current ? 24 : 8, backgroundColor: i <= current ? colors.ink : colors.border }} />
    ))}
  </div>
);

// ============================================
// WIZARD: MAIN COMPONENT
// ============================================

export default function TuitionBillingWizard({ onSave }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState('choose');
  const [saving, setSaving] = useState(false);

  const [pricingMethod, setPricingMethod] = useState('flat');
  const [flatRate, setFlatRate] = useState(87);
  const [hourlyRate, setHourlyRate] = useState(60);
  const [tiers, setTiers] = useState([{ min: 30, amount: 65 }, { min: 45, amount: 75 }, { min: 60, amount: 85 }]);
  const [exceptions, setExceptions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [fees, setFees] = useState([]);

  const queryClient = useQueryClient();

  // Load existing rules
  const { data: existingRules = [] } = useQuery({
    queryKey: ['tuitionRules'],
    queryFn: () => base44.entities.TuitionRule.list(),
  });

  const createRule = (type) => ({
    id: `${type}_${Date.now()}`,
    type,
    priority: 10,
    conditions: [],
    value: type === 'discount' ? { percent: 10, target: 'total' } : { amount: 0, name: '', frequency: 'annual', per: 'family' },
    note: '',
  });

  const compileRules = () => {
    const all = [{
      id: 'base',
      type: 'base_pricing',
      priority: 0,
      conditions: [],
      value: pricingMethod === 'flat' ? { method: 'flat', amount: flatRate } : pricingMethod === 'hourly' ? { method: 'hourly', rate: hourlyRate } : { method: 'by_duration', rates: tiers.map(t => ({ maxMinutes: t.min, amount: t.amount })) },
      note: pricingMethod === 'flat' ? `$${flatRate} per class` : pricingMethod === 'hourly' ? `$${hourlyRate}/hour` : 'Duration-based pricing',
    }];
    [...exceptions, ...packages, ...discounts, ...fees].forEach(r => r.note && all.push(r));
    return all;
  };

  const handleSave = async () => {
    setSaving(true);
    const rules = compileRules();
    
    try {
      // Delete existing rules first
      for (const existing of existingRules) {
        await base44.entities.TuitionRule.delete(existing.id);
      }
      
      // Create new rules
      for (const rule of rules) {
        await base44.entities.TuitionRule.create({
          type: rule.type,
          priority: rule.priority || 0,
          conditions: rule.conditions || [],
          value: rule.value,
          note: rule.note || '',
          active: true,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['tuitionRules'] });
      
      if (onSave) {
        onSave(rules);
      }
      
      alert('Tuition rules saved successfully!');
    } catch (error) {
      console.error('Error saving rules:', error);
      alert('Failed to save rules. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    <BasePricingStep key="base" method={pricingMethod} setMethod={setPricingMethod} flatRate={flatRate} setFlatRate={setFlatRate} hourlyRate={hourlyRate} setHourlyRate={setHourlyRate} tiers={tiers} setTiers={setTiers} />,
    <RulesListStep key="exc" title="Any classes priced differently?" subtitle="Override the base price for specific classes" rules={exceptions} onAdd={() => setExceptions([...exceptions, createRule('class_exception')])} onUpdate={(id, u) => setExceptions(exceptions.map(r => r.id === id ? { ...r, ...u } : r))} onRemove={(id) => setExceptions(exceptions.filter(r => r.id !== id))} renderForm={(rule, update) => (<div className="flex items-center gap-3"><span style={{ color: colors.muted }}>Charge</span><StyledInput type="number" value={rule.value.amount} onChange={(v) => update({ value: { ...rule.value, amount: v } })} prefix="$" /></div>)} />,
    <RulesListStep key="pkg" title="Any package deals?" subtitle="Bundled pricing replaces individual class prices" rules={packages} onAdd={() => setPackages([...packages, createRule('package')])} onUpdate={(id, u) => setPackages(packages.map(r => r.id === id ? { ...r, ...u } : r))} onRemove={(id) => setPackages(packages.filter(r => r.id !== id))} renderForm={(rule, update) => (<div className="flex items-center gap-3"><span style={{ color: colors.muted }}>Total</span><StyledInput type="number" value={rule.value.amount} onChange={(v) => update({ value: { ...rule.value, amount: v } })} prefix="$" /></div>)} />,
    <RulesListStep key="disc" title="Any discounts?" subtitle="Automatic reductions when conditions are met" rules={discounts} onAdd={() => setDiscounts([...discounts, createRule('discount')])} onUpdate={(id, u) => setDiscounts(discounts.map(r => r.id === id ? { ...r, ...u } : r))} onRemove={(id) => setDiscounts(discounts.filter(r => r.id !== id))} renderForm={(rule, update) => (<div className="flex items-center gap-4 flex-wrap"><div className="flex items-center gap-2"><StyledInput type="number" value={rule.value.percent} onChange={(v) => update({ value: { ...rule.value, percent: v } })} suffix="%" /><span style={{ color: colors.muted }}>off</span></div><PillSelector size="sm" options={[{ id: 'total', label: 'Total' }, { id: 'least_expensive', label: 'Cheapest' }, { id: 'matching_classes', label: 'Matching' }]} value={rule.value.target} onChange={(v) => update({ value: { ...rule.value, target: v } })} /></div>)} />,
    <RulesListStep key="fees" title="Any additional fees?" subtitle="Registration, costumes, recital, etc." rules={fees} onAdd={() => setFees([...fees, createRule('fee')])} onUpdate={(id, u) => setFees(fees.map(r => r.id === id ? { ...r, ...u } : r))} onRemove={(id) => setFees(fees.filter(r => r.id !== id))} renderForm={(rule, update) => (<div className="space-y-4"><div className="flex items-center gap-3"><StyledInput type="number" value={rule.value.amount} onChange={(v) => update({ value: { ...rule.value, amount: v } })} prefix="$" /><PillSelector size="sm" options={[{ id: 'annual', label: 'Yearly' }, { id: 'monthly', label: 'Monthly' }, { id: 'once', label: 'Once' }]} value={rule.value.frequency} onChange={(v) => update({ value: { ...rule.value, frequency: v } })} /></div><div className="flex items-center gap-3"><span style={{ color: colors.muted }}>Per</span><PillSelector size="sm" options={[{ id: 'family', label: 'Family' }, { id: 'student', label: 'Student' }, { id: 'class', label: 'Class' }]} value={rule.value.per} onChange={(v) => update({ value: { ...rule.value, per: v } })} /></div></div>)} />,
    <ReviewStep key="review" rules={compileRules()} />,
  ];

  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: colors.paper }}>
        <div className="max-w-md w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3" style={{ color: colors.ink, letterSpacing: '-0.02em' }}>Set up tuition</h1>
            <p style={{ color: colors.muted }} className="text-lg">How would you like to start?</p>
          </div>
          <div className="space-y-3">
            {[
              { id: 'guided', label: 'Guided setup', desc: 'Answer a few questions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
              { id: 'upload', label: 'Import rate sheet', desc: 'Paste text or upload', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            ].map((opt) => (
              <button key={opt.id} onClick={() => setMode(opt.id)} className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-200 group" style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.warm }}><svg className="w-6 h-6" style={{ color: colors.ink }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={opt.icon} /></svg></div>
                <div className="flex-1"><p className="font-semibold text-lg" style={{ color: colors.ink }}>{opt.label}</p><p style={{ color: colors.muted }}>{opt.desc}</p></div>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" style={{ color: colors.muted }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'upload') {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: colors.paper }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setMode('choose')} className="mb-8 flex items-center gap-2 font-medium transition-colors" style={{ color: colors.muted }} onMouseEnter={(e) => e.currentTarget.style.color = colors.ink} onMouseLeave={(e) => e.currentTarget.style.color = colors.muted}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Back
          </button>
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-3" style={{ color: colors.ink, letterSpacing: '-0.02em' }}>Describe your pricing</h1>
            <p style={{ color: colors.muted }} className="text-lg">Paste your rate sheet or describe how you charge</p>
          </div>
          <div className="rounded-3xl p-6" style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }}>
            <textarea placeholder="We charge $87 per class. Toddler classes are $55. If a student takes 3+ classes, they get 5% off the cheapest one..." className="w-full h-64 p-4 rounded-2xl text-lg resize-none focus:outline-none" style={{ backgroundColor: colors.warm, color: colors.ink, caretColor: colors.accent }} />
            <button className="w-full mt-4 py-4 rounded-2xl font-semibold text-lg transition-all" style={{ backgroundColor: colors.ink, color: colors.paper }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>Extract rules</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setMode('choose')} className="mb-8 flex items-center gap-2 font-medium transition-colors" style={{ color: colors.muted }} onMouseEnter={(e) => e.currentTarget.style.color = colors.ink} onMouseLeave={(e) => e.currentTarget.style.color = colors.muted}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Back
        </button>
        <ProgressBar current={step} total={steps.length} />
        {steps[step]}
        <div className="flex justify-between items-center mt-12">
          <button onClick={() => setStep(step - 1)} className={`px-6 py-3 font-medium transition-colors ${step === 0 ? 'opacity-0 pointer-events-none' : ''}`} style={{ color: colors.muted }} onMouseEnter={(e) => e.currentTarget.style.color = colors.ink} onMouseLeave={(e) => e.currentTarget.style.color = colors.muted}>← Back</button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="px-8 py-3 rounded-full font-semibold transition-all" style={{ backgroundColor: colors.ink, color: colors.paper }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>Continue →</button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="px-8 py-3 rounded-full font-semibold transition-all disabled:opacity-50" style={{ backgroundColor: colors.success, color: '#fff' }} onMouseEnter={(e) => !saving && (e.currentTarget.style.opacity = '0.9')} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>{saving ? 'Saving...' : 'Save rules ✓'}</button>
          )}
        </div>
      </div>
    </div>
  );
}