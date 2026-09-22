import React, { useState, useMemo } from 'react';
import { Transaction, Account, Category } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { CategoryIcon } from './CategoryIcon';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  Search,
  Filter,
  Calendar,
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  ReceiptText,
  SearchX,
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  categories,
}) => {
  const { t, language, formatTaka, formatDate, formatNumber, getCategoryName, getAccountName } = useLanguage();
  // 1. Search Query
  const [searchTerm, setSearchTerm] = useState('');

  // 2. Filter states
  const [selectedType, setSelectedType] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmountTaka, setMinAmountTaka] = useState<string>('');
  const [maxAmountTaka, setMaxAmountTaka] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  // Check if any filter is active
  const hasActiveFilters =
    selectedType !== 'ALL' ||
    selectedCategoryId !== 'ALL' ||
    selectedAccountId !== 'ALL' ||
    !!startDate ||
    !!endDate ||
    !!minAmountTaka ||
    !!maxAmountTaka ||
    !!searchTerm.trim();

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setSelectedCategoryId('ALL');
    setSelectedAccountId('ALL');
    setStartDate('');
    setEndDate('');
    setMinAmountTaka('');
    setMaxAmountTaka('');
  };

  // Quick Date Range Shortcuts
  const setDateShortcut = (range: 'TODAY' | 'LAST_7_DAYS' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH') => {
    const now = new Date();
    const toDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (range === 'TODAY') {
      const todayStr = toDateStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (range === 'LAST_7_DAYS') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      setStartDate(toDateStr(past7));
      setEndDate(toDateStr(now));
    } else if (range === 'THIS_WEEK') {
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - now.getDay()); // Sunday as start of week
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(now));
    } else if (range === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(lastDay));
    } else if (range === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(lastDay));
    }
  };

  // Sort and Filter Transactions
  const filteredTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date);
      if (dateComp !== 0) return dateComp;
      return (b.time || '').localeCompare(a.time || '');
    });

    const minPoisha = minAmountTaka ? parseFloat(minAmountTaka) * 100 : null;
    const maxPoisha = maxAmountTaka ? parseFloat(maxAmountTaka) * 100 : null;
    const term = searchTerm.trim().toLowerCase();

    return sorted.filter((tx) => {
      // Type Filter
      if (selectedType !== 'ALL' && tx.type !== selectedType) return false;

      // Category Filter
      if (selectedCategoryId !== 'ALL' && tx.category_id !== selectedCategoryId) return false;

      // Account Filter
      if (
        selectedAccountId !== 'ALL' &&
        tx.account_id !== selectedAccountId &&
        tx.to_account_id !== selectedAccountId
      ) {
        return false;
      }

      // Date Range Filter
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      // Amount Range Filter
      if (minPoisha !== null && !isNaN(minPoisha) && tx.amount_poisha < minPoisha) return false;
      if (maxPoisha !== null && !isNaN(maxPoisha) && tx.amount_poisha > maxPoisha) return false;

      // Search Term (Note, custom category, category name, account name, amount)
      if (term) {
        const noteMatch = tx.note?.toLowerCase().includes(term);
        const customCatMatch = tx.custom_category_name?.toLowerCase().includes(term);
        const cat = tx.category_id ? categoryMap.get(tx.category_id) : undefined;
        const catName = cat ? getCategoryName(cat.name).toLowerCase() : '';
        const srcAcc = accountMap.get(tx.account_id);
        const srcAccName = srcAcc ? getAccountName(srcAcc.name).toLowerCase() : '';
        const dstAcc = tx.to_account_id ? accountMap.get(tx.to_account_id) : undefined;
        const dstAccName = dstAcc ? getAccountName(dstAcc.name).toLowerCase() : '';
        const amountTakaStr = (tx.amount_poisha / 100).toString();

        const matches =
          noteMatch ||
          customCatMatch ||
          catName?.includes(term) ||
          srcAccName?.includes(term) ||
          dstAccName?.includes(term) ||
          amountTakaStr.includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedType,
    selectedCategoryId,
    selectedAccountId,
    startDate,
    endDate,
    minAmountTaka,
    maxAmountTaka,
    searchTerm,
    categoryMap,
    accountMap,
    getCategoryName,
    getAccountName,
  ]);

  // Summary of filtered results
  const { totalFilteredExpense, totalFilteredIncome } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'EXPENSE') exp += tx.amount_poisha;
      if (tx.type === 'INCOME') inc += tx.amount_poisha;
      if (tx.type === 'TRANSFER' && tx.transfer_fee_poisha > 0) exp += tx.transfer_fee_poisha;
    }
    return { totalFilteredExpense: exp, totalFilteredIncome: inc };
  }, [filteredTransactions]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.transactions.title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.transactions.subtitle}</p>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/80 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {t.transactions.resetFilter}
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="transaction-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.transactions.searchPlaceholder}
            className="w-full pl-9 pr-10 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-2xs font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Type Filter Tabs */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 text-xs flex-1">
            <button
              id="filter-type-all"
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                selectedType === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.transactions.filterAll} ({formatNumber(transactions.length)})
            </button>
            <button
              id="filter-type-expense"
              onClick={() => setSelectedType('EXPENSE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                selectedType === 'EXPENSE'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.transactions.expense}
            </button>
            <button
              id="filter-type-income"
              onClick={() => setSelectedType('INCOME')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                selectedType === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.transactions.income}
            </button>
            <button
              id="filter-type-transfer"
              onClick={() => setSelectedType('TRANSFER')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                selectedType === 'TRANSFER'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.transactions.transfer}
            </button>
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            id="toggle-advanced-filters-btn"
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
              showAdvancedFilters || startDate || endDate || minAmountTaka || maxAmountTaka || selectedCategoryId !== 'ALL'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t.transactions.filter}
          </button>
        </div>
      </div>

      {/* Advanced Filter Box */}
      {showAdvancedFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5 animate-in fade-in zoom-in-98 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {language === 'bn' ? 'তারিখ, ক্যাটাগরি ও টাকার ফিল্টার' : 'Date, Category & Amount Filters'}
            </span>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Shortcuts */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {language === 'bn' ? 'দ্রুত সময়সীমা নির্বাচন:' : 'Quick Range:'}
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                id="filter-date-today-btn"
                onClick={() => setDateShortcut('TODAY')}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap transition-colors"
              >
                {t.datePicker.today}
              </button>
              <button
                type="button"
                id="filter-date-7days-btn"
                onClick={() => setDateShortcut('LAST_7_DAYS')}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap transition-colors"
              >
                {t.datePicker.last7Days}
              </button>
              <button
                type="button"
                id="filter-date-thisweek-btn"
                onClick={() => setDateShortcut('THIS_WEEK')}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap transition-colors"
              >
                {t.datePicker.thisWeek}
              </button>
              <button
                type="button"
                id="filter-date-thismonth-btn"
                onClick={() => setDateShortcut('THIS_MONTH')}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap transition-colors"
              >
                {t.datePicker.thisMonth}
              </button>
              <button
                type="button"
                id="filter-date-lastmonth-btn"
                onClick={() => setDateShortcut('LAST_MONTH')}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap transition-colors"
              >
                {t.datePicker.lastMonth}
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-bold whitespace-nowrap transition-colors"
                >
                  {language === 'bn' ? 'তারিখ মুছুন' : 'Clear Dates'}
                </button>
              )}
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'শুরুর তারিখ (হতে)' : 'Start Date (From)'}
              </label>
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'শেষ তারিখ (পর্যন্ত)' : 'End Date (To)'}
              </label>
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Category & Account Selectors */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
              </label>
              <select
                id="filter-category-select"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
              >
                <option value="ALL">{language === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getCategoryName(c)} ({c.type === 'EXPENSE' ? t.transactions.expense : t.transactions.income})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'অ্যাকাউন্ট / ওয়ালেট' : 'Account / Wallet'}
              </label>
              <select
                id="filter-account-select"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
              >
                <option value="ALL">{language === 'bn' ? 'সব ওয়ালেট ও ব্যাংক' : 'All Wallets & Banks'}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {getAccountName(a)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount Range Filter */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'সর্বনিম্ন টাকা (৳)' : 'Min Amount (৳)'}
              </label>
              <input
                id="filter-min-amount"
                type="number"
                min="0"
                step="any"
                value={minAmountTaka}
                onChange={(e) => setMinAmountTaka(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'bn' ? 'সর্বোচ্চ টাকা (৳)' : 'Max Amount (৳)'}
              </label>
              <input
                id="filter-max-amount"
                type="number"
                min="0"
                step="any"
                value={maxAmountTaka}
                onChange={(e) => setMaxAmountTaka(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: ১০০০' : 'e.g. 1000'}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filtered Result Metrics Banner */}
      {hasActiveFilters && (
        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/80 rounded-xl flex items-center justify-between text-xs">
          <span className="text-emerald-950 dark:text-emerald-200 font-medium">
            {language === 'bn' ? (
              <>ফিল্টার করা মোট <strong className="font-bold text-emerald-950 dark:text-emerald-100">{formatNumber(filteredTransactions.length)}টি</strong> লেনদেন</>
            ) : (
              <>Filtered total <strong className="font-bold text-emerald-950 dark:text-emerald-100">{formatNumber(filteredTransactions.length)}</strong> transactions</>
            )}
          </span>
          <div className="flex gap-2 text-xs font-bold">
            {totalFilteredIncome > 0 && (
              <span className="text-emerald-700 dark:text-emerald-300">+{formatTaka(totalFilteredIncome)}</span>
            )}
            {totalFilteredExpense > 0 && (
              <span className="text-rose-600 dark:text-rose-300">-{formatTaka(totalFilteredExpense)}</span>
            )}
          </div>
        </div>
      )}

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
            {hasActiveFilters ? (
              <SearchX className="w-6 h-6 stroke-[1.75]" />
            ) : (
              <ReceiptText className="w-6 h-6 stroke-[1.75]" />
            )}
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {hasActiveFilters ? t.transactions.emptyFilter : t.transactions.emptyList}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xs">
            {hasActiveFilters
              ? (language === 'bn'
                ? 'আপনার দেওয়া সার্চ বা ফিল্টারের সাথে মিলছে এমন কোনো লেনদেন নেই।'
                : 'No transactions match your current search and filters.')
              : (language === 'bn'
                ? 'নতুন আয় বা ব্যয়ের হিসাব রাখতে নিচের + বাটনে চাপ দিন।'
                : 'Tap the + button below to add your first transaction.')}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-3 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 rounded-xl text-xs font-bold transition-colors"
            >
              {t.transactions.resetFilter}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => {
            const cat = tx.category_id ? categoryMap.get(tx.category_id) : undefined;
            const srcAcc = accountMap.get(tx.account_id);
            const dstAcc = tx.to_account_id ? accountMap.get(tx.to_account_id) : undefined;

            return (
              <div
                key={tx.id}
                id={`transaction-item-${tx.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor:
                        tx.type === 'TRANSFER'
                          ? '#DBEAFE'
                          : cat
                          ? `${cat.color}18`
                          : '#F1F5F9',
                      color:
                        tx.type === 'TRANSFER'
                          ? '#2563EB'
                          : cat
                          ? cat.color
                          : '#475569',
                    }}
                  >
                    {tx.type === 'TRANSFER' ? (
                      <ArrowRightLeft className="w-4 h-4" />
                    ) : (
                      <CategoryIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug truncate">
                      {tx.type === 'TRANSFER'
                        ? `${srcAcc ? getAccountName(srcAcc.name) : (language === 'bn' ? 'অ্যাকাউন্ট' : 'Account')} ➔ ${dstAcc ? getAccountName(dstAcc.name) : (language === 'bn' ? 'অ্যাকাউন্ট' : 'Account')}`
                        : (tx.custom_category_name || (cat ? getCategoryName(cat.name) : t.transactions.uncategorized))}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                      {srcAcc ? getAccountName(srcAcc.name) : ''}
                      {tx.custom_category_name && cat ? ` • ${getCategoryName(cat.name)}` : ''} • {formatDate(tx.date)}
                      {tx.time ? ` (${tx.time})` : ''}
                    </p>
                    {tx.note && (!tx.custom_category_name || tx.note !== tx.custom_category_name) && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-md px-2 py-0.5 mt-1 inline-block max-w-full truncate font-medium">
                        📝 {tx.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm font-extrabold block ${
                      tx.type === 'EXPENSE'
                        ? 'text-rose-600 dark:text-rose-400'
                        : tx.type === 'INCOME'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {tx.type === 'EXPENSE'
                      ? `-${formatTaka(tx.amount_poisha)}`
                      : tx.type === 'INCOME'
                      ? `+${formatTaka(tx.amount_poisha)}`
                      : formatTaka(tx.amount_poisha)}
                  </span>
                  {tx.transfer_fee_poisha > 0 && (
                    <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium block">
                      {language === 'bn' ? 'চার্জ:' : 'Fee:'} {formatTaka(tx.transfer_fee_poisha)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
