'use client';

interface CorvixLogoProps {
  size?: number | string;
  className?: string;
}

export function CorvixLogo({ size = 48, className = '' }: CorvixLogoProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="110 70 292 372"
      style={{ width: dimension, height: dimension }}
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="clogo_green_left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="clogo_green_right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="clogo_green_bottom" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="clogo_dark_top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      <g>
        {/* Top Dark Vault Arch */}
        <path
          d="M 256 80 L 380 152 L 380 220 L 256 148 L 132 220 L 132 152 Z"
          fill="url(#clogo_dark_top)"
        />

        {/* Left Vibrant Emerald Facet */}
        <path
          d="M 120 168 L 244 240 L 244 360 L 120 288 Z"
          fill="url(#clogo_green_left)"
        />

        {/* Right Deep Emerald Facet (Balanced & High Contrast) */}
        <path
          d="M 392 168 L 392 288 L 268 360 L 268 240 Z"
          fill="url(#clogo_green_right)"
        />

        {/* Bottom Emerald Shield Anchor */}
        <path
          d="M 256 432 L 132 360 L 132 292 L 256 364 L 380 292 L 380 360 Z"
          fill="url(#clogo_green_bottom)"
        />

        {/* Center Emerald Diamond Core */}
        <polygon
          points="256,204 316,256 256,308 196,256"
          fill="#10b981"
        />

        {/* Center Brilliant White Diamond */}
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
