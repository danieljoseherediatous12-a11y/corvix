'use client';

interface CorvixLogoProps {
  size?: number | string;
  className?: string;
}

export function CorvixLogo({ size = 40, className = '' }: CorvixLogoProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={dimension}
      height={dimension}
      className={`shrink-0 ${className}`}
      style={{ width: dimension, height: dimension, minWidth: dimension, minHeight: dimension }}
    >
      <defs>
        <linearGradient id="crvx_green1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981"/>
          <stop offset="100%" stopColor="#059669"/>
        </linearGradient>
        <linearGradient id="crvx_green2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399"/>
          <stop offset="100%" stopColor="#10b981"/>
        </linearGradient>
        <linearGradient id="crvx_dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
      </defs>

      <g>
        {/* Top Dark Wing */}
        <path d="M 256 70 L 400 152 L 400 230 L 256 148 L 112 230 L 112 152 Z" fill="url(#crvx_dark)"/>
        {/* Left Green Wing */}
        <path d="M 100 170 L 244 250 L 244 380 L 100 300 Z" fill="url(#crvx_green1)"/>
        {/* Right Dark Wing */}
        <path d="M 412 170 L 412 300 L 268 380 L 268 250 Z" fill="url(#crvx_dark)"/>
        {/* Bottom Green Anchor */}
        <path d="M 256 445 L 112 360 L 112 285 L 256 365 L 400 285 L 400 360 Z" fill="url(#crvx_green2)"/>
        {/* Center Emerald Diamond Core */}
        <polygon points="256,195 330,256 256,317 182,256" fill="#10b981"/>
        {/* Center White Sparkle */}
        <polygon points="256,220 295,256 256,292 217,256" fill="#ffffff"/>
      </g>
    </svg>
  );
}

export default CorvixLogo;
