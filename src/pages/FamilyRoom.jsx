import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ChevronRight, Download, Star, Calendar, CreditCard, 
    ArrowRight, MapPin, Mail, Phone, ExternalLink 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function FamilyRoom() {
    const [searchParams] = useSearchParams();
    const configId = searchParams.get('id');

    const { data: config, isLoading } = useQuery({
        queryKey: ['familyRoomConfig', configId],
        queryFn: async () => {
            if (configId === 'preview') return null; // Handle preview better in real app
            const configs = await base44.entities.FamilyRoomConfig.list();
            return configs.find(c => c.id === configId);
        },
        enabled: !!configId
    });

    // Mock family data fetch (would need secure token in real app)
    const { data: familyInvoices } = useQuery({
        queryKey: ['roomInvoices', config?.parent_email],
        queryFn: async () => {
             const all = await base44.entities.Invoice.list('-issue_date', 5);
             return all.filter(inv => inv.parent_email === config?.parent_email);
        },
        enabled: !!config?.parent_email
    });

    if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading your personalized space...</div>;
    if (!config) return <div className="min-h-screen flex items-center justify-center">Room not found.</div>;

    const visibleModules = config.modules.filter(m => m.isVisible);

    return (
        <div className={`min-h-screen font-sans text-[#333333] ${config.theme === 'elegant' ? 'bg-[#FDFBF7]' : 'bg-white'}`}>
            {visibleModules.map((module, idx) => {
                
                // HERO MODULE
                if (module.type === 'hero') {
                    return (
                        <div key={module.id} className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
                             {module.content.image_url ? (
                                 <>
                                    <div className="absolute inset-0 bg-black/30 z-10" />
                                    <img src={module.content.image_url} className="absolute inset-0 w-full h-full object-cover" alt="Hero" />
                                 </>
                             ) : (
                                 <div className="absolute inset-0 bg-[#333333] z-0" />
                             )}
                             
                             <div className="relative z-20 text-center max-w-4xl px-6">
                                 <motion.h1 
                                     initial={{ opacity: 0, y: 20 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     className="font-serif text-5xl md:text-7xl text-white mb-6 leading-tight"
                                 >
                                     {module.content.title}
                                 </motion.h1>
                                 <motion.p 
                                     initial={{ opacity: 0, y: 20 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     transition={{ delay: 0.1 }}
                                     className="text-white/90 text-xl md:text-2xl font-light"
                                 >
                                     {module.content.subtitle}
                                 </motion.p>
                             </div>
                        </div>
                    );
                }

                // TEXT BLOCK MODULE
                if (module.type === 'text_block') {
                    return (
                        <div key={module.id} className="max-w-3xl mx-auto px-6 py-16">
                            <h2 className="font-serif text-3xl mb-6 text-[#333333]">{module.content.heading}</h2>
                            <div className="prose prose-lg text-gray-600 leading-relaxed whitespace-pre-line">
                                {module.content.body}
                            </div>
                        </div>
                    );
                }

                // INVOICE HIGHLIGHT MODULE
                if (module.type === 'invoice_highlight') {
                    const balance = familyInvoices?.reduce((sum, inv) => sum + (inv.balance_due || 0), 0) || 0;
                    return (
                        <div key={module.id} className="bg-[#F4F4F6] py-16">
                            <div className="max-w-4xl mx-auto px-6">
                                <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2 text-gray-400 uppercase tracking-wider text-xs font-bold">
                                            <CreditCard className="w-4 h-4" /> Billing Status
                                        </div>
                                        <h3 className="font-serif text-3xl text-[#333333] mb-2">Current Balance</h3>
                                        <div className="text-5xl font-serif text-[#333333]">${balance.toLocaleString()}</div>
                                        <p className="text-gray-400 mt-2 text-sm">Due immediately. Secure payment via Stripe.</p>
                                    </div>
                                    <div className="flex flex-col gap-3 w-full md:w-auto">
                                        <Button className="bg-[#333333] text-white hover:bg-black rounded-full h-14 px-8 text-lg w-full md:w-auto">
                                            Pay Balance Now <ArrowRight className="w-5 h-5 ml-2" />
                                        </Button>
                                        <Button variant="ghost" className="rounded-full">View Invoice History</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                // CTA BUTTON
                if (module.type === 'cta_button') {
                    return (
                        <div key={module.id} className="max-w-4xl mx-auto px-6 py-8 flex justify-center">
                            <Button 
                                className="h-14 px-8 rounded-full text-lg shadow-lg hover:scale-105 transition-transform"
                                onClick={() => window.open(module.content.url, '_blank')}
                            >
                                {module.content.label} <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    );
                }

                return null;
            })}

            {/* Footer */}
            <div className="bg-[#333333] text-white py-16 mt-16">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h3 className="font-serif text-2xl mb-8">Studio Name</h3>
                    <div className="flex justify-center gap-8 mb-8 text-sm opacity-70">
                        <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> hello@studio.com</span>
                        <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> (555) 123-4567</span>
                    </div>
                    <p className="text-xs opacity-30">Powered by Base44 Digital Sales Rooms</p>
                </div>
            </div>
        </div>
    );
}