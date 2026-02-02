import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Search, Sparkles, Save, X, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function NaturalLanguageSearch({ onFilterChange, onSearchChange }) {
    const [query, setQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeFilter, setActiveFilter] = useState(null); // The currently applied parsed filter
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [newFilterName, setNewFilterName] = useState('');
    const [isShared, setIsShared] = useState(false);
    const [isSavedFiltersOpen, setIsSavedFiltersOpen] = useState(false);

    const queryClient = useQueryClient();

    // Fetch performances and routines for context
    const { data: performances = [] } = useQuery({
        queryKey: ['performances'],
        queryFn: () => base44.entities.Performance.list(),
    });

    const { data: routines = [] } = useQuery({
        queryKey: ['allRoutines'],
        queryFn: () => base44.entities.PerformanceRoutine.list(),
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['classes'],
        queryFn: () => base44.entities.DanceClass.list(),
    });

    const { data: teachers = [] } = useQuery({
        queryKey: ['teachers'],
        queryFn: () => base44.entities.Teacher.list(),
    });

    // Fetch saved filters
    const { data: savedFilters = [] } = useQuery({
        queryKey: ['savedFilters'],
        queryFn: () => base44.entities.SavedFilter.list(),
    });

    // Mutation to save a filter
    const saveFilterMutation = useMutation({
        mutationFn: (data) => base44.entities.SavedFilter.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['savedFilters']);
            setIsSaveModalOpen(false);
            setNewFilterName('');
        }
    });

    // Delete filter
    const deleteFilterMutation = useMutation({
        mutationFn: (id) => base44.entities.SavedFilter.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['savedFilters'])
    });

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        // Clear instant search to prevent conflicts with AI results
        if (onSearchChange) onSearchChange('');
        
        setIsProcessing(true);
        try {
            // Build context for the AI
            const performanceContext = performances.map(p => `- "${p.title}" (ID: ${p.id})`).join('\n');
            const classContext = classes.map(c => `- "${c.title}" on ${c.day} with ${c.teacher || 'TBD'} (style: ${c.style || c.title})`).join('\n');
            const teacherContext = teachers.map(t => `- ${t.name}`).join('\n');

            const prompt = `
            Analyze this query for a dance studio CRM and extract filter criteria.
            Query: "${query}"

            AVAILABLE PERFORMANCES:
            ${performanceContext || 'None'}

            AVAILABLE CLASSES:
            ${classContext || 'None'}

            TEACHERS:
            ${teacherContext || 'None'}

            Return a valid JSON object matching this structure:
            {
                "filters": {
                    "name": string (partial match on student name),
                    "status": "active" | "inactive" | "prospect" | "alumni",
                    "billing_method": "auto_pay" | "manual",
                    "age": { "$eq": number, "$gt": number, "$lt": number, "$gte": number, "$lte": number },
                    "level": string (e.g. "Mini", "Petite", "Junior", "Senior"),
                    "tags": [string]
                },
                "class_filters": {
                    "day": "M"|"T"|"W"|"R"|"F"|"S"|"U",
                    "style": string (e.g. "Ballet", "Tap", "Jazz", "Hip Hop", "Acro", "Contemporary", "Lyrical"),
                    "teacher": string,
                    "class_title": string (exact or partial class name match)
                },
                "performance_filters": {
                    "performance_id": string (ID of the performance),
                    "performance_title": string (name of performance for display)
                }
            }
            
            IMPORTANT RULES:
            - Only include fields that are present in the query
            - For performance queries like "students in X performance", use performance_filters with the matching performance_id
            - For class queries like "students in Ballet I" or "Monday students", use class_filters
            - Match performance titles loosely (e.g. "new years" matches "New Year's")
            - If asking for "my students" or "my classes", ignore the "my" part
            
            Examples:
            - "9 year old tap students" -> { "filters": { "age": { "$eq": 9 } }, "class_filters": { "style": "tap" } }
            - "students in the new years performance" -> { "performance_filters": { "performance_id": "<matching ID>", "performance_title": "New Year's" } }
            - "Monday ballet students" -> { "class_filters": { "day": "M", "style": "Ballet" } }
            - "Miss Sarah's students" -> { "class_filters": { "teacher": "Sarah" } }
            `;

            const res = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        filters: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                status: { type: "string", enum: ["active", "inactive", "prospect", "alumni"] },
                                billing_method: { type: "string", enum: ["auto_pay", "manual"] },
                                age: {
                                    type: "object",
                                    properties: {
                                        "$eq": { type: "number" },
                                        "$gt": { type: "number" },
                                        "$lt": { type: "number" },
                                        "$gte": { type: "number" },
                                        "$lte": { type: "number" }
                                    }
                                },
                                level: { type: "string" },
                                tags: { type: "array", items: { type: "string" } }
                            }
                        },
                        class_filters: {
                            type: "object",
                            properties: {
                                day: { type: "string", enum: ["M", "T", "W", "R", "F", "S", "U"] },
                                style: { type: "string" },
                                teacher: { type: "string" },
                                class_title: { type: "string" }
                            }
                        },
                        performance_filters: {
                            type: "object",
                            properties: {
                                performance_id: { type: "string" },
                                performance_title: { type: "string" }
                            }
                        }
                    }
                }
            });

            if (res) {
                // Sanitize the response to remove empty values
                const cleanObject = (obj) => {
                    const cleaned = {};
                    Object.keys(obj).forEach(key => {
                        const value = obj[key];
                        if (value === null || value === undefined || value === '') return;
                        if (Array.isArray(value) && value.length === 0) return;
                        if (typeof value === 'object' && !Array.isArray(value)) {
                            const nested = cleanObject(value);
                            if (Object.keys(nested).length > 0) {
                                cleaned[key] = nested;
                            }
                            return;
                        }
                        cleaned[key] = value;
                    });
                    return cleaned;
                };

                const cleanedRes = cleanObject(res);

                const filterData = {
                    parsed_criteria_json: cleanedRes,
                    natural_language_query: query
                };
                setActiveFilter(filterData);
                onFilterChange(cleanedRes);
            }
        } catch (error) {
            console.error("AI Search failed", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveFilter = () => {
        if (!activeFilter) return;
        saveFilterMutation.mutate({
            filter_name: newFilterName,
            natural_language_query: activeFilter.natural_language_query,
            parsed_criteria_json: activeFilter.parsed_criteria_json,
            is_shared: isShared
        });
    };

    const applySavedFilter = (saved) => {
        setQuery(saved.natural_language_query);
        setActiveFilter(saved);
        onFilterChange(saved.parsed_criteria_json);
        setIsSavedFiltersOpen(false);
    };

    const clearFilter = () => {
        setQuery('');
        setActiveFilter(null);
        onFilterChange(null);
        if (onSearchChange) onSearchChange('');
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 w-full">
                {/* Search Input Group */}
                <div className="relative flex-1 group">
                    <form onSubmit={handleSearch} className="relative">
                        <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${activeFilter ? 'text-indigo-500' : 'text-gray-400'}`}>
                            {isProcessing ? (
                                <Sparkles className="w-4 h-4 animate-spin" />
                            ) : activeFilter ? (
                                <Sparkles className="w-4 h-4" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                        </div>
                        <Input 
                            placeholder="Search by name or ask AI... (e.g. 'Active 9yr olds')" 
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                // If no AI filter is active, update simple search instantly
                                if (!activeFilter && onSearchChange) {
                                    onSearchChange(e.target.value);
                                }
                            }}
                            onKeyDown={(e) => {
                                // If backspacing on empty query, clear everything
                                if (e.key === 'Backspace' && query === '') {
                                    clearFilter();
                                }
                            }}
                            disabled={isProcessing}
                            className={`pl-10 pr-20 h-12 bg-white border-transparent hover:border-gray-200 focus:border-indigo-200 transition-all shadow-sm hover:shadow-md rounded-full text-base font-serif placeholder:font-sans ${
                                activeFilter ? 'ring-2 ring-indigo-500/10' : ''
                            }`}
                        />
                        {activeFilter && (
                             <button 
                                type="button"
                                onClick={clearFilter}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                             >
                                <X className="w-3 h-3" />
                             </button>
                        )}
                    </form>
                </div>



                {/* Save Current Filter Button */}
                {activeFilter && !activeFilter.id && (
                    <Button 
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsSaveModalOpen(true)}
                        className="h-10 w-10 rounded-full bg-gradient-to-br from-white/30 to-white/5 backdrop-blur-xl border border-white/20 shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:bg-white/20 text-[#333333] transition-all duration-500 animate-in fade-in zoom-in shrink-0 relative overflow-hidden ring-1 ring-white/30"
                        title="Save View"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                        <Save className="w-4 h-4 relative z-10" />
                    </Button>
                )}
                </div>

                {/* Saved Views */}
                {savedFilters.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar mask-gradient animate-in slide-in-from-top-2">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider shrink-0 mr-1">Views</span>
                    {savedFilters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => applySavedFilter(filter)}
                            className={`
                                group flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 border
                                ${activeFilter?.id === filter.id 
                                    ? 'bg-[#333333] text-white border-[#333333] shadow-md' 
                                    : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300 hover:text-[#333333] hover:shadow-sm'}
                            `}
                        >
                            <span>{filter.filter_name}</span>
                            <span 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteFilterMutation.mutate(filter.id);
                                }}
                                className={`
                                    opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full
                                    ${activeFilter?.id === filter.id ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'}
                                `}
                            >
                                <X className="w-3 h-3" />
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Active Criteria Display */}
            {activeFilter && (
                <div className="flex flex-wrap gap-2 text-xs animate-in slide-in-from-top-2">
                    {Object.entries(activeFilter.parsed_criteria_json.filters || {}).map(([key, val]) => {
                         if (val === undefined || val === null) return null;
                         
                         let displayVal = val;
                         if (typeof val === 'object') {
                             if (val.$eq !== undefined) displayVal = val.$eq;
                             else if (val.$gt !== undefined) displayVal = `> ${val.$gt}`;
                             else if (val.$lt !== undefined) displayVal = `< ${val.$lt}`;
                             else if (val.$gte !== undefined) displayVal = `>= ${val.$gte}`;
                             else if (val.$lte !== undefined) displayVal = `<= ${val.$lte}`;
                             else displayVal = JSON.stringify(val).replace(/["{}]/g, '').replace(':', ' ');
                         }

                         return (
                            <Badge key={key} variant="secondary" className="px-3 py-1 rounded-full bg-white border border-gray-100 text-[#333333] shadow-sm font-normal">
                                <span className="opacity-50 mr-1">{key}:</span> {displayVal}
                            </Badge>
                         );
                    })}
                    {Object.entries(activeFilter.parsed_criteria_json.class_filters || {}).map(([key, val]) => {
                         if (!val) return null;
                         return (
                            <Badge key={key} variant="secondary" className="px-3 py-1 rounded-full bg-white border border-gray-100 text-[#333333] shadow-sm font-normal">
                                <span className="opacity-50 mr-1">Class {key}:</span> {val}
                            </Badge>
                         );
                    })}
                    {activeFilter.parsed_criteria_json.performance_filters?.performance_title && (
                        <Badge variant="secondary" className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm font-normal">
                            <span className="opacity-50 mr-1">Performance:</span> {activeFilter.parsed_criteria_json.performance_filters.performance_title}
                        </Badge>
                    )}
                    </div>
            )}

            {/* Save Modal */}
            <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-serif">Save Smart View</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>View Name</Label>
                            <Input 
                                placeholder="e.g. My Thursday Jazz Kids" 
                                value={newFilterName}
                                onChange={(e) => setNewFilterName(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Share with team?</Label>
                            <Switch checked={isShared} onCheckedChange={setIsShared} />
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                            Query: "{activeFilter?.natural_language_query}"
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveFilter} disabled={!newFilterName}>Save View</Button>
                        </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}