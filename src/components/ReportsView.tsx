import React, { useState, useMemo } from 'react';
import {
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  DollarSign,
  Receipt,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Transaction, Category, Account, FinancialSummary } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { DateFilterSelection } from './DateRangePicker';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { useLanguage } from '../contexts/LanguageContext';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  summary: FinancialSummary;
  dateFilter: DateFilterSelection;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  categories,
  accounts,
  summary,
  dateFilter,
}) => {
  const { t, language, formatTaka, formatMonthYear, getCategoryName } = useLanguage();

  // Chart tab: 'EXPENSE' | 'INCOME' | 'COMPARISON'
  const [activeChartTab, setActiveChartTab] = useState<'EXPENSE' | 'INCOME' | 'COMPARISON'>('EXPENSE');
  // Selected category slice for interactive details
  const [selectedCategorySlice, setSelectedCategorySlice] = useState<string | null>(null);

  const categoryMap = useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);

  // Check if a transaction is in the active filter period
  const isTxInPeriod = (txDate: string): boolean => {
    if (dateFilter.type === 'ALL_TIME') return true;
    if (dateFilter.type === 'CUSTOM') {
      if (dateFilter.startDate && txDate < dateFilter.startDate) return false;
      if (dateFilter.endDate && txDate > dateFilter.endDate) return false;
      return true;
    }
    // Default: MONTH
    return txDate.startsWith(dateFilter.selectedMonth);
  };

  // 1. Filter transactions for the selected period
  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => isTxInPeriod(tx.date));
  }, [transactions, dateFilter]);

  // 2. Category Breakdown for Expenses in Current Period
  const expenseCategoryData = useMemo(() => {
    const map = new Map<string, { totalPoisha: number; count: number }>();
    let totalExpensePoisha = 0;

    for (const tx of transactions) {
      if (!isTxInPeriod(tx.date)) continue;

      if (tx.type === 'EXPENSE') {
        totalExpensePoisha += tx.amount_poisha;
        const catId = tx.category_id || 'uncategorized';
        const current = map.get(catId) || { totalPoisha: 0, count: 0 };
        map.set(catId, {
          totalPoisha: current.totalPoisha + tx.amount_poisha,
          count: current.count + 1,
        });
      } else if (tx.type === 'TRANSFER' && tx.transfer_fee_poisha > 0) {
        // Transfer fee counts as expense under fee category
        totalExpensePoisha += tx.transfer_fee_poisha;
        const feeId = 'transfer_fee';
        const current = map.get(feeId) || { totalPoisha: 0, count: 0 };
        map.set(feeId, {
          totalPoisha: current.totalPoisha + tx.transfer_fee_poisha,
          count: current.count + 1,
        });
      }
    }

    const items = Array.from(map.entries()).map(([catId, data]) => {
      let name = language === 'bn' ? 'অন্যান্য খরচ' : 'Other Expenses';
      let color = '#94A3B8';
      let icon = 'Tag';

      if (catId === 'transfer_fee') {
        name = language === 'bn' ? 'ব্যাংক/ট্রান্সফার চার্জ' : 'Bank / Transfer Fee';
        color = '#F43F5E';
        icon = 'CreditCard';
      } else {
        const cat = categoryMap.get(catId);
        if (cat) {
          name = getCategoryName(cat);
          color = cat.color || '#10B981';
          icon = cat.icon || 'Tag';
        }
      }

      const taka = Math.round(data.totalPoisha / 100);
      const percentage = totalExpensePoisha > 0 ? (data.totalPoisha / totalExpensePoisha) * 100 : 0;

      return {
        id: catId,
        name,
        color,
        icon,
        value: taka,
        totalPoisha: data.totalPoisha,
        percentage: Number(percentage.toFixed(1)),
        count: data.count,
      };
    });

    // Sort descending by amount
    items.sort((a, b) => b.totalPoisha - a.totalPoisha);
    return { items, totalExpensePoisha };
  }, [transactions, dateFilter, categoryMap, language]);

  // 3. Category Breakdown for Income in Current Period
  const incomeCategoryData = useMemo(() => {
    const map = new Map<string, { totalPoisha: number; count: number }>();
    let totalIncomePoisha = 0;

    for (const tx of transactions) {
      if (!isTxInPeriod(tx.date)) continue;

      if (tx.type === 'INCOME') {
        totalIncomePoisha += tx.amount_poisha;
        const catId = tx.category_id || 'uncategorized';
        const current = map.get(catId) || { totalPoisha: 0, count: 0 };
        map.set(catId, {
          totalPoisha: current.totalPoisha + tx.amount_poisha,
          count: current.count + 1,
        });
      }
    }

    const items = Array.from(map.entries()).map(([catId, data]) => {
      let name = language === 'bn' ? 'অন্যান্য আয়' : 'Other Income';
      let color = '#10B981';
      let icon = 'Banknote';

      const cat = categoryMap.get(catId);
      if (cat) {
        name = getCategoryName(cat);
        color = cat.color || '#10B981';
        icon = cat.icon || 'Banknote';
      }

      const taka = Math.round(data.totalPoisha / 100);
      const percentage = totalIncomePoisha > 0 ? (data.totalPoisha / totalIncomePoisha) * 100 : 0;

      return {
        id: catId,
        name,
        color,
        icon,
        value: taka,
        totalPoisha: data.totalPoisha,
        percentage: Number(percentage.toFixed(1)),
        count: data.count,
      };
    });

    items.sort((a, b) => b.totalPoisha - a.totalPoisha);
    return { items, totalIncomePoisha };
  }, [transactions, dateFilter, categoryMap, language]);

  // 4. Monthly Trend Data (Last 6 Months comparison of Income vs Expense)
  const monthlyTrendData = useMemo(() => {
    // Generate previous 6 months list: [5 months ago, ..., current month]
    const months: string[] = [];
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
    }

    const incomeLabel = language === 'bn' ? 'আয় (টাকা)' : 'Income (৳)';
    const expenseLabel = language === 'bn' ? 'ব্যয় (টাকা)' : 'Expense (৳)';
    const savingsLabel = language === 'bn' ? 'সঞ্চয় (টাকা)' : 'Savings (৳)';

    return months.map((mKey) => {
      let incomePoisha = 0;
      let expensePoisha = 0;

      for (const tx of transactions) {
        if (tx.date.startsWith(mKey)) {
          if (tx.type === 'INCOME') {
            incomePoisha += tx.amount_poisha;
          } else if (tx.type === 'EXPENSE') {
            expensePoisha += tx.amount_poisha;
          } else if (tx.type === 'TRANSFER' && tx.transfer_fee_poisha > 0) {
            expensePoisha += tx.transfer_fee_poisha;
          }
        }
      }

      const incomeTaka = Math.round(incomePoisha / 100);
      const expenseTaka = Math.round(expensePoisha / 100);
      const savingsTaka = incomeTaka - expenseTaka;

      // Extract short Month Label
      const shortLabel = formatMonthYear(mKey).split(' ')[0];

      return {
        monthKey: mKey,
        monthName: shortLabel,
        [incomeLabel]: incomeTaka,
        [expenseLabel]: expenseTaka,
        [savingsLabel]: savingsTaka,
        incomePoisha,
        expensePoisha,
        rawSavingsTaka: savingsTaka,
      };
    });
  }, [transactions, language, formatMonthYear]);

  // Active dataset depending on selected tab
  const currentChartDataset = activeChartTab === 'EXPENSE' ? expenseCategoryData : incomeCategoryData;

  const incomeBarKey = language === 'bn' ? 'আয় (টাকা)' : 'Income (৳)';
  const expenseBarKey = language === 'bn' ? 'ব্যয় (টাকা)' : 'Expense (৳)';

  // Custom Recharts Tooltip for Category Pie Chart
  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 shadow-lg text-xs space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-bold text-slate-900 dark:text-slate-100">{data.name}</span>
          </div>
          <div className="text-slate-600 dark:text-slate-300">
            {language === 'bn' ? 'টাকা:' : 'Amount:'} <span className="font-extrabold text-slate-900 dark:text-slate-100">{formatTaka(data.totalPoisha)}</span>
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            {language === 'bn' ? 'মোট অনুপাত:' : 'Share of total:'} <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data.percentage}%</span> ({data.count} {language === 'bn' ? 'টি লেনদেন' : 'txns'})
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Monthly Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-lg text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1">
            {language === 'bn' ? 'মাস:' : 'Month:'} {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }} className="font-medium">
                {entry.name}:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {formatTaka(entry.value * 100)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t.reports.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t.reports.subtitle}
          </p>
        </div>

        <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate max-w-[130px] font-bold">{dateFilter.label}</span>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{t.reports.totalIncome}</span>
          </div>
          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate tracking-tight">
            {formatTaka(summary.monthlyIncomePoisha)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 mb-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{t.reports.totalExpense}</span>
          </div>
          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate tracking-tight">
            {formatTaka(summary.monthlyExpensePoisha)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-1 text-teal-700 dark:text-teal-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{t.reports.netSavings}</span>
          </div>
          <div
            className={`text-sm sm:text-base font-extrabold truncate tracking-tight ${
              summary.monthlySavingsPoisha < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-teal-700 dark:text-teal-400'
            }`}
          >
            {formatTaka(summary.monthlySavingsPoisha)}
          </div>
        </div>
      </div>

      {/* Main Tab Controller for Visual Charts */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl gap-1">
        <button
          id="report-tab-expense"
          onClick={() => {
            setActiveChartTab('EXPENSE');
            setSelectedCategorySlice(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeChartTab === 'EXPENSE'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <PieChartIcon className="w-3.5 h-3.5" />
          {t.reports.expenseReport}
        </button>

        <button
          id="report-tab-income"
          onClick={() => {
            setActiveChartTab('INCOME');
            setSelectedCategorySlice(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeChartTab === 'INCOME'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <PieChartIcon className="w-3.5 h-3.5" />
          {t.reports.incomeReport}
        </button>

        <button
          id="report-tab-comparison"
          onClick={() => {
            setActiveChartTab('COMPARISON');
            setSelectedCategorySlice(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeChartTab === 'COMPARISON'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          {t.reports.comparisonReport}
        </button>
      </div>

      {/* SECTION 1: Category Pie Chart Breakdown (Expense or Income) */}
      {(activeChartTab === 'EXPENSE' || activeChartTab === 'INCOME') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {activeChartTab === 'EXPENSE'
                  ? (language === 'bn' ? 'ক্যাটাগরি অনুযায়ী খরচের পাই চার্ট' : 'Category Expense Breakdown')
                  : (language === 'bn' ? 'ক্যাটাগরি অনুযায়ী আয়ের পাই চার্ট' : 'Category Income Breakdown')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'bn'
                  ? 'কোন খাতে কত শতাংশ ও কত টাকা লেনদেন হয়েছে'
                  : 'Percentage and amounts spent across categories'}
              </p>
            </div>
            <span
              className={`text-xs font-extrabold px-2.5 py-1 rounded-xl ${
                activeChartTab === 'EXPENSE'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {language === 'bn' ? 'মোট: ' : 'Total: '}
              {formatTaka(
                activeChartTab === 'EXPENSE'
                  ? expenseCategoryData.totalExpensePoisha
                  : incomeCategoryData.totalIncomePoisha
              )}
            </span>
          </div>

          {/* If No Data */}
          {currentChartDataset.items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <PieChartIcon className="w-6 h-6 stroke-[1.75]" />
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t.reports.noDataForPeriod}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {language === 'bn' ? 'নতুন লেনদেন যোগ করলে স্বয়ংক্রিয়ভাবে চার্ট তৈরি হবে' : 'Adding transactions will automatically generate this chart'}
              </p>
            </div>
          ) : (
            <div>
              {/* Pie Chart SVG Render */}
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip content={<CustomCategoryTooltip />} />
                    <Pie
                      data={currentChartDataset.items}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={(entry: any) => setSelectedCategorySlice(entry?.id || null)}
                    >
                      {currentChartDataset.items.map((entry) => (
                        <Cell
                          key={`cell-${entry.id}`}
                          fill={entry.color}
                          stroke={selectedCategorySlice === entry.id ? '#0f172a' : 'none'}
                          strokeWidth={selectedCategorySlice === entry.id ? 2 : 0}
                          className="cursor-pointer transition-transform hover:opacity-90"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge inside Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {activeChartTab === 'EXPENSE' ? t.reports.totalExpense : t.reports.totalIncome}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {formatTaka(
                      activeChartTab === 'EXPENSE'
                        ? expenseCategoryData.totalExpensePoisha
                        : incomeCategoryData.totalIncomePoisha
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {currentChartDataset.items.length} {language === 'bn' ? 'টি ক্যাটাগরি' : 'Categories'}
                  </span>
                </div>
              </div>

              {/* Category Breakdown Progress Bars & List */}
              <div className="mt-4 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {language === 'bn' ? 'ক্যাটাগরি ভিত্তিক বিস্তারিত তালিকা:' : 'Detailed Category Breakdown:'}
                </h4>

                {currentChartDataset.items.map((item) => {
                  const isSelected = selectedCategorySlice === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedCategorySlice(isSelected ? null : item.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/60 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${item.color}25`,
                              color: item.color,
                            }}
                          >
                            <CategoryIcon name={item.icon} className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {item.count} {language === 'bn' ? 'টি লেনদেন' : 'transactions'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                            {formatTaka(item.totalPoisha)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bar */}
                      <AnimatedProgressBar
                        percentage={item.percentage}
                        color={item.color}
                        heightClass="h-1.5"
                        bgClass="bg-slate-200 dark:bg-slate-700"
                        duration={0.35}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Monthly Comparison Bar Chart */}
      {activeChartTab === 'COMPARISON' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {language === 'bn' ? 'গত ৬ মাসের আয় ও ব্যয়ের বার চার্ট' : 'Last 6 Months Income vs Expense Chart'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'bn'
                  ? 'প্রতি মাসে কত টাকা আয় হয়েছে বনাম কত টাকা খরচ হয়েছে'
                  : 'Monthly comparison of total earned vs spent'}
              </p>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} stroke="#94a3b8" />
                <XAxis
                  dataKey="monthName"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `৳${val > 999 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <RechartsTooltip content={<CustomBarTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar
                  dataKey={incomeBarKey}
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey={expenseBarKey}
                  fill="#F43F5E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Comparison Table */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'bn' ? 'মাসিক হিসাবের সারাংশ তালিকা:' : 'Monthly Summary Table:'}
            </h4>
            <div className="space-y-1.5">
              {monthlyTrendData.map((item) => {
                const isPositive = item.rawSavingsTaka >= 0;
                return (
                  <div
                    key={item.monthKey}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/60 text-xs"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200 min-w-[70px]">
                      {formatMonthYear(item.monthKey)}
                    </div>

                    <div className="flex items-center gap-3 font-medium">
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {language === 'bn' ? 'আয়: ' : 'Income: '}{formatTaka(item.incomePoisha)}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {language === 'bn' ? 'ব্যয়: ' : 'Expense: '}{formatTaka(item.expensePoisha)}
                      </span>
                      <span
                        className={`font-bold ${
                          isPositive
                            ? 'text-teal-700 dark:text-teal-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {language === 'bn' ? 'উদ্বৃত্ত: ' : 'Net: '}{formatTaka(item.rawSavingsTaka * 100)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Financial Health Tips Card */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
          <Info className="w-4 h-4 shrink-0" />
          <span>{language === 'bn' ? 'সহজ আর্থিক পরামর্শ' : 'Financial Insight & Tips'}</span>
        </div>
        <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
          {summary.monthlySavingsPoisha >= 0
            ? (language === 'bn'
                ? `মাশাআল্লাহ! চলতি সময়ে আপনার মোট আয়ের চেয়ে ব্যয় কম থাকায় ${formatTaka(
                    summary.monthlySavingsPoisha
                  )} টাকা উদ্বৃত্ত/সঞ্চয় রয়েছে। নিয়মিত এই উদ্বৃত্ত টাকা সেভিংস বা সঞ্চয় অ্যাকাউন্টে আলাদা করে রাখুন।`
                : `Great job! Your income exceeds your expenses with a net surplus of ${formatTaka(
                    summary.monthlySavingsPoisha
                  )}. Consider setting this surplus aside in your savings account.`)
            : (language === 'bn'
                ? `সতর্কতা: চলতি সময়ে আয়ের চেয়ে ব্যয় ${formatTaka(
                    Math.abs(summary.monthlySavingsPoisha)
                  )} টাকা বেশি হয়েছে। সর্বোচ্চ খরচের ক্যাটাগরিগুলো চিহ্নিত করে অপ্রয়োজনীয় ব্যয় কমিয়ে আনুন।`
                : `Caution: Your expenses exceed your income by ${formatTaka(
                    Math.abs(summary.monthlySavingsPoisha)
                  )}. Review your highest spending categories to cut down on discretionary expenses.`)}
        </p>
      </div>
    </div>
  );
};
