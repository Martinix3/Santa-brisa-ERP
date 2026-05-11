/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/projects/components/ProgressCircle.tsx
"use client";

import React from "react";

interface ProgressCircleProps {
  progress: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  className?: string;
}

export function ProgressCircle({
  progress,
  size = 100,
  strokeWidth = 4,
  className = "",
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div 
        className="rounded-full bg-secondary/30 flex items-center justify-center"
        style={{ 
          width: size, 
          height: size,
          border: '4px solid hsl(var(--border))'
        }}
      >
        <svg
          width={size - 8}
          height={size - 8}
          className="transform -rotate-90 absolute"
        >
          {/* Background circle */}
          <circle
            cx={(size - 8) / 2}
            cy={(size - 8) / 2}
            r={radius - 4}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />
          {/* Progress circle */}
          <circle
            cx={(size - 8) / 2}
            cy={(size - 8) / 2}
            r={radius - 4}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Percentage text */}
        <div className="relative z-10 text-center">
          <div className="text-2xl font-bold text-primary">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    </div>
  );
}
