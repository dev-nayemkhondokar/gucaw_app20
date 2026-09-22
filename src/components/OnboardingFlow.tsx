import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Check,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { BRAND } from '../config/brand';
import { GochaoAppIcon } from './GochaoLogo';
import { useLanguage } from '../contexts/LanguageContext';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 2; // Slide 0 (Welcome / Brand Identity), Slide 1 (Call-To-Action / Get Started)

  // Touch swipe gesture support
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;

    if (isLeftSwipe && currentSlide < totalSlides - 1) {
      setCurrentSlide(1);
    } else if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(0);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentSlide < totalSlides - 1) {
        setCurrentSlide(1);
      } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
        setCurrentSlide(0);
      } else if (e.key === 'Escape') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, onComplete]);

  return (
    <div
      id="onboarding-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#f4fbf7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none overflow-hidden"
    >
      {/* ========================================================================= */}
      {/* 100% SOLID OPAQUE BRAND BACKGROUND GRADIENT & CURVED GEOMETRIC ACCENTS */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-gradient-to-b from-[#eafaf1] via-[#f4fbf7] to-[#eef7f2] dark:from-[#020617] dark:via-[#032317] dark:to-[#020617]" aria-hidden="true">
        {/* Noticeable & Rich Dark Green Corner Gradient (18-20% opacity) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,78,59,0.20)_0%,rgba(5,46,22,0.12)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(5,150,105,0.30)_0%,rgba(6,78,59,0.18)_50%,transparent_80%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/[0.18] via-emerald-800/[0.08] to-transparent dark:from-emerald-900/[0.25] dark:via-emerald-950/[0.15]" />

        {/* Ambient Radial Lights */}
        <div className="absolute -top-16 -left-16 w-96 h-96 rounded-full bg-emerald-700/20 dark:bg-emerald-500/18 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-88 h-88 rounded-full bg-green-700/15 dark:bg-emerald-600/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-88 h-88 rounded-full bg-teal-800/15 dark:bg-teal-600/12 blur-3xl" />

        {/* Elegant Curved Geometry (Subtle stroke arcs) */}
        <svg
          className="absolute inset-0 w-full h-full opacity-50 dark:opacity-25 stroke-emerald-600 dark:stroke-emerald-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          <defs>
            <linearGradient id="curve-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#065F46" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="90%" cy="15%" r="180" stroke="url(#curve-grad)" strokeWidth="1.4" strokeDasharray="4 4" />
          <circle cx="90%" cy="15%" r="240" stroke="url(#curve-grad)" strokeWidth="1.2" />
          <path
            d="M -50,320 Q 150,220 320,380 T 600,280"
            stroke="url(#curve-grad)"
            strokeWidth="1.5"
          />
          <path
            d="M -30,360 Q 180,260 340,420 T 620,320"
            stroke="url(#curve-grad)"
            strokeWidth="1.2"
            strokeDasharray="6 6"
          />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 1. MINIMAL & BALANCED HEADER */}
      {/* Left: Small Logo + Brand Name. Right: Subtle, unboxed "Skip" button */}
      {/* ========================================================================= */}
      <header className="w-full max-w-md px-6 pt-4 pb-2 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <GochaoAppIcon size="xs" className="w-7 h-7 rounded-lg shadow-2xs" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-sans">
              {BRAND.name}
            </span>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
              ({BRAND.banglaName})
            </span>
          </div>
        </div>

        <button
          id="onboarding-skip-btn"
          type="button"
          onClick={onComplete}
          aria-label={language === 'bn' ? 'স্কিপ করে সরাসরি অ্যাপে যান' : 'Skip and go to app'}
          className="text-xs font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 cursor-pointer active:scale-95"
        >
          {language === 'bn' ? 'স্কিপ' : 'Skip'}
        </button>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN SLIDE CAROUSEL AREA (EXACTLY 2 SLIDES) */}
      {/* min-h-0 prevents flexbox child from expanding and pushing footer offscreen */}
      {/* ========================================================================= */}
      <main className="w-full max-w-md flex-1 min-h-0 flex flex-col justify-center px-6 py-2 overflow-y-auto relative z-10">
        <AnimatePresence mode="wait">
          {/* --------------------------------------------------------------------- */}
          {/* SLIDE 0: WELCOME & BRAND IDENTITY */}
          {/* --------------------------------------------------------------------- */}
          {currentSlide === 0 && (
            <motion.div
              key="slide-welcome"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex flex-col items-center text-center my-auto space-y-4 sm:space-y-6 py-2"
            >
              {/* Gochao "G" App Logo: Green background (#16A34A), white G with subtle ambient glow */}
              <div className="relative pt-1">
                <div className="absolute inset-1 bg-green-500/25 dark:bg-green-500/30 rounded-3xl blur-xl" />
                <GochaoAppIcon
                  size="xl"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shadow-xl relative border border-white/80 dark:border-white/10"
                />
              </div>

              {/* App Name & Tagline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {BRAND.name}
                  </h1>
                  <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-100/90 dark:bg-green-950/80 px-2 py-0.5 rounded-md border border-green-300/80 dark:border-green-800">
                    {BRAND.banglaName}
                  </span>
                </div>

                <p className="text-sm sm:text-base font-bold text-green-700 dark:text-green-400 tracking-tight">
                  {language === 'bn' ? BRAND.tagline : 'Smart, Simple & Secure Personal Money Manager'}
                </p>
              </div>

              {/* Minimal Description */}
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
                {language === 'bn'
                  ? 'আপনার দৈনন্দিন আয়-ব্যয়, বাজেট ও আর্থিক জীবনের সহজ সমাধান। ১০০% অফলাইন ও সম্পূর্ণ নিরাপদ।'
                  : 'Manage your daily income, expenses, budget, and finances effortlessly. 100% offline and secure.'}
              </p>

              {/* Refined Feature Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full shadow-2xs">
                  <Zap className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <span>{language === 'bn' ? 'অফলাইন-ফার্স্ট' : 'Offline-First'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <span>{language === 'bn' ? 'ডেটা সুরক্ষা' : 'Data Privacy'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <span>{language === 'bn' ? 'এআই সহকারী' : 'AI Assistant'}</span>
                </span>
              </div>
            </motion.div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SLIDE 1: CALL-TO-ACTION & READY TO START */}
          {/* --------------------------------------------------------------------- */}
          {currentSlide === 1 && (
            <motion.div
              key="slide-cta"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex flex-col items-center text-center my-auto space-y-4 sm:space-y-6 py-2"
            >
              {/* Premium Feature Card Preview */}
              <div className="w-full max-w-xs bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-400 flex items-center justify-center font-bold text-xs">
                      ৳
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {language === 'bn' ? 'সবকিছু প্রস্তুত' : 'All Set & Ready'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {language === 'bn' ? 'কোনো সাইনআপ বা ইন্টারনেটের বাধ্যবাধকতা নেই' : 'No sign-up or internet connection required'}
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                </div>

                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>{language === 'bn' ? 'এক ক্লিকে আয় ও ব্যয়ের হিসাব রেকর্ড' : 'Track income and expenses in a single tap'}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>{language === 'bn' ? 'ক্যাটাগরি ভিত্তিক খরচ ও মাসিক বাজেট পর্যবেক্ষণ' : 'Monitor category spending & monthly budgets'}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>{language === 'bn' ? 'বাংলা ও ইংলিশে ব্যক্তিগত এআই আর্থিক সহকারী' : 'Smart AI financial assistant in Bangla & English'}</span>
                  </div>
                </div>
              </div>

              {/* Caption & Title */}
              <div className="space-y-1.5">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {language === 'bn' ? 'শুরু করতে প্রস্তুত?' : 'Ready to begin?'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
                  {language === 'bn'
                    ? 'আপনার ডিভাইস থেকেই সবকিছু নিয়ন্ত্রিত হবে। নিচের বাটনে চাপ দিয়ে সরাসরি আপনার পার্সোনাল অ্যাকাউন্টে প্রবেশ করুন।'
                    : 'Everything stays privately on your device. Tap below to launch your personal finance account.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ========================================================================= */}
      {/* 3. BOTTOM CONTROLS: EXACTLY 2 PROGRESS DOTS & PRIMARY ACTION BUTTON */}
      {/* shrink-0 and z-20 ensure it is ALWAYS visible and never pushed offscreen */}
      {/* ========================================================================= */}
      <footer className="w-full max-w-md px-6 pb-6 pt-2 space-y-3 shrink-0 z-20 relative">
        {/* Exactly 2 Pagination Dots */}
        <div className="flex items-center justify-center gap-1.5" aria-label={language === 'bn' ? 'স্লাইড নেভিগেশন' : 'Slide navigation'}>
          <button
            type="button"
            onClick={() => setCurrentSlide(0)}
            aria-label={language === 'bn' ? 'স্লাইড ১: স্বাগতম' : 'Slide 1: Welcome'}
            className={`h-1.5 transition-all rounded-full cursor-pointer ${
              currentSlide === 0
                ? 'w-6 bg-green-600'
                : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
            }`}
          />
          <button
            type="button"
            onClick={() => setCurrentSlide(1)}
            aria-label={language === 'bn' ? 'স্লাইড ২: শুরু করুন' : 'Slide 2: Get Started'}
            className={`h-1.5 transition-all rounded-full cursor-pointer ${
              currentSlide === 1
                ? 'w-6 bg-green-600'
                : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
            }`}
          />
        </div>

        {/* Primary Action Button */}
        <div>
          {currentSlide === 0 ? (
            <button
              id="onboarding-next-btn"
              type="button"
              onClick={() => setCurrentSlide(1)}
              className="w-full h-12 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white text-sm font-bold rounded-2xl shadow-md transition-all cursor-pointer"
            >
              <span>{language === 'bn' ? 'পরবর্তী' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="onboarding-prev-btn"
                type="button"
                onClick={() => setCurrentSlide(0)}
                aria-label={language === 'bn' ? 'পূর্ববর্তী স্লাইড' : 'Previous slide'}
                className="h-12 w-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                id="onboarding-start-btn"
                type="button"
                onClick={onComplete}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white text-sm font-bold rounded-2xl shadow-md transition-all cursor-pointer"
              >
                <span>{language === 'bn' ? 'শুরু করুন' : 'Get Started'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
