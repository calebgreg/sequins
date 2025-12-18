import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Shirt, Sparkles, ExternalLink, Loader2, Search } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { toast } from 'sonner';

export default function ProducerCostumeEnricher({ segment, onUpdate, context }) {
    const suggestions = segment.costume_product_suggestions || [];
    
    const enrichMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('producePerformanceV2', {
                action: 'enrich_costume',
                segment: segment,
                context: context
            });
            return response.data;
        },
        onSuccess: (data) => {
            if (data?.costume_product_suggestions) {
                onUpdate(data.costume_product_suggestions);
                toast.success("Found costumes!");
            }
        },
        onError: () => toast.error("Failed to source costumes")
    });

    if (suggestions.length > 0) {
        return (
            <div className="mt-3 grid grid-cols-2 gap-2">
                {suggestions.map((item, itemIdx) => (
                    <a 
                        key={itemIdx} 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex flex-col items-center p-2 bg-white/50 rounded-lg border border-pink-100 hover:bg-white transition-all group/item"
                    >
                        {item.image_url ? (
                            <div className="w-full aspect-[3/4] mb-2 rounded overflow-hidden bg-gray-100 relative">
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/5 transition-colors" />
                            </div>
                        ) : (
                            <div className="w-full aspect-[3/4] mb-2 rounded bg-pink-100 flex items-center justify-center">
                                <Shirt className="w-6 h-6 text-pink-300" />
                            </div>
                        )}
                        <div className="w-full flex items-center justify-between gap-2">
                            <span className="text-[10px] font-medium text-pink-900 line-clamp-1 flex-1">{item.name}</span>
                            <ExternalLink className="w-3 h-3 text-pink-400" />
                        </div>
                    </a>
                ))}
            </div>
        );
    }

    return (
        <div className="mt-3">
             <Button 
                variant="outline" 
                size="sm"
                onClick={() => enrichMutation.mutate()}
                disabled={enrichMutation.isPending}
                className="w-full bg-white/50 border-pink-200 text-pink-700 hover:bg-white hover:text-pink-800 hover:border-pink-300 transition-all text-xs h-8"
            >
                {enrichMutation.isPending ? (
                    <>
                        <Loader2 className="w-3 h-3 animate-spin mr-2" /> Sourcing...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-3 h-3 mr-2" /> Auto-Source Products
                    </>
                )}
            </Button>
            <p className="text-[10px] text-pink-400 text-center mt-2">
                Use AI to find real purchasable items
            </p>
        </div>
    );
}