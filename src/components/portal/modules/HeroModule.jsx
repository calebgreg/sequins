import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeroModule({ module, isMobilePreview }) {
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