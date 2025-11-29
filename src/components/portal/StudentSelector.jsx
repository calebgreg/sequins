import React from 'react';
import { cn } from "@/lib/utils";

export default function StudentSelector({ students, selectedStudent, onSelect }) {
  return (
    <div className="flex gap-4">
      {students.map((student) => (
        <button
          key={student.id}
          onClick={() => onSelect(student.name === selectedStudent ? null : student.name)}
          className={cn(
            "px-8 py-3 rounded-full text-lg font-medium transition-all duration-300",
            student.color === 'pink' 
              ? "bg-[#F2DCDD] text-[#5A4A4B] hover:bg-[#EBC8CA]" 
              : "bg-[#555555] text-white hover:bg-[#444444]",
             selectedStudent && selectedStudent !== student.name && "opacity-40"
          )}
        >
          {student.name}
        </button>
      ))}
    </div>
  );
}