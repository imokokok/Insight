'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface ParticleNetworkProps {
  particleCount?: number;
  connectionDistance?: number;
  themeColor?: string;
}

const defaultProps = {
  particleCount: 60,
  connectionDistance: 150,
  themeColor: '#3b82f6',
};

export default function ParticleNetwork({
  particleCount = defaultProps.particleCount,
  connectionDistance = defaultProps.connectionDistance,
  themeColor = defaultProps.themeColor,
}: ParticleNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 2 + 2,
      });
    }
    particlesRef.current = particles;
  }, [particleCount]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const particles = particlesRef.current;
    const accentColor = '#8b5cf6';

    // 更新和绘制粒子
    particles.forEach((particle, i) => {
      // 更新位置
      particle.x += particle.vx;
      particle.y += particle.vy;

      // 边缘碰撞检测
      if (particle.x <= particle.radius || particle.x >= width - particle.radius) {
        particle.vx = -particle.vx;
        particle.x = Math.max(particle.radius, Math.min(width - particle.radius, particle.x));
      }
      if (particle.y <= particle.radius || particle.y >= height - particle.radius) {
        particle.vy = -particle.vy;
        particle.y = Math.max(particle.radius, Math.min(height - particle.radius, particle.y));
      }

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? accentColor : themeColor;
      ctx.fill();
    });

    // 绘制连线
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionDistance) {
          const opacity = 1 - (distance / connectionDistance);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(59, 130, 246, ${opacity * 0.5})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }, [connectionDistance, themeColor]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawParticles(ctx, canvas.width, canvas.height);

    animationRef.current = requestAnimationFrame(animate);
  }, [drawParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles(canvas.width, canvas.height);
    };

    handleResize();
    animate();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initParticles, animate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
