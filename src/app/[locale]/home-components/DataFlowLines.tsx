"use client";

import { useEffect, useState } from "react";

interface LineConfig {
  id: number;
  top: string;
  duration: number;
  delay: number;
  opacity: number;
  blur: number;
}

const linesConfig: LineConfig[] = [
  { id: 1, top: "10%", duration: 25, delay: 0, opacity: 0.2, blur: 2 },
  { id: 2, top: "20%", duration: 35, delay: 2, opacity: 0.15, blur: 3 },
  { id: 3, top: "30%", duration: 20, delay: 4, opacity: 0.25, blur: 1 },
  { id: 4, top: "40%", duration: 40, delay: 1, opacity: 0.1, blur: 4 },
  { id: 5, top: "50%", duration: 30, delay: 3, opacity: 0.2, blur: 2 },
  { id: 6, top: "60%", duration: 22, delay: 5, opacity: 0.15, blur: 3 },
  { id: 7, top: "70%", duration: 38, delay: 2.5, opacity: 0.25, blur: 1 },
  { id: 8, top: "80%", duration: 28, delay: 1.5, opacity: 0.1, blur: 4 },
  { id: 9, top: "90%", duration: 32, delay: 4.5, opacity: 0.2, blur: 2 },
];

export default function DataFlowLines() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {linesConfig.map((line) => (
        <div
          key={line.id}
          className="absolute h-px w-full"
          style={{
            top: line.top,
            opacity: line.opacity,
            filter: `blur(${line.blur}px)`,
          }}
        >
          <div
            className="h-full w-1/3 animate-flow"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #3b82f6 20%, #8b5cf6 80%, transparent 100%)",
              boxShadow:
                "0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)",
              animationDuration: `${line.duration}s`,
              animationDelay: `${line.delay}s`,
            }}
          />
        </div>
      ))}

      <style jsx>{`
        @keyframes flow {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        .animate-flow {
          animation: flow linear infinite;
        }
      `}</style>
    </div>
  );
}
