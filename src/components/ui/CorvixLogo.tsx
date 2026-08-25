'use client';

interface CorvixLogoProps {
  size?: number | string;
  className?: string;
}

export function CorvixLogo({ size = 44, className = '' }: CorvixLogoProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const numSize = typeof size === 'number' ? size : 44;

  return (
    <img
      src="/logo.png"
      alt="CORVIX"
      width={numSize}
      height={numSize}
      className={`shrink-0 object-contain ${className}`}
      style={{
        width: dimension,
        height: dimension,
        minWidth: dimension,
        minHeight: dimension,
        display: 'inline-block',
      }}
    />
  );
}

export default CorvixLogo;
