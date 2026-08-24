'use client';

interface CorvixLogoProps {
  size?: number | string;
  className?: string;
}

export function CorvixLogo({ size = 40, className = '' }: CorvixLogoProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src="/corvix-logo.svg"
      alt="CORVIX"
      width={typeof size === 'number' ? size : 40}
      height={typeof size === 'number' ? size : 40}
      style={{ width: dimension, height: dimension }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

export default CorvixLogo;
