import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

// SVG cloud path generator
function CloudShape({ cx, cy, scale = 1, opacity = 1, blur = 0 }) {
  return (
    <ellipse
      cx={cx} cy={cy}
      rx={120 * scale} ry={80 * scale}
      fill="white"
      opacity={opacity}
      style={{ filter: blur ? `blur(${blur}px)` : undefined }}
    />
  );
}

export default function CloudHero() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const cloudsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize cloud puffs
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const makeCloud = (x, y, size, speed, depth) => ({
      x, y, size, speed, depth,
      puffs: Array.from({ length: Math.floor(5 + Math.random() * 5) }, (_, i) => ({
        dx: (i - 2) * size * 0.55 + (Math.random() - 0.5) * size * 0.3,
        dy: (Math.random() - 0.5) * size * 0.4,
        r: size * (0.5 + Math.random() * 0.6),
      })),
      opacity: 0.55 + Math.random() * 0.35,
    });

    cloudsRef.current = [
      // Back layer (slow, big)
      makeCloud(W() * 0.1, H() * 0.55, 130, 0.12, 0),
      makeCloud(W() * 0.35, H() * 0.65, 160, 0.09, 0),
      makeCloud(W() * 0.65, H() * 0.6, 145, 0.11, 0),
      makeCloud(W() * 0.9, H() * 0.7, 120, 0.13, 0),
      // Mid layer
      makeCloud(W() * 0.05, H() * 0.45, 100, 0.2, 1),
      makeCloud(W() * 0.25, H() * 0.5, 115, 0.17, 1),
      makeCloud(W() * 0.55, H() * 0.48, 130, 0.19, 1),
      makeCloud(W() * 0.78, H() * 0.52, 105, 0.22, 1),
      makeCloud(W() * 1.1, H() * 0.47, 120, 0.18, 1),
      // Front layer (fast, sharp)
      makeCloud(W() * -0.05, H() * 0.72, 85, 0.35, 2),
      makeCloud(W() * 0.2, H() * 0.78, 95, 0.3, 2),
      makeCloud(W() * 0.5, H() * 0.75, 100, 0.32, 2),
      makeCloud(W() * 0.75, H() * 0.8, 80, 0.38, 2),
      makeCloud(W() * 1.05, H() * 0.73, 90, 0.33, 2),
    ];

    const drawCloud = (cloud, w, h) => {
      const depthBlur = [18, 8, 2][cloud.depth];
      const depthOpacity = [0.7, 0.85, 1][cloud.depth];

      ctx.save();
      ctx.filter = `blur(${depthBlur}px)`;

      cloud.puffs.forEach((puff, i) => {
        const px = cloud.x + puff.dx;
        const py = cloud.y + puff.dy;

        // Layered gradient per puff
        const grad = ctx.createRadialGradient(
          px, py - puff.r * 0.2, puff.r * 0.1,
          px, py, puff.r
        );

        if (cloud.depth === 0) {
          // Back: deep rosy purple
          grad.addColorStop(0, `rgba(255, 210, 210, ${cloud.opacity * depthOpacity})`);
          grad.addColorStop(0.4, `rgba(230, 175, 185, ${cloud.opacity * depthOpacity * 0.85})`);
          grad.addColorStop(1, `rgba(190, 130, 155, 0)`);
        } else if (cloud.depth === 1) {
          // Mid: warm pink
          grad.addColorStop(0, `rgba(255, 235, 235, ${cloud.opacity * depthOpacity})`);
          grad.addColorStop(0.35, `rgba(250, 200, 205, ${cloud.opacity * depthOpacity * 0.9})`);
          grad.addColorStop(1, `rgba(220, 160, 175, 0)`);
        } else {
          // Front: bright, creamy highlight
          grad.addColorStop(0, `rgba(255, 250, 250, ${cloud.opacity * depthOpacity})`);
          grad.addColorStop(0.3, `rgba(255, 225, 225, ${cloud.opacity * depthOpacity * 0.92})`);
          grad.addColorStop(1, `rgba(240, 185, 195, 0)`);
        }

        ctx.beginPath();
        ctx.arc(px, py, puff.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      ctx.restore();
    };

    let t = 0;
    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#c8667a');
      sky.addColorStop(0.3, '#d4809a');
      sky.addColorStop(0.65, '#e8a8b8');
      sky.addColorStop(1, '#f0c8d0');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Subtle golden glow from upper-right
      const glow = ctx.createRadialGradient(w * 0.75, h * 0.1, 0, w * 0.75, h * 0.1, w * 0.6);
      glow.addColorStop(0, 'rgba(255, 210, 150, 0.28)');
      glow.addColorStop(1, 'rgba(255, 200, 180, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      t += 0.003;

      // Sort back to front
      const sorted = [...cloudsRef.current].sort((a, b) => a.depth - b.depth);

      sorted.forEach(cloud => {
        // Gentle sine drift + scroll
        cloud.x -= cloud.speed;
        cloud.y += Math.sin(t + cloud.x * 0.005) * 0.18;

        // Wrap around
        if (cloud.x < -300) {
          cloud.x = w + 200 + Math.random() * 200;
          cloud.y = h * (0.4 + Math.random() * 0.45);
        }

        drawCloud(cloud, w, h);
      });

      // Soft vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(150, 60, 80, 0.18)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Canvas sky */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Frosted glass content card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center px-6 pt-28 pb-16 max-w-4xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            background: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.35)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-white opacity-80" />
          <span className="text-xs font-bold uppercase tracking-widest text-white opacity-80">Dance Studio Operating System</span>
        </motion.div>

        <h1
          className="text-6xl md:text-8xl font-bold tracking-tight leading-[0.9] mb-8 drop-shadow-sm"
          style={{
            color: 'white',
            textShadow: '0 2px 20px rgba(140,60,80,0.3), 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          Run your studio<br />
          <span style={{ opacity: 0.75 }}>without the chaos.</span>
        </h1>

        <p
          className="text-lg md:text-xl max-w-xl mx-auto leading-relaxed mb-10"
          style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 8px rgba(140,60,80,0.3)' }}
        >
          Sequins is the complete platform for dance studios — enrollment, scheduling, billing, and AI-powered insights in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#waitlist">
            <button
              className="h-14 px-10 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.98] hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.22)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(140,60,80,0.25), inset 0 1px 1px rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.4)',
              }}
            >
              Get Early Access <ArrowRight className="inline w-4 h-4 ml-1" />
            </button>
          </a>
          <a href="#features">
            <button
              className="h-14 px-10 rounded-2xl text-base font-medium transition-all"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                color: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              See how it works <ChevronDown className="inline w-4 h-4 ml-1" />
            </button>
          </a>
        </div>

        <p className="mt-6 text-sm flex items-center justify-center gap-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: 'rgba(200,240,210,0.9)' }} />
          Free 30-day trial · No credit card required
        </p>
      </motion.div>

      {/* Bottom fade into white */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }}
      />
    </section>
  );
}