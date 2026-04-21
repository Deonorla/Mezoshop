import { cn } from '@/src/lib/utils';

interface LogoProps {
  /** 'dark' = dark bg (dapp interior), 'light' = light bg (landing scrolled), 'auto' = adapts via prop */
  variant?: 'dark' | 'light';
  className?: string;
  textClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 28, text: 'text-xs' },
  md: { icon: 34, text: 'text-sm' },
  lg: { icon: 44, text: 'text-base' },
};

export default function Logo({ variant = 'dark', className, textClassName, size = 'md' }: LogoProps) {
  const { icon: iconSize, text: textSize } = sizes[size];
  const isDark = variant === 'dark';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* SVG icon — inline so it renders everywhere without a network request */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" fill={isDark ? '#0D0D0D' : '#FFFFFF'} />
        {/* M letterform */}
        <path
          d="M6 23V9l10 9 10-9v14"
          stroke="#C9A84C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bitcoin dot */}
        <circle cx="26" cy="7" r="3.5" fill="#E8365D" />
        <text
          x="26"
          y="9.6"
          textAnchor="middle"
          fontSize="4.5"
          fontFamily="serif"
          fontWeight="bold"
          fill="white"
        >
          ₿
        </text>
      </svg>

      {/* Wordmark */}
      <span
        className={cn(
          'font-display font-black tracking-[0.12em] uppercase leading-none',
          textSize,
          isDark ? 'text-white' : 'text-mezo-ink',
          textClassName,
        )}
      >
        MezoShop
      </span>
    </div>
  );
}
