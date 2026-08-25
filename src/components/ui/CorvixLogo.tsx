'use client';

import React from 'react';

interface CorvixLogoProps {
  size?: number | string;
  className?: string;
}

export function CorvixLogo({ size = 44, className = '' }: CorvixLogoProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="115 75 282 360"
      width={dimension}
      height={dimension}
      className={`shrink-0 ${className}`}
      style={{
        width: dimension,
        height: dimension,
        minWidth: dimension,
        minHeight: dimension,
        display: 'inline-block',
      }}
    >
      <defs>
        <linearGradient id="corv_g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="corv_g2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="corv_dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      <g>
        {/* Top Dark Vault Wing */}
        <path
          d="M 256 80 L 380 152 L 380 220 L 256 148 L 132 220 L 132 152 Z"
          fill="#1e293b"
        />

        {/* Left Emerald Facet */}
        <path
          d="M 120 168 L 244 240 L 244 360 L 120 288 Z"
          fill="#10b981"
        />

        {/* Right Obsidian Facet */}
        <path
          d="M 392 168 L 392 288 L 268 360 L 268 240 Z"
          fill="#0f172a"
        />

        {/* Bottom Emerald Wing */}
        <path
          d="M 256 432 L 132 360 L 132 292 L 256 364 L 380 292 L 380 360 Z"
          fill="#059669"
        />

        {/* Center Precision Diamond Core */}
        <polygon
          points="256,204 316,256 256,308 196,256"
          fill="#34d399"
        />

        {/* Diamond Sparkle Star */}
        <polygon
          points="256,226 290,256 256,286 222,256"
          fill="#ffffff"
          opacity="0.98"
        />
      </g>
    </svg>
  );
}

export default CorvixLogo;
