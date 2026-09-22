import React from 'react';
import { motion } from 'motion/react';

interface AnimatedProgressBarProps {
  percentage: number;
  color?: string;
  heightClass?: string;
  bgClass?: string;
  className?: string;
  duration?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  percentage,
  color,
  heightClass = 'h-2',
  bgClass = 'bg-gray-100',
  className = '',
  duration = 0.4,
}) => {
  const safePercent = typeof percentage === 'number' && !isNaN(percentage) && isFinite(percentage)
    ? percentage
    : 0;
  const clamped = Math.min(100, Math.max(0, Math.round(safePercent)));

  return (
    <div className={`w-full rounded-full overflow-hidden ${heightClass} ${bgClass} ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
        className="h-full rounded-full transition-colors"
        style={color ? { backgroundColor: color } : undefined}
      />
    </div>
  );
};
