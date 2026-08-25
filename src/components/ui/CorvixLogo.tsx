'use client';

interface CorvixLogoProps {
  size?: number | string;
  className?: string;
  variant?: 'shield' | 'badge' | 'print';
}

export function CorvixLogo({ size = 44, className = '', variant = 'shield' }: CorvixLogoProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
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
        <linearGradient id="cvx_slate" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="cvx_emerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="cvx_bright" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Background Badge Container */}
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="110"
        fill="url(#cvx_slate)"
      />

      {/* Emerald Outline Ring */}
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="110"
        fill="none"
        stroke="#10b981"
        strokeWidth="14"
        strokeOpacity="0.8"
      />

      {/* Outer Stylized 'C' Emblem (Protective Vault Arch) */}
      <path
        d="M 330 145 C 290 120 220 120 170 160 C 115 205 115 307 170 352 C 220 392 290 392 330 367 L 330 305 C 300 325 255 325 220 295 C 190 270 190 242 220 217 C 255 187 300 187 330 207 Z"
        fill="url(#cvx_emerald)"
      />

      {/* Top Security Chevron */}
      <polygon
        points="256,70 330,120 300,140 256,110 212,140 182,120"
        fill="#34d399"
      />

      {/* Central Financial Vault Core */}
      <circle
        cx="290"
        cy="256"
        r="54"
        fill="#0f172a"
        stroke="#10b981"
        strokeWidth="12"
      />

      {/* Diamond Sparkle (Precision & Cash Intelligence) */}
      <polygon
        points="290,224 299,247 322,256 299,265 290,288 281,265 258,256 281,247"
        fill="#ffffff"
      />

      {/* Small Glowing Center Point */}
      <circle cx="290" cy="256" r="5" fill="#34d399" />
    </svg>
  );
}

export default CorvixLogo;
