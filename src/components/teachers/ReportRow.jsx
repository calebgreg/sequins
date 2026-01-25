import React from 'react';
import { ChevronUp } from 'lucide-react';
import StaffCard from './StaffCard';
import GhostCard from './GhostCard';

const getInitials = (name) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const countAllReports = (staff, managerId) => {
  const direct = staff.filter(p => p.manager_id === managerId);
  let total = direct.length;
  direct.forEach(person => {
    total += countAllReports(staff, person.id);
  });
  return total;
};

const getDirectReports = (staff, managerId) => {
  return staff.filter(p => p.manager_id === managerId);
};

export default function ReportRow({
  manager,
  reports,
  staff,
  expandedNodes,
  onToggleExpand,
  selectedIds,
  onSelect,
  onCardClick,
  onAddStaff,
  onCollapse,
}) {
  if (reports.length === 0) return null;

  const totalCards = reports.length + 1;

  return (
    <div className="mt-0">
      {/* Row Header */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-b border-[#e5e5e5] bg-[#fafafa]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#e5e5e5] flex items-center justify-center text-[#6b7280] text-[11px] font-medium">
            {manager.avatar_url ? (
              <img
                src={manager.avatar_url}
                alt={manager.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(manager.name)
            )}
          </div>
          <span className="text-sm text-[#6b7280]">{manager.name}</span>
        </div>
        <button
          onClick={() => onCollapse(manager.id)}
          className="flex items-center gap-1.5 bg-transparent border-none text-sm text-[#6b7280] cursor-pointer hover:text-[#1a1a1a] transition-colors"
        >
          Collapse
          <ChevronUp size={14} />
        </button>
      </div>

      {/* Connector Lines */}
      <div className="relative pt-8">
        {/* Vertical line from top */}
        <div className="absolute top-0 left-1/2 w-px h-8 bg-[#e5e5e5]" />

        {/* Horizontal line spanning cards */}
        {totalCards > 1 && (
          <div
            className="absolute top-8 left-1/2 -translate-x-1/2 h-px bg-[#e5e5e5]"
            style={{ width: `calc(${(totalCards - 1) * 220}px + 100px)`, maxWidth: 'calc(100% - 100px)' }}
          />
        )}

        {/* Cards Row */}
        <div className="flex justify-center gap-6 px-6 pb-8 flex-wrap">
          {reports.map((person) => {
            const reportCount = countAllReports(staff, person.id);
            return (
              <div key={person.id} className="relative flex flex-col items-center">
                {/* Vertical line to card */}
                <div className="absolute -top-8 left-1/2 w-px h-8 bg-[#e5e5e5]" />
                <StaffCard
                  person={person}
                  reportCount={reportCount}
                  isExpanded={expandedNodes.has(person.id)}
                  onToggleExpand={onToggleExpand}
                  isSelected={selectedIds.has(person.id)}
                  onSelect={onSelect}
                  onCardClick={onCardClick}
                />
              </div>
            );
          })}

          {/* Ghost Card */}
          <div className="relative flex flex-col items-center">
            <div className="absolute -top-8 left-1/2 w-px h-8 bg-[#e5e5e5] opacity-50" />
            <GhostCard onClick={() => onAddStaff(manager.id)} />
          </div>
        </div>
      </div>

      {/* Nested Report Rows */}
      {reports.map((person) => {
        if (!expandedNodes.has(person.id)) return null;
        const nestedReports = getDirectReports(staff, person.id);
        if (nestedReports.length === 0) return null;

        return (
          <ReportRow
            key={`row-${person.id}`}
            manager={person}
            reports={nestedReports}
            staff={staff}
            expandedNodes={expandedNodes}
            onToggleExpand={onToggleExpand}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onCardClick={onCardClick}
            onAddStaff={onAddStaff}
            onCollapse={onToggleExpand}
          />
        );
      })}
    </div>
  );
}