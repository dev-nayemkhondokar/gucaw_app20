import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { Category, Transaction, CategoryBudget } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { CategoryIcon } from './CategoryIcon';
import { AnimatedProgressBar } from './AnimatedProgressBar';

interface CategoryExpensesCardProps {
  categories: Category[];
  transactions: Transaction[];
  budgets: CategoryBudget[];
  selectedMonth: string;
  isPrivacyMode: boolean;
  onAddCategory: (data: {
    name: string;
    type: 'EXPENSE' | 'INCOME';
    icon: string;
    color: string;
  }) => void;
  onUpdateBudget: (categoryId: string, limitPoisha: number) => void;
}

const AVAILABLE_ICONS = [
  'Utensils',
  'Home',
  'Car',
  'Zap',
  'ShoppingBag',
  'HeartPulse',
  'GraduationCap',
  'Film',
  'ShoppingCart',
  'Smartphone',
  'Coffee',
  'Gift',
  'BookOpen',
  'Receipt',
  'Users',
  'Dumbbell',
  'Plane',
  'Tv',
  'Gamepad2',
  'Sparkles',
  'Tag',
];

const PRESET_COLORS = [
  '#F59E0B', // Amber
  '#EF4444', // Rose
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#64748B', // Slate
];

export const CategoryExpensesCard: React.FC<CategoryExpensesCardProps> = ({
  categories,
  transactions,
  budgets,
  selectedMonth,
  isPrivacyMode,
  onAddCategory,
  onUpdateBudget,
}) => {
  const { t, language, formatTaka, formatNumber, getCategoryName } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#EF4444');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Budget Set/Edit Modal state
  const [budgetModalCategory, setBudgetModalCategory] = useState<Category | null>(null);
  const [budgetInputTaka, setBudgetInputTaka] = useState('');

  // 1. Filter expense transactions for selected month and calculate totals per category
  const { categoryExpenseMap, totalExpensePoisha } = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;

    for (const tx of transactions) {
      if (tx.date.startsWith(selectedMonth) && tx.type === 'EXPENSE') {
        const catId = tx.category_id || 'other';
        const current = map.get(catId) || 0;
        map.set(catId, current + tx.amount_poisha);
        total += tx.amount_poisha;
      }
    }

    return { categoryExpenseMap: map, totalExpensePoisha: total };
  }, [transactions, selectedMonth]);

  // 2. Map of category budgets
  const budgetMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of budgets) {
      map.set(b.category_id, b.limit_poisha);
    }
    return map;
  }, [budgets]);

  // 3. All expense categories, ordered so active ones with spending come first, followed by others
  const expenseCategories = useMemo(() => {
    const list = categories.filter((c) => c.type === 'EXPENSE');

    // Sort: categories with expense > 0 first (descending by spend), then 0-spend categories
    return [...list].sort((a, b) => {
      const spendA = categoryExpenseMap.get(a.id) || 0;
      const spendB = categoryExpenseMap.get(b.id) || 0;
      if (spendA > 0 && spendB === 0) return -1;
      if (spendA === 0 && spendB > 0) return 1;
      if (spendA !== spendB) return spendB - spendA;
      return a.name.localeCompare(b.name, language === 'bn' ? 'bn' : 'en');
    });
  }, [categories, categoryExpenseMap, language]);

  // Check how many categories exceeded budget
  const exceededCount = useMemo(() => {
    let count = 0;
    for (const cat of expenseCategories) {
      const spend = categoryExpenseMap.get(cat.id) || 0;
      const limit = budgetMap.get(cat.id) || 0;
      if (limit > 0 && spend > limit) {
        count++;
      }
    }
    return count;
  }, [expenseCategories, categoryExpenseMap, budgetMap]);

  // Handle new category submit
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    onAddCategory({
      name: trimmed,
      type: 'EXPENSE',
      icon: newCatIcon,
      color: newCatColor,
    });

    setNewCatName('');
    setNewCatIcon('Tag');
    setNewCatColor('#EF4444');
    setIsModalOpen(false);
  };

  // Handle budget edit submit
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetModalCategory) return;
    const taka = parseFloat(budgetInputTaka);
    const limitPoisha = !isNaN(taka) && taka >= 0 ? Math.round(taka * 100) : 0;

    onUpdateBudget(budgetModalCategory.id, limitPoisha);
    setBudgetModalCategory(null);
    setBudgetInputTaka('');
  };

  const openBudgetModalFor = (cat: Category) => {
    setBudgetModalCategory(cat);
    const currentLimitPoisha = budgetMap.get(cat.id) || 0;
    setBudgetInputTaka(currentLimitPoisha > 0 ? (currentLimitPoisha / 100).toString() : '');
  };

  const renderAmount = (amountPoisha: number) => {
    if (amountPoisha === 0) return language === 'bn' ? '০ ৳' : '0 ৳';
    if (isPrivacyMode) return '•••••• ৳';
    return formatTaka(amountPoisha);
  };

  // Limit display to 6 items by default if not expanded
  const displayedCategories = showAllCategories
    ? expenseCategories
    : expenseCategories.slice(0, 6);

  const activeCategoryCount = expenseCategories.filter(
    (c) => (categoryExpenseMap.get(c.id) || 0) > 0
  ).length;

  return (
    <div
      id="category-expenses-card"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <PieChart className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {language === 'bn' ? 'ক্যাটাগরি অনুযায়ী খরচ ও সীমা' : 'Category Spending & Budget'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {activeCategoryCount > 0
                ? (language === 'bn'
                  ? `${formatNumber(expenseCategories.length)}টির মধ্যে ${formatNumber(activeCategoryCount)}টি খাতে খরচ হয়েছে`
                  : `Spent in ${formatNumber(activeCategoryCount)} of ${formatNumber(expenseCategories.length)} categories`)
                : (language === 'bn' ? 'এই মাসে কোন খাতে কত টাকা খরচ হলো' : 'Spending breakdown this month')}
            </p>
          </div>
        </div>

        {/* Action Button: Quick Add Category */}
        <button
          id="open-add-category-modal-btn"
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {language === 'bn' ? 'নতুন ক্যাটাগরি' : 'New Category'}
        </button>
      </div>

      {/* Exceeded alert banner if any */}
      {exceededCount > 0 && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2.5 text-rose-800 dark:text-rose-200 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <p className="text-xs font-bold leading-normal">
            {language === 'bn'
              ? `সতর্কতা: এই মাসে ${formatNumber(exceededCount)}টি ক্যাটাগরিতে আপনার নির্ধারিত খরচের সীমা পার হয়ে গেছে!`
              : `Warning: Budget exceeded in ${formatNumber(exceededCount)} categories this month!`}
          </p>
        </div>
      )}

      {/* Category List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
        {displayedCategories.map((cat) => {
          const amountPoisha = categoryExpenseMap.get(cat.id) || 0;
          const hasExpense = amountPoisha > 0;
          const budgetLimitPoisha = budgetMap.get(cat.id) || 0;
          const hasBudget = budgetLimitPoisha > 0;

          // Budget percentage & alert state
          const budgetRatio = hasBudget ? (amountPoisha / budgetLimitPoisha) * 100 : 0;
          const isOverBudget = hasBudget && amountPoisha > budgetLimitPoisha;
          const isNearBudget = hasBudget && !isOverBudget && budgetRatio >= 85;

          // Progress bar percentage (capped at 100% for bar, but visually alerts)
          const barFillPercentage = hasBudget
            ? Math.min(100, Math.round(budgetRatio))
            : hasExpense && totalExpensePoisha > 0
            ? Math.round((amountPoisha / totalExpensePoisha) * 100)
            : 0;

          return (
            <div
              key={cat.id}
              id={`cat-expense-row-${cat.id}`}
              className={`py-2.5 px-2 rounded-xl transition-all ${
                isOverBudget
                  ? 'bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/80 my-1 shadow-2xs'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              {/* Top Row: Icon + Name + Amounts */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${cat.color}15`,
                      color: cat.color,
                    }}
                  >
                    <CategoryIcon name={cat.icon} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {getCategoryName(cat)}
                      </span>
                      {isOverBudget && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold bg-rose-600 text-white tracking-wide">
                          <AlertTriangle className="w-3 h-3" /> {language === 'bn' ? 'সীমা পার!' : 'Over Limit!'}
                        </span>
                      )}
                      {isNearBudget && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200">
                          {formatNumber(Math.round(budgetRatio))}% {language === 'bn' ? 'খরচ' : 'spent'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Spent & Budget button */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <span
                      className={`text-sm font-extrabold block ${
                        isOverBudget
                          ? 'text-rose-600 dark:text-rose-400'
                          : hasExpense
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400 font-medium'
                      }`}
                    >
                      {renderAmount(amountPoisha)}
                    </span>
                    {hasBudget ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                        {language === 'bn' ? 'সীমা:' : 'Limit:'} {renderAmount(budgetLimitPoisha)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                        {language === 'bn' ? 'সীমা নেই' : 'No limit'}
                      </span>
                    )}
                  </div>

                  {/* Budget Edit Button */}
                  <button
                    id={`edit-budget-btn-${cat.id}`}
                    type="button"
                    onClick={() => openBudgetModalFor(cat)}
                    title={language === 'bn' ? 'খরচের সীমা সেট করুন' : 'Set spending limit'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      hasBudget
                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        : 'bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar with Budget Warning */}
              <div className="mt-2 space-y-1">
                <AnimatedProgressBar
                  percentage={Math.max(barFillPercentage, hasExpense ? 5 : 0)}
                  color={
                    isOverBudget
                      ? '#EF4444' // Bright Red when exceeded
                      : isNearBudget
                      ? '#F59E0B' // Amber when near limit
                      : cat.color
                  }
                  heightClass="h-2"
                  bgClass="bg-slate-100 dark:bg-slate-800"
                  duration={0.35}
                />

                {/* Progress details */}
                <div className="flex items-center justify-between text-xs font-medium">
                  {hasBudget ? (
                    <>
                      <span className={isOverBudget ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                        {isOverBudget
                          ? (language === 'bn'
                            ? `${renderAmount(amountPoisha - budgetLimitPoisha)} অতিরিক্ত খরচ হয়েছে!`
                            : `${renderAmount(amountPoisha - budgetLimitPoisha)} over budget!`)
                          : (language === 'bn'
                            ? `বাকি আছে: ${renderAmount(budgetLimitPoisha - amountPoisha)}`
                            : `Remaining: ${renderAmount(budgetLimitPoisha - amountPoisha)}`)}
                      </span>
                      <span
                        className={`font-bold ${
                          isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {formatNumber(Math.round(budgetRatio))}%
                      </span>
                    </>
                  ) : hasExpense ? (
                    <>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {language === 'bn' ? 'মোট খরচের অংশ' : 'Share of total'}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        {formatNumber(barFillPercentage)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {language === 'bn' ? 'কোনো খরচ নেই' : 'No expenses'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more / Show less toggle */}
      {expenseCategories.length > 6 && (
        <button
          id="toggle-all-categories-btn"
          type="button"
          onClick={() => setShowAllCategories(!showAllCategories)}
          className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center gap-1 transition-colors"
        >
          {showAllCategories ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              {language === 'bn' ? 'কম দেখুন' : 'Show less'}
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              {language === 'bn'
                ? `সব ক্যাটাগরি দেখুন (${formatNumber(expenseCategories.length)}টি)`
                : `View all categories (${formatNumber(expenseCategories.length)})`}
            </>
          )}
        </button>
      )}

      {/* Modal: Set / Edit Category Budget Limit */}
      {budgetModalCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {language === 'bn' ? 'মাসিক খরচের সীমা সেট করুন' : 'Set Monthly Budget Limit'}
              </div>
              <button
                type="button"
                onClick={() => setBudgetModalCategory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${budgetModalCategory.color}20`,
                    color: budgetModalCategory.color,
                  }}
                >
                  <CategoryIcon name={budgetModalCategory.icon} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{getCategoryName(budgetModalCategory)}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'bn' ? 'এই মাসে ইতিমধ্যে খরচ হয়েছে:' : 'Already spent this month:'}{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatTaka(categoryExpenseMap.get(budgetModalCategory.id) || 0)}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'মাসিক বাজেট লিমিট (টাকা ৳)' : 'Monthly Budget Limit (৳)'}
                </label>
                <input
                  id="category-budget-limit-input"
                  type="number"
                  min="0"
                  step="any"
                  value={budgetInputTaka}
                  onChange={(e) => setBudgetInputTaka(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: ৫০০০ (০ লিখলে সীমা মুছে যাবে)' : 'e.g. 5000 (0 to remove limit)'}
                  className="w-full px-3.5 py-2.5 text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
                  autoFocus
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {language === 'bn' ? 'বাজেট পার হলে লাল রঙের সতর্কতা সংকেত দেখাবে।' : 'A red warning alert will trigger if spending exceeds the limit.'}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBudgetModalCategory(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  id="save-budget-submit-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {language === 'bn' ? 'বাজেট সংরক্ষণ করুন' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {language === 'bn' ? 'নতুন ক্যাটাগরি যোগ করুন' : 'Add New Category'}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'ক্যাটাগরির নাম *' : 'Category Name *'}
                </label>
                <input
                  id="dashboard-new-cat-name-input"
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: জিম ও ফিটনেস, বইমেলা, গিফট' : 'e.g. Gym & Fitness, Book Fair, Gifts'}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                  required
                  autoFocus
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'bn' ? 'আইকন বেছে নিন:' : 'Select Icon:'}
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewCatIcon(iconName)}
                      className={`p-2 rounded-xl border shrink-0 transition-all ${
                        newCatIcon === iconName
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <CategoryIcon name={iconName} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'bn' ? 'রং বেছে নিন:' : 'Select Color:'}
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={`w-7 h-7 rounded-full shrink-0 transition-transform ${
                        newCatColor === c
                          ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview chip */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between border border-slate-200/70 dark:border-slate-700/70">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: `${newCatColor}20`,
                      color: newCatColor,
                    }}
                  >
                    <CategoryIcon name={newCatIcon} className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {newCatName.trim() || (language === 'bn' ? 'ক্যাটাগরির নাম' : 'Category Name')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                      {language === 'bn' ? 'খরচের ক্যাটাগরি' : 'Expense Category'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {language === 'bn' ? '০ ৳' : '0 ৳'}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  id="submit-dashboard-new-cat-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {language === 'bn' ? 'ক্যাটাগরি যোগ করুন' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
