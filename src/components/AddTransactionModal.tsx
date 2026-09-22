import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowDownRight, ArrowUpRight, ArrowRightLeft, HandCoins, Check, Sparkles } from 'lucide-react';
import { Account, Category, TransactionType, DebtType } from '../types';
import { parseInputToPoisha } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { useLanguage } from '../contexts/LanguageContext';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (data: {
    type: TransactionType;
    amount_poisha: number;
    account_id: string;
    to_account_id?: string;
    transfer_fee_poisha: number;
    category_id?: string;
    date: string;
    time: string;
    note?: string;
  }) => void;
  onAddDebt: (data: {
    type: DebtType;
    person_name: string;
    phone?: string;
    person_phone?: string;
    amount_poisha?: number;
    initial_amount_poisha: number;
    account_id: string;
    due_date?: string;
    notes?: string;
    note?: string;
    date: string;
  }) => void;
}

type ModalTab = 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'DEBT';

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onAddTransaction,
  onAddDebt,
}) => {
  const { t, language, getCategoryName, getAccountName } = useLanguage();
  const [activeTab, setActiveTab] = useState<ModalTab>('EXPENSE');
  const [amountInput, setAmountInput] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [selectedToAccountId, setSelectedToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [note, setNote] = useState('');
  
  // Debt specific fields
  const [debtType, setDebtType] = useState<DebtType>('LENT');
  const [personName, setPersonName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Keep selected accounts properly synchronized when accounts load or modal opens
  useEffect(() => {
    if (accounts.length > 0) {
      if (!selectedAccountId || !accounts.some((a) => a.id === selectedAccountId)) {
        setSelectedAccountId(accounts[0].id);
      }
      if (!selectedToAccountId || !accounts.some((a) => a.id === selectedToAccountId)) {
        setSelectedToAccountId(accounts[1]?.id || accounts[0].id);
      }
    }
  }, [accounts, isOpen]);

  // Success state for confirmation animation
  const [isSuccess, setIsSuccess] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);

  const filteredCategories = categories.filter((c) => {
    if (activeTab === 'EXPENSE') return c.type === 'EXPENSE';
    if (activeTab === 'INCOME') return c.type === 'INCOME';
    return false;
  });

  // Keep selected category properly synchronized with current tab
  useEffect(() => {
    if (activeTab === 'EXPENSE' || activeTab === 'INCOME') {
      const exists = filteredCategories.some((c) => c.id === selectedCategoryId);
      if (!exists && filteredCategories.length > 0) {
        setSelectedCategoryId(filteredCategories[0].id);
        setCustomCategoryName('');
      }
    }
  }, [activeTab, filteredCategories, selectedCategoryId]);

  const selectedCat = categories.find((c) => c.id === (selectedCategoryId || filteredCategories[0]?.id));
  const isOtherCategorySelected = Boolean(
    selectedCat && (
      selectedCat.id === 'cat-income-other' ||
      selectedCat.id === 'cat-other' ||
      selectedCat.name === 'অন্যান্য' ||
      selectedCat.name === 'অন্যান্য খরচ' ||
      selectedCat.name === 'অন্যান্য আয়' ||
      selectedCat.name.toLowerCase() === 'other' ||
      selectedCat.name.toLowerCase() === 'other income' ||
      selectedCat.name.toLowerCase() === 'other expenses'
    )
  );

  const resetForm = () => {
    setAmountInput('');
    setCustomCategoryName('');
    setNote('');
    setPersonName('');
    setPhoneNumber('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountPoisha = parseInputToPoisha(amountInput);
    if (amountPoisha <= 0) {
      alert(language === 'bn' ? 'সঠিক টাকার পরিমাণ উল্লেখ করুন' : 'Please enter a valid amount');
      return;
    }

    const finalAccountId = selectedAccountId || accounts[0]?.id || 'acc-cash';
    const finalToAccountId = selectedToAccountId || accounts[1]?.id || accounts[0]?.id || 'acc-bkash';

    if (activeTab === 'DEBT') {
      if (!personName.trim()) {
        alert(language === 'bn' ? 'ব্যক্তির নাম লিখুন' : "Please enter the person's name");
        return;
      }
      onAddDebt({
        type: debtType,
        person_name: personName.trim(),
        phone: phoneNumber.trim() || undefined,
        person_phone: phoneNumber.trim() || undefined,
        amount_poisha: amountPoisha,
        initial_amount_poisha: amountPoisha,
        account_id: finalAccountId,
        due_date: dueDate || undefined,
        notes: note.trim() || undefined,
        note: note.trim() || undefined,
        date,
      });
    } else if (activeTab === 'TRANSFER') {
      if (finalAccountId === finalToAccountId) {
        alert(language === 'bn' ? 'উৎস ও গন্তব্য অ্যাকাউন্ট ভিন্ন হতে হবে' : 'Source and destination accounts must be different');
        return;
      }
      onAddTransaction({
        type: 'TRANSFER',
        amount_poisha: amountPoisha,
        account_id: finalAccountId,
        to_account_id: finalToAccountId,
        transfer_fee_poisha: 0,
        date,
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        note: note.trim() || undefined,
      });
    } else {
      const effectiveCategoryId = selectedCategoryId || filteredCategories[0]?.id;
      const effectiveCategory = categories.find((c) => c.id === effectiveCategoryId);
      const isOther = Boolean(
        effectiveCategory && (
          effectiveCategory.id === 'cat-income-other' ||
          effectiveCategory.id === 'cat-other' ||
          effectiveCategory.name === 'অন্যান্য' ||
          effectiveCategory.name === 'অন্যান্য খরচ' ||
          effectiveCategory.name === 'অন্যান্য আয়' ||
          effectiveCategory.name.toLowerCase() === 'other' ||
          effectiveCategory.name.toLowerCase() === 'other income' ||
          effectiveCategory.name.toLowerCase() === 'other expenses'
        )
      );

      const trimmedCustom = customCategoryName.trim();
      const finalCustomCatName = isOther && trimmedCustom ? trimmedCustom : undefined;

      let finalNote = note.trim() || undefined;
      if (finalCustomCatName) {
        if (note.trim() && note.trim() !== finalCustomCatName) {
          finalNote = `${finalCustomCatName} • ${note.trim()}`;
        } else {
          finalNote = finalCustomCatName;
        }
      }

      onAddTransaction({
        type: activeTab,
        amount_poisha: amountPoisha,
        account_id: finalAccountId,
        transfer_fee_poisha: 0,
        category_id: effectiveCategoryId,
        custom_category_name: finalCustomCatName,
        date,
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        note: finalNote,
      });
    }

    // Trigger fast, delightful success animation for 500ms
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      resetForm();
    }, 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Animated Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={isSuccess ? undefined : onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Bottom Sheet / Dialog */}
          <motion.div 
            id="add-transaction-sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden z-10"
          >
            {isSuccess ? (
              /* Success Confirmation Animation */
              <div className="py-14 px-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  {/* Clean rounded badge with gentle scale */}
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.05, duration: 0.16 }}
                    >
                      <Check className="w-8 h-8 stroke-[2.75]" />
                    </motion.div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.18 }}
                  className="space-y-1"
                >
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1.5">
                    {language === 'bn' ? 'সফলভাবে যোগ হয়েছে' : 'Successfully Added'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeTab === 'DEBT'
                      ? t.addModal.successDebt
                      : activeTab === 'TRANSFER'
                      ? t.addModal.successTransfer
                      : activeTab === 'EXPENSE'
                      ? t.addModal.successExpense
                      : t.addModal.successIncome}
                  </p>
                </motion.div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.addModal.title}</h2>
                  <button 
                    id="close-transaction-modal-btn"
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tab Switcher */}
                <div className="grid grid-cols-4 p-1.5 bg-slate-100 dark:bg-slate-800/80 mx-5 mt-3 rounded-xl gap-1">
                  <button
                    id="tab-expense-btn"
                    type="button"
                    onClick={() => setActiveTab('EXPENSE')}
                    className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      activeTab === 'EXPENSE'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {t.addModal.expenseTab}
                  </button>
                  <button
                    id="tab-income-btn"
                    type="button"
                    onClick={() => setActiveTab('INCOME')}
                    className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      activeTab === 'INCOME'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {t.addModal.incomeTab}
                  </button>
                  <button
                    id="tab-transfer-btn"
                    type="button"
                    onClick={() => setActiveTab('TRANSFER')}
                    className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      activeTab === 'TRANSFER'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    {t.addModal.transferTab}
                  </button>
                  <button
                    id="tab-debt-btn"
                    type="button"
                    onClick={() => setActiveTab('DEBT')}
                    className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      activeTab === 'DEBT'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <HandCoins className="w-3.5 h-3.5" />
                    {t.addModal.debtTab}
                  </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {activeTab === 'TRANSFER' 
                        ? (language === 'bn' ? 'স্থানান্তরের পরিমাণ' : 'Transfer Amount')
                        : t.addModal.amountLabel}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-lg font-bold">
                        ৳
                      </span>
                      <input
                        id="transaction-amount-input"
                        type="number"
                        step="any"
                        required
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        placeholder={activeTab === 'TRANSFER' ? '০' : t.addModal.amountPlaceholder}
                        className="w-full pl-9 pr-4 py-2.5 text-xl font-extrabold bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Debt Type toggle if Debt */}
                  {activeTab === 'DEBT' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDebtType('LENT')}
                          className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                            debtType === 'LENT'
                              ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-500 dark:border-amber-600 text-amber-950 dark:text-amber-200'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {t.addModal.lentOption}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDebtType('BORROWED')}
                          className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                            debtType === 'BORROWED'
                              ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-500 dark:border-rose-600 text-rose-950 dark:text-rose-200'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {t.addModal.borrowedOption}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.addModal.personNameLabel} *</label>
                          <input
                            id="debt-person-name-input"
                            type="text"
                            required
                            value={personName}
                            onChange={(e) => setPersonName(e.target.value)}
                            placeholder={t.addModal.personNamePlaceholder}
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.addModal.phoneLabel}</label>
                          <input
                            id="debt-phone-input"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder={t.addModal.phonePlaceholder}
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.addModal.dueDateLabel}</label>
                        <input
                          id="debt-due-date-input"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {/* Account Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {activeTab === 'TRANSFER' ? t.addModal.fromAccount : t.addModal.accountLabel}
                      </label>
                      <select
                        id="transaction-account-select"
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {getAccountName(acc)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {activeTab === 'TRANSFER' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          {t.addModal.toAccount}
                        </label>
                        <select
                          id="transaction-to-account-select"
                          value={selectedToAccountId}
                          onChange={(e) => setSelectedToAccountId(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {getAccountName(acc)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Category Selector (Expense & Income only) */}
                  {(activeTab === 'EXPENSE' || activeTab === 'INCOME') && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.addModal.categoryLabel}</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                        {filteredCategories.map((cat) => {
                          const isSelected = selectedCategoryId === cat.id || (!selectedCategoryId && cat.id === filteredCategories[0]?.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategoryId(cat.id);
                                if (
                                  cat.id !== 'cat-income-other' &&
                                  cat.id !== 'cat-other' &&
                                  !cat.name.includes('অন্যান্য') &&
                                  cat.name.toLowerCase() !== 'other'
                                ) {
                                  setCustomCategoryName('');
                                }
                              }}
                              className={`p-2 rounded-lg flex flex-col items-center justify-center text-center transition-all ${
                                isSelected
                                  ? 'bg-white dark:bg-slate-700 shadow-2xs border border-emerald-500 font-bold text-slate-900 dark:text-white'
                                  : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-medium'
                              }`}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center mb-1"
                                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                              >
                                <CategoryIcon name={cat.icon} className="w-4 h-4" />
                              </div>
                              <span className="text-xs truncate w-full">{getCategoryName(cat)}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom source / details input box when "অন্যান্য" or "অন্যান্য খরচ" is chosen */}
                      {isOtherCategorySelected && (
                        <div className="mt-2 p-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 rounded-xl animate-in fade-in slide-in-from-top-1 duration-150">
                          <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            {activeTab === 'INCOME'
                              ? (language === 'bn' ? 'আয়ের উৎস লিখুন' : 'Source of Income')
                              : (language === 'bn' ? 'খরচের বিবরণ লিখুন' : 'Expense Details')}
                            <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400 ml-1.5">
                              {activeTab === 'INCOME'
                                ? (language === 'bn' ? '(যেমন: টিউশনি থেকে আয়, উপহার, পুরনো জিনিস বিক্রি)' : '(e.g. Tuition, Gift, Sold items)')
                                : (language === 'bn' ? '(যেমন: লন্ড্রি বিল, পার্কিং ফি)' : '(e.g. Laundry, Parking fee)')}
                            </span>
                          </label>
                          <input
                            id="custom-source-input"
                            type="text"
                            value={customCategoryName}
                            onChange={(e) => setCustomCategoryName(e.target.value)}
                            placeholder={
                              activeTab === 'INCOME'
                                ? (language === 'bn' ? 'আয়ের উৎস লিখুন (যেমন: টিউশনি থেকে আয়)' : 'Enter income source (e.g. Tuition)')
                                : (language === 'bn' ? 'খরচের বিবরণ লিখুন (যেমন: লন্ড্রি বিল)' : 'Enter expense details (e.g. Laundry)')
                            }
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-600 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Date & Note */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.addModal.dateLabel}</label>
                      <input
                        id="transaction-date-input"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {activeTab === 'TRANSFER' 
                          ? (language === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note (Optional)')
                          : t.addModal.noteLabel}
                      </label>
                      <input
                        id="transaction-note-input"
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={
                          activeTab === 'TRANSFER'
                            ? (language === 'bn' ? 'কিছু লিখুন...' : 'Write something...')
                            : t.addModal.notePlaceholder
                        }
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      id="save-transaction-btn"
                      type="submit"
                      className={`w-full py-3 rounded-xl font-bold text-white shadow-xs transition-all active:scale-98 ${
                        activeTab === 'EXPENSE'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : activeTab === 'INCOME'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : activeTab === 'TRANSFER'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      {activeTab === 'EXPENSE'
                        ? t.addModal.submitExpense
                        : activeTab === 'INCOME'
                        ? t.addModal.submitIncome
                        : activeTab === 'TRANSFER'
                        ? t.addModal.submitTransfer
                        : t.addModal.submitDebt}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
