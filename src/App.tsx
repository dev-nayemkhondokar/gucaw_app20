import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storageService } from './services/storageService';
import {
  Account,
  Category,
  Transaction,
  DebtRecord,
  DebtPaymentHistory,
  TransactionType,
  DebtType,
  AccountType,
  CategoryBudget,
  SavingsGoal,
  RecurringExpense,
} from './types';
import {
  calculateAccountBalance,
  calculateFinancialSummary,
} from './utils/calculations';
import { getMonthYearBangla } from './utils/formatters';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { ReportsView } from './components/ReportsView';
import { AccountsView } from './components/AccountsView';
import { DebtsView } from './components/DebtsView';
import { SettingsView } from './components/SettingsView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { BottomNavBar } from './components/BottomNavBar';
import { PinLockOverlay } from './components/PinLockOverlay';
import { DateRangePicker, DateFilterSelection } from './components/DateRangePicker';
import { securityUtils } from './utils/securityUtils';
import { AIAssistantView } from './components/AIAssistantView';
import { Settings } from 'lucide-react';
import { BRAND } from './config/brand';
import { GochaoAppIcon } from './components/GochaoLogo';
import { OnboardingFlow } from './components/OnboardingFlow';
import { useLanguage } from './contexts/LanguageContext';

export default function App() {
  const { language, t, formatMonthYear } = useLanguage();

  // 1. Data States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPaymentHistory[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  // Onboarding Flow State (Shown only on first app launch)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !storageService.isOnboardingCompleted();
  });

  const handleCompleteOnboarding = () => {
    storageService.setOnboardingCompleted();
    setShowOnboarding(false);
  };

  const handleReopenOnboarding = () => {
    setShowOnboarding(true);
  };

  // 2. Navigation & UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('plm_theme_mode') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('plm_theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('plm_theme_mode', 'light');
    }
  }, [isDarkMode]);

  // Active Date Filter (Month / Custom Date Range / All Time)
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [dateFilter, setDateFilter] = useState<DateFilterSelection>({
    type: 'MONTH',
    selectedMonth: currentMonthStr,
    label: formatMonthYear(currentMonthStr),
  });

  // Sync dateFilter label when language changes
  useEffect(() => {
    if (dateFilter.type === 'MONTH') {
      setDateFilter((prev) => ({
        ...prev,
        label: formatMonthYear(prev.selectedMonth),
      }));
    } else if (dateFilter.type === 'ALL_TIME') {
      setDateFilter((prev) => ({
        ...prev,
        label: t.datePicker.allTimeTitle,
      }));
    }
  }, [language, formatMonthYear, t]);

  // Initial Load
  const loadData = () => {
    setAccounts(storageService.getAccounts());
    setCategories(storageService.getCategories());
    setTransactions(storageService.getTransactions());
    setDebts(storageService.getDebts());
    setDebtPayments(storageService.getDebtPayments());
    setBudgets(storageService.getBudgets());
    setSavingsGoals(storageService.getSavingsGoals());
    setRecurringExpenses(storageService.getRecurringExpenses());

    // Check PIN Lock
    const sec = securityUtils.getSettings();
    if (sec.isLockEnabled) {
      setIsLocked(true);
    }
  };


  useEffect(() => {
    loadData();
  }, []);

  // 3. Derived Balances & Metrics
  const accountBalances = useMemo(() => {
    const map: { [id: string]: number } = {};
    for (const acc of accounts) {
      map[acc.id] = calculateAccountBalance(acc, transactions, debts, debtPayments);
    }
    return map;
  }, [accounts, transactions, debts, debtPayments]);

  // Compute Financial Summary according to Date Filter
  const summary = useMemo(() => {
    if (dateFilter.type === 'CUSTOM') {
      return calculateFinancialSummary(
        accounts,
        transactions,
        debts,
        debtPayments,
        {
          start: dateFilter.startDate,
          end: dateFilter.endDate,
          label: dateFilter.label,
        }
      );
    }
    if (dateFilter.type === 'ALL_TIME') {
      return calculateFinancialSummary(
        accounts,
        transactions,
        debts,
        debtPayments,
        { label: 'সব সময়ের হিসাব' }
      );
    }
    // Standard Month
    return calculateFinancialSummary(
      accounts,
      transactions,
      debts,
      debtPayments,
      dateFilter.selectedMonth
    );
  }, [accounts, transactions, debts, debtPayments, dateFilter]);

  // 4. Handlers
  const handleAddTransaction = (data: {
    type: TransactionType;
    amount_poisha: number;
    account_id: string;
    to_account_id?: string;
    transfer_fee_poisha: number;
    category_id?: string;
    date: string;
    time: string;
    note?: string;
  }) => {
    // Ensure account_id is valid and points to an existing account
    const validAccountId =
      data.account_id && accounts.some((a) => a.id === data.account_id)
        ? data.account_id
        : accounts[0]?.id || 'acc-cash';

    const validToAccountId =
      data.to_account_id && accounts.some((a) => a.id === data.to_account_id)
        ? data.to_account_id
        : data.type === 'TRANSFER'
        ? accounts.find((a) => a.id !== validAccountId)?.id || accounts[1]?.id
        : undefined;

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: data.type,
      amount_poisha: data.amount_poisha,
      account_id: validAccountId,
      to_account_id: validToAccountId,
      transfer_fee_poisha: data.transfer_fee_poisha || 0,
      category_id: data.category_id,
      date: data.date,
      time: data.time,
      note: data.note,
      created_at: Date.now(),
    };

    const updated = [newTx, ...transactions];
    setTransactions(updated);
    storageService.saveTransactions(updated);
  };

  const handleAddDebt = (data: {
    type: DebtType;
    person_name: string;
    phone?: string;
    person_phone?: string;
    amount_poisha?: number;
    initial_amount_poisha?: number;
    account_id: string;
    date: string;
    due_date?: string;
    notes?: string;
    note?: string;
  }) => {
    const rawAmount = data.initial_amount_poisha ?? data.amount_poisha ?? 0;
    const initialAmount = typeof rawAmount === 'number' && !isNaN(rawAmount) ? rawAmount : (parseFloat(String(rawAmount)) || 0);

    const validAccountId =
      data.account_id && accounts.some((a) => a.id === data.account_id)
        ? data.account_id
        : accounts[0]?.id || 'acc-cash';

    const newDebt: DebtRecord = {
      id: `debt-${Date.now()}`,
      type: data.type,
      person_name: data.person_name,
      phone: data.phone || data.person_phone,
      initial_amount_poisha: initialAmount,
      account_id: validAccountId,
      date: data.date,
      due_date: data.due_date,
      notes: data.notes || data.note,
      status: 'ACTIVE',
      created_at: Date.now(),
    };

    const updated = [newDebt, ...debts];
    setDebts(updated);
    storageService.saveDebts(updated);
  };

  const handleAddDebtPayment = (data: {
    debt_id: string;
    amount_poisha: number;
    account_id: string;
    payment_date: string;
    note?: string;
  }) => {
    const rawAmount = data.amount_poisha;
    const paymentAmount = typeof rawAmount === 'number' && !isNaN(rawAmount) ? rawAmount : (parseFloat(String(rawAmount)) || 0);

    const validAccountId =
      data.account_id && accounts.some((a) => a.id === data.account_id)
        ? data.account_id
        : accounts[0]?.id || 'acc-cash';

    const newPayment: DebtPaymentHistory = {
      id: `payment-${Date.now()}`,
      debt_id: data.debt_id,
      amount_poisha: paymentAmount,
      account_id: validAccountId,
      payment_date: data.payment_date,
      note: data.note,
      created_at: Date.now(),
    };

    const updatedPayments = [newPayment, ...debtPayments];
    setDebtPayments(updatedPayments);
    storageService.saveDebtPayments(updatedPayments);

    // Check if debt is fully paid
    const targetDebt = debts.find((d) => d.id === data.debt_id);
    if (targetDebt) {
      const allPaymentsForDebt = updatedPayments
        .filter((p) => p.debt_id === data.debt_id)
        .reduce((sum, p) => sum + (Number(p.amount_poisha) || 0), 0);

      const targetInitialAmount = Number(targetDebt.initial_amount_poisha) || (targetDebt as any).amount_poisha || 0;
      const newStatus: 'ACTIVE' | 'SETTLED' =
        allPaymentsForDebt >= targetInitialAmount ? 'SETTLED' : 'ACTIVE';

      const updatedDebts = debts.map((d) =>
        d.id === data.debt_id ? { ...d, status: newStatus } : d
      );
      setDebts(updatedDebts);
      storageService.saveDebts(updatedDebts);
    }
  };

  const handleAddAccount = (data: {
    name: string;
    type: AccountType;
    opening_balance_poisha: number;
    color: string;
    account_number_suffix?: string;
  }) => {
    const newAcc: Account = {
      id: `acc-${Date.now()}`,
      name: data.name,
      type: data.type,
      opening_balance_poisha: data.opening_balance_poisha,
      color: data.color,
      account_number_suffix: data.account_number_suffix,
      is_active: true,
      created_at: Date.now(),
    };

    const updated = [...accounts, newAcc];
    setAccounts(updated);
    storageService.saveAccounts(updated);
  };

  const handleAddCategory = (data: {
    name: string;
    type: 'EXPENSE' | 'INCOME';
    icon: string;
    color: string;
  }) => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
      is_system_default: false,
      created_at: Date.now(),
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    storageService.saveCategories(updated);
  };

  const handleUpdateBudget = (categoryId: string, limitPoisha: number) => {
    const existingIndex = budgets.findIndex((b) => b.category_id === categoryId);
    let updated: CategoryBudget[];

    if (limitPoisha <= 0) {
      // Remove limit if 0
      updated = budgets.filter((b) => b.category_id !== categoryId);
    } else if (existingIndex >= 0) {
      updated = budgets.map((b, idx) =>
        idx === existingIndex ? { ...b, limit_poisha: limitPoisha } : b
      );
    } else {
      updated = [...budgets, { category_id: categoryId, limit_poisha: limitPoisha }];
    }
    setBudgets(updated);
    storageService.saveBudgets(updated);
  };

  const handleAddSavingsGoal = (
    goalData: Omit<SavingsGoal, 'id' | 'created_at'>
  ) => {
    const newGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      ...goalData,
      created_at: Date.now(),
    };
    const updated = [newGoal, ...savingsGoals];
    setSavingsGoals(updated);
    storageService.saveSavingsGoals(updated);
  };

  const handleUpdateSavingsGoalProgress = (goalId: string, addedPoisha: number) => {
    const updated = savingsGoals.map((g) => {
      if (g.id === goalId) {
        return {
          ...g,
          saved_amount_poisha: Math.max(0, g.saved_amount_poisha + addedPoisha),
        };
      }
      return g;
    });
    setSavingsGoals(updated);
    storageService.saveSavingsGoals(updated);
  };

  const handleDeleteSavingsGoal = (goalId: string) => {
    const updated = savingsGoals.filter((g) => g.id !== goalId);
    setSavingsGoals(updated);
    storageService.saveSavingsGoals(updated);
  };

  // Recurring Expenses Handlers
  const handleAddRecurringExpense = (
    expenseData: Omit<RecurringExpense, 'id' | 'created_at'>
  ) => {
    const newExpense: RecurringExpense = {
      id: `recurring-${Date.now()}`,
      ...expenseData,
      created_at: Date.now(),
    };
    const updated = [newExpense, ...recurringExpenses];
    setRecurringExpenses(updated);
    storageService.saveRecurringExpenses(updated);
  };

  const handleToggleRecurringExpense = (id: string, isActive: boolean) => {
    const updated = recurringExpenses.map((item) =>
      item.id === id ? { ...item, is_active: isActive } : item
    );
    setRecurringExpenses(updated);
    storageService.saveRecurringExpenses(updated);
  };

  const handleDeleteRecurringExpense = (id: string) => {
    const updated = recurringExpenses.filter((item) => item.id !== id);
    setRecurringExpenses(updated);
    storageService.saveRecurringExpenses(updated);
  };

  // Executes a single recurring expense: creates an EXPENSE transaction and stamps last_processed_month
  const handleExecuteRecurringExpense = (expense: RecurringExpense) => {
    const activeMonth = dateFilter.selectedMonth; // YYYY-MM
    const dateFormatted = `${activeMonth}-${String(expense.day_of_month).padStart(2, '0')}`;

    const newTx: Transaction = {
      id: `tx-recurring-${Date.now()}-${expense.id}`,
      type: 'EXPENSE',
      amount_poisha: expense.amount_poisha,
      account_id: expense.account_id,
      category_id: expense.category_id,
      transfer_fee_poisha: 0,
      date: dateFormatted,
      time: '09:00',
      note: `অটো রিকারিং খরচ: ${expense.title}${expense.note ? ` (${expense.note})` : ''}`,
      created_at: Date.now(),
    };

    const updatedTx = [newTx, ...transactions];
    setTransactions(updatedTx);
    storageService.saveTransactions(updatedTx);

    // Update last_processed_month
    const updatedRecurring = recurringExpenses.map((item) =>
      item.id === expense.id ? { ...item, last_processed_month: activeMonth } : item
    );
    setRecurringExpenses(updatedRecurring);
    storageService.saveRecurringExpenses(updatedRecurring);
  };

  // Executes all pending active recurring expenses for the current selected month
  const handleExecuteAllPendingRecurring = () => {
    const activeMonth = dateFilter.selectedMonth;
    const pending = recurringExpenses.filter(
      (item) => item.is_active && item.last_processed_month !== activeMonth
    );
    if (pending.length === 0) return;

    const newTxs: Transaction[] = [];
    const updatedRecurring = recurringExpenses.map((item) => {
      if (item.is_active && item.last_processed_month !== activeMonth) {
        const dateFormatted = `${activeMonth}-${String(item.day_of_month).padStart(2, '0')}`;
        newTxs.push({
          id: `tx-recurring-${Date.now()}-${item.id}-${Math.random().toString(36).substr(2, 4)}`,
          type: 'EXPENSE',
          amount_poisha: item.amount_poisha,
          account_id: item.account_id,
          category_id: item.category_id,
          transfer_fee_poisha: 0,
          date: dateFormatted,
          time: '09:00',
          note: `অটো রিকারিং খরচ: ${item.title}${item.note ? ` (${item.note})` : ''}`,
          created_at: Date.now(),
        });
        return { ...item, last_processed_month: activeMonth };
      }
      return item;
    });

    const updatedTx = [...newTxs, ...transactions];
    setTransactions(updatedTx);
    storageService.saveTransactions(updatedTx);

    setRecurringExpenses(updatedRecurring);
    storageService.saveRecurringExpenses(updatedRecurring);
  };

  // If Onboarding is active, render only the Onboarding screen with solid background
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleCompleteOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col items-center transition-colors">
      {/* PIN Lock Screen if locked */}
      {isLocked && <PinLockOverlay onUnlock={() => setIsLocked(false)} />}

      {/* Main Mobile App Frame */}
      <div className="w-full max-w-lg min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 relative pb-16 transition-colors">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xs transition-colors">
          <div
            id="header-brand"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 select-none cursor-pointer group active:scale-98 transition-transform"
            title={`${BRAND.name} (${BRAND.banglaName}) - হোম`}
          >
            <GochaoAppIcon size="sm" />
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                {BRAND.name}
              </span>
              <span className="text-[11px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/70 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800/60">
                {BRAND.banglaName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Date Range / Month Filter Selector */}
            <DateRangePicker
              currentFilter={dateFilter}
              onChangeFilter={(newFilter) => setDateFilter(newFilter)}
            />

            {/* Settings Icon in Top-Right Corner */}
            <button
              id="header-settings-btn"
              onClick={() => setActiveTab('settings')}
              aria-label={t.settings.title}
              title={t.settings.title}
              className={`p-1.5 rounded-xl border transition-all shrink-0 active:scale-95 ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* View Switcher Container with Smooth Screen Transition */}
        <main className="flex-1 p-4 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  summary={summary}
                  accounts={accounts}
                  recentTransactions={transactions}
                  categories={categories}
                  budgets={budgets}
                  isPrivacyMode={isPrivacyMode}
                  onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  selectedMonth={dateFilter.selectedMonth}
                  allTransactions={transactions}
                  onAddCategory={handleAddCategory}
                  onUpdateBudget={handleUpdateBudget}
                />
              )}

              {activeTab === 'ai' && (
                <AIAssistantView
                  transactions={transactions}
                  categories={categories}
                  accounts={accounts}
                  debts={debts}
                  debtPayments={debtPayments}
                  budgets={budgets}
                  savingsGoals={savingsGoals}
                  recurringExpenses={recurringExpenses}
                  accountBalances={accountBalances}
                  summary={summary}
                  selectedMonth={dateFilter.selectedMonth}
                  onAddTransaction={handleAddTransaction}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  accounts={accounts}
                  categories={categories}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  transactions={transactions}
                  categories={categories}
                  accounts={accounts}
                  summary={summary}
                  dateFilter={dateFilter}
                />
              )}

              {activeTab === 'accounts' && (
                <AccountsView
                  accounts={accounts}
                  accountBalances={accountBalances}
                  onAddAccount={handleAddAccount}
                />
              )}

              {activeTab === 'debts' && (
                <DebtsView
                  debts={debts}
                  debtPayments={debtPayments}
                  accounts={accounts}
                  onAddPayment={handleAddDebtPayment}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  categories={categories}
                  accounts={accounts}
                  transactions={transactions}
                  debts={debts}
                  summary={summary}
                  dateFilterLabel={dateFilter.label}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
                  onLockNow={() => setIsLocked(true)}
                  onAddCategory={handleAddCategory}
                  onRefreshData={loadData}
                  onReopenOnboarding={handleReopenOnboarding}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>


        {/* Bottom Navigation */}
        <BottomNavBar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />

        {/* Add Transaction / Debt Modal Sheet */}
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          accounts={accounts}
          categories={categories}
          onAddTransaction={handleAddTransaction}
          onAddDebt={handleAddDebt}
        />
      </div>
    </div>
  );
}
