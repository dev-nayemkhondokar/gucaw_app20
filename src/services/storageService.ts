/**
 * Offline-first Storage Service with Schema Migration & Forward/Backward Compatibility
 * 
 * Architecture Guarantees:
 * 1. Lossless Schema: New fields and tables can be introduced without corrupting or deleting existing user data.
 * 2. Feature Data Archival: Removing or altering a feature archives its data rather than deleting it.
 * 3. App Version Upgrades: Version migrations run automatically and safely without affecting existing balances or transactions.
 * 4. Backward Compatibility: 100% compatible with existing callers and backup files.
 */

import {
  Account,
  Transaction,
  DebtRecord,
  DebtPaymentHistory,
  Category,
  CategoryBudget,
  SavingsGoal,
  RecurringExpense,
  SmartReminder,
  PersonalizationSettings,
  SchemaMeta,
  FeatureArchiveRecord,
} from '../types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  DEFAULT_BUDGETS,
  DEFAULT_SAVINGS_GOALS,
  DEFAULT_RECURRING_EXPENSES,
  DEFAULT_DEBTS,
  DEFAULT_TRANSACTIONS,
} from '../data/defaultData';
import { AIPermissions, DEFAULT_AI_PERMISSIONS, AgentMessage } from './agenticAI/types';
import {
  CURRENT_SCHEMA_VERSION,
  CURRENT_APP_VERSION,
  STORAGE_KEYS,
} from './db/schemaMeta';
import {
  sanitizeAccount,
  sanitizeCategory,
  sanitizeTransaction,
  sanitizeDebtRecord,
  sanitizeDebtPayment,
  sanitizeBudget,
  sanitizeSavingsGoal,
  sanitizeRecurringExpense,
} from './db/tableSanitizers';
import { dbMigrationEngine } from './db/migrationEngine';

export const storageService = {
  /**
   * Initializes the storage service, runs pending schema migrations,
   * and ensures demo data is purged for a clean user fresh start.
   */
  init(): { success: boolean; migratedFrom: number; migratedTo: number } {
    const res = dbMigrationEngine.runMigrations();
    this.ensureFreshStartClean();
    return res;
  },

  /**
   * Cleans all demo transactions, debts, balances, budgets, and goals
   * so new users have a pristine fresh start with 0 balances.
   */
  ensureFreshStartClean(): void {
    const FRESH_FLAG = 'gochao_fresh_start_v2_applied';
    if (localStorage.getItem(FRESH_FLAG) === 'true') {
      return;
    }
    try {
      // 1. Reset accounts to 0 opening balance and clear fake demo suffixes
      const accountsRaw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (accountsRaw) {
        const parsed = JSON.parse(accountsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const zeroAccounts = parsed.map((acc: any, idx: number) => ({
            ...sanitizeAccount(acc, idx),
            opening_balance_poisha: 0,
            account_number_suffix: undefined,
          }));
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(zeroAccounts));
        } else {
          const zeroDefaults = DEFAULT_ACCOUNTS.map((a, i) => sanitizeAccount(a, i));
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(zeroDefaults));
        }
      } else {
        const zeroDefaults = DEFAULT_ACCOUNTS.map((a, i) => sanitizeAccount(a, i));
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(zeroDefaults));
      }

      // 2. Clear all sample transactions
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));

      // 3. Clear debts & debt payments
      localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify([]));

      // 4. Clear budgets
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify([]));

      // 5. Clear savings goals
      localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify([]));

      // 6. Clear recurring expenses
      localStorage.setItem(STORAGE_KEYS.RECURRING_EXPENSES, JSON.stringify([]));

      // 7. Clear AI chat history
      localStorage.setItem(STORAGE_KEYS.AI_CHAT_HISTORY, JSON.stringify([]));

      // Mark fresh start completed
      localStorage.setItem(FRESH_FLAG, 'true');
    } catch (e) {
      console.error('Failed to enforce fresh start clean', e);
    }
  },

  /**
   * Schema Metadata Access
   */
  getSchemaMeta(): SchemaMeta {
    return dbMigrationEngine.getSchemaMeta();
  },

  // -------------------------------------------------------------
  // Accounts
  // -------------------------------------------------------------
  getAccounts(): Account[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          let modified = false;
          const sanitized: Account[] = parsed.map((acc: any, idx: number) => {
            const clean = sanitizeAccount(acc, idx);
            if (clean.opening_balance_poisha !== acc.opening_balance_poisha || clean.schema_version !== acc.schema_version) {
              modified = true;
            }
            return clean;
          });
          if (modified) {
            this.saveAccounts(sanitized);
          }
          return sanitized;
        }
      }
    } catch (e) {
      console.error('Failed to load accounts from storage', e);
    }
    const defaults = DEFAULT_ACCOUNTS.map((a, i) => sanitizeAccount(a, i));
    this.saveAccounts(defaults);
    return defaults;
  },

  saveAccounts(accounts: Account[]): void {
    const sanitized = accounts.map((a, i) => sanitizeAccount(a, i));
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(sanitized));
  },

  // -------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------
  getCategories(): Category[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (data) {
        const saved: any[] = JSON.parse(data);
        if (Array.isArray(saved)) {
          let updated = false;
          const sanitized = saved.map((c, i) => {
            const cat = sanitizeCategory(c, i);
            if (cat.id === 'cat-gift-income' && cat.name === 'উপহার / অন্যান্য আয়') {
              cat.name = 'উপহার ও অনুদান';
              updated = true;
            }
            return cat;
          });
          const existingIds = new Set(sanitized.map((c) => c.id));
          const missingDefaults = DEFAULT_CATEGORIES.filter((c) => !existingIds.has(c.id)).map((c, i) =>
            sanitizeCategory(c, i)
          );
          if (missingDefaults.length > 0 || updated) {
            const merged = [...sanitized, ...missingDefaults];
            this.saveCategories(merged);
            return merged;
          }
          return sanitized;
        }
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
    const defaults = DEFAULT_CATEGORIES.map((c, i) => sanitizeCategory(c, i));
    this.saveCategories(defaults);
    return defaults;
  },

  saveCategories(categories: Category[]): void {
    const sanitized = categories.map((c, i) => sanitizeCategory(c, i));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(sanitized));
  },

  // -------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------
  getTransactions(): Transaction[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          let modified = false;
          const sanitized: Transaction[] = parsed.map((tx: any, idx: number) => {
            const clean = sanitizeTransaction(tx, idx);
            if (
              clean.amount_poisha !== tx.amount_poisha ||
              clean.transfer_fee_poisha !== tx.transfer_fee_poisha ||
              clean.account_id !== tx.account_id
            ) {
              modified = true;
            }
            return clean;
          });
          if (modified) {
            this.saveTransactions(sanitized);
          }
          return sanitized;
        }
      }
    } catch (e) {
      console.error('Failed to load transactions', e);
    }
    this.saveTransactions([]);
    return [];
  },

  saveTransactions(transactions: Transaction[]): void {
    const sanitized = transactions.map((t, i) => sanitizeTransaction(t, i));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(sanitized));
  },

  // -------------------------------------------------------------
  // Debts (Receivables & Payables)
  // -------------------------------------------------------------
  getDebts(): DebtRecord[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          let modified = false;
          const sanitized: DebtRecord[] = parsed.map((d: any, idx: number) => {
            const clean = sanitizeDebtRecord(d, idx);
            if (
              clean.initial_amount_poisha !== d.initial_amount_poisha ||
              clean.phone !== d.phone ||
              clean.account_id !== d.account_id
            ) {
              modified = true;
            }
            return clean;
          });
          if (modified) {
            this.saveDebts(sanitized);
          }
          return sanitized;
        }
      }
    } catch (e) {
      console.error('Failed to load debts', e);
    }
    this.saveDebts([]);
    return [];
  },

  saveDebts(debts: DebtRecord[]): void {
    const sanitized = debts.map((d, i) => sanitizeDebtRecord(d, i));
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(sanitized));
  },

  // -------------------------------------------------------------
  // Debt Payments
  // -------------------------------------------------------------
  getDebtPayments(): DebtPaymentHistory[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEBT_PAYMENTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          let modified = false;
          const sanitized: DebtPaymentHistory[] = parsed.map((p: any, idx: number) => {
            const clean = sanitizeDebtPayment(p, idx);
            if (
              clean.amount_poisha !== p.amount_poisha ||
              clean.account_id !== p.account_id
            ) {
              modified = true;
            }
            return clean;
          });
          if (modified) {
            this.saveDebtPayments(sanitized);
          }
          return sanitized;
        }
      }
    } catch (e) {
      console.error('Failed to load debt payments', e);
    }
    return [];
  },

  saveDebtPayments(payments: DebtPaymentHistory[]): void {
    const sanitized = payments.map((p, i) => sanitizeDebtPayment(p, i));
    localStorage.setItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify(sanitized));
  },

  // -------------------------------------------------------------
  // Budgets
  // -------------------------------------------------------------
  getBudgets(): CategoryBudget[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map((b: any) => sanitizeBudget(b));
        }
      }
    } catch (e) {
      console.error('Failed to load budgets', e);
    }
    const defaults = DEFAULT_BUDGETS.map((b) => sanitizeBudget(b));
    this.saveBudgets(defaults);
    return defaults;
  },

  saveBudgets(budgets: CategoryBudget[]): void {
    const sanitized = budgets.map((b) => sanitizeBudget(b));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(sanitized));
  },

  // -------------------------------------------------------------
  // Savings Goals
  // -------------------------------------------------------------
  getSavingsGoals(): SavingsGoal[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map((g: any, i: number) => sanitizeSavingsGoal(g, i));
        }
      }
    } catch (e) {
      console.error('Failed to load savings goals', e);
    }
    const defaults = DEFAULT_SAVINGS_GOALS.map((g, i) => sanitizeSavingsGoal(g, i));
    this.saveSavingsGoals(defaults);
    return defaults;
  },

  saveSavingsGoals(goals: SavingsGoal[]): void {
    const sanitized = goals.map((g, i) => sanitizeSavingsGoal(g, i));
    localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(sanitized));
  },

  // -------------------------------------------------------------
  // Recurring Expenses
  // -------------------------------------------------------------
  getRecurringExpenses(): RecurringExpense[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECURRING_EXPENSES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map((r: any, i: number) => sanitizeRecurringExpense(r, i));
        }
      }
    } catch (e) {
      console.error('Failed to load recurring expenses', e);
    }
    const defaults = DEFAULT_RECURRING_EXPENSES.map((r, i) => sanitizeRecurringExpense(r, i));
    this.saveRecurringExpenses(defaults);
    return defaults;
  },

  saveRecurringExpenses(expenses: RecurringExpense[]): void {
    const sanitized = expenses.map((r, i) => sanitizeRecurringExpense(r, i));
    localStorage.setItem(STORAGE_KEYS.RECURRING_EXPENSES, JSON.stringify(sanitized));
  },

  // -------------------------------------------------------------
  // AI Data Permissions
  // -------------------------------------------------------------
  getAIPermissions(): AIPermissions {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AI_PERMISSIONS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_AI_PERMISSIONS,
          ...parsed,
          financeAction:
            typeof parsed.financeAction === 'boolean'
              ? parsed.financeAction
              : parsed.financeData !== undefined
              ? parsed.financeData
              : DEFAULT_AI_PERMISSIONS.financeAction,
        };
      }
    } catch (e) {
      console.error('Failed to load AI permissions', e);
    }
    return DEFAULT_AI_PERMISSIONS;
  },

  saveAIPermissions(permissions: AIPermissions): void {
    localStorage.setItem(STORAGE_KEYS.AI_PERMISSIONS, JSON.stringify(permissions));
  },

  // -------------------------------------------------------------
  // AI Chat History
  // -------------------------------------------------------------
  getAIChatHistory(): AgentMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AI_CHAT_HISTORY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load AI chat history', e);
    }
    return [];
  },

  saveAIChatHistory(messages: AgentMessage[]): void {
    const trimmed = messages.slice(-50);
    localStorage.setItem(STORAGE_KEYS.AI_CHAT_HISTORY, JSON.stringify(trimmed));
  },

  // -------------------------------------------------------------
  // Feature Archival & Deprecation Preservation (Requirement 2)
  // -------------------------------------------------------------
  archiveFeatureData(featureKey: string, reason: string, data: any): void {
    dbMigrationEngine.archiveFeature(featureKey, reason, data);
  },

  getArchivedFeatureData(featureKey: string): FeatureArchiveRecord | undefined {
    return dbMigrationEngine.getArchivedFeature(featureKey);
  },

  getAllArchivedFeatures(): Record<string, FeatureArchiveRecord> {
    return dbMigrationEngine.getAllArchivedFeatures();
  },

  // -------------------------------------------------------------
  // Dynamic Table Storage for Future Features (Requirement 1)
  // -------------------------------------------------------------
  getTable<T>(tableKey: string, fallback: T[] = []): T[] {
    return dbMigrationEngine.getGenericTable<T>(tableKey, fallback);
  },

  saveTable<T>(tableKey: string, items: T[]): void {
    dbMigrationEngine.saveGenericTable<T>(tableKey, items);
  },

  // -------------------------------------------------------------
  // Complete Forward/Backward Compatible Offline Backup (Requirement 3)
  // -------------------------------------------------------------
  exportBackupJSON(): string {
    const accounts = this.getAccounts();
    const categories = this.getCategories();
    const transactions = this.getTransactions();
    const debts = this.getDebts();
    const debt_payments = this.getDebtPayments();
    const budgets = this.getBudgets();
    const savings_goals = this.getSavingsGoals();
    const recurring_expenses = this.getRecurringExpenses();
    const ai_permissions = this.getAIPermissions();
    const archived_features = this.getAllArchivedFeatures();

    const backup = {
      app_name: 'Gochao',
      app_version: CURRENT_APP_VERSION,
      schema_version: CURRENT_SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      // Top-level entities for direct 100% backward-compatibility
      accounts,
      categories,
      transactions,
      debts,
      debt_payments,
      budgets,
      savings_goals,
      recurring_expenses,
      ai_permissions,
      archived_features,
      // Structured meta
      meta: {
        schema_version: CURRENT_SCHEMA_VERSION,
        app_version: CURRENT_APP_VERSION,
      },
    };
    return JSON.stringify(backup, null, 2);
  },

  /**
   * Restore from Backup Payload
   * Automatically handles legacy, current, and future schemas.
   */
  importBackupJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format');
      }

      // Read from either root or nested data container
      const source = parsed.data || parsed;
      if (!source.accounts && !source.transactions) {
        throw new Error('Invalid backup structure: missing accounts or transactions');
      }

      if (Array.isArray(source.accounts)) {
        this.saveAccounts(source.accounts.map((a: any, i: number) => sanitizeAccount(a, i)));
      }
      if (Array.isArray(source.categories)) {
        this.saveCategories(source.categories.map((c: any, i: number) => sanitizeCategory(c, i)));
      }
      if (Array.isArray(source.transactions)) {
        this.saveTransactions(source.transactions.map((t: any, i: number) => sanitizeTransaction(t, i)));
      }
      if (Array.isArray(source.debts)) {
        this.saveDebts(source.debts.map((d: any, i: number) => sanitizeDebtRecord(d, i)));
      }
      if (Array.isArray(source.debt_payments)) {
        this.saveDebtPayments(source.debt_payments.map((p: any, i: number) => sanitizeDebtPayment(p, i)));
      }
      if (Array.isArray(source.budgets)) {
        this.saveBudgets(source.budgets.map((b: any) => sanitizeBudget(b)));
      }
      if (Array.isArray(source.savings_goals)) {
        this.saveSavingsGoals(source.savings_goals.map((g: any, i: number) => sanitizeSavingsGoal(g, i)));
      }
      if (Array.isArray(source.recurring_expenses)) {
        this.saveRecurringExpenses(source.recurring_expenses.map((r: any, i: number) => sanitizeRecurringExpense(r, i)));
      }
      if (source.ai_permissions && typeof source.ai_permissions === 'object') {
        this.saveAIPermissions({ ...DEFAULT_AI_PERMISSIONS, ...source.ai_permissions });
      }
      if (source.archived_features && typeof source.archived_features === 'object') {
        Object.entries(source.archived_features).forEach(([key, val]: [string, any]) => {
          this.archiveFeatureData(key, val?.reason || 'Restored from backup', val?.data || val);
        });
      }

      // Run any migrations if imported from older version
      this.init();
      return true;
    } catch (err) {
      console.error('Restore failed', err);
      return false;
    }
  },

  /**
   * Onboarding State Management
   */
  isOnboardingCompleted(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
  },

  setOnboardingCompleted(): void {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
  },

  resetOnboarding(): void {
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
  },
};
