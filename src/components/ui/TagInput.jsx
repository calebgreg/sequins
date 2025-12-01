import React, { useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { base44 } from "@/api/base44Client";

export default function TagInput({ tags = [], onChange, suggestions = [], placeholder = "Add tag...", enableAI = false, contextData = null }) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = (tagToAdd) => {
    const value = tagToAdd || input.trim();
    if (value && !tags.includes(value)) {
      onChange([...tags, value]);
      setInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAIGenerate = async () => {
    if (!contextData) return;
    setIsGenerating(true);
    try {
        const prompt = `Analyze this student data and suggest 3-5 short, single-word tags (lowercase, snake_case) that describe them useful for a dance studio staff. Data: ${JSON.stringify(contextData)}. Existing tags: ${tags.join(', ')}. Return JSON: {"tags": ["tag1", "tag2"]}`;
        
        const res = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } }
        });
        
        if (res && res.tags) {
            const newTags = res.tags.filter(t => !tags.includes(t));
            onChange([...tags, ...newTags]);
        }
    } catch (err) {
        console.error("Tag gen error", err);
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center min-h-[2.5rem] p-2 bg-white rounded-xl border border-gray-200 focus-within:border-[#333333] transition-all">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="px-3 py-1 rounded-full bg-[#F4F4F6] text-[#333333] hover:bg-gray-200 transition-colors flex items-center gap-1 border border-gray-200">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-red-500 outline-none ml-1">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <input
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder={tags.length === 0 ? placeholder : ""}
             className="flex-1 bg-transparent border-none outline-none text-sm min-w-[80px]"
           />
        {enableAI && (
            <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="h-6 px-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
            >
                {isGenerating ? <Sparkles className="w-3 h-3 animate-pulse" /> : <Sparkles className="w-3 h-3" />}
            </Button>
        )}
      </div>
      
      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.filter(s => !tags.includes(s)).map(s => (
             <button 
               key={s} 
               type="button"
               onClick={() => addTag(s)}
               className="text-xs text-gray-400 bg-transparent px-2 py-1 rounded-full hover:bg-gray-100 border border-dashed border-gray-200 flex items-center gap-1 transition-all"
             >
               <Plus className="w-3 h-3" /> {s}
             </button>
          ))}
        </div>
      )}
    </div>
  );
}