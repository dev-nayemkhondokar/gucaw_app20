import React from 'react';
import { motion } from 'motion/react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  ChevronRight,
  Eye,
  EyeOff,
  PieChart,
  Sparkles,
  ReceiptText,
} from 'lucide-react';
import { FinancialSummary, Account, Transaction, Category, CategoryBudget } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { CategoryIcon } from './CategoryIcon';
import { CategoryExpensesCard } from './CategoryExpensesCard';
import { AnimatedTaka } from './AnimatedTaka';

interface DashboardViewProps {
  summary: FinancialSummary;
  accounts: Account[];
  recentTransactions: Transaction[];
  categories: Category[];
  budgets: CategoryBudget[];
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onOpenAddModal: () => void;
  onNavigateToTab: (tab: string) => void;
  selectedMonth: string;
  allTransactions: Transaction[];
  onAddCategory: (data: {
    name: string;
    type: 'EXPENSE' | 'INCOME';
    icon: string;
    color: string;
  }) => void;
  onUpdateBudget: (categoryId: string, limitPoisha: number) => void;
}

// Subtle Stagger & Slide-Up Variants (Requirement 3: 0.25-0.3s duration, fast & smooth)
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.01,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.26,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  accounts,
  recentTransactions,
  categories,
  budgets,
  isPrivacyMode,
  onTogglePrivacy,
  onOpenAddModal,
  onNavigateToTab,
  selectedMonth,
  allTransactions,
  onAddCategory,
  onUpdateBudget,
}) => {
  const { t, language, formatTaka, formatDate, getCategoryName, getAccountName } = useLanguage();
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));

  const safeSummary: FinancialSummary = {
    totalLiquidBalancePoisha: Number(summary?.totalLiquidBalancePoisha) || 0,
    monthlyIncomePoisha: Number(summary?.monthlyIncomePoisha) || 0,
    monthlyExpensePoisha: Number(summary?.monthlyExpensePoisha) || 0,
    monthlySavingsPoisha: Number(summary?.monthlySavingsPoisha) || 0,
    totalReceivablesPoisha: Number(summary?.totalReceivablesPoisha) || 0,
    totalPayablesPoisha: Number(summary?.totalPayablesPoisha) || 0,
    trueNetWorthPoisha: Number(summary?.trueNetWorthPoisha) || 0,
    periodLabel: summary?.periodLabel,
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 pb-20"
    >
      {/* 1. Primary Card: Total Liquid Cash & Net Worth with Clean Geometric Accent */}
      <motion.div 
        variants={itemVariants}
        id="net-worth-card"
        className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-950 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden border border-emerald-600/30"
      >
        {/* Subtle, purposeful geometric banknote/fintech arcs watermark */}
        <svg
          className="absolute right-0 bottom-0 w-44 h-44 text-emerald-300/10 pointer-events-none"
          viewBox="0 0 160 160"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="140" cy="140" r="110" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="140" cy="140" r="80" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="140" cy="140" r="50" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="50" y1="140" x2="140" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          <rect x="95" y="95" width="45" height="45" rx="10" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div className="flex items-center justify-between text-white mb-2 relative z-10">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-100/90">
            <Wallet className="w-3.5 h-3.5 text-emerald-300" /> {t.dashboard.liquidBalance}
          </span>
          <button
            id="privacy-toggle-btn"
            onClick={onTogglePrivacy}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors active:scale-90"
            title={t.dashboard.privacyTooltip}
          >
            {isPrivacyMode ? <EyeOff className="w-4 h-4 text-emerald-200" /> : <Eye className="w-4 h-4 text-emerald-200" />}
          </button>
        </div>

        {/* Big Balance with Smooth Count-Up Animation */}
        <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 relative z-10">
          <AnimatedTaka
            amountPoisha={safeSummary.totalLiquidBalancePoisha}
            isPrivacyMode={isPrivacyMode}
            duration={320}
          />
        </div>

        {/* Sub-metrics: True Net Worth, Receivables, Payables */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/15 text-xs relative z-10">
          <div>
            <span className="text-emerald-100/80 text-[11px] font-medium block mb-0.5">{t.dashboard.netWorth}</span>
            <span className="font-bold text-white text-sm sm:text-base tracking-tight">
              <AnimatedTaka
                amountPoisha={safeSummary.trueNetWorthPoisha}
                isPrivacyMode={isPrivacyMode}
                duration={300}
              />
            </span>
          </div>
          <div>
            <span className="text-emerald-100/80 text-[11px] font-medium block mb-0.5">{t.dashboard.receivables}</span>
            <span className="font-bold text-white text-sm sm:text-base tracking-tight">
              <AnimatedTaka
                amountPoisha={safeSummary.totalReceivablesPoisha}
                isPrivacyMode={isPrivacyMode}
                duration={300}
              />
            </span>
          </div>
          <div>
            <span className="text-emerald-100/80 text-[11px] font-medium block mb-0.5">{t.dashboard.payables}</span>
            <span className="font-bold text-white text-sm sm:text-base tracking-tight">
              <AnimatedTaka
                amountPoisha={safeSummary.totalPayablesPoisha}
                isPrivacyMode={isPrivacyMode}
                duration={300}
              />
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Monthly/Period Cash Flow (P&L): Income, Expense, Savings */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2.5">
        {/* Income */}
        <div 
          id="monthly-income-card"
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 mb-1.5">
            <div className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold truncate">
              {safeSummary.periodLabel ? t.dashboard.income : t.dashboard.monthlyIncome}
            </span>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            <AnimatedTaka
              amountPoisha={safeSummary.monthlyIncomePoisha}
              isPrivacyMode={isPrivacyMode}
              duration={300}
            />
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-1">{t.dashboard.withoutDebt}</span>
        </div>

        {/* Expense */}
        <div 
          id="monthly-expense-card"
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 mb-1.5">
            <div className="w-5 h-5 rounded-md bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold truncate">
              {safeSummary.periodLabel ? t.dashboard.expense : t.dashboard.monthlyExpense}
            </span>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            <AnimatedTaka
              amountPoisha={safeSummary.monthlyExpensePoisha}
              isPrivacyMode={isPrivacyMode}
              duration={300}
            />
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-1">{t.dashboard.afterExpense}</span>
        </div>

        {/* Savings: Income - Expense */}
        <div 
          id="monthly-savings-card"
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 mb-1.5">
            <div className="w-5 h-5 rounded-md bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center shrink-0">
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold truncate">
              {safeSummary.periodLabel ? t.dashboard.savings : t.dashboard.monthlySavings}
            </span>
          </div>
          <div
            className={`text-base sm:text-lg font-extrabold tracking-tight ${
              safeSummary.monthlySavingsPoisha < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-teal-700 dark:text-teal-400'
            }`}
          >
            <AnimatedTaka
              amountPoisha={safeSummary.monthlySavingsPoisha}
              isPrivacyMode={isPrivacyMode}
              duration={300}
            />
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-1 truncate">
            {language === 'bn' ? 'আয় ও ব্যয়ের পার্থক্য' : 'Income minus Expense'}
          </span>
        </div>
      </motion.div>

      {/* 3. Quick Access to Reports & Charts (Secondary card: visually clean & balanced) */}
      <motion.button 
        variants={itemVariants}
        id="dashboard-reports-banner"
        onClick={() => onNavigateToTab('reports')}
        className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.985] transition-all flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {t.reports.title}
              </h4>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold border border-slate-200/70 dark:border-slate-700">
                {language === 'bn' ? 'চার্ট' : 'Charts'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {t.reports.subtitle}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all shrink-0" />
      </motion.button>

      {/* 4. AI Assistant Quick Access Banner */}
      <motion.button
        variants={itemVariants}
        id="dashboard-ai-banner"
        onClick={() => onNavigateToTab('ai')}
        className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3.5 rounded-2xl flex items-center justify-between text-left transition-all hover:border-emerald-500/60 group shadow-2xs active:scale-[0.985]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.ai.title}
              </span>
              <span className="text-[10.5px] px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded font-bold border border-emerald-200/80 dark:border-emerald-800/60">
                {language === 'bn' ? 'বাংলা' : 'AI'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {t.ai.subtitle}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
      </motion.button>

      {/* 5. Category Expenses & Budget Card */}
      <motion.div variants={itemVariants}>
        <CategoryExpensesCard
          categories={categories}
          transactions={allTransactions}
          budgets={budgets}
          selectedMonth={selectedMonth}
          isPrivacyMode={isPrivacyMode}
          onAddCategory={onAddCategory}
          onUpdateBudget={onUpdateBudget}
        />
      </motion.div>

      {/* 6. Quick Access Account Pills */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-3.5 bg-emerald-600 rounded-full" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {t.accounts.title}
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('accounts')}
            className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center hover:underline active:scale-95"
          >
            {t.dashboard.seeAll} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {accounts.slice(0, 4).map((acc) => (
            <div
              key={acc.id}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: acc.color }}
                />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{getAccountName(acc.name)}</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {acc.account_number_suffix ? `•••• ${acc.account_number_suffix}` : acc.type}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 7. Recent Transactions Section */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-3.5 bg-emerald-600 rounded-full" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {t.dashboard.recentTransactions}
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('transactions')}
            className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center hover:underline active:scale-95"
          >
            {t.dashboard.seeAll} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 px-4 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-2">
              <ReceiptText className="w-5 h-5 stroke-[1.75]" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{t.dashboard.noTransactions}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {t.dashboard.addFirstTransaction}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.slice(0, 5).map((tx) => {
              const cat = tx.category_id ? categoryMap.get(tx.category_id) : undefined;
              const acc = accountMap.get(tx.account_id);

              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: cat ? `${cat.color}18` : '#F1F5F9',
                        color: cat ? cat.color : '#475569',
                      }}
                    >
                      <CategoryIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {tx.type === 'TRANSFER'
                          ? t.transactions.transfer
                          : (tx.custom_category_name || (cat ? getCategoryName(cat.name) : t.transactions.uncategorized))}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                        {acc ? getAccountName(acc.name) : ''} • {formatDate(tx.date)}
                        {tx.note && (!tx.custom_category_name || tx.note !== tx.custom_category_name) ? ` • ${tx.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span
                      className={`text-sm sm:text-base font-extrabold tracking-tight ${
                        tx.type === 'EXPENSE'
                          ? 'text-rose-600 dark:text-rose-400'
                          : tx.type === 'INCOME'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}
                      {isPrivacyMode ? (
                        '•••••• ৳'
                      ) : (
                        formatTaka(tx.amount_poisha)
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
