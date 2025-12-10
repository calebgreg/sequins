import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ChevronRight, Download, Star, Calendar, CreditCard, 
    ArrowRight, MapPin, Mail, Phone, ExternalLink, Play 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function FamilyRoom() {
    const [searchParams] = useSearchParams();
    const configId = searchParams.get('id');
    const isPreview = searchParams.get('preview') === 'true';

    // Fetch Config logic
    const { data: config, isLoading } = useQuery({
        queryKey: ['familyRoomConfig', configId, isPreview],
        queryFn: async () => {
            if (isPreview) {
                const stored = localStorage.getItem('familyRoomPreview');
                return stored ? JSON.parse(stored) : null;
            }
            if (!configId) return null;
            const configs = await base44.entities.FamilyRoomConfig.list();
            return configs.find(c => c.id === configId);
        },
    });

    // Mock family data fetch (would need secure token in real app)
    const { data: familyInvoices } = useQuery({
        queryKey: ['roomInvoices', config?.parent_email],
        queryFn: async () => {
             const all = await base44.entities.Invoice.list('-issue_date', 5);
             return all.filter(inv => inv.parent_email === config?.parent_email);
        },
        enabled: !!config?.parent_email && !isPreview
    });

    // Mock for preview if no real data
    const displayInvoices = isPreview ? [{ balance_due: 450 }] : (familyInvoices || []);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] font-serif text-xl">Loading your space...</div>;
    if (!config) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">Unable to load room configuration.</div>;

    const visibleModules = config.modules.filter(m => m.isVisible);
    const themeBg = config.theme === 'elegant' ? 'bg-[#FDFBF7]' : config.theme === 'energetic' ? 'bg-white' : 'bg-gray-50';
    const themeText = config.theme === 'energetic' ? 'text-indigo-950' : 'text-[#333333]';

    return (
        <div className={`min-h-screen font-sans ${themeBg} ${themeText}`}>
            {/* Optional Header based on Theme */}
            <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto">
                 <div className="text-sm font-bold tracking-widest uppercase opacity-70">The Studio</div>
                 {isPreview && <Badge variant="destructive" className="animate-pulse">Preview Mode</Badge>}
            </div>

            {visibleModules.map((module, idx) => {
                
                // HERO MODULE
                if (module.type === 'hero') {
                    return (
                        <div key={module.id} className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
                             <div className="absolute inset-0 z-0">
                                 {module.content.image_url ? (
                                    <motion.img 
                                        initial={{ scale: 1.1 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 10, ease: "easeOut" }}
                                        src={module.content.image_url} 
                                        className="w-full h-full object-cover" 
                                        alt="Hero" 
                                    />
                                 ) : (
                                    <div className="w-full h-full bg-[#1a1a1a]" />
                                 )}
                                 <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                             </div>
                             
                             <div className="relative z-20 text-center max-w-5xl px-6">
                                 <motion.h1 
                                     initial={{ opacity: 0, y: 30 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     transition={{ duration: 0.8, delay: 0.2 }}
                                     className="font-serif text-6xl md:text-8xl text-white mb-6 leading-tight tracking-tight drop-shadow-lg"
                                 >
                                     {module.content.title}
                                 </motion.h1>
                                 <motion.div 
                                     initial={{ opacity: 0, y: 20 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     transition={{ duration: 0.8, delay: 0.4 }}
                                     className="w-24 h-1 bg-white/50 mx-auto mb-8 rounded-full backdrop-blur-sm"
                                 />
                                 <motion.p 
                                     initial={{ opacity: 0, y: 20 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     transition={{ duration: 0.8, delay: 0.5 }}
                                     className="text-white/90 text-xl md:text-3xl font-light tracking-wide max-w-3xl mx-auto drop-shadow-md"
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
                        <div key={module.id} className="max-w-4xl mx-auto px-6 py-24">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                <h2 className={`font-serif text-4xl mb-8 ${themeText} relative inline-block`}>
                                    {module.content.heading}
                                    <span className="absolute -bottom-2 left-0 w-1/3 h-1 bg-indigo-500/20 rounded-full" />
                                </h2>
                                <div className="prose prose-xl prose-gray leading-loose whitespace-pre-line font-light">
                                    {module.content.body}
                                </div>
                            </motion.div>
                        </div>
                    );
                }

                // VIDEO EMBED MODULE
                if (module.type === 'video_embed') {
                     // Basic parsing for Youtube embed
                     let embedUrl = module.content.url;
                     if (embedUrl?.includes('youtube.com/watch')) {
                         const videoId = embedUrl.split('v=')[1];
                         embedUrl = `https://www.youtube.com/embed/${videoId}`;
                     } else if (embedUrl?.includes('youtu.be/')) {
                         const videoId = embedUrl.split('youtu.be/')[1];
                         embedUrl = `https://www.youtube.com/embed/${videoId}`;
                     }

                    return (
                        <div key={module.id} className="bg-black py-24">
                             <div className="max-w-6xl mx-auto px-6">
                                 <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-[#1a1a1a] relative group"
                                 >
                                     {embedUrl ? (
                                        <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
                                     ) : (
                                        <div className="flex items-center justify-center h-full text-white/30 flex-col gap-4">
                                            <Play className="w-16 h-16" />
                                            <span className="font-serif text-xl">Video Placeholder</span>
                                        </div>
                                     )}
                                 </motion.div>
                                 {module.content.caption && (
                                     <p className="text-center text-white/60 mt-6 font-serif text-lg italic">{module.content.caption}</p>
                                 )}
                             </div>
                        </div>
                    );
                }

                // INVOICE HIGHLIGHT MODULE
                if (module.type === 'invoice_highlight') {
                    const balance = displayInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0) || 0;
                    return (
                        <div key={module.id} className="py-16 px-6">
                            <div className="max-w-5xl mx-auto">
                                <motion.div 
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="bg-white rounded-[40px] p-8 md:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
                                    
                                    <div className="relative z-10 text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-2 mb-4 text-indigo-600 uppercase tracking-widest text-xs font-bold">
                                            <CreditCard className="w-4 h-4" /> Account Status
                                        </div>
                                        <h3 className="font-serif text-4xl text-[#333333] mb-2">Outstanding Balance</h3>
                                        <p className="text-gray-400 max-w-md">
                                            Please settle your account to ensure uninterrupted access to classes and resources.
                                        </p>
                                    </div>

                                    <div className="relative z-10 flex flex-col items-center gap-4 bg-gray-50 p-8 rounded-3xl border border-gray-100 min-w-[300px]">
                                        <div className="text-6xl font-serif text-[#333333]">${balance.toLocaleString()}</div>
                                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Due Immediately</div>
                                        <Button className="w-full bg-[#333333] text-white hover:bg-black rounded-full h-12 mt-2 shadow-lg hover:shadow-xl transition-all">
                                            Pay Securely
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    );
                }

                // CTA BUTTON
                if (module.type === 'cta_button') {
                    return (
                        <div key={module.id} className="max-w-4xl mx-auto px-6 py-12 flex justify-center">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button 
                                    className={`
                                        h-16 px-12 rounded-full text-lg shadow-xl hover:shadow-2xl transition-all font-serif
                                        ${module.content.style === 'outline' 
                                            ? 'bg-transparent border-2 border-[#333333] text-[#333333] hover:bg-[#333333] hover:text-white' 
                                            : 'bg-[#333333] text-white hover:bg-black'}
                                    `}
                                    onClick={() => window.open(module.content.url, '_blank')}
                                >
                                    {module.content.label} <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </motion.div>
                        </div>
                    );
                }

                // FILE DOWNLOAD MODULE
                if (module.type === 'file_download') {
                     return (
                         <div key={module.id} className="max-w-3xl mx-auto px-6 py-12">
                             <motion.a 
                                href={module.content.url}
                                target="_blank"
                                whileHover={{ scale: 1.02 }}
                                className="block bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
                             >
                                 <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                         <Download className="w-6 h-6" />
                                     </div>
                                     <div>
                                         <h3 className="font-bold text-[#333333] text-lg">{module.content.title || "Download Resource"}</h3>
                                         <p className="text-gray-400 text-sm">{module.content.description || "Click to download file"}</p>
                                     </div>
                                     <ExternalLink className="w-5 h-5 text-gray-300 ml-auto group-hover:text-indigo-600" />
                                 </div>
                             </motion.a>
                         </div>
                     )
                }

                return null;
            })}

            {/* Footer */}
            <div className="bg-[#1a1a1a] text-white py-24 mt-24">
                <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                    <div>
                        <h3 className="font-serif text-3xl mb-6">The Studio</h3>
                        <p className="text-white/40 leading-relaxed text-sm">
                            Excellence in dance education since 2010. Creating artists, building character, and fostering community.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold uppercase tracking-widest text-xs text-white/50 mb-6">Contact</h4>
                        <div className="space-y-4 text-sm text-white/70">
                            <p className="flex items-center justify-center md:justify-start gap-3 hover:text-white transition-colors cursor-pointer">
                                <Mail className="w-4 h-4" /> hello@studio.com
                            </p>
                            <p className="flex items-center justify-center md:justify-start gap-3 hover:text-white transition-colors cursor-pointer">
                                <Phone className="w-4 h-4" /> (555) 123-4567
                            </p>
                            <p className="flex items-center justify-center md:justify-start gap-3 hover:text-white transition-colors cursor-pointer">
                                <MapPin className="w-4 h-4" /> 123 Dance Ave, NY
                            </p>
                        </div>
                    </div>
                    <div>
                         <h4 className="font-bold uppercase tracking-widest text-xs text-white/50 mb-6">Quick Links</h4>
                         <div className="space-y-3 text-sm text-white/70">
                             <a href="#" className="block hover:text-white">Parent Portal</a>
                             <a href="#" className="block hover:text-white">Class Schedule</a>
                             <a href="#" className="block hover:text-white">Terms & Policies</a>
                         </div>
                    </div>
                </div>
                <div className="max-w-5xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 text-center text-xs text-white/20">
                    © 2025 The Studio. Powered by Base44.
                </div>
            </div>
        </div>
    );
}