import React from 'react';
import { BRAND } from '../config/brand';

export interface GochaoLogoProps {
  variant?: 'icon' | 'app-icon' | 'header' | 'splash';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

/**
 * Pure SVG Gochao G Lettermark
 * Professional, clean geometric "G" with an integrated subtle checkmark flow
 * signifying organization, financial health, and completion.
 */
export const GochaoGSymbol: React.FC<{
  className?: string;
  strokeWidth?: number;
  color?: string;
}> = ({ className = 'w-6 h-6', strokeWidth = 10.5, color = 'currentColor' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 75 25 C 67 16 57.5 13 47.5 13 C 27 13 13 28.5 13 50 C 13 71.5 27 87 47.5 87 C 68 87 83 72.5 84 52 L 84 48 L 50 61 L 38 49"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Dedicated Gochao Android App Icon
 * Clean green background (#16A34A) with crisp white G symbol.
 * Uses modern rounded Android squircle proportions with no text.
 */
export const GochaoAppIcon: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  roundedClass?: string;
}> = ({ size = 'md', className = '', roundedClass }) => {
  const sizeMap = {
    xs: { box: 'w-6 h-6', icon: 'w-3.5 h-3.5', round: 'rounded-lg' },
    sm: { box: 'w-8 h-8', icon: 'w-5 h-5', round: 'rounded-xl' },
    md: { box: 'w-10 h-10', icon: 'w-6 h-6', round: 'rounded-2xl' },
    lg: { box: 'w-14 h-14', icon: 'w-8 h-8', round: 'rounded-2xl' },
    xl: { box: 'w-20 h-20', icon: 'w-12 h-12', round: 'rounded-3xl' },
  };

  const config = sizeMap[size];
  const roundRadius = roundedClass || config.round;

  return (
    <div
      className={`inline-flex items-center justify-center bg-green-600 text-white shadow-xs shrink-0 select-none ${config.box} ${roundRadius} ${className}`}
      style={{ backgroundColor: BRAND.colors.primaryGreen }}
      aria-label={`${BRAND.name} App Icon`}
    >
      <GochaoGSymbol className={config.icon} strokeWidth={11} color="#FFFFFF" />
    </div>
  );
};

/**
 * Gochao Brand Logo Component
 * Supports multiple variants for app header, splash branding, and icons.
 */
export const GochaoLogo: React.FC<GochaoLogoProps> = ({
  variant = 'header',
  size = 'md',
  className = '',
  showTagline = false,
}) => {
  if (variant === 'icon') {
    return <GochaoGSymbol className={className} />;
  }

  if (variant === 'app-icon') {
    return <GochaoAppIcon size={size} className={className} />;
  }

  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <GochaoAppIcon size="sm" />
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              {BRAND.name}
            </span>
            <span className="text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800/50">
              {BRAND.banglaName}
            </span>
          </div>
          {showTagline && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              {BRAND.tagline}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Splash / Hero Branding Variant
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      <GochaoAppIcon size="xl" className="shadow-md mb-3" />
      <div className="flex items-center gap-2 justify-center mb-1">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {BRAND.name}
        </h2>
        <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/80 px-2 py-0.5 rounded-md border border-green-200 dark:border-green-800/60">
          {BRAND.banglaName}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {BRAND.tagline}
      </p>
    </div>
  );
};

/**
 * Gochao AI Assistant Icon
 * Distinctive, modern visual identity for Gochao AI Assistant:
 * Combines a clean geometric conversation bubble with an integrated
 * four-point intelligent core spark and smart neural node.
 * Uses Gochao green brand styling, avoiding generic multi-star sparkles.
 */
export const GochaoAIIcon: React.FC<{
  className?: string;
  size?: number | string;
  color?: string;
}> = ({ className = 'w-5 h-5', color = 'currentColor' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Precision geometric chat bubble with curved organic tail */}
      <path
        d="M20 11.5C20 15.642 16.418 19 12 19C10.748 19 9.563 18.724 8.508 18.231L4 19.5L5.228 15.817C4.461 14.57 4 13.094 4 11.5C4 7.358 7.582 4 12 4C16.418 4 20 7.358 20 11.5Z"
        stroke={color}
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central intelligent AI spark diamond */}
      <path
        d="M12 7.5L12.95 10.55L16 11.5L12.95 12.45L12 15.5L11.05 12.45L8 11.5L11.05 10.55L12 7.5Z"
        fill={color}
      />
      {/* Intelligent companion node */}
      <circle cx="16.5" cy="7.5" r="1" fill={color} />
    </svg>
  );
};

/**
 * Gochao AI Assistant Rounded Badge / Avatar
 * Features Gochao's signature primary green background squircle
 * with the crisp white Gochao AI Icon.
 */
export const GochaoAIAssistantBadge: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    xs: { box: 'w-6 h-6', icon: 'w-3.5 h-3.5', round: 'rounded-lg' },
    sm: { box: 'w-8 h-8', icon: 'w-4.5 h-4.5', round: 'rounded-xl' },
    md: { box: 'w-9 h-9', icon: 'w-5 h-5', round: 'rounded-xl' },
    lg: { box: 'w-12 h-12', icon: 'w-7 h-7', round: 'rounded-2xl' },
  };
  const config = sizeMap[size];

  return (
    <div
      className={`inline-flex items-center justify-center bg-emerald-600 text-white shadow-2xs shrink-0 select-none ${config.box} ${config.round} ${className}`}
      style={{ backgroundColor: BRAND.colors.primaryGreen }}
      aria-label="গোছাও AI সহকারী"
    >
      <GochaoAIIcon className={`${config.icon} text-white`} color="#FFFFFF" />
    </div>
  );
};

