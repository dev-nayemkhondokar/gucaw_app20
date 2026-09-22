/**
 * Agentic AI Engine
 * 
 * Implements strict 3-tier Agentic Architecture:
 * 1. Read: Guarded by data permissions (Finance, Notes, Contacts, Calendar).
 * 2. Suggest: Analyzes data and provides actionable Bengali recommendations (0 mutations).
 * 3. Action: Prepares proposed data modifications. STRICTLY REQUIRES EXPLICIT USER CONFIRMATION.
 * 
 * Hybrid Engine:
 * - Server-side Gemini API (/api/ai/query) for deep conversational reasoning when available.
 * - Robust Local Analytical Engine for comprehensive, accurate, instant offline computation.
 */

import {
  Transaction,
  Category,
  Account,
  DebtRecord,
  DebtPaymentHistory,
  CategoryBudget,
  SavingsGoal,
  RecurringExpense,
  FinancialSummary,
} from '../../types';
import { formatTaka } from '../../utils/formatters';
import { calculateAccountBalance } from '../../utils/calculations';
import {
  AIPermissions,
  AgentMessage,
  ProposedTransactionAction,
  FinancialAnalysisData,
  ChatHistoryItem,
} from './types';
import {
  classifyIntent,
  parseVoiceOrTextTransaction,
  extractDateFilter,
  detectCategory,
  detectAccount,
  BENGALI_MONTHS,
  detectUserLanguage,
  resolveContextualQuery,
  isOutOfScopeQuery,
} from './bengaliNLP';

export interface EngineContext {
  permissions: AIPermissions;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  debts: DebtRecord[];
  debtPayments?: DebtPaymentHistory[];
  budgets?: CategoryBudget[];
  savingsGoals?: SavingsGoal[];
  recurringExpenses?: RecurringExpense[];
  accountBalances?: { [id: string]: number };
  summary: FinancialSummary;
  selectedMonth: string; // YYYY-MM
  currentDate?: string; // YYYY-MM-DD
  chatHistory?: ChatHistoryItem[];
}

// Convert English number to Bengali digits string
export function toBengaliNumber(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (w) => bnDigits[+w]);
}

// Month name lookup in Bengali
export function getMonthBengaliName(monthNum: number): string {
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  return months[monthNum - 1] || `${monthNum} নম্বর মাস`;
}

// Format date YYYY-MM-DD to Bengali string e.g. "১৫ সেপ্টেম্বর ২০২৬"
export function formatDateBengali(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${toBengaliNumber(day)} ${getMonthBengaliName(month)} ${toBengaliNumber(year)}`;
}

/**
 * Builds permission-sanitized database snapshot for Gemini API
 */
export function buildDatabaseSnapshot(context: EngineContext) {
  const {
    permissions,
    transactions,
    categories,
    accounts,
    debts,
    debtPayments = [],
    budgets = [],
    savingsGoals = [],
    recurringExpenses = [],
    accountBalances,
    summary,
    selectedMonth,
    currentDate = new Date().toISOString().split('T')[0],
  } = context;

  if (!permissions.financeData) {
    return {
      financeDataAllowed: false,
      message: 'User has denied access to financial data.',
    };
  }

  // Sanitized Accounts
  const safeAccounts = accounts.filter((a) => a.is_active).map((a) => {
    const balPoisha = accountBalances?.[a.id] ?? calculateAccountBalance(a, transactions, debts, debtPayments);
    return {
      name: a.name,
      type: a.type,
      currentBalanceTaka: (balPoisha / 100).toFixed(2),
    };
  });

  // Sanitized Categories Map
  const catMap = new Map<string, string>();
  categories.forEach((c) => catMap.set(c.id, c.name));

  // Sanitized All Transactions
  const safeTransactions = transactions
    .slice(-150)
    .map((t) => ({
      date: t.date,
      type: t.type,
      amountTaka: (t.amount_poisha / 100).toFixed(2),
      category: t.category_id ? catMap.get(t.category_id) || 'অন্যান্য' : 'ট্রান্সফার',
      account: accounts.find((a) => a.id === t.account_id)?.name || 'অ্যাকাউন্ট',
      note: permissions.notes ? t.note : undefined,
    }));

  // Aggregated Category Summary for Current Year and Month
  const currentYear = currentDate.split('-')[0];
  const yearlyCategoryBreakdown = categories
    .filter((c) => c.type === 'EXPENSE')
    .map((c) => {
      const yearTx = transactions.filter(
        (t) => t.type === 'EXPENSE' && t.category_id === c.id && t.date.startsWith(currentYear)
      );
      const monthTx = transactions.filter(
        (t) => t.type === 'EXPENSE' && t.category_id === c.id && t.date.startsWith(selectedMonth)
      );
      const totalYearTaka = (yearTx.reduce((sum, t) => sum + t.amount_poisha, 0) / 100).toFixed(2);
      const totalMonthTaka = (monthTx.reduce((sum, t) => sum + t.amount_poisha, 0) / 100).toFixed(2);
      return {
        categoryName: c.name,
        currentYearTotalTaka: totalYearTaka,
        currentYearTransactionCount: yearTx.length,
        currentMonthTotalTaka: totalMonthTaka,
        currentMonthTransactionCount: monthTx.length,
      };
    })
    .filter((c) => Number(c.currentYearTotalTaka) > 0 || Number(c.currentMonthTotalTaka) > 0);

  // Sanitized Budgets
  const currentMonthTx = transactions.filter((t) => t.date.startsWith(selectedMonth));
  const safeBudgets = budgets.map((b) => {
    const catName = catMap.get(b.category_id) || 'ক্যাটাগরি';
    const spentPoisha = currentMonthTx
      .filter((t) => t.type === 'EXPENSE' && t.category_id === b.category_id)
      .reduce((sum, t) => sum + t.amount_poisha, 0);
    const limitTaka = b.limit_poisha / 100;
    const spentTaka = spentPoisha / 100;
    return {
      category: catName,
      monthlyLimitTaka: limitTaka,
      currentSpentTaka: spentTaka,
      isExceeded: spentTaka > limitTaka,
      exceededByTaka: spentTaka > limitTaka ? spentTaka - limitTaka : 0,
    };
  });

  // Sanitized Debts
  const safeDebts = debts.map((d, index) => {
    return {
      type: d.type === 'LENT' ? 'পাওনা (Lent)' : 'দেনা (Borrowed)',
      amountTaka: (d.initial_amount_poisha / 100).toFixed(2),
      status: d.status,
      personName: permissions.contacts ? d.person_name : `ব্যক্তি ${index + 1}`,
      dueDate: permissions.calendar ? d.due_date : undefined,
      note: permissions.notes ? d.notes : undefined,
    };
  });

  // Sanitized Savings Goals
  const safeSavingsGoals = savingsGoals.map((g) => {
    const target = g.target_amount_poisha / 100;
    const saved = g.saved_amount_poisha / 100;
    return {
      title: g.title,
      targetAmountTaka: target,
      savedAmountTaka: saved,
      percentageAchieved: target > 0 ? Math.round((saved / target) * 100) : 0,
      targetDate: permissions.calendar ? g.target_date : undefined,
    };
  });

  return {
    financeDataAllowed: true,
    currentDate,
    selectedMonth,
    financialSummary: {
      totalLiquidBalanceTaka: (summary.totalLiquidBalancePoisha / 100).toFixed(2),
      monthlyIncomeTaka: (summary.monthlyIncomePoisha / 100).toFixed(2),
      monthlyExpenseTaka: (summary.monthlyExpensePoisha / 100).toFixed(2),
      monthlySavingsTaka: (summary.monthlySavingsPoisha / 100).toFixed(2),
      totalReceivablesTaka: (summary.totalReceivablesPoisha / 100).toFixed(2),
      totalPayablesTaka: (summary.totalPayablesPoisha / 100).toFixed(2),
      trueNetWorthTaka: (summary.trueNetWorthPoisha / 100).toFixed(2),
    },
    accounts: safeAccounts,
    budgets: safeBudgets,
    debts: safeDebts,
    savingsGoals: safeSavingsGoals,
    recurringExpensesCount: recurringExpenses.length,
    yearlyCategoryExpenses: yearlyCategoryBreakdown,
    recentTransactions: safeTransactions,
  };
}

/**
 * Local Analytical Processing Engine
 * Guaranteed accurate, 100% offline-compatible answers.
 */
export function processAgentQuery(
  rawInput: string,
  context: EngineContext
): AgentMessage {
  const {
    permissions,
    transactions,
    categories,
    accounts,
    debts,
    debtPayments = [],
    budgets = [],
    savingsGoals = [],
    accountBalances,
    summary,
    selectedMonth,
    currentDate = new Date().toISOString().split('T')[0],
    chatHistory = [],
  } = context;

  // Resolve conversational continuity (e.g. "আর গত মাসে?", "আর আয়ের কি অবস্থা?", "আর খাবারে?")
  const contextual = resolveContextualQuery(rawInput, chatHistory, categories, accounts);
  const input = contextual.resolvedText;
  const intent = contextual.inferredIntent || classifyIntent(input, categories, accounts);
  const userLang = detectUserLanguage(input);
  const isEnglish = userLang === 'ENGLISH';
  const now = Date.now();

  // Out of Scope query: Gochao AI strictly handles personal finances
  if (intent === 'OUT_OF_SCOPE' || isOutOfScopeQuery(rawInput)) {
    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: isEnglish
        ? 'I am Gochao\'s personal finance assistant. I can only assist you with your personal finances, income, expenses, accounts, budgets, and savings. Please feel free to ask any finance-related questions!'
        : 'আমি গোছাও-এর ব্যক্তিগত আর্থিক সহকারী। আমি শুধুমাত্র আপনার হিসাব-নিকাশ, আয়-ব্যয়, অ্যাকাউন্ট ব্যালেন্স, বাজেট ও সঞ্চয় সংক্রান্ত বিষয়ে সাহায্য করতে পারি। আপনার হিসাব বা আর্থিক কোনো তথ্য জানতে চাইলে আমাকে নির্দ্বিধায় জিজ্ঞাসা করতে পারেন!',
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: isEnglish
        ? ['How much did I spend this month?', 'What is my total balance?', 'How much budget is left?']
        : ['এই মাসে মোট কত খরচ হয়েছে?', 'সব অ্যাকাউন্টে কত টাকা আছে?', 'বাজেট কত বাকি আছে?'],
    };
  }

  // Helper: check current month transactions
  const currentMonthTx = transactions.filter((t) => t.date.startsWith(selectedMonth));
  
  // Previous month calculation
  const [currY, currM] = selectedMonth.split('-').map(Number);
  const prevDate = new Date(currY, currM - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthTx = transactions.filter((t) => t.date.startsWith(prevMonthStr));

  // TIER 3: ACTION PROPOSAL
  // If the user's intent is an action (e.g. "আজ দুপুরে ১৫০ টাকা খরচ করেছি খাবারে", "ajke 200 taka expense add koro", "500 taka save korlam")
  if (intent === 'ACTION_CREATE_TRANSACTION') {
    if (!permissions.financeAction) {
      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: isEnglish
          ? 'Financial transaction action permission (Finance Data → Action) is currently turned off. Please enable the "Finance Data → Action" permission switch in the permission panel above.'
          : 'আর্থিক লেনদেন প্রস্তাব বা রেকর্ড করার অনুমতি (Finance Data → Action) বন্ধ রয়েছে। কোনো লেনদেন যুক্ত করতে অনুগ্রহ করে উপরের পারমিশন প্যানেলে গিয়ে "Finance Data → Action" চালু করুন।',
        timestamp: now,
        actionTier: 'ACTION',
        requiredPermission: 'financeAction',
        isPermissionDenied: true,
        source: 'engine',
        suggestedQuestions: isEnglish
          ? ['How to enable permissions?', 'What is my total balance?']
          : ['পারমিশন চালু করব কীভাবে?', 'বিকাশে এখন কত টাকা আছে?'],
      };
    }
    const proposal = parseVoiceOrTextTransaction(input, categories, accounts);
    if (proposal) {
      const cat = categories.find((c) => c.id === proposal.category_id);
      const acc = accounts.find((a) => a.id === proposal.account_id);
      const amountTaka = formatTaka(proposal.amount_poisha);

      const actionText = isEnglish
        ? `I have identified the transaction details:\n\n` +
          `• Amount: ${amountTaka}\n` +
          `• Type: ${proposal.type === 'EXPENSE' ? 'Expense' : 'Income'}\n` +
          `• Category: ${cat?.name || 'General'}\n` +
          `• Account: ${acc?.name || 'Cash'}\n` +
          `• Date: ${proposal.date === currentDate ? 'Today' : proposal.date}\n` +
          `${proposal.note && permissions.notes ? `• Note: ${proposal.note}\n` : ''}\n` +
          `You can edit the details below or confirm to save this transaction.`
        : `আমি আপনার লেনদেনের বিবরণটি শনাক্ত করেছি:\n\n` +
          `• পরিমাণ: ${amountTaka}\n` +
          `• ধরন: ${proposal.type === 'EXPENSE' ? 'ব্যয় (Expense)' : 'আয় (Income)'}\n` +
          `• ক্যাটাগরি: ${cat?.name || 'সাধারণ'}\n` +
          `• অ্যাকাউন্ট: ${acc?.name || 'ক্যাশ'}\n` +
          `• তারিখ: ${proposal.date === currentDate ? 'আজ (Today)' : proposal.date}\n` +
          `${proposal.note && permissions.notes ? `• নোট: ${proposal.note}\n` : ''}\n` +
          `সংরক্ষণ করার আগে আপনি তথ্যটি সম্পাদনা (Edit) করতে পারেন অথবা নিশ্চিত (Confirm) করতে পারেন।`;

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: actionText,
        timestamp: now,
        actionTier: 'ACTION',
        proposedAction: proposal,
        source: 'engine',
        suggestedQuestions: isEnglish
          ? ['Confirm transaction', 'What is my total balance?', 'How much did I spend this month?']
          : ['নিশ্চিত করুন', 'বিকাশে এখন কত টাকা আছে?', 'এই মাসে মোট কত খরচ হয়েছে?'],
      };
    }
  }

  // TIER 1 & 2: PERMISSION CHECK FOR FINANCE DATA
  const isFinanceRequired = intent !== 'PERMISSION_INFO' && intent !== 'GENERAL';
  if (isFinanceRequired && !permissions.financeData) {
    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: isEnglish
        ? 'Your financial data access permission is currently turned off to ensure privacy. Please enable the "Finance Data" permission switch above to allow AI insights.'
        : 'আপনার আর্থিক হিসাব (Finance Data) দেখার অনুমতি বর্তমানে বন্ধ রয়েছে। ব্যক্তিগত তথ্যের সর্বোচ্চ গোপনীয়তা রক্ষার্থে এটি ডিফল্টভাবে বন্ধ থাকে। অনুগ্রহ করে উপরে থাকা "Finance Data" সুইচটি অন করে অনুমতি দিন।',
      timestamp: now,
      actionTier: 'READ',
      requiredPermission: 'financeData',
      isPermissionDenied: true,
      source: 'engine',
      suggestedQuestions: isEnglish
        ? ['How to enable permissions?', 'What can Gochao AI do?']
        : ['পারমিশন চালু করব কীভাবে?', 'AI Assistant কী কী করতে পারে?'],
    };
  }

  // 0.1. LAST TRANSACTION QUERY (e.g. "last transaction ta dekhao", "show last transaction", "শেষ লেনদেনটি দেখাও")
  if (intent === 'LAST_TRANSACTION') {
    const sortedTx = [...transactions].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return (b.time || '').localeCompare(a.time || '');
    });

    const lastTx = sortedTx[0];
    if (!lastTx) {
      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: isEnglish ? 'No transactions have been recorded yet.' : 'আপনার কোনো লেনদেন এখনো রেকর্ড করা হয়নি।',
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: isEnglish ? ['What is my balance?'] : ['আজকে কত খরচ করেছি?'],
      };
    }

    const cat = categories.find((c) => c.id === lastTx.category_id)?.name || (lastTx.type === 'TRANSFER' ? (isEnglish ? 'Transfer' : 'স্থানান্তর') : (isEnglish ? 'General' : 'সাধারণ'));
    const acc = accounts.find((a) => a.id === lastTx.account_id)?.name || (isEnglish ? 'Cash' : 'ক্যাশ');
    const toAcc = lastTx.to_account_id ? accounts.find((a) => a.id === lastTx.to_account_id)?.name : null;
    const noteStr = permissions.notes && lastTx.note ? lastTx.note : null;

    if (isEnglish) {
      const typeStr = lastTx.type === 'EXPENSE' ? 'Expense' : lastTx.type === 'INCOME' ? 'Income' : 'Transfer';
      let reply = `Here is your latest transaction:\n\n` +
        `• Amount: ${formatTaka(lastTx.amount_poisha)}\n` +
        `• Type: ${typeStr}\n` +
        `• Category: ${cat}\n` +
        `• Account: ${acc}${toAcc ? ` -> ${toAcc}` : ''}\n` +
        `• Date: ${lastTx.date}${lastTx.time ? ` (${lastTx.time})` : ''}\n`;
      if (noteStr) reply += `• Note: "${noteStr}"\n`;

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: reply.trim(),
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'How much did I spend this month?',
          'What is my income?',
          'What is my total balance?',
        ],
      };
    }

    const typeStr = lastTx.type === 'EXPENSE' ? 'ব্যয় (Expense)' : lastTx.type === 'INCOME' ? 'আয় (Income)' : 'স্থানান্তর (Transfer)';
    let reply = `আপনার সর্বশেষ লেনদেনের বিবরণ:\n\n` +
      `• পরিমাণ: ${formatTaka(lastTx.amount_poisha)}\n` +
      `• ধরন: ${typeStr}\n` +
      `• ক্যাটাগরি: ${cat}\n` +
      `• অ্যাকাউন্ট: ${acc}${toAcc ? ` ➔ ${toAcc}` : ''}\n` +
      `• তারিখ: ${formatDateBengali(lastTx.date)}${lastTx.time ? ` (সময়: ${lastTx.time})` : ''}\n`;
    if (noteStr) reply += `• নোট: "${noteStr}"\n`;

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: reply.trim(),
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'এই মাসে মোট কত খরচ হয়েছে?',
        'আমার ইনকাম কত?',
        'সব অ্যাকাউন্টে কত টাকা আছে?',
      ],
    };
  }

  // 0.2. INCOME STATUS QUERY (e.g. "amar income koto?", "what is my income?", "আমার আয় কত?")
  if (intent === 'INCOME_STATUS') {
    const totalIncPoisha = currentMonthTx
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount_poisha, 0);
    const count = currentMonthTx.filter((t) => t.type === 'INCOME').length;

    if (isEnglish) {
      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: `In this month (${summary.periodLabel || 'current month'}), your total income is ${formatTaka(totalIncPoisha)} across ${count} income transaction(s).\n\nTotal liquid balance across your accounts is ${formatTaka(summary.totalLiquidBalancePoisha)}.`,
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'How much did I spend this month?',
          'What is my total balance?',
          'How much budget is left?',
        ],
      };
    }

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: `এই চলতি মাসে (${summary.periodLabel || 'চলতি মাস'}) আপনার মোট আয় হয়েছে ${formatTaka(totalIncPoisha)} (মোট ${toBengaliNumber(count)}টি আয়ের লেনদেন)।\n\nবর্তমানে আপনার সকল অ্যাকাউন্টে মোট তরল ব্যালেন্স রয়েছে ${formatTaka(summary.totalLiquidBalancePoisha)}।`,
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'এই মাসে মোট কত খরচ হয়েছে?',
        'সব অ্যাকাউন্টে কত টাকা আছে?',
        'বাজেট কত বাকি আছে?',
      ],
    };
  }

  // 0.3. CURRENT MONTH EXPENSES (Flexible queries like "এই মাসে কত খরচ করেছি?", "এই মাসের খরচ কত?", "মাসের হিসাব বলো তো", "কত টাকা গেল এই মাসে?", "টাকা গেল কই", "ei mashe koto khoroc hoise?")
  if (intent === 'CURRENT_MONTH_EXPENSE') {
    const monthExpenses = currentMonthTx.filter((t) => t.type === 'EXPENSE');
    const totalExpPoisha = monthExpenses.reduce((sum, t) => sum + t.amount_poisha, 0);
    const totalIncPoisha = currentMonthTx
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount_poisha, 0);
    const netSavingsPoisha = totalIncPoisha - totalExpPoisha;

    // Top spending categories
    const catMap: { [catId: string]: number } = {};
    monthExpenses.forEach((t) => {
      catMap[t.category_id] = (catMap[t.category_id] || 0) + t.amount_poisha;
    });
    const sortedCats = Object.entries(catMap)
      .map(([catId, poisha]) => ({
        name: categories.find((c) => c.id === catId)?.name || 'অন্যান্য',
        poisha,
      }))
      .sort((a, b) => b.poisha - a.poisha);

    // Previous month comparison
    const prevExpPoisha = prevMonthTx
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount_poisha, 0);

    if (isEnglish) {
      let reply = `In this month (${summary.periodLabel || 'Current Month'}), your total expenses are ${formatTaka(totalExpPoisha)} across ${monthExpenses.length} transaction(s).\n\n`;
      if (sortedCats.length > 0) {
        reply += `💸 Top spending categories:\n`;
        sortedCats.slice(0, 3).forEach((c) => {
          reply += `• ${c.name}: ${formatTaka(c.poisha)}\n`;
        });
        reply += `\n`;
      }
      reply += `💵 Total income this month is ${formatTaka(totalIncPoisha)}${totalIncPoisha > 0 ? ` with net savings of ${formatTaka(netSavingsPoisha)}` : ''}.\n`;
      if (prevExpPoisha > 0) {
        const diff = Math.abs(totalExpPoisha - prevExpPoisha);
        reply += `📌 Compared to last month (${formatTaka(prevExpPoisha)}), your expenses are ${totalExpPoisha > prevExpPoisha ? `${formatTaka(diff)} higher` : `${formatTaka(diff)} lower`}.\n`;
      }
      reply += `\nFeel free to ask if you would like to see category budgets or specific transactions!`;

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: reply,
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'What is my remaining budget?',
          'What is my total balance?',
          'How much did I spend on food?',
        ],
      };
    }

    let reply = `চলতি মাসে (${summary.periodLabel || 'চলতি মাস'}) আপনার মোট খরচ হয়েছে ${formatTaka(totalExpPoisha)} (মোট ${toBengaliNumber(monthExpenses.length)}টি লেনদেনে)।\n\n`;
    if (sortedCats.length > 0) {
      reply += `💸 শীর্ষ খরচের খাতগুলো:\n`;
      sortedCats.slice(0, 3).forEach((c) => {
        reply += `• ${c.name}: ${formatTaka(c.poisha)}\n`;
      });
      reply += `\n`;
    }
    reply += `💵 চলতি মাসে মোট আয় হয়েছে ${formatTaka(totalIncPoisha)}${totalIncPoisha > 0 ? ` এবং নিট সঞ্চয় রয়েছে ${formatTaka(netSavingsPoisha)}` : ''}।`;
    if (prevExpPoisha > 0) {
      const isHigher = totalExpPoisha > prevExpPoisha;
      reply += `\n\n📌 গত মাসের তুলনায় (${formatTaka(prevExpPoisha)}) চলতি মাসে খরচ ${isHigher ? 'কিছুটা বেশি হয়েছে' : 'সাশ্রয়ী হয়েছে'}।`;
    }
    reply += `\n\nআপনার কোনো নির্দিষ্ট খাতের হিসাব বা বাজেট দেখতে চাইলে বলতে পারেন!`;

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: reply,
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'আর গত মাসে?',
        'খাবারে কত খরচ হয়েছে?',
        'বাজেট কত বাকি আছে?',
        'সব অ্যাকাউন্টে কত টাকা আছে?',
      ],
    };
  }

  // 1. SPECIFIC DATE OR MONTH EXPENSE (e.g. "গত ১৫ তারিখে কত খরচ করেছি?", "১৫ সেপ্টেম্বর কত খরচ?", "আজকে কত খরচ?", "আর গত মাসে?")
  if (intent === 'SPECIFIC_DATE_EXPENSE') {
    const dateFilter = contextual.dateFilterOverride || extractDateFilter(input, new Date(currentDate));

    if (dateFilter?.type === 'SPECIFIC_DATE' && dateFilter.dateStr) {
      const targetDate = dateFilter.dateStr;
      const dayTx = transactions.filter((t) => t.date === targetDate);
      const dayExpenses = dayTx.filter((t) => t.type === 'EXPENSE');
      const dayIncomes = dayTx.filter((t) => t.type === 'INCOME');

      const totalExp = dayExpenses.reduce((sum, t) => sum + t.amount_poisha, 0);
      const totalInc = dayIncomes.reduce((sum, t) => sum + t.amount_poisha, 0);

      const formattedDate = formatDateBengali(targetDate);

      if (dayTx.length === 0) {
        return {
          id: `msg-${now}`,
          sender: 'assistant',
          text: `${formattedDate}-এ আপনার কোনো আয় বা ব্যয়ের লেনদেন লিপিবদ্ধ নেই।`,
          timestamp: now,
          actionTier: 'READ',
          source: 'engine',
          suggestedQuestions: [
            'আজকে কত খরচ করেছি?',
            'এই মাসে আমার মোট খরচ কত?',
            'বিকাশে এখন কত টাকা আছে?',
          ],
        };
      }

      let reply = `${formattedDate}-এর হিসাবের সারসংক্ষেপ:\n\n`;
      reply += `• মোট খরচ: ${formatTaka(totalExp)} (${toBengaliNumber(dayExpenses.length)}টি লেনদেন)\n`;
      if (totalInc > 0) {
        reply += `• মোট আয়: ${formatTaka(totalInc)} (${toBengaliNumber(dayIncomes.length)}টি লেনদেন)\n`;
      }

      if (dayExpenses.length > 0) {
        reply += `\nখরচের বিস্তারিত তালিকা:\n`;
        dayExpenses.forEach((tx, idx) => {
          const cat = categories.find((c) => c.id === tx.category_id)?.name || 'অন্যান্য';
          const acc = accounts.find((a) => a.id === tx.account_id)?.name || '';
          const noteStr = permissions.notes && tx.note ? ` ("${tx.note}")` : '';
          reply += `${toBengaliNumber(idx + 1)}. ${cat}: ${formatTaka(tx.amount_poisha)}${acc ? ` [${acc}]` : ''}${noteStr}\n`;
        });
      }

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: reply.trim(),
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'আজকে কত খরচ করেছি?',
          'এই মাসে আমার মোট খরচ কত?',
          'সবচেয়ে বেশি খরচ কোন category-তে?',
        ],
      };
    }

    if ((dateFilter?.type === 'SPECIFIC_MONTH' || dateFilter?.type === 'LAST_MONTH') && dateFilter.monthStr) {
      const monthTx = transactions.filter((t) => t.date.startsWith(dateFilter.monthStr!));
      const expTx = monthTx.filter((t) => t.type === 'EXPENSE');
      const exp = expTx.reduce((s, t) => s + t.amount_poisha, 0);
      const inc = monthTx.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount_poisha, 0);

      const [y, m] = dateFilter.monthStr.split('-').map(Number);
      const mName = getMonthBengaliName(m);
      const isLastMonth = dateFilter.type === 'LAST_MONTH';

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: isEnglish
          ? `In ${isLastMonth ? 'last month' : `${mName} ${y}`}, your total expenses were ${formatTaka(exp)} (${expTx.length} transaction(s)).\n\n• Total income: ${formatTaka(inc)}\n• Net savings: ${formatTaka(inc - exp)}`
          : `${isLastMonth ? 'গত মাসে' : `${mName} ${toBengaliNumber(y)} মাসে`} আপনার মোট খরচ হয়েছিল ${formatTaka(exp)} (মোট ${toBengaliNumber(expTx.length)}টি লেনদেন)।\n\n• মোট আয় ছিল: ${formatTaka(inc)}\n• নিট সঞ্চয়: ${formatTaka(inc - exp)}\n\nকোনো নির্দিষ্ট খাতের হিসাব দেখতে চাইলে আমাকে বলতে পারেন!`,
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'সবচেয়ে বেশি খরচ কোন category-তে?',
          'এই মাসে আমার মোট খরচ কত?',
          'গত তিন মাসে কোন মাসে সবচেয়ে বেশি খরচ হয়েছে?',
        ],
      };
    }

    if (dateFilter?.type === 'SPECIFIC_YEAR' && dateFilter.yearStr) {
      const yearTx = transactions.filter((t) => t.date.startsWith(dateFilter.yearStr!));
      const exp = yearTx.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount_poisha, 0);
      const inc = yearTx.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount_poisha, 0);

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: `${toBengaliNumber(dateFilter.yearStr)} সালে আপনার মোট হিসাব:\n\n• মোট খরচ: ${formatTaka(exp)} (মোট ${toBengaliNumber(yearTx.filter(t => t.type === 'EXPENSE').length)}টি খরচ)\n• মোট আয়: ${formatTaka(inc)}\n• সঞ্চয়: ${formatTaka(inc - exp)}`,
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'সবচেয়ে বেশি খরচ কোন category-তে?',
          'এই মাসে আমার মোট খরচ কত?',
        ],
      };
    }
  }

  // 2. SPECIFIC CATEGORY EXPENSE (e.g. "এই বছর মোবাইল রিচার্জে মোট কত খরচ হয়েছে?", "খাবারে কত খরচ?")
  if (intent === 'SPECIFIC_CATEGORY_EXPENSE') {
    const cat = detectCategory(input, categories, true);
    const dateFilter = extractDateFilter(input, new Date(currentDate));

    if (cat) {
      let matchingTx = transactions.filter((t) => t.type === 'EXPENSE' && t.category_id === cat.id);
      let timeLabel = 'সব মিলিয়ে (All time)';

      if (dateFilter?.type === 'SPECIFIC_DATE' && dateFilter.dateStr) {
        matchingTx = matchingTx.filter((t) => t.date === dateFilter.dateStr);
        timeLabel = `${formatDateBengali(dateFilter.dateStr)}-এ`;
      } else if (dateFilter?.type === 'SPECIFIC_YEAR' && dateFilter.yearStr) {
        matchingTx = matchingTx.filter((t) => t.date.startsWith(dateFilter.yearStr!));
        timeLabel = `${toBengaliNumber(dateFilter.yearStr)} সালে`;
      } else if (dateFilter?.type === 'SPECIFIC_MONTH' && dateFilter.monthStr) {
        matchingTx = matchingTx.filter((t) => t.date.startsWith(dateFilter.monthStr!));
        const [y, m] = dateFilter.monthStr.split('-').map(Number);
        timeLabel = `${getMonthBengaliName(m)} ${toBengaliNumber(y)} মাসে`;
      } else if (dateFilter?.type === 'CURRENT_MONTH' || input.includes('এই মাসে') || input.includes('চলতি মাসে')) {
        matchingTx = matchingTx.filter((t) => t.date.startsWith(selectedMonth));
        timeLabel = 'চলতি মাসে';
      } else if (input.includes('এই বছর') || input.includes('চলতি বছর') || dateFilter?.type === 'SPECIFIC_YEAR') {
        const curYear = currentDate.split('-')[0];
        matchingTx = matchingTx.filter((t) => t.date.startsWith(curYear));
        timeLabel = `${toBengaliNumber(curYear)} সালে`;
      }

      const totalPoisha = matchingTx.reduce((sum, t) => sum + t.amount_poisha, 0);
      const count = matchingTx.length;

      if (count === 0) {
        let emptyReply = `${timeLabel} '${cat.name}' খাতে আপনার কোনো খরচ রেকর্ড করা নেই।`;
        const anyTx = transactions.filter((t) => t.type === 'EXPENSE' && t.category_id === cat.id);
        if (anyTx.length > 0) {
          const allTotal = anyTx.reduce((sum, t) => sum + t.amount_poisha, 0);
          emptyReply += `\n(তবে অন্যান্য সময় মিলিয়ে এই খাতে মোট ${formatTaka(allTotal)} খরচ হয়েছে)।`;
        }
        return {
          id: `msg-${now}`,
          sender: 'assistant',
          text: emptyReply,
          timestamp: now,
          actionTier: 'READ',
          source: 'engine',
          suggestedQuestions: [
            'এই মাসে আমার মোট খরচ কত?',
            'সবচেয়ে বেশি খরচ কোন category-তে?',
            'বিকাশে এখন কত টাকা আছে?',
          ],
        };
      }

      let reply = `${timeLabel} '${cat.name}' খাতে আপনার মোট খরচ হয়েছে ${formatTaka(totalPoisha)} (মোট ${toBengaliNumber(count)}টি লেনদেন)।`;

      if (count > 0) {
        const avg = Math.round(totalPoisha / count);
        reply += `\nগড়ে প্রতিটি লেনদেনে খরচ হয়েছে প্রায় ${formatTaka(avg)}।`;
        
        // Show recent transactions in this category
        const recent = matchingTx.slice(-5).reverse();
        reply += `\n\nলেনদেনের তালিকা:`;
        recent.forEach((t) => {
          const accName = accounts.find((a) => a.id === t.account_id)?.name;
          const noteText = permissions.notes && t.note ? ` - ${t.note}` : '';
          reply += `\n• ${formatDateBengali(t.date)}: ${formatTaka(t.amount_poisha)} (${accName || 'ক্যাশ'}${noteText})`;
        });
      }

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: reply,
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'সবচেয়ে বেশি খরচ কোন category-তে?',
          'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
          'বিকাশে এখন কত টাকা আছে?',
        ],
      };
    }
  }

  // 3. SPECIFIC ACCOUNT BALANCE (e.g. "বিকাশে এখন কত টাকা আছে?", "নগদে কত টাকা আছে?")
  if (intent === 'SPECIFIC_ACCOUNT_BALANCE') {
    const acc = detectAccount(input, accounts);
    if (acc) {
      const balPoisha = accountBalances?.[acc.id] ?? calculateAccountBalance(acc, transactions, debts, debtPayments);
      
      // Calculate monthly in & out for this account
      let monthIn = 0;
      let monthOut = 0;
      for (const t of currentMonthTx) {
        if (t.account_id === acc.id) {
          if (t.type === 'EXPENSE') monthOut += t.amount_poisha;
          if (t.type === 'TRANSFER') monthOut += (t.amount_poisha + t.transfer_fee_poisha);
        }
        if (t.type === 'INCOME' && t.account_id === acc.id) {
          monthIn += t.amount_poisha;
        }
        if (t.type === 'TRANSFER' && t.to_account_id === acc.id) {
          monthIn += t.amount_poisha;
        }
      }

      const reply = isEnglish
        ? `Your '${acc.name}' account balance is currently ${formatTaka(balPoisha)}.\n\n` +
          `In this month from this account:\n` +
          `• Total expenses/transfers: ${formatTaka(monthOut)}\n` +
          `• Total deposits/income: ${formatTaka(monthIn)}`
        : `আপনার '${acc.name}' অ্যাকাউন্টে বর্তমানে ব্যালেন্স রয়েছে ${formatTaka(balPoisha)}।\n\n` +
          `চলতি মাসে এই অ্যাকাউন্ট থেকে:\n` +
          `• মোট খরচ/স্থানান্তর: ${formatTaka(monthOut)}\n` +
          `• মোট জমা/আয়: ${formatTaka(monthIn)}`;

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: reply,
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: isEnglish
          ? ['What is my total balance?', 'How much did I spend this month?', 'What is my income?']
          : [
              'সব অ্যাকাউন্টে কত টাকা আছে?',
              'আমার কত টাকা পাওনা?',
              'এই মাসে আমার মোট খরচ কত?',
            ],
      };
    }
  }

  // 4. ALL ACCOUNTS BALANCE (e.g. "সব অ্যাকাউন্টে কত টাকা আছে?", "মোট ব্যালেন্স কত?", "total balance")
  if (intent === 'ALL_ACCOUNTS_BALANCE') {
    const activeAccs = accounts.filter((a) => a.is_active);
    let totalBal = 0;

    if (isEnglish) {
      let reply = `Here is the current balance of your active accounts:\n\n`;
      activeAccs.forEach((acc, idx) => {
        const bal = accountBalances?.[acc.id] ?? calculateAccountBalance(acc, transactions, debts, debtPayments);
        totalBal += bal;
        reply += `${idx + 1}. ${acc.name}: ${formatTaka(bal)}\n`;
      });
      reply += `\n👉 Total Liquid Balance: ${formatTaka(totalBal)}`;

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: reply,
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'How much did I spend this month?',
          'What is my income?',
          'How much budget is left?',
        ],
      };
    }

    let reply = `আপনার সকল সক্রিয় অ্যাকাউন্টের বর্তমান স্থিতি:\n\n`;

    activeAccs.forEach((acc, idx) => {
      const bal = accountBalances?.[acc.id] ?? calculateAccountBalance(acc, transactions, debts, debtPayments);
      totalBal += bal;
      reply += `${toBengaliNumber(idx + 1)}. ${acc.name}: ${formatTaka(bal)}\n`;
    });

    reply += `\n👉 আপনার মোট তরল অর্থ (Liquid Balance): ${formatTaka(totalBal)}`;

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: reply,
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'আমার financial situation কেমন?',
        'আমার কত টাকা পাওনা?',
        'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
      ],
    };
  }

  // 5. BUDGET & LIMIT STATUS (e.g. "কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?", "বাজেট কত বাকি?", "amar budget koto baki?")
  if (intent === 'BUDGET_LIMIT_STATUS') {
    if (budgets.length === 0) {
      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: isEnglish
          ? 'You do not have any monthly budgets configured yet. You can set category-wise spending limits in the Budgets & Goals section.'
          : 'আপনার কোনো মাসিক বাজেট নির্ধারণ করা নেই। আপনি বাজেট ও লক্ষ্য পেজে গিয়ে আপনার পছন্দমতো ক্যাটাগরিতে মাসিক খরচের সীমা নির্ধারণ করতে পারেন।',
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: isEnglish
          ? ['How much did I spend this month?', 'Which category has the highest expense?']
          : ['এই মাসে আমার মোট খরচ কত?', 'সবচেয়ে বেশি খরচ কোন category-তে?'],
      };
    }

    const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit_poisha, 0);
    const totalBudgetSpent = currentMonthTx
      .filter((t) => t.type === 'EXPENSE' && budgets.some((b) => b.category_id === t.category_id))
      .reduce((sum, t) => sum + t.amount_poisha, 0);
    const totalBudgetRemaining = Math.max(0, totalBudgetLimit - totalBudgetSpent);

    const exceeded: Array<{ name: string; limit: number; spent: number; diff: number; pct: number }> = [];
    const closeToLimit: Array<{ name: string; limit: number; spent: number; remaining: number; pct: number }> = [];
    const safe: Array<{ name: string; limit: number; spent: number; remaining: number; pct: number }> = [];

    for (const b of budgets) {
      const cat = categories.find((c) => c.id === b.category_id);
      const catName = cat?.name || (isEnglish ? 'Category' : 'ক্যাটাগরি');
      const spent = currentMonthTx
        .filter((t) => t.type === 'EXPENSE' && t.category_id === b.category_id)
        .reduce((sum, t) => sum + t.amount_poisha, 0);

      const limit = b.limit_poisha;
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      if (spent > limit) {
        exceeded.push({ name: catName, limit, spent, diff: spent - limit, pct });
      } else if (pct >= 80) {
        closeToLimit.push({ name: catName, limit, spent, remaining: limit - spent, pct });
      } else {
        safe.push({ name: catName, limit, spent, remaining: limit - spent, pct });
      }
    }

    if (isEnglish) {
      let reply = `📊 Monthly Budget Status:\n\n` +
        `• Total Budget Limit: ${formatTaka(totalBudgetLimit)}\n` +
        `• Total Budgeted Spent: ${formatTaka(totalBudgetSpent)}\n` +
        `• Remaining Budget Left: ${formatTaka(totalBudgetRemaining)}\n\n`;

      if (exceeded.length > 0) {
        reply += `🚨 Over Budget (${exceeded.length} category/categories):\n`;
        exceeded.forEach((item) => {
          reply += `• ${item.name}: Budget ${formatTaka(item.limit)}, Spent ${formatTaka(item.spent)} (Exceeded by ${formatTaka(item.diff)} - ${item.pct}%)\n`;
        });
        reply += `\n`;
      } else {
        reply += `🎉 Great job! No category has exceeded its budget limit this month.\n\n`;
      }

      if (closeToLimit.length > 0) {
        reply += `⚠️ Near Limit Warning:\n`;
        closeToLimit.forEach((item) => {
          reply += `• ${item.name}: Spent ${formatTaka(item.spent)} / ${formatTaka(item.limit)} (Remaining: ${formatTaka(item.remaining)} - ${item.pct}% used)\n`;
        });
        reply += `\n`;
      }

      if (safe.length > 0) {
        reply += `✅ Within Budget Limit:\n`;
        safe.slice(0, 3).forEach((item) => {
          reply += `• ${item.name}: Spent ${formatTaka(item.spent)} / ${formatTaka(item.limit)} (Remaining: ${formatTaka(item.remaining)})\n`;
        });
      }

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: reply.trim(),
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'How much did I spend this month?',
          'Which category has the highest expense?',
          'What is my total balance?',
        ],
      };
    }

    let reply = `📊 চলতি মাসের বাজেট পর্যবেক্ষণ:\n\n` +
      `• মোট বাজেট সীমা: ${formatTaka(totalBudgetLimit)}\n` +
      `• বাজেটভুক্ত খাতে মোট খরচ: ${formatTaka(totalBudgetSpent)}\n` +
      `• সর্বমোট অবশিষ্ট বাকি বাজেট: ${formatTaka(totalBudgetRemaining)}\n\n`;

    if (exceeded.length > 0) {
      reply += `🚨 বাজেট সীমা পার হয়ে গেছে (${toBengaliNumber(exceeded.length)}টি খাতে):\n`;
      exceeded.forEach((item) => {
        reply += `• ${item.name}: বাজেট ${formatTaka(item.limit)}, খরচ হয়েছে ${formatTaka(item.spent)} (সীমার চেয়ে ${formatTaka(item.diff)} বেশি — ${toBengaliNumber(item.pct)}%)\n`;
      });
      reply += `\n`;
    } else {
      reply += `🎉 চমৎকার! এই মাসে কোনো ক্যাটাগরিতেই এখনও বাজেট সীমা পার হয়নি।\n\n`;
    }

    if (closeToLimit.length > 0) {
      reply += `⚠️ সীমার কাছাকাছি রয়েছে (সতর্কতা):\n`;
      closeToLimit.forEach((item) => {
        reply += `• ${item.name}: খরচ ${formatTaka(item.spent)} / ${formatTaka(item.limit)} (বাকি আছে মাত্র ${formatTaka(item.remaining)} — ${toBengaliNumber(item.pct)}% ব্যবহৃত)\n`;
      });
      reply += `\n`;
    }

    if (safe.length > 0) {
      reply += `✅ সীমার মধ্যে রয়েছে:\n`;
      safe.slice(0, 3).forEach((item) => {
        reply += `• ${item.name}: খরচ ${formatTaka(item.spent)} / ${formatTaka(item.limit)} (বাকি ${formatTaka(item.remaining)})\n`;
      });
    }

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: reply.trim(),
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'এই মাসের খরচ analyse করে কোথায় কমানো যায় বলো',
        'সবচেয়ে বেশি খরচ কোন category-তে?',
        'আমার financial situation কেমন?',
      ],
    };
  }

  // 6. SAVINGS GOALS STATUS (e.g. "আমার সেভিংস গোল কতদূর এগিয়েছে?", "সঞ্চয় লক্ষ্য কত বাকি?")
  if (intent === 'SAVINGS_GOALS_STATUS') {
    if (savingsGoals.length === 0) {
      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: 'আপনার কোনো সেভিংস গোল (সঞ্চয় লক্ষ্য) তৈরি করা নেই। বাজেট ও সঞ্চয় সেকশনে গিয়ে নতুন সঞ্চয় লক্ষ্য (যেমন: ল্যাপটপ কেনা, ইমার্জেন্সি ফান্ড) যোগ করতে পারেন।',
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'আমার financial situation কেমন?',
          'এই মাসে আমার মোট খরচ কত?',
        ],
      };
    }

    let reply = `🎯 আপনার সেভিংস গোলের বর্তমান অগ্রগতি:\n\n`;
    savingsGoals.forEach((goal, idx) => {
      const target = goal.target_amount_poisha;
      const saved = goal.saved_amount_poisha;
      const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
      const remaining = Math.max(0, target - saved);

      reply += `${toBengaliNumber(idx + 1)}. ${goal.title}:\n`;
      reply += `   • জমানো হয়েছে: ${formatTaka(saved)} / ${formatTaka(target)} (${toBengaliNumber(pct)}% সম্পন্ন)\n`;
      if (remaining > 0) {
        reply += `   • লক্ষ্য অর্জনে এখনও বাকি: ${formatTaka(remaining)}\n`;
      } else {
        reply += `   • 🌟 অভিনন্দন! এই লক্ষ্যটি ১০০% পূরণ হয়েছে!\n`;
      }
      if (permissions.calendar && goal.target_date) {
        reply += `   • নির্ধারিত সময়: ${formatDateBengali(goal.target_date)}\n`;
      }
      reply += `\n`;
    });

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: reply.trim(),
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'আমার financial situation কেমন?',
        'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
        'এই মাসের খরচ analyse করে কোথায় কমানো যায় বলো',
      ],
    };
  }

  // 7. COMPARATIVE QUESTIONS (e.g. "গত তিন মাসে কোন মাসে সবচেয়ে বেশি খরচ হয়েছে?", "মাসের তুলনা")
  if (intent === 'COMPARATIVE_MONTHS') {
    // Group all transactions by month
    const monthExpMap: Record<string, number> = {};
    const monthIncMap: Record<string, number> = {};

    transactions.forEach((t) => {
      const m = t.date.substring(0, 7); // YYYY-MM
      if (t.type === 'EXPENSE') {
        monthExpMap[m] = (monthExpMap[m] || 0) + t.amount_poisha;
      } else if (t.type === 'INCOME') {
        monthIncMap[m] = (monthIncMap[m] || 0) + t.amount_poisha;
      }
    });

    // Determine target months (last 3-4 months up to selectedMonth)
    const sortedMonths = Object.keys(monthExpMap).sort();
    const recentMonths = sortedMonths.length > 0 ? sortedMonths.slice(-3) : [selectedMonth];

    let highestMonth = '';
    let highestExp = -1;

    let reply = `📅 বিগত মাসগুলোর খরচের তুলনামূলক বিশ্লেষণ:\n\n`;
    recentMonths.forEach((m) => {
      const exp = monthExpMap[m] || 0;
      const inc = monthIncMap[m] || 0;
      const [y, mNum] = m.split('-').map(Number);
      const name = `${getMonthBengaliName(mNum)} ${toBengaliNumber(y)}`;

      if (exp > highestExp) {
        highestExp = exp;
        highestMonth = name;
      }

      reply += `• ${name}: মোট খরচ ${formatTaka(exp)}${inc > 0 ? ` (আয়: ${formatTaka(inc)})` : ''}\n`;
    });

    if (highestMonth && highestExp > 0) {
      reply += `\n👉 এই সময়সীমার মধ্যে সবচেয়ে বেশি খরচ হয়েছে '${highestMonth}' মাসে (${formatTaka(highestExp)})।`;
    }

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: reply,
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'এই মাসের খরচ analyse করে কোথায় কমানো যায় বলো',
        'সবচেয়ে বেশি খরচ কোন category-তে?',
        'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
      ],
    };
  }

  // 8. TOTAL RECEIVABLES (কার কাছে কত টাকা পাওনা?)
  if (intent === 'DEBT_RECEIVABLES') {
    const activeReceivables = debts.filter((d) => d.type === 'LENT' && d.status === 'ACTIVE');
    const totalReceivablePoisha = activeReceivables.reduce((sum, d) => sum + d.initial_amount_poisha, 0);

    let detail = '';
    if (activeReceivables.length > 0) {
      if (permissions.contacts) {
        const names = activeReceivables.map((d) => `${d.person_name} (${formatTaka(d.initial_amount_poisha)})`).join(', ');
        detail = `\n\nযাদের কাছে পাওনা:\n` + activeReceivables.map((d, i) => `${toBengaliNumber(i + 1)}. ${d.person_name}: ${formatTaka(d.initial_amount_poisha)}${permissions.calendar && d.due_date ? ` (ফেরতের তারিখ: ${formatDateBengali(d.due_date)})` : ''}`).join('\n');
      } else {
        detail = `\n\n(ব্যক্তিদের নাম ও তালিকা দেখতে 'Contacts' পারমিশন চালু করুন)।`;
      }
    }

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: `অন্যদের কাছে আপনার মোট পাওনা রয়েছে ${formatTaka(totalReceivablePoisha)} টাকা (মোট ${toBengaliNumber(activeReceivables.length)} জনের কাছে)।${detail}`,
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'আমাকে কত টাকা দিতে হবে?',
        'আমার financial situation কেমন?',
        'বিকাশে এখন কত টাকা আছে?',
      ],
    };
  }

  // 9. TOTAL PAYABLES (আমাকে কত টাকা দিতে হবে? দেনা কত?)
  if (intent === 'DEBT_PAYABLES') {
    const activePayables = debts.filter((d) => d.type === 'BORROWED' && d.status === 'ACTIVE');
    const totalPayablePoisha = activePayables.reduce((sum, d) => sum + d.initial_amount_poisha, 0);

    let detail = '';
    if (activePayables.length > 0) {
      if (permissions.contacts) {
        detail = `\n\nপাওনাদারদের তালিকা:\n` + activePayables.map((d, i) => `${toBengaliNumber(i + 1)}. ${d.person_name}: ${formatTaka(d.initial_amount_poisha)}${permissions.calendar && d.due_date ? ` (পরিশোধের তারিখ: ${formatDateBengali(d.due_date)})` : ''}`).join('\n');
      } else {
        detail = `\n\n(ব্যক্তিদের বিস্তারিত নাম দেখতে 'Contacts' পারমিশন চালু করুন)।`;
      }
    }

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: `আপনাকে মোট দেনা পরিশোধ করতে হবে ${formatTaka(totalPayablePoisha)} টাকা (মোট ${toBengaliNumber(activePayables.length)} জনের কাছে)।${detail}`,
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'কার কাছে কত টাকা পাওনা আছি?',
        'আমার financial situation কেমন?',
        'বিকাশে এখন কত টাকা আছে?',
      ],
    };
  }

  // 11. TOP CATEGORY EXPENSE (সবচেয়ে বেশি খরচ কোন category-তে?)
  if (intent === 'TOP_CATEGORY_EXPENSE') {
    const catMap: Record<string, number> = {};
    let totalExpPoisha = 0;

    for (const t of currentMonthTx) {
      if (t.type === 'EXPENSE' && t.category_id) {
        catMap[t.category_id] = (catMap[t.category_id] || 0) + t.amount_poisha;
        totalExpPoisha += t.amount_poisha;
      }
    }

    const sorted = Object.entries(catMap)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          name: cat?.name || 'অন্যান্য',
          amountPoisha: amount,
          percentage: totalExpPoisha > 0 ? Math.round((amount / totalExpPoisha) * 100) : 0,
        };
      })
      .sort((a, b) => b.amountPoisha - a.amountPoisha);

    if (sorted.length === 0) {
      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: 'এই মাসে এখনো কোনো ব্যয়ের লেনদেন লিপিবদ্ধ করা হয়নি। কোনো খরচ যোগ করলে আমি সাথে সাথে ক্যাটাগরি বিশ্লেষণ দেখাতে পারব।',
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: ['বিকাশে এখন কত টাকা আছে?', 'আমার financial situation কেমন?'],
      };
    }

    const top = sorted[0];
    const second = sorted[1];
    let reply = `এই মাসে সবচেয়ে বেশি খরচ হয়েছে '${top.name}' ক্যাটাগরিতে — মোট ${formatTaka(top.amountPoisha)}, যা আপনার মোট ব্যয়ের প্রায় ${toBengaliNumber(top.percentage)}%।`;

    if (second) {
      reply += `\n\nদ্বিতীয় সর্বোচ্চ খরচ হয়েছে '${second.name}' খাতে (${formatTaka(second.amountPoisha)}, মোট খরচের ${toBengaliNumber(second.percentage)}%)।`;
    }

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: reply,
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'এই মাসের খরচ analyse করে কোথায় কমানো যায় বলো',
        'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
        'গত তিন মাসে কোন মাসে সবচেয়ে বেশি খরচ হয়েছে?',
      ],
    };
  }

  // 12. FINANCIAL SITUATION (আমার financial situation কেমন?)
  if (intent === 'FINANCIAL_SITUATION') {
    const liquid = formatTaka(summary.totalLiquidBalancePoisha);
    const income = formatTaka(summary.monthlyIncomePoisha);
    const expense = formatTaka(summary.monthlyExpensePoisha);
    const savings = formatTaka(summary.monthlySavingsPoisha);
    const netWorth = formatTaka(summary.trueNetWorthPoisha);

    const savingsRate = summary.monthlyIncomePoisha > 0
      ? Math.round((summary.monthlySavingsPoisha / summary.monthlyIncomePoisha) * 100)
      : 0;

    let evaluation = '';
    if (summary.monthlySavingsPoisha > 0 && savingsRate >= 20) {
      evaluation = `আপনার আর্থিক অবস্থা বেশ সন্তোষজনক ও ইতিবাচক। চলতি মাসে আপনার আয়ের প্রায় ${toBengaliNumber(savingsRate)}% সঞ্চয় হচ্ছে, যা ব্যক্তিগত ফাইন্যান্সের জন্য চমৎকার।`;
    } else if (summary.monthlySavingsPoisha > 0) {
      evaluation = `আপনার আর্থিক অবস্থা স্থিতিশীল। চলতি মাসে সামান্য উদ্বৃত্ত বা সঞ্চয় (${toBengaliNumber(savingsRate)}%) রয়েছে, তবে ব্যয়ের দিকে নজর দিলে সঞ্চয় আরও বাড়ানো সম্ভব।`;
    } else {
      evaluation = `সতর্কতা: চলতি মাসে আয়ের চেয়ে ব্যয় বেশি হয়েছে। অতিরিক্ত খরচ নিয়ন্ত্রণে কিছু অপ্রয়োজনীয় খাতে ব্যয় হ্রাস করার সুপারিশ করা হচ্ছে।`;
    }

    const text = `আপনার সার্বিক আর্থিক পর্যালোচনা:\n\n` +
      `• মোট ক্যাশ ও অ্যাকাউন্ট স্থিতি: ${liquid}\n` +
      `• এই মাসের মোট আয়: ${income}\n` +
      `• এই মাসের মোট ব্যয়: ${expense}\n` +
      `• চলতি মাসের নিট সঞ্চয়: ${savings}\n` +
      `• মোট পাওনা: ${formatTaka(summary.totalReceivablesPoisha)}\n` +
      `• মোট দেনা: ${formatTaka(summary.totalPayablesPoisha)}\n` +
      `• প্রকৃত মোট সম্পদ (Net Worth): ${netWorth}\n\n` +
      evaluation;

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text,
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'এই মাসের খরচ analyse করে কোথায় কমানো যায় বলো',
        'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
        'আমার সেভিংস গোল কতদূর এগিয়েছে?',
      ],
    };
  }

  // 13. EXPENSE REDUCTION ADVICE (এই মাসের খরচ analyse করে কোথায় কমানো যায় বলো)
  if (intent === 'EXPENSE_REDUCTION_ADVICE') {
    const totalExpPoisha = currentMonthTx
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount_poisha, 0);

    const catMap: Record<string, number> = {};
    for (const t of currentMonthTx) {
      if (t.type === 'EXPENSE' && t.category_id) {
        catMap[t.category_id] = (catMap[t.category_id] || 0) + t.amount_poisha;
      }
    }

    const sortedCats = Object.entries(catMap)
      .map(([catId, amt]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name || 'অন্যান্য',
          color: cat?.color || '#10B981',
          amountPoisha: amt,
          percentage: totalExpPoisha > 0 ? Math.round((amt / totalExpPoisha) * 100) : 0,
        };
      })
      .sort((a, b) => b.amountPoisha - a.amountPoisha);

    const prevExpPoisha = prevMonthTx
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount_poisha, 0);

    const diffPoisha = totalExpPoisha - prevExpPoisha;
    const diffPercent = prevExpPoisha > 0 ? Math.round((Math.abs(diffPoisha) / prevExpPoisha) * 100) : 0;

    const recommendations: string[] = [];

    if (sortedCats.length > 0) {
      const top = sortedCats[0];
      recommendations.push(
        `১. '${top.name}' খাতে আপনার ব্যয়ের সবচেয়ে বড় অংশ (${toBengaliNumber(top.percentage)}%) যাচ্ছে। এই খাতে দৈনিক খরচের একটি সুনির্দিষ্ট সীমা নির্ধারণ করুন।`
      );
    }

    const foodCat = sortedCats.find((c) => c.id === 'cat-food' || c.name.includes('খাবার'));
    if (foodCat && foodCat.percentage >= 25) {
      recommendations.push(
        `২. বাইরের খাবার ও নাশতার খরচ কিছুটা কমিয়ে ঘরে তৈরি খাবারকে প্রাধান্য দিলে মাসে প্রায় ১৫-২০% সাশ্রয় করা সম্ভব।`
      );
    }

    const shoppingCat = sortedCats.find((c) => c.id === 'cat-shopping' || c.name.includes('শপিং'));
    if (shoppingCat) {
      recommendations.push(
        `৩. শপিং বা পোশাক কেনার আগে ৭২ ঘণ্টার কুলিং-অফ নিয়ম মেনে চলুন (প্রয়োজন ছাড়া তাৎক্ষণিক আবেগতাড়িত কেনাকাটা এড়ানো)।`
      );
    }

    if (diffPoisha > 0 && prevExpPoisha > 0) {
      recommendations.push(
        `৪. গত মাসের চেয়ে খরচ ${toBengaliNumber(diffPercent)}% বৃদ্ধি পেয়েছে। চলতি মাসের বাকি দিনগুলোতে জরুরি প্রয়োজন ছাড়া অন্যান্য খরচ সীমিত রাখা উচিত।`
      );
    } else {
      recommendations.push(
        `৫. মাসের শুরুতেই আয়ের ন্যূনতম ২০% একটি আলাদা সঞ্চয় বা ডিপোজিট হিসাবে সরিয়ে রাখুন।`
      );
    }

    const analysisData: FinancialAnalysisData = {
      currentMonthExpensePoisha: totalExpPoisha,
      lastMonthExpensePoisha: prevExpPoisha,
      expenseDifferencePoisha: diffPoisha,
      expenseDifferencePercent: diffPercent,
      topCategories: sortedCats.slice(0, 3),
      savingsRatePercent: summary.monthlyIncomePoisha > 0
        ? Math.round((summary.monthlySavingsPoisha / summary.monthlyIncomePoisha) * 100)
        : 0,
      recommendations,
    };

    const reply = `📊 এই মাসের ব্যয় বিশ্লেষণ ও সাশ্রয়ের পরামর্শ:\n\n` +
      `১) লেনদেন বিশ্লেষণ: চলতি মাসে মোট ব্যয় ${formatTaka(totalExpPoisha)}।\n` +
      `২) শীর্ষ ব্যয়ের খাত: ${sortedCats.slice(0, 2).map((c) => `${c.name} (${toBengaliNumber(c.percentage)}%)`).join(', ') || 'কোনো খাত পাওয়া যায়নি'}।\n` +
      `৩) আগের মাসের সাথে তুলনা: ${prevExpPoisha > 0 ? (diffPoisha > 0 ? `${toBengaliNumber(diffPercent)}% বেশি খরচ হয়েছে` : `${toBengaliNumber(diffPercent)}% সাশ্রয় হয়েছে`) : 'আগের মাসের ডেটা নেই'}।\n\n` +
      `💡 খরচ কমানোর সহজ সুপারিশমালা:\n` +
      recommendations.join('\n\n') +
      `\n\n(নোট: এটি একটি পরামর্শ মাত্র। আপনার অনুমতি ছাড়া কোনো তথ্য পরিবর্তিত হবে না।)`;

    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: reply,
      timestamp: now,
      actionTier: 'SUGGEST',
      analysisData,
      source: 'engine',
      suggestedQuestions: [
        'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
        'আমার সেভিংস গোল কতদূর এগিয়েছে?',
        'বিকাশে এখন কত টাকা আছে?',
      ],
    };
  }

  // 14. PERMISSION INFO
  if (intent === 'PERMISSION_INFO') {
    return {
      id: `msg-${now}`,
      sender: 'assistant',
      text: `🔒 এআই পারমিশন নিয়ন্ত্রণ (মোট ৮টি অপশন):\n\n` +
        `• Finance Data → Read: ${permissions.financeData ? 'চালু (ON)' : 'বন্ধ (OFF)'}\n` +
        `• Finance Data → Action: ${permissions.financeAction ? 'চালু (ON)' : 'বন্ধ (OFF)'}\n` +
        `• Notes → Read: ${permissions.notes ? 'চালু (ON)' : 'বন্ধ (OFF)'}\n` +
        `• Notes → Action: ${permissions.notesAction ? 'চালু (ON)' : 'বন্ধ (OFF)'}\n` +
        `• Contacts → Read: ${permissions.contacts ? 'চালু (ON)' : 'বন্ধ (OFF)'}\n` +
        `• Contacts → Action: ${permissions.contactsAction ? 'চালু (ON)' : 'বন্ধ (OFF)'}\n` +
        `• Calendar → Read: ${permissions.calendar ? 'চালু (ON)' : 'বন্ধ (OFF)'}\n` +
        `• Calendar → Action: ${permissions.calendarAction ? 'চালু (ON)' : 'বন্ধ (OFF)'}\n\n` +
        `আপনার অনুমতি ছাড়া কোনো ব্যক্তিগত তথ্য এআই ব্যবহার করবে না। উপরে থাকা পারমিশন প্যানেলটি খুলে যেকোনো অপশন ইচ্ছামত অন বা অফ করতে পারেন।`,
      timestamp: now,
      actionTier: 'READ',
      source: 'engine',
      suggestedQuestions: [
        'এই মাসে আমার মোট খরচ কত?',
        'আজ দুপুরে ১৫০ টাকা খরচ করেছি খাবারে',
      ],
    };
  }

  // 14.5. INTELLIGENT SEARCH & OPEN-ENDED QUERY HANDLER
  if (permissions.financeData) {
    // 1. Try finding any matching transactions by search terms in note or category or account
    const stopWords = new Set(['কত', 'কি', 'কী', 'আমার', 'এই', 'আছে', 'হয়েছে', 'টাকা', 'খরচ', 'করেছি', 'কেমন', 'হিসাব', 'ছিল', 'মোট', 'গেছে', 'গেল', 'বল', 'বলো', 'দাও', 'লিস্ট', 'দেখা', 'দেখাও']);
    const rawWords = input.toLowerCase().split(/[\s,?.!]+/).filter((w) => w.length >= 2 && !stopWords.has(w));

    if (rawWords.length > 0) {
      const matchedTx = transactions.filter((t) => {
        const catName = categories.find((c) => c.id === t.category_id)?.name?.toLowerCase() || '';
        const accName = accounts.find((a) => a.id === t.account_id)?.name?.toLowerCase() || '';
        const noteText = (t.note || '').toLowerCase();
        return rawWords.some((word) => catName.includes(word) || noteText.includes(word) || accName.includes(word));
      });

      if (matchedTx.length > 0) {
        const totalAmount = matchedTx.reduce((sum, t) => sum + t.amount_poisha, 0);
        let searchReply = `আপনার অনুসন্ধানের সাথে সম্পর্কিত মোট ${toBengaliNumber(matchedTx.length)}টি লেনদেন পাওয়া গেছে (মোট পরিমাণ: ${formatTaka(totalAmount)}):\n\n`;
        matchedTx.slice(-5).reverse().forEach((t, idx) => {
          const cat = categories.find((c) => c.id === t.category_id)?.name || 'অন্যান্য';
          const acc = accounts.find((a) => a.id === t.account_id)?.name || '';
          const noteStr = permissions.notes && t.note ? ` ("${t.note}")` : '';
          searchReply += `${toBengaliNumber(idx + 1)}. ${formatDateBengali(t.date)}: ${formatTaka(t.amount_poisha)} [${cat}] (${acc}${noteStr})\n`;
        });
        return {
          id: `msg-${now}`,
          sender: 'assistant',
          text: searchReply.trim(),
          timestamp: now,
          actionTier: 'READ',
          source: 'engine',
          suggestedQuestions: [
            'এই মাসে আমার মোট খরচ কত?',
            'বিকাশে এখন কত টাকা আছে?',
            'আমার সেভিংস গোল কতদূর এগিয়েছে?',
          ],
        };
      }
    }

    // 2. If the user asked an open question about their finances
    if (/টাকা|হিসাব|খরচ|আয়|ব্যালেন্স|অবস্থা|সার্বিক|কীভাবে|কিভাবে|বলো|জানাও/.test(input)) {
      const reply = `📊 আপনার সার্বিক আর্থিক তথ্যের সংক্ষেপ:\n\n` +
        `• হাতে থাকা মোট ব্যালেন্স: ${formatTaka(summary.totalLiquidBalancePoisha)}\n` +
        `• চলতি মাসের মোট আয়: ${formatTaka(summary.monthlyIncomePoisha)}\n` +
        `• চলতি মাসের মোট ব্যয়: ${formatTaka(summary.monthlyExpensePoisha)}\n` +
        `• চলতি মাসের নিট সঞ্চয়: ${formatTaka(summary.monthlySavingsPoisha)}\n` +
        `• মোট দেনা: ${formatTaka(summary.totalPayablesPoisha)}\n` +
        `• মোট পাওনা: ${formatTaka(summary.totalReceivablesPoisha)}\n\n` +
        `আপনার নির্দিষ্ট কোনো প্রশ্ন থাকলে (যেমন: কোনো তারিখ, ক্যাটাগরি বা অ্যাকাউন্ট) নির্দ্বিধায় করতে পারেন।`;

      return {
        id: `msg-${now}`,
        sender: 'assistant',
        text: reply,
        timestamp: now,
        actionTier: 'READ',
        source: 'engine',
        suggestedQuestions: [
          'গত ১৫ তারিখে কত খরচ করেছি?',
          'এই বছর মোবাইল রিচার্জে মোট কত খরচ হয়েছে?',
          'বিকাশে এখন কত টাকা আছে?',
          'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
        ],
      };
    }
  }

  // 15. GENERAL / FALLBACK
  return {
    id: `msg-${now}`,
    sender: 'assistant',
    text: `আসসালামু আলাইকুম! আমি আপনার গুছাও এআই সহকারী। আপনি যেকোনো ধরনের আর্থিক প্রশ্ন করতে পারেন, যেমন:\n\n` +
      `• নির্দিষ্ট তারিখ বা মাস: "গত ১৫ তারিখে কত খরচ করেছি?", "আজকে কত খরচ?"\n` +
      `• নির্দিষ্ট ক্যাটাগরি: "এই বছর মোবাইল রিচার্জে মোট কত খরচ হয়েছে?", "খাবারে কত খরচ?"\n` +
      `• নির্দিষ্ট অ্যাকাউন্ট: "বিকাশে এখন কত টাকা আছে?", "ক্যাশে কত টাকা?"\n` +
      `• তুলনামূলক হিসাব: "গত তিন মাসে কোন মাসে সবচেয়ে বেশি খরচ হয়েছে?"\n` +
      `• বাজেট ও সীমা: "কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?"\n` +
      `• পাওনা ও দেনা: "কার কাছে কত টাকা পাওনা আছি?", "আমার দেনা কত?"\n` +
      `• সেভিংস লক্ষ্য: "আমার সেভিংস গোল কতদূর এগিয়েছে?"\n` +
      `• পরামর্শ: "এই মাসের খরচ analyse করে কোথায় কমানো যায় বলো"\n\n` +
      `অথবা কণ্ঠস্বরে বলুন: "আজ দুপুরে ১৫০ টাকা খাবার খরচ করেছি।"`,
    timestamp: now,
    actionTier: 'READ',
    source: 'engine',
    suggestedQuestions: [
      'গত ১৫ তারিখে কত খরচ করেছি?',
      'বিকাশে এখন কত টাকা আছে?',
      'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
      'আমার সেভিংস গোল কতদূর এগিয়েছে?',
      'গত তিন মাসে কোন মাসে সবচেয়ে বেশি খরচ হয়েছে?',
    ],
  };
}

/**
 * Main Async Query Gateway:
 * 1. Checks permissions.
 * 2. Tries server-side Gemini API (/api/ai/query).
 * 3. Falls back smoothly to Local Analytical Engine if offline or no key.
 */
export async function queryAIAssistant(
  rawInput: string,
  context: EngineContext
): Promise<AgentMessage> {
  const input = rawInput.trim();
  const now = Date.now();

  // Resolve contextual continuity and detect intent early
  const contextual = resolveContextualQuery(input, context.chatHistory, context.categories, context.accounts);
  const resolvedInput = contextual.resolvedText;
  const intent = contextual.inferredIntent || classifyIntent(resolvedInput, context.categories, context.accounts);

  // If query is strictly out-of-scope or an action proposal, let local engine handle it directly with polite speed
  if (intent === 'ACTION_CREATE_TRANSACTION' || intent === 'OUT_OF_SCOPE' || isOutOfScopeQuery(input)) {
    return processAgentQuery(input, context);
  }

  // Try calling server-side Gemini route
  try {
    const snapshot = buildDatabaseSnapshot(context);
    const response = await fetch('/api/ai/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: input,
        permissions: context.permissions,
        databaseSnapshot: snapshot,
        chatHistory: context.chatHistory || [],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && !data.fallback && data.reply) {
        return {
          id: `msg-${now}`,
          sender: 'assistant',
          text: data.reply,
          timestamp: now,
          actionTier: data.actionTier || 'READ',
          source: 'gemini',
          requiredPermission: data.requiredPermission,
          isPermissionDenied: data.isPermissionDenied,
          suggestedQuestions: [
            'আর গত মাসে?',
            'এই মাসে কত খরচ করেছি?',
            'বিকাশে এখন কত টাকা আছে?',
            'কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?',
          ],
        };
      }
    }
  } catch (err) {
    // Network or server error - seamlessly proceed to local engine
    console.warn('AI Server query failed, falling back to local analytical engine:', err);
  }

  // Local Analytical Engine fallback
  return processAgentQuery(input, context);
}
