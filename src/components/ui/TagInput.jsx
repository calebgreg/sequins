import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from 'lucide-react';

export default function TagInput({ value = [], onChange, placeholder = "Add tag...", className }) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const removeTag = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={`flex flex-wrap gap-2 p-2 bg-white border border-gray-200 rounded-md focus-within:ring-2 focus-within:ring-black focus-within:border-transparent ${className}`}>
      {value.map((tag, index) => (
        <Badge key={index} variant="secondary" className="gap-1 pr-1 bg-gray-100 text-gray-800 hover:bg-gray-200">
          {tag}
          <button 
            type="button"
            onClick={() => removeTag(index)}
            className="hover:bg-gray-300 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] outline-none bg-transparent text-sm py-1"
      />
    </div>
  );
}