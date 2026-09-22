import { Transaction, Category, CategoryBudget, FinancialSummary } from '../types';
import { formatTaka, formatNumber, Language } from './formatters';

export interface TopCategoryData {
  category: Category;
  amountPoisha: number;
  percentage: number;
  count: number;
}

export interface SmartSpendingMetrics {
  todayExpensePoisha: number;
  thisWeekExpensePoisha: number;
  thisMonthExpensePoisha: number;
  lastMonthExpensePoisha: number;
  topExpenseCategory: TopCategoryData | null;
  insights: {
    id: string;
    type: 'TOP_CATEGORY' | 'MONTH_COMPARISON' | 'SAVINGS_RATE' | 'BUDGET_WARNING' | 'NEUTRAL';
    text: string;
    highlight?: string;
  }[];
}

export function computeSmartSpendingInsights(
  transactions: Transaction[],
  categories: Category[],
  budgets: CategoryBudget[],
  summary: FinancialSummary,
  selectedMonth: string, // YYYY-MM
  lang: Language = 'bn'
): SmartSpendingMetrics {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  // Calculate start of current week (Sunday)
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = `${currentWeekStart.getFullYear()}-${String(
    currentWeekStart.getMonth() + 1
  ).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;

  // Calculate last month YYYY-MM
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${prevMonthDate.getFullYear()}-${String(
    prevMonthDate.getMonth() + 1
  ).padStart(2, '0')}`;

  let todayExpensePoisha = 0;
  let thisWeekExpensePoisha = 0;
  let thisMonthExpensePoisha = 0;
  let lastMonthExpensePoisha = 0;

  const categoryExpenseMap = new Map<string, { totalPoisha: number; count: number }>();

  for (const tx of transactions) {
    const rawAmount = (tx as any).amount_poisha ?? 0;
    const amount = typeof rawAmount === 'number' && !isNaN(rawAmount) ? rawAmount : 0;
    const rawFee = (tx as any).transfer_fee_poisha ?? 0;
    const fee = typeof rawFee === 'number' && !isNaN(rawFee) ? rawFee : 0;

    const isExpense = tx.type === 'EXPENSE';
    const isFee = tx.type === 'TRANSFER' && fee > 0;

    // 1. Today's expense
    if (tx.date === todayStr) {
      if (isExpense) todayExpensePoisha += amount;
      if (isFee) todayExpensePoisha += fee;
    }

    // 2. This week's expense
    if (tx.date >= weekStartStr && tx.date <= todayStr) {
      if (isExpense) thisWeekExpensePoisha += amount;
      if (isFee) thisWeekExpensePoisha += fee;
    }

    // 3. This month's expense
    if (tx.date.startsWith(selectedMonth)) {
      if (isExpense) {
        thisMonthExpensePoisha += amount;
        const catId = tx.category_id || 'other';
        const current = categoryExpenseMap.get(catId) || { totalPoisha: 0, count: 0 };
        categoryExpenseMap.set(catId, {
          totalPoisha: current.totalPoisha + amount,
          count: current.count + 1,
        });
      }
      if (isFee) {
        thisMonthExpensePoisha += fee;
      }
    }

    // 4. Last month's expense
    if (tx.date.startsWith(lastMonthKey)) {
      if (isExpense) lastMonthExpensePoisha += amount;
      if (isFee) lastMonthExpensePoisha += fee;
    }
  }

  // Find top spending category in selected month
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  let topCatId: string | null = null;
  let maxSpend = 0;
  let maxCount = 0;

  categoryExpenseMap.forEach((val, catId) => {
    if (val.totalPoisha > maxSpend) {
      maxSpend = val.totalPoisha;
      maxCount = val.count;
      topCatId = catId;
    }
  });

  let topExpenseCategory: TopCategoryData | null = null;
  if (topCatId && maxSpend > 0) {
    const cat = categoryMap.get(topCatId) || {
      id: topCatId,
      name: lang === 'bn' ? 'অন্যান্য' : 'Other',
      type: 'EXPENSE',
      icon: 'Tag',
      color: '#94A3B8',
    };
    const percentage = thisMonthExpensePoisha > 0 ? (maxSpend / thisMonthExpensePoisha) * 100 : 0;
    topExpenseCategory = {
      category: cat,
      amountPoisha: maxSpend,
      percentage: Math.round(percentage),
      count: maxCount,
    };
  }

  // Generate Data-Driven Insights
  const insights: SmartSpendingMetrics['insights'] = [];

  // Insight 1: Top Category
  if (topExpenseCategory) {
    const catName = topExpenseCategory.category.name;
    const pct = formatNumber(topExpenseCategory.percentage, lang);
    const amountStr = formatTaka(topExpenseCategory.amountPoisha, false, lang);

    insights.push({
      id: 'insight-top-cat',
      type: 'TOP_CATEGORY',
      text:
        lang === 'bn'
          ? `এই মাসে আপনার সবচেয়ে বেশি খরচ হয়েছে "${catName}" খাতে—মোট খরচের ${pct}% (${amountStr})।`
          : `Highest spending this month is in "${catName}"—accounting for ${pct}% of total expense (${amountStr}).`,
      highlight: catName,
    });
  }

  // Insight 2: Month Comparison
  if (thisMonthExpensePoisha > 0 && lastMonthExpensePoisha > 0) {
    const diff = thisMonthExpensePoisha - lastMonthExpensePoisha;
    const diffTaka = formatTaka(Math.abs(diff), false, lang);
    if (diff > 0) {
      insights.push({
        id: 'insight-month-comp-high',
        type: 'MONTH_COMPARISON',
        text:
          lang === 'bn'
            ? `এই মাসে আপনার খরচ গত মাসের তুলনায় ${diffTaka} বেশি হয়েছে।`
            : `Expenses this month are ${diffTaka} higher than last month.`,
        highlight: diffTaka,
      });
    } else if (diff < 0) {
      insights.push({
        id: 'insight-month-comp-low',
        type: 'MONTH_COMPARISON',
        text:
          lang === 'bn'
            ? `ভালো খবর! এই মাসে আপনার খরচ গত মাসের তুলনায় ${diffTaka} কম হয়েছে।`
            : `Great news! Expenses this month are ${diffTaka} lower than last month.`,
        highlight: diffTaka,
      });
    }
  }

  // Insight 3: Savings Rate
  if (summary.monthlyIncomePoisha > 0) {
    const savingsRate = Math.round((summary.monthlySavingsPoisha / summary.monthlyIncomePoisha) * 100);
    if (savingsRate > 0) {
      insights.push({
        id: 'insight-savings-positive',
        type: 'SAVINGS_RATE',
        text:
          lang === 'bn'
            ? `এই মাসে আপনার আয়ের ${formatNumber(savingsRate, lang)}% সঞ্চয় হয়েছে।`
            : `You saved ${formatNumber(savingsRate, lang)}% of your income this month.`,
        highlight: `${formatNumber(savingsRate, lang)}%`,
      });
    } else if (savingsRate < 0) {
      insights.push({
        id: 'insight-savings-negative',
        type: 'SAVINGS_RATE',
        text:
          lang === 'bn'
            ? 'এই মাসে আয়ের চেয়ে ব্যয় বেশি হয়েছে। বাজেট পর্যালোচনা করার পরামর্শ রইল।'
            : 'Expenses exceeded income this month. Review your budget allocations.',
      });
    }
  }

  // Insight 4: Category Budget Alerts
  for (const b of budgets) {
    const spent = categoryExpenseMap.get(b.category_id)?.totalPoisha || 0;
    if (b.limit_poisha > 0 && spent >= b.limit_poisha) {
      const cat = categoryMap.get(b.category_id);
      const catName = cat?.name || (lang === 'bn' ? 'ক্যাটাগরি' : 'Category');
      insights.push({
        id: `insight-budget-exceeded-${b.category_id}`,
        type: 'BUDGET_WARNING',
        text:
          lang === 'bn'
            ? `সতর্কতা: "${catName}" খাতে বাজেট সীমা পার হয়ে গেছে (${formatTaka(spent, false, lang)} / ${formatTaka(b.limit_poisha, false, lang)})!`
            : `Warning: Budget exceeded in "${catName}" (${formatTaka(spent, false, lang)} / ${formatTaka(b.limit_poisha, false, lang)})!`,
        highlight: catName,
      });
      break; // Show at most one critical budget warning in top highlights
    }
  }

  // Default fallback insight if clean fresh start
  if (insights.length === 0) {
    insights.push({
      id: 'insight-welcome',
      type: 'NEUTRAL',
      text:
        lang === 'bn'
          ? 'নতুন লেনদেন যুক্ত করুন। লেনদেনের সাথে সাথে আপনার ব্যয়ের তথ্য ও ট্রেন্ড স্বয়ংক্রিয়ভাবে এখানে উপস্থাপিত হবে।'
          : 'Add transactions to see automated spending analysis and data-driven insights here.',
    });
  }

  return {
    todayExpensePoisha,
    thisWeekExpensePoisha,
    thisMonthExpensePoisha,
    lastMonthExpensePoisha,
    topExpenseCategory,
    insights,
  };
}
