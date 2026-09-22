import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Shield,
  ShieldCheck,
  Fingerprint,
  Moon,
  Sun,
  FileSpreadsheet,
  Printer,
  FileText,
  Tag,
  Plus,
  Check,
  KeyRound,
  Lock,
  RotateCcw,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Languages,
} from 'lucide-react';
import { Category, Account, Transaction, DebtRecord, FinancialSummary } from '../types';
import { storageService } from '../services/storageService';
import { CategoryIcon } from './CategoryIcon';
import { runFinancialIntegrityTests } from '../utils/testCalculations';
import { securityUtils } from '../utils/securityUtils';
import { downloadTransactionsCSV, printFinancialReportPDF } from '../utils/exportUtils';
import { BRAND } from '../config/brand';
import { GochaoAppIcon } from './GochaoLogo';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsViewProps {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  debts: DebtRecord[];
  summary: FinancialSummary;
  dateFilterLabel: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLockNow: () => void;
  onAddCategory: (cat: { name: string; type: 'EXPENSE' | 'INCOME'; icon: string; color: string }) => void;
  onRefreshData: () => void;
  onReopenOnboarding?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  categories,
  accounts,
  transactions,
  debts,
  summary,
  dateFilterLabel,
  isDarkMode,
  onToggleDarkMode,
  onLockNow,
  onAddCategory,
  onRefreshData,
  onReopenOnboarding,
}) => {
  const { language, setLanguage, t, getCategoryName, formatNumber } = useLanguage();

  // Security State
  const [securitySettings, setSecuritySettings] = useState(() => securityUtils.getSettings());
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinFirst, setPinFirst] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#10B981');

  // Export Filter Scope
  const [exportScope, setExportScope] = useState<'CURRENT' | 'ALL'>('CURRENT');

  // Feedback Notification
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  const refreshSecurity = () => {
    setSecuritySettings(securityUtils.getSettings());
  };

  // Toggle PIN Lock
  const handleTogglePinLock = () => {
    if (!securitySettings.hasPin) {
      // Need to set PIN first
      setIsPinModalOpen(true);
      return;
    }

    const nextState = !securitySettings.isLockEnabled;
    securityUtils.setLockEnabled(nextState);
    refreshSecurity();
    showNotification(
      nextState ? 'পিন লক সফলভাবে চালু করা হয়েছে।' : 'পিন লক সাময়িকভাবে বন্ধ করা হয়েছে।'
    );
  };

  // Toggle Biometric Lock
  const handleToggleBiometric = async () => {
    if (!securitySettings.hasPin) {
      alert('ফিঙ্গারপ্রিন্ট চালু করতে প্রথমে একটি ৪ সংখ্যার পিন সেট করুন');
      setIsPinModalOpen(true);
      return;
    }

    const nextState = !securitySettings.isBiometricEnabled;
    securityUtils.setBiometricEnabled(nextState);
    refreshSecurity();
    showNotification(
      nextState
        ? 'ফিঙ্গারপ্রিন্ট / বায়োমেট্রিক লক চালু হয়েছে!'
        : 'ফিঙ্গারপ্রিন্ট লক বন্ধ করা হয়েছে।'
    );
  };

  // Submit New PIN
  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinFirst.length !== 4 || !/^\d+$/.test(pinFirst)) {
      setPinError('পিন অবশ্যই ৪ সংখ্যার হতে হবে (যেমন: 1234)');
      return;
    }
    if (pinFirst !== pinConfirm) {
      setPinError('দুটো পিন নম্বর মেলেনি! আবার দেখে লিখুন।');
      return;
    }

    securityUtils.setPin(pinFirst);
    refreshSecurity();
    setIsPinModalOpen(false);
    setPinFirst('');
    setPinConfirm('');
    setPinError(null);
    showNotification('৪ সংখ্যার অ্যাপ লক পিন সফলভাবে সংরক্ষিত হয়েছে!');
  };

  // Remove PIN completely
  const handleRemovePin = () => {
    if (confirm('আপনি কি নিশ্চিত যে পিন ও ফিঙ্গারপ্রিন্ট লক সম্পূর্ণ সরিয়ে নিতে চান?')) {
      securityUtils.removeLock();
      refreshSecurity();
      showNotification('পিন ও নিরাপত্তা লক সম্পূর্ণ নিষ্ক্রিয় করা হয়েছে।', 'info');
    }
  };

  // Backup Download
  const handleDownloadBackup = () => {
    try {
      const dataStr = storageService.exportBackupJSON();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `personal-life-manager-backup-${dateStr}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showNotification(
        `ব্যাকআপ ফাইল ডাউনলোড হয়েছে! (${transactions.length}টি লেনদেন ও ${accounts.length}টি অ্যাকাউন্ট সংরক্ষিত)`
      );
    } catch {
      showNotification('ব্যাকআপ ফাইল তৈরিতে সমস্যা হয়েছে।', 'error');
    }
  };

  // Restore Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) return;

        const isConfirmed = window.confirm(
          'আপনি কি নিশ্চিত যে এই ব্যাকআপ ফাইলটি রিস্টোর করতে চান?\n\nসতর্কতা: এটি বর্তমান তথ্যের সাথে ব্যাকআপ ফাইল প্রতিস্থাপন করবে।'
        );
        if (!isConfirmed) return;

        const success = storageService.importBackupJSON(content);
        if (success) {
          showNotification('ব্যাকআপ সফলভাবে রিস্টোর সম্পন্ন হয়েছে!');
          onRefreshData();
          refreshSecurity();
        } else {
          alert('ব্যাকআপ ফাইলটি সঠিক নয় বা তথ্য ক্ষতিগ্রস্ত হয়েছে।');
        }
      } catch {
        alert('ফাইলটি পড়তে সমস্যা হয়েছে। অনুগ্রহ করে সঠিক .json ব্যাকআপ ফাইল দিন।');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export CSV
  const handleExportCSV = () => {
    const txList = exportScope === 'CURRENT' ? transactions : storageService.getTransactions();
    const label = exportScope === 'CURRENT' ? dateFilterLabel : 'সব_লেনদেন';
    downloadTransactionsCSV(txList, accounts, categories, label);
    showNotification('CSV ফাইল ডাউনলোড সম্পন্ন হয়েছে!');
  };

  // Export PDF / Print
  const handleExportPDF = () => {
    const txList = exportScope === 'CURRENT' ? transactions : storageService.getTransactions();
    const label = exportScope === 'CURRENT' ? dateFilterLabel : 'সব সময়ের হিসাব';
    printFinancialReportPDF(summary, accounts, categories, txList, debts, label);
  };

  // Add Category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    onAddCategory({
      name: newCatName.trim(),
      type: newCatType,
      icon: newCatIcon,
      color: newCatColor,
    });

    setNewCatName('');
    showNotification('নতুন ক্যাটাগরি সফলভাবে যুক্ত হয়েছে!');
  };

  const availableIcons = [
    'ShoppingCart',
    'Home',
    'Utensils',
    'Car',
    'HeartPulse',
    'Smartphone',
    'ShoppingBag',
    'Users',
    'Banknote',
    'Briefcase',
    'Laptop',
    'TrendingUp',
    'CreditCard',
    'Tag',
  ];

  return (
    <div className="space-y-4 pb-24 text-slate-900 dark:text-slate-100">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.settings.title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          {t.settings.subtitle}
        </p>
      </div>

      {/* Floating Notification */}
      {message && (
        <div
          className={`p-3 text-xs font-semibold rounded-2xl flex items-center gap-2 border transition-all ${
            message.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              : message.type === 'info'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <Info className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LANGUAGE SELECTOR CARD */}
      {/* ========================================================================= */}
      <div 
        id="settings-language-card"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.languageCardTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t.settings.languageCardSubtitle}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
            {language === 'bn' ? t.settings.langActiveBn : t.settings.langActiveEn}
          </span>
        </div>

        {/* Language selector toggle buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            id="lang-select-bn-btn"
            type="button"
            onClick={() => setLanguage('bn')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
              language === 'bn'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-[1.01]'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <span className="text-sm">🇧🇩</span>
            <span>{t.settings.banglaOption}</span>
            {language === 'bn' && <Check className="w-3.5 h-3.5 ml-auto" />}
          </button>

          <button
            id="lang-select-en-btn"
            type="button"
            onClick={() => setLanguage('en')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
              language === 'en'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-[1.01]'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <span className="text-sm">🌐</span>
            <span>{t.settings.englishOption}</span>
            {language === 'en' && <Check className="w-3.5 h-3.5 ml-auto" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 4: DARK MODE TOGGLE ROW */}
      {/* ========================================================================= */}
      <div 
        id="settings-theme-card"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isDarkMode 
                ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/50' 
                : 'bg-amber-50 text-amber-600 border border-amber-200/60'
            }`}>
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.themeCardTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {isDarkMode ? t.settings.themeCardSubtitleDark : t.settings.themeCardSubtitleLight}
              </p>
            </div>
          </div>

          <button
            id="toggle-dark-mode-btn"
            onClick={onToggleDarkMode}
            type="button"
            className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${
              isDarkMode ? 'bg-emerald-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
            }`}
            aria-label="Toggle dark mode"
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 1: PIN / FINGERPRINT LOCK SECTION */}
      {/* ========================================================================= */}
      <div 
        id="settings-security-card"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3.5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.settings.securityCardTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t.settings.securityCardSubtitle}
            </p>
          </div>
        </div>

        {/* PIN Lock Row */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.settings.pinLockTitle}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {securitySettings.hasPin
                  ? securitySettings.isLockEnabled
                    ? t.settings.pinLockSubtitleActive
                    : t.settings.pinLockSubtitleInactive
                  : t.settings.pinLockSubtitleNotSet}
              </div>
            </div>
          </div>

          <button
            id="toggle-pin-lock-btn"
            onClick={handleTogglePinLock}
            type="button"
            className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${
              securitySettings.isLockEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Fingerprint / Biometric Lock Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.settings.biometricTitle}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {securitySettings.isBiometricEnabled
                  ? t.settings.biometricSubtitleActive
                  : t.settings.biometricSubtitleInactive}
              </div>
            </div>
          </div>

          <button
            id="toggle-biometric-lock-btn"
            onClick={handleToggleBiometric}
            type="button"
            className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${
              securitySettings.isBiometricEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Action Controls for PIN */}
        <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            id="open-pin-setup-btn"
            onClick={() => setIsPinModalOpen(true)}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {securitySettings.hasPin ? t.settings.changePinBtn : t.settings.setPinBtn}
          </button>

          {securitySettings.hasPin && securitySettings.isLockEnabled && (
            <button
              id="test-lock-now-btn"
              onClick={onLockNow}
              className="py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              {t.settings.lockNowBtn}
            </button>
          )}

          {securitySettings.hasPin && (
            <button
              onClick={handleRemovePin}
              className="py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              {t.settings.removePinBtn}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 2: BACKUP & RESTORE SECTION */}
      {/* ========================================================================= */}
      <div 
        id="settings-backup-card"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.settings.backupCardTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t.settings.backupCardSubtitle}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-800">
          <p>
            {language === 'bn' 
              ? 'আপনার হিসাবের সব তথ্য (লেনদেন, ক্যাটাগরি, ওয়ালেট) আপনার ডিভাইসে ১০০% অফলাইনে থাকে। ফোন পরিবর্তন বা সুরক্ষার জন্য একটি ব্যাকআপ ফাইল নামিয়ে রাখুন।'
              : 'All your financial records (transactions, categories, wallets) stay 100% offline on your device. Download a backup file for safety or device migration.'}
          </p>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
            {language === 'bn' ? 'বর্তমান হিসাব ভাণ্ডার: ' : 'Current ledger records: '}
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              {language === 'bn' ? `${formatNumber(transactions.length)}টি লেনদেন` : `${formatNumber(transactions.length)} transactions`}
            </span>,{' '}
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              {language === 'bn' ? `${formatNumber(accounts.length)}টি অ্যাকাউন্ট` : `${formatNumber(accounts.length)} accounts`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            id="export-backup-btn"
            onClick={handleDownloadBackup}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            {t.settings.exportBackupBtn}
          </button>

          <label
            id="import-backup-label"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Upload className="w-4 h-4" />
            {t.settings.importBackupBtn}
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 3: PDF / CSV EXPORT SECTION */}
      {/* ========================================================================= */}
      <div 
        id="settings-export-card"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3.5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/50">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.settings.exportReportCardTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t.settings.exportReportCardSubtitle}
            </p>
          </div>
        </div>

        {/* Scope selector */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setExportScope('CURRENT')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              exportScope === 'CURRENT'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {language === 'bn' ? `নির্বাচিত সময়কাল (${dateFilterLabel})` : `Selected Period (${dateFilterLabel})`}
          </button>
          <button
            type="button"
            onClick={() => setExportScope('ALL')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              exportScope === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {language === 'bn' ? `সব লেনদেন (${formatNumber(storageService.getTransactions().length)}টি)` : `All Transactions (${formatNumber(storageService.getTransactions().length)})`}
          </button>
        </div>

        {/* Export Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* CSV Export */}
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t.settings.exportCsvBtn}
          </button>

          {/* PDF Export / Print */}
          <button
            id="export-pdf-btn"
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Printer className="w-4 h-4" />
            {t.settings.printPdfBtn}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {language === 'bn' 
            ? '* CSV ফাইলটি যেকোনো এক্সেল বা গুগল শিটে সরাসরি দেখতে পাবেন। PDF প্রিন্ট উইন্ডো থেকে "Save as PDF" অপশন বেছে নিয়ে ডিভাইসে সেভ করতে পারেন।'
            : '* CSV files can be opened in Excel or Google Sheets. In the PDF print window, choose "Save as PDF" to save directly to your device.'}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 5. CUSTOM CATEGORIES MANAGER */}
      {/* ========================================================================= */}
      <div 
        id="settings-categories-card"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3.5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.settings.categoriesCardTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t.settings.categoriesCardSubtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCategory} className="space-y-3 pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewCatType('EXPENSE')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                newCatType === 'EXPENSE'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-2xs font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {language === 'bn' ? 'ব্যয় খাত' : 'Expense Category'}
            </button>
            <button
              type="button"
              onClick={() => setNewCatType('INCOME')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                newCatType === 'INCOME'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {language === 'bn' ? 'আয় খাত' : 'Income Category'}
            </button>
          </div>

          <div>
            <input
              id="new-category-name-input"
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={language === 'bn' ? 'ক্যাটাগরির নাম (যেমন: বাড়ি ভাড়া, টিউশনি)' : 'Category name (e.g. Rent, Freelancing)'}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-medium focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {language === 'bn' ? 'আইকন বেছে নিন:' : 'Choose icon:'}
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {availableIcons.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setNewCatIcon(ic)}
                  className={`p-2 rounded-xl border shrink-0 transition-all ${
                    newCatIcon === ic
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <CategoryIcon name={ic} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <button
            id="add-custom-category-btn"
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            {t.settings.addCategoryBtn}
          </button>
        </form>

        {/* Existing categories pill list */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            {t.settings.currentCategoriesTitle.replace('{count}', formatNumber(categories.length))}
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <CategoryIcon name={c.icon} className="w-3.5 h-3.5" />
                {getCategoryName(c.name)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. FINANCIAL INTEGRITY AUDIT CARD */}
      {/* ========================================================================= */}
      <div 
        id="settings-audit-card"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.settings.auditCardTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t.settings.auditCardSubtitle}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {t.settings.auditCardDesc}
        </p>

        <button
          id="run-audit-tests-btn"
          onClick={() => {
            const audit = runFinancialIntegrityTests();
            alert(audit.results.join('\n\n'));
          }}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
        >
          <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          {t.settings.runAuditBtn}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 8. ABOUT GOCHAO BRANDING CARD */}
      {/* ========================================================================= */}
      <div
        id="about-gochao-card"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs text-center space-y-3"
      >
        <div className="flex flex-col items-center">
          <GochaoAppIcon size="lg" className="shadow-xs mb-2.5" />
          <div className="flex items-center gap-2 justify-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {BRAND.name}
            </h3>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
              {BRAND.banglaName}
            </span>
          </div>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
            {BRAND.tagline}
          </p>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
          {BRAND.description}
        </p>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {t.settings.offlineSecurityBadge}
          </span>
          <span>•</span>
          <span>{t.settings.appVersion.replace('{version}', BRAND.version)}</span>
        </div>

        {onReopenOnboarding && (
          <div className="pt-2">
            <button
              id="reopen-onboarding-btn"
              type="button"
              onClick={onReopenOnboarding}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.settings.reopenOnboardingBtn}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PIN SETUP / CHANGE MODAL DIALOG */}
      {/* ========================================================================= */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {securitySettings.hasPin 
                  ? (language === 'bn' ? 'নতুন পিন কোড সেট করুন' : 'Set New PIN Code')
                  : (language === 'bn' ? 'প্রথমবার পিন সেট করুন' : 'Set PIN for First Time')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {language === 'bn' 
                  ? 'অ্যাপ খোলার সময় এই ৪ সংখ্যার পিন কোড দিতে হবে' 
                  : 'You will enter this 4-digit PIN when opening the app'}
              </p>
            </div>

            {pinError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-semibold rounded-xl text-center">
                {pinError}
              </div>
            )}

            <form onSubmit={handleSaveNewPin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {language === 'bn' ? '৪ সংখ্যার পিন:' : '4-Digit PIN:'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinFirst}
                  onChange={(e) => setPinFirst(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center text-xl tracking-widest py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {language === 'bn' ? 'আবার পিনটি নিশ্চিত করুন:' : 'Confirm PIN again:'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center text-xl tracking-widest py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setPinFirst('');
                    setPinConfirm('');
                    setPinError(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
