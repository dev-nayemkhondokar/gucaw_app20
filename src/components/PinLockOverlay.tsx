import React, { useState, useEffect } from 'react';
import { Fingerprint } from 'lucide-react';
import { securityUtils } from '../utils/securityUtils';
import { BRAND } from '../config/brand';
import { GochaoAppIcon } from './GochaoLogo';
import { useLanguage } from '../contexts/LanguageContext';

interface PinLockOverlayProps {
  onUnlock: () => void;
}

export const PinLockOverlay: React.FC<PinLockOverlayProps> = ({ onUnlock }) => {
  const { language } = useLanguage();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<string | null>(null);

  const isBiometricEnabled = localStorage.getItem('plm_biometric_enabled') === 'true';

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === 4) {
        if (securityUtils.verifyPin(newPin)) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleBiometricUnlock = async () => {
    setBiometricStatus(language === 'bn' ? 'বায়োমেট্রিক স্ক্যান করা হচ্ছে...' : 'Scanning biometrics...');
    try {
      const success = await securityUtils.triggerBiometricAuth();
      if (success) {
        setBiometricStatus(language === 'bn' ? 'সফলভাবে শনাক্ত হয়েছে!' : 'Verified successfully!');
        setTimeout(() => {
          onUnlock();
        }, 300);
      } else {
        setBiometricStatus(language === 'bn' ? 'শনাক্ত করা যায়নি। পিন দিয়ে চেষ্টা করুন।' : 'Verification failed. Try with PIN.');
        setTimeout(() => setBiometricStatus(null), 2500);
      }
    } catch {
      setBiometricStatus(language === 'bn' ? 'ফিঙ্গারপ্রিন্ট স্ক্যান ব্যর্থ হয়েছে। পিন দিন।' : 'Biometric scan failed. Enter PIN.');
      setTimeout(() => setBiometricStatus(null), 2500);
    }
  };

  useEffect(() => {
    if (isBiometricEnabled) {
      // Small delay for smooth overlay appearance
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isBiometricEnabled]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="flex flex-col items-center mb-6 text-center">
        <GochaoAppIcon size="xl" className="shadow-xl mb-3" />
        <div className="flex items-center gap-1.5 justify-center mb-1">
          <h1 className="text-2xl font-black tracking-tight text-white">{BRAND.name}</h1>
          <span className="text-xs font-bold text-green-400 bg-green-950/80 px-2 py-0.5 rounded-md border border-green-800/60">
            {BRAND.banglaName}
          </span>
        </div>
        <p className="text-xs text-green-300 font-medium">
          {language === 'bn' ? BRAND.tagline : 'Smart, Simple & Secure Personal Money Manager'}
        </p>
        <p className="text-xs text-slate-400 mt-3 font-normal">
          {language === 'bn' ? 'আপনার ৪ সংখ্যার পিন কোড দিন' : 'Enter your 4-digit PIN code'}
        </p>
      </div>

      {/* Pin Dots */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map((idx) => {
          const isFilled = pin.length > idx;
          return (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                error
                  ? 'bg-rose-500 scale-110'
                  : isFilled
                  ? 'bg-green-500 scale-110'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            />
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-rose-400 font-semibold mb-4 animate-bounce">
          {language === 'bn' ? 'ভুল পিন কোড! আবার চেষ্টা করুন' : 'Incorrect PIN! Please try again'}
        </p>
      )}

      {biometricStatus && (
        <p className="text-xs text-green-400 font-medium mb-4 animate-pulse">
          {biometricStatus}
        </p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3.5 max-w-xs w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleKeyPress(digit)}
            className="h-14 rounded-2xl bg-gray-900/80 hover:bg-gray-800 active:scale-95 text-xl font-bold flex items-center justify-center transition-all border border-gray-800"
          >
            {digit}
          </button>
        ))}
        
        {/* Biometric or Empty */}
        {isBiometricEnabled ? (
          <button
            id="biometric-unlock-btn"
            onClick={handleBiometricUnlock}
            title={language === 'bn' ? 'ফিঙ্গারপ্রিন্ট দিয়ে আনলক করুন' : 'Unlock with fingerprint'}
            className="h-14 rounded-2xl bg-green-950/60 hover:bg-green-900/80 active:scale-95 text-green-400 flex flex-col items-center justify-center transition-all border border-green-800/60"
          >
            <Fingerprint className="w-5 h-5" />
            <span className="text-xs mt-0.5 font-bold">{language === 'bn' ? 'ফিঙ্গারপ্রিন্ট' : 'Biometrics'}</span>
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={() => handleKeyPress('0')}
          className="h-14 rounded-2xl bg-gray-900/80 hover:bg-gray-800 active:scale-95 text-xl font-bold flex items-center justify-center transition-all border border-gray-800"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-14 rounded-2xl bg-gray-900/40 hover:bg-gray-800 active:scale-95 text-sm font-semibold flex items-center justify-center transition-all text-gray-400 border border-gray-800/50"
        >
          {language === 'bn' ? 'মুছুন' : 'Delete'}
        </button>
      </div>

      {isBiometricEnabled && (
        <button
          onClick={handleBiometricUnlock}
          className="mt-6 flex items-center gap-2 py-2 px-4 rounded-xl text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-900/50"
        >
          <Fingerprint className="w-4 h-4" />
          {language === 'bn' ? 'ফিঙ্গারপ্রিন্ট দিয়ে আনলক করুন' : 'Unlock with Biometrics'}
        </button>
      )}
    </div>
  );
};

