import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronRight, Download, Star, Calendar, CreditCard, 
    ArrowRight, MapPin, Mail, Phone, ExternalLink, PlayCircle, Clock 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import EventDetailCard from '@/components/portal/EventDetailCard';
import PerformanceHub from '@/components/portal/PerformanceHub';

export default function FamilyRoom({ previewConfig = null, isMobilePreview = false }) {
    const [searchParams] = useSearchParams();
    const configId = searchParams.get('id');
    const urlPreview = searchParams.get('preview') === 'true';
    const isPreview = urlPreview || !!previewConfig;
    const [previewData, setPreviewData] = useState(null);
    const [previewError, setPreviewError] = useState(false);
    const [primaryStudentId, setPrimaryStudentId] = useState(null);

    // Load preview data from URL hash (robust against domain/storage issues)
    useEffect(() => {
        if (urlPreview && !previewConfig) {
            try {
                // Try reading from hash first (Primary method)
                const hash = window.location.hash;
                if (hash && hash.includes('data=')) {
                    const encodedData = hash.split('data=')[1];
                    const decodedData = decodeURIComponent(atob(encodedData));
                    setPreviewData(JSON.parse(decodedData));
                    setPreviewError(false);
                    return;
                }

                // Fallback to localStorage (Secondary method)
                const stored = localStorage.getItem('familyRoomPreview');
                if (stored) {
                    setPreviewData(JSON.parse(stored));
                    setPreviewError(false);
                } else {
                     setPreviewError(true);
                }
            } catch (e) {
                console.error("Failed to load preview data", e);
                setPreviewError(true);
            }
        }
    }, [isPreview]);

    // Fetch Config logic for non-preview or fallback
    const { data: dbConfig, isLoading: isDbLoading } = useQuery({
        queryKey: ['familyRoomConfig', configId],
        queryFn: async () => {
            if (isPreview) return null;
            const configs = await base44.entities.FamilyRoomConfig.list();
            // If ID is provided, use it. Otherwise, fallback to the most recent config for demo purposes.
            return configId ? configs.find(c => c.id === configId) : configs[0];
        },
        enabled: !isPreview,
        retry: false
    });

    // Fetch performances for event cards
    const { data: performances = [] } = useQuery({
        queryKey: ['performances'],
        queryFn: () => base44.entities.Performance.list(),
    });

    const config = previewConfig || (urlPreview ? previewData : dbConfig);
    const isLoading = previewConfig ? false : (urlPreview ? (!previewData && !previewError) : isDbLoading);

    if (urlPreview && previewError && !previewConfig) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-8 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 max-w-md">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <ExternalLink className="w-6 h-6" />
                    </div>
                    <h2 className="font-serif text-2xl text-[#333333] mb-2">Preview Not Found</h2>
                    <p className="text-gray-500 mb-6">We couldn't find the preview data. This usually happens if the preview window was opened directly or the data expired.</p>
                    <Button onClick={() => window.close()} variant="outline">Close Tab</Button>
                </div>
            </div>
        );
    }

    // Mock family data fetch (would need secure token in real app)
    const { data: familyInvoices } = useQuery({
        queryKey: ['roomInvoices', config?.parent_email],
        queryFn: async () => {
             const all = await base44.entities.Invoice.list('-issue_date', 5);
             return all.filter(inv => inv.parent_email === config?.parent_email);
        },
        enabled: !!config?.parent_email && !isPreview,
        retry: false
    });

    // Mock for preview if no real data
    const displayInvoices = isPreview ? [{ balance_due: 450, stripe_payment_link: '#' }] : (familyInvoices || []);

    // Fetch students to identify the primary student for this family
    const { data: familyStudents = [] } = useQuery({
        queryKey: ['familyStudents', config?.parent_email],
        queryFn: async () => {
            if (!config?.parent_email) return [];
            // Use backend filtering to ensure we find the student even if the list is large
            return await base44.entities.Student.filter({ parent_email: config.parent_email });
        },
        enabled: !!config?.parent_email && !isPreview
    });

    useEffect(() => {
        if (familyStudents.length > 0 && !primaryStudentId) {
            setPrimaryStudentId(familyStudents[0].id);
        }
    }, [familyStudents, primaryStudentId]);

    // Fetch classes for recommendations
        const { data: allClasses = [] } = useQuery({
            queryKey: ['publicClasses'],
            queryFn: async () => base44.entities.DanceClass.list(),
            enabled: !isLoading
        });

        // Fetch Shared Tasks
        const { data: sharedTasks = [] } = useQuery({
            queryKey: ['roomTasks', config?.parent_email],
            queryFn: async () => {
                 const all = await base44.entities.FamilyTask.list();
                 return all.filter(t => t.parent_email === config?.parent_email && t.is_shared && t.status !== 'archived');
            },
            enabled: !!config?.parent_email && !isPreview,
            retry: false
        });

        const displayTasks = isPreview ? [
            { id: 1, title: 'Complete Enrollment Form', status: 'completed', due_date: '2025-09-01' },
            { id: 2, title: 'Sign Liability Waiver', status: 'pending', due_date: '2025-09-05' },
            { id: 3, title: 'Upload Immunization Records', status: 'pending', due_date: '2025-09-10' }
        ] : sharedTasks;

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] font-serif text-xl animate-pulse">Loading space...</div>;
    
    // Debug helper for development
    if (!config && !isPreview) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] text-center p-8">
                <h2 className="font-serif text-2xl mb-2 text-[#333333]">Unable to load room configuration</h2>
                <p className="text-gray-400 text-sm">ID missing and not in preview mode.</p>
            </div>
        );
    }

    if (isPreview && !config) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">Preview data not found. Please close this tab and click 'Live Preview' again.</div>;

    // Safe access to modules
    const modules = Array.isArray(config?.modules) ? config.modules : [];
    const visibleModules = modules.filter(m => m.isVisible);
    
    const themeBg = config?.theme === 'elegant' ? 'bg-[#FDFBF7]' : config?.theme === 'energetic' ? 'bg-white' : 'bg-gray-50';
    const themeText = config?.theme === 'energetic' ? 'text-indigo-950' : 'text-[#333333]';
    
    // Dynamic footer styles based on theme
    const footerBg = config?.theme === 'elegant' ? 'bg-[#2A2826]' : config?.theme === 'energetic' ? 'bg-indigo-900' : 'bg-gray-900';
    const footerText = 'text-white';

    const footer = config?.footer_settings || {
        title: "The Studio",
        description: "Excellence in dance education since 2010.",
        contact_email: "hello@studio.com",
        contact_phone: "(555) 123-4567",
        contact_address: "123 Dance Ave, NY",
        show_footer: true
    };

    return (
        <div className={`min-h-screen font-sans ${themeBg} ${themeText} overflow-x-hidden`}>
            {/* Optional Header based on Theme */}
            <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto">
                 <div className="text-sm font-bold tracking-widest uppercase opacity-70">{config?.header_text || 'The Studio'}</div>
                 {isPreview && !previewConfig && <Badge variant="destructive" className="animate-pulse shadow-xl">Live Preview Mode</Badge>}
            </div>

            {/* Performance Hub - Auto-injected if relevant */}
            {!isPreview && primaryStudentId && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
                     <PerformanceHub studentId={primaryStudentId} />
                </div>
            )}

            {visibleModules.map((module, idx) => {
                
                // HERO MODULE
                if (module.type === 'hero') {
                    // Determine which images to show
                    const images = (module.content.images && module.content.images.length > 0) 
                        ? module.content.images 
                        : (module.content.image_url ? [module.content.image_url] : []);

                    const [currentImageIndex, setCurrentImageIndex] = useState(0);

                    // Slideshow effect
                    useEffect(() => {
                        if (images.length <= 1) return;
                        const interval = setInterval(() => {
                            setCurrentImageIndex(prev => (prev + 1) % images.length);
                        }, 5000);
                        return () => clearInterval(interval);
                    }, [images.length]);

                    return (
                        <div key={module.id} className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
                             {/* Background Slideshow */}
                             <div className="absolute inset-0 z-0">
                                 <AnimatePresence mode="popLayout">
                                     {images.length > 0 ? (
                                         <motion.img 
                                            key={currentImageIndex}
                                            src={images[currentImageIndex]}
                                            initial={{ opacity: 0, scale: 1.1 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="absolute inset-0 w-full h-full object-cover" 
                                            alt="Hero Background" 
                                         />
                                     ) : (
                                         <div className="w-full h-full bg-[#1a1a1a]" />
                                     )}
                                 </AnimatePresence>
                                 <div className="absolute inset-0 bg-black/40 mix-blend-multiply z-10" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 z-10" />
                             </div>
                             
                             <div className="relative z-20 text-center max-w-5xl px-6">
                                 <motion.h1 
                                     initial={{ opacity: 0, y: 30 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     transition={{ duration: 0.8, delay: 0.2 }}
                                     className={`font-serif text-6xl ${!isMobilePreview ? 'md:text-8xl' : ''} text-white mb-6 leading-tight tracking-tight drop-shadow-lg`}
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
                                     className={`text-white/90 text-xl ${!isMobilePreview ? 'md:text-3xl' : ''} font-light tracking-wide max-w-3xl mx-auto drop-shadow-md`}
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
                                            <PlayCircle className="w-16 h-16" />
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
                    
                    const handlePayment = () => {
                        // Find first unpaid invoice with a link
                        const paymentLink = displayInvoices.find(inv => (inv.balance_due > 0 && inv.stripe_payment_link))?.stripe_payment_link;
                        
                        if (paymentLink && paymentLink !== '#') {
                            window.open(paymentLink, '_blank');
                        } else if (isPreview) {
                            toast.success("In live mode, this connects to your payment processor.");
                        } else {
                            toast.info("No online payment link available for this invoice.");
                        }
                    };

                    return (
                        <div key={module.id} className="py-16 px-6">
                            <div className="max-w-5xl mx-auto">
                                <motion.div 
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className={`bg-white rounded-[40px] p-8 ${!isMobilePreview ? 'md:p-16' : ''} shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col ${!isMobilePreview ? 'md:flex-row' : ''} items-center justify-between gap-12 relative overflow-hidden`}
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
                                        <Button 
                                            onClick={handlePayment}
                                            className="w-full bg-[#333333] text-white hover:bg-black rounded-full h-12 mt-2 shadow-lg hover:shadow-xl transition-all"
                                        >
                                            Pay Securely
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    );
                }

                // CLASS RECOMMENDATION MODULE
                if (module.type === 'class_recommendation') {
                    // Logic: Use specific class_ids if present, otherwise pick first 3 classes as a fallback
                    // In a real scenario, this would filter by student age/level
                    const recommendedClasses = (module.content.class_ids && module.content.class_ids.length > 0)
                        ? allClasses.filter(c => module.content.class_ids.includes(c.id))
                        : allClasses.slice(0, 3);

                    if (recommendedClasses.length === 0 && !isPreview) return null; // Hide if empty in real view

                    return (
                         <div key={module.id} className="max-w-6xl mx-auto px-6 py-20">
                             <div className="text-center mb-12">
                                <h2 className="font-serif text-3xl text-[#333333] mb-4">{module.content.title || 'Recommended Classes'}</h2>
                                <p className="text-gray-400 max-w-2xl mx-auto">Classes selected specifically for your dancer's level and interests.</p>
                             </div>
                             
                             <div className={`grid grid-cols-1 ${!isMobilePreview ? 'md:grid-cols-3' : ''} gap-6`}>
                                {recommendedClasses.length > 0 ? recommendedClasses.map(cls => (
                                    <motion.div 
                                        key={cls.id}
                                        whileHover={{ y: -5 }}
                                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                                {cls.style}
                                            </div>
                                            <div className="text-[#333333] font-serif italic text-sm">{cls.level || 'All Levels'}</div>
                                        </div>
                                        
                                        <h3 className="font-bold text-xl text-[#333333] mb-2 group-hover:text-indigo-600 transition-colors">{cls.title}</h3>
                                        
                                        <div className="space-y-2 mb-6">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar className="w-4 h-4 text-gray-300" />
                                                <span>{cls.day}s at {cls.start_time}:00</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Clock className="w-4 h-4 text-gray-300" />
                                                <span>{cls.duration} hrs • with {cls.teacher}</span>
                                            </div>
                                        </div>

                                        <Button className="w-full bg-white border border-gray-200 text-[#333333] hover:bg-[#333333] hover:text-white hover:border-[#333333] rounded-xl transition-all">
                                            Register Now
                                        </Button>
                                    </motion.div>
                                )) : (
                                    // Empty state for preview if no classes exist in DB
                                    [1, 2, 3].map(i => (
                                        <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-200 text-center flex flex-col items-center justify-center min-h-[250px] opacity-50">
                                            <Star className="w-8 h-8 text-gray-300 mb-2" />
                                            <p className="text-sm text-gray-400">Class Recommendation Placeholder</p>
                                        </div>
                                    ))
                                )}
                             </div>
                         </div>
                    );
                }

                // EVENT DETAILS CARD MODULE
                if (module.type === 'event_details_card') {
                    const perf = performances.find(p => p.id === module.content.performance_id);
                    if (!perf && !isPreview) return null;
                    
                    // Preview mock if needed
                    const displayPerf = perf || (isPreview ? {
                        title: "Winter Showcase 2025",
                        date: "2025-12-12",
                        venue: { venue_name: "Abbey Theater", formatted_address: "5600 Post Rd, Dublin, OH 43017" },
                        routines: [{ duration_seconds: 180 }, { duration_seconds: 240 }]
                    } : null);

                    if (!displayPerf) return null;

                    return (
                        <div key={module.id} className="max-w-5xl mx-auto px-6 py-12">
                            <EventDetailCard performance={displayPerf} />
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

                // SHARED TASK LIST MODULE
                if (module.type === 'task_list') {
                    return (
                        <div key={module.id} className="max-w-3xl mx-auto px-6 py-16">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="font-serif text-2xl text-[#333333]">{module.content.title || 'Your To-Do List'}</h3>
                                        <p className="text-gray-400 text-sm mt-1">Please complete these items before the session starts.</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#333333] text-white rounded-full flex items-center justify-center font-bold font-serif">
                                        {displayTasks.filter(t => t.status !== 'completed').length}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {displayTasks.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 italic">You're all caught up! No tasks pending.</div>
                                    ) : (
                                        displayTasks.map(task => (
                                            <div key={task.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/30">
                                                <div className={`mt-1 p-0.5 rounded-full ${task.status === 'completed' ? 'text-green-500' : 'text-gray-300'}`}>
                                                    {task.status === 'completed' ? <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Done</Badge> : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className={`font-bold text-[#333333] ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>{task.title}</h4>
                                                    {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                        {task.due_date && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" /> Due {task.due_date}
                                                            </span>
                                                        )}
                                                        {task.priority === 'high' && (
                                                            <span className="text-red-500 font-bold uppercase tracking-wider">High Priority</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    );
                }

                return null;
            })}

            {/* Footer */}
            {footer.show_footer && (
                <div className={`${footerBg} ${footerText} py-24 mt-24 transition-colors duration-500`}>
                    <div className={`max-w-5xl mx-auto px-6 grid grid-cols-1 ${!isMobilePreview ? 'md:grid-cols-3' : ''} gap-12 text-center ${!isMobilePreview ? 'md:text-left' : ''}`}>
                        <div>
                            <h3 className="font-serif text-3xl mb-6">{footer.title}</h3>
                            <p className="text-white/40 leading-relaxed text-sm whitespace-pre-line">
                                {footer.description}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold uppercase tracking-widest text-xs text-white/50 mb-6">Contact</h4>
                            <div className="space-y-4 text-sm text-white/70">
                                {footer.contact_email && (
                                    <p className="flex items-center justify-center md:justify-start gap-3 hover:text-white transition-colors cursor-pointer">
                                        <Mail className="w-4 h-4" /> {footer.contact_email}
                                    </p>
                                )}
                                {footer.contact_phone && (
                                    <p className="flex items-center justify-center md:justify-start gap-3 hover:text-white transition-colors cursor-pointer">
                                        <Phone className="w-4 h-4" /> {footer.contact_phone}
                                    </p>
                                )}
                                {footer.contact_address && (
                                    <p className="flex items-center justify-center md:justify-start gap-3 hover:text-white transition-colors cursor-pointer">
                                        <MapPin className="w-4 h-4" /> {footer.contact_address}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                             <h4 className="font-bold uppercase tracking-widest text-xs text-white/50 mb-6">Quick Links</h4>
                             <div className="space-y-3 text-sm text-white/70">
                                 <a href="#" className="block hover:text-white">Class Schedule</a>
                                 <a href="#" className="block hover:text-white">Terms & Policies</a>
                             </div>
                        </div>
                    </div>
                    <div className="max-w-5xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 text-center text-xs text-white/20">
                        © 2025 {footer.title}. Powered by Base44.
                    </div>
                </div>
            )}
        </div>
    );
}