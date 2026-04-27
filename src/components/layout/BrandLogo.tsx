import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  variant?: 'default' | 'mono';
}

export function BrandLogo({ className, variant = 'default' }: BrandLogoProps) {
  const loopColor = variant === 'mono' ? 'currentColor' : '#2E75B6';
  const letterColor = variant === 'mono' ? 'currentColor' : '#1F4E79';

  return (
    <svg
      viewBox="0 0 680 220"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden={true}
      focusable="false"
    >
      <path
        d="M 340 30 C 430 30, 500 80, 500 110 C 500 150, 440 185, 340 185 C 240 185, 180 150, 180 110 C 180 70, 250 30, 338 30"
        fill="none"
        stroke={loopColor}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M493 103L505 110L493 117"
        fill="none"
        stroke={loopColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="280"
        y1="70"
        x2="330"
        y2="70"
        stroke={letterColor}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1="305"
        y1="70"
        x2="305"
        y2="150"
        stroke={letterColor}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1="350"
        y1="70"
        x2="400"
        y2="70"
        stroke={letterColor}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1="350"
        y1="150"
        x2="400"
        y2="150"
        stroke={letterColor}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1="375"
        y1="70"
        x2="375"
        y2="150"
        stroke={letterColor}
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
