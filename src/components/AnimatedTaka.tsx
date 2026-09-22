import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface AnimatedTakaProps {
  amountPoisha: number;
  prefix?: string;
  suffix?: string;
  isPrivacyMode?: boolean;
  className?: string;
  duration?: number; // duration in ms, default 320ms
  showDecimalIfZero?: boolean;
}

export const AnimatedTaka: React.FC<AnimatedTakaProps> = ({
  amountPoisha,
  prefix = '',
  suffix = '',
  isPrivacyMode = false,
  className = '',
  duration = 320,
  showDecimalIfZero = false,
}) => {
  const { formatTaka } = useLanguage();
  const safeTarget = typeof amountPoisha === 'number' && !isNaN(amountPoisha) && isFinite(amountPoisha)
    ? amountPoisha
    : 0;


  const [currentPoisha, setCurrentPoisha] = useState<number>(safeTarget);
  const prevAmountRef = useRef<number>(safeTarget);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPrivacyMode) {
      prevAmountRef.current = safeTarget;
      setCurrentPoisha(safeTarget);
      return;
    }

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrentPoisha(safeTarget);
      prevAmountRef.current = safeTarget;
      return;
    }

    const startValue = prevAmountRef.current;
    const endValue = safeTarget;

    if (startValue === endValue) {
      setCurrentPoisha(endValue);
      return;
    }

    const startTime = performance.now();
    const diff = endValue - startValue;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth ease-out cubic curve (snappy, fast start, soft settle)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + diff * easeOut);

      setCurrentPoisha(nextValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentPoisha(endValue);
        prevAmountRef.current = endValue;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [safeTarget, duration, isPrivacyMode]);

  if (isPrivacyMode) {
    return <span className={className}>•••••• ৳</span>;
  }

  return (
    <span className={className}>
      {prefix}
      {formatTaka(currentPoisha, showDecimalIfZero)}
      {suffix}
    </span>
  );
};
