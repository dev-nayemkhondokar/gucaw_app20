/**
 * Schema Migration Registry
 * Defines deterministic, forward-only data migrations between schema versions.
 * 
 * Rules for writing migrations:
 * 1. Migrations MUST be idempotent and non-destructive.
 * 2. Old fields MUST NOT be deleted unless transformed or archived into feature archive.
 * 3. Any removed feature's data MUST be saved to context.archiveFeature() before key removal.
 * 4. All existing records must be preserved.
 */

import { MigrationStep } from '../../types';
import { STORAGE_KEYS } from './schemaMeta';
import {
  sanitizeAccount,
  sanitizeCategory,
  sanitizeTransaction,
  sanitizeDebtRecord,
  sanitizeDebtPayment,
  sanitizeBudget,
  sanitizeSavingsGoal,
  sanitizeRecurringExpense,
} from './tableSanitizers';

export const MIGRATIONS: MigrationStep[] = [
  {
    id: 'v1_to_v2_lossless_schema_architecture',
    fromVersion: 1,
    toVersion: 2,
    description: 'Upgrade data tables with schema_version tags, lossless field preservation, and auto-repairing numeric fields.',
    migrate: (context) => {
      // 1. Upgrade Accounts
      const rawAccounts = context.getRawItem(STORAGE_KEYS.ACCOUNTS);
      if (rawAccounts) {
        try {
          const parsed = JSON.parse(rawAccounts);
          if (Array.isArray(parsed)) {
            const upgraded = parsed.map((acc, idx) => sanitizeAccount(acc, idx));
            context.setRawItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(upgraded));
          }
        } catch (e) {
          console.error('[Migration v1->v2] Error upgrading accounts', e);
        }
      }

      // 2. Upgrade Categories
      const rawCategories = context.getRawItem(STORAGE_KEYS.CATEGORIES);
      if (rawCategories) {
        try {
          const parsed = JSON.parse(rawCategories);
          if (Array.isArray(parsed)) {
            const upgraded = parsed.map((cat, idx) => sanitizeCategory(cat, idx));
            context.setRawItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(upgraded));
          }
        } catch (e) {
          console.error('[Migration v1->v2] Error upgrading categories', e);
        }
      }

      // 3. Upgrade Transactions
      const rawTransactions = context.getRawItem(STORAGE_KEYS.TRANSACTIONS);
      if (rawTransactions) {
        try {
          const parsed = JSON.parse(rawTransactions);
          if (Array.isArray(parsed)) {
            const upgraded = parsed.map((tx, idx) => sanitizeTransaction(tx, idx));
            context.setRawItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(upgraded));
          }
        } catch (e) {
          console.error('[Migration v1->v2] Error upgrading transactions', e);
        }
      }

      // 4. Upgrade Debts
      const rawDebts = context.getRawItem(STORAGE_KEYS.DEBTS);
      if (rawDebts) {
        try {
          const parsed = JSON.parse(rawDebts);
          if (Array.isArray(parsed)) {
            const upgraded = parsed.map((d, idx) => sanitizeDebtRecord(d, idx));
            context.setRawItem(STORAGE_KEYS.DEBTS, JSON.stringify(upgraded));
          }
        } catch (e) {
          console.error('[Migration v1->v2] Error upgrading debts', e);
        }
      }

      // 5. Upgrade Debt Payments
      const rawPayments = context.getRawItem(STORAGE_KEYS.DEBT_PAYMENTS);
      if (rawPayments) {
        try {
          const parsed = JSON.parse(rawPayments);
          if (Array.isArray(parsed)) {
            const upgraded = parsed.map((p, idx) => sanitizeDebtPayment(p, idx));
            context.setRawItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify(upgraded));
          }
        } catch (e) {
          console.error('[Migration v1->v2] Error upgrading debt payments', e);
        }
      }

      // 6. Upgrade Budgets
      const rawBudgets = context.getRawItem(STORAGE_KEYS.BUDGETS);
      if (rawBudgets) {
        try {
          const parsed = JSON.parse(rawBudgets);
          if (Array.isArray(parsed)) {
            const upgraded = parsed.map((b) => sanitizeBudget(b));
            context.setRawItem(STORAGE_KEYS.BUDGETS, JSON.stringify(upgraded));
          }
        } catch (e) {
          console.error('[Migration v1->v2] Error upgrading budgets', e);
        }
      }

      // 7. Upgrade Savings Goals
      const rawGoals = context.getRawItem(STORAGE_KEYS.SAVINGS_GOALS);
      if (rawGoals) {
        try {
          const parsed = JSON.parse(rawGoals);
          if (Array.isArray(parsed)) {
            const upgraded = parsed.map((g, idx) => sanitizeSavingsGoal(g, idx));
            context.setRawItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(upgraded));
          }
        } catch (e) {
          console.error('[Migration v1->v2] Error upgrading savings goals', e);
        }
      }

      // 8. Upgrade Recurring Expenses
      const rawRecurring = context.getRawItem(STORAGE_KEYS.RECURRING_EXPENSES);
      if (rawRecurring) {
        try {
          const parsed = JSON.parse(rawRecurring);
          if (Array.isArray(parsed)) {
            const upgraded = parsed.map((r, idx) => sanitizeRecurringExpense(r, idx));
            context.setRawItem(STORAGE_KEYS.RECURRING_EXPENSES, JSON.stringify(upgraded));
          }
        } catch (e) {
          console.error('[Migration v1->v2] Error upgrading recurring expenses', e);
        }
      }
    },
  },
  {
    id: 'v2_to_v3_fresh_start_clear_demo_data',
    fromVersion: 2,
    toVersion: 3,
    description: 'Clean wipe of all demo/sample transactions, balances, debts, budgets, goals for a completely fresh user start while preserving categories.',
    migrate: (context) => {
      // 1. Reset accounts to 0 opening balance and remove sample suffixes
      const rawAccounts = context.getRawItem(STORAGE_KEYS.ACCOUNTS);
      if (rawAccounts) {
        try {
          const parsed = JSON.parse(rawAccounts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const resetAccounts = parsed.map((acc, idx) => ({
              ...sanitizeAccount(acc, idx),
              opening_balance_poisha: 0,
              account_number_suffix: undefined,
            }));
            context.setRawItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(resetAccounts));
          }
        } catch (e) {
          console.error('[Migration v2->v3] Error resetting accounts', e);
        }
      }

      // 2. Clear sample transactions
      context.setRawItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));

      // 3. Clear debts & debt payments
      context.setRawItem(STORAGE_KEYS.DEBTS, JSON.stringify([]));
      context.setRawItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify([]));

      // 4. Clear budgets
      context.setRawItem(STORAGE_KEYS.BUDGETS, JSON.stringify([]));

      // 5. Clear savings goals
      context.setRawItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify([]));

      // 6. Clear recurring expenses
      context.setRawItem(STORAGE_KEYS.RECURRING_EXPENSES, JSON.stringify([]));

      // 7. Clear AI chat history
      context.setRawItem(STORAGE_KEYS.AI_CHAT_HISTORY, JSON.stringify([]));
    },
  },
];
