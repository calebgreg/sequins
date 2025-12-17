import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function VenueSearch({ value, onChange, onSelect }) {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef(null);

    // Sync with external value
    useEffect(() => {
        if (value !== query) { // Only update if external value changes and is different from internal query
            setQuery(value || '');
        }
    }, [value]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const fetchSuggestions = useCallback(async (input) => {
        if (!input || input.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await base44.functions.invoke('googlePlacesAutocomplete', { query: input });
            if (data.suggestions) {
                setSuggestions(data.suggestions);
                setIsOpen(true);
            }
        } catch (error) {
            console.error("Failed to fetch suggestions:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounce manual implementation
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only search if user typed something new
            if (query && query !== value) { 
                 fetchSuggestions(query);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, fetchSuggestions]);

    const handleSelect = async (suggestion) => {
        setQuery(suggestion.main_text);
        setIsOpen(false);
        setSuggestions([]);
        
        // Notify parent of text change immediately
        onChange(suggestion.main_text);

        // Fetch details
        setIsLoading(true);
        try {
            const { data } = await base44.functions.invoke('googlePlacesDetails', { place_id: suggestion.place_id });
            if (data && !data.error) {
                onSelect(data); // Pass full venue object back
            }
        } catch (error) {
            console.error("Failed to fetch place details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setQuery('');
        setSuggestions([]);
        onChange('');
        onSelect(null);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value); // Allow free text typing too
                    }}
                    placeholder="Search for a venue..."
                    className="h-10 pl-9 pr-8 bg-[#F9F9FB] border-gray-100 focus:bg-white transition-colors"
                />
                {query && (
                    <button 
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full text-gray-400"
                    >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    </button>
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 overflow-auto">
                    {suggestions.map((item) => (
                        <button
                            key={item.place_id}
                            onClick={() => handleSelect(item)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col gap-0.5 border-b border-gray-50 last:border-0 transition-colors"
                        >
                            <span className="text-sm font-medium text-gray-900">{item.main_text}</span>
                            <span className="text-xs text-gray-500 truncate">{item.secondary_text}</span>
                        </button>
                    ))}
                    <div className="px-2 py-1 bg-gray-50 flex justify-end">
                        <img src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png" alt="Powered by Google" className="h-4 opacity-70" />
                    </div>
                </div>
            )}
        </div>
    );
}