/**
 * Core Types for Gochao (গুছাও)
 * All monetary values stored as integers in Poisha (1 Taka = 100 Poisha)
 */

/**
 * BaseEntity allows forward and backward compatibility across all entities.
 * Any new fields added in future versions or experimental branches will be preserved
 * and never stripped during serialization or migrations.
 */
export interface BaseEntity {
  id: string;
  created_at: number;
  updated_at?: number;
  schema_version?: number;
  is_archived?: boolean;
  metadata?: Record<string, any>;
  extra_data?: Record<string, any>;
}

export type AccountType = 'CASH' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK' | 'SAVINGS';

export interface Account extends BaseEntity {
  name: string;
  type: AccountType;
  opening_balance_poisha: number;
  account_number_suffix?: string;
  is_active: boolean;
  color: string;
}

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface Category extends BaseEntity {
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon: string;
  color: string;
  is_system_default: boolean;
}

export interface Transaction extends BaseEntity {
  type: TransactionType;
  amount_poisha: number; // strictly positive integer
  account_id: string; // source account for expense/transfer, target account for income
  to_account_id?: string; // target account for transfer
  transfer_fee_poisha: number; // fee deducted from account_id
  category_id?: string; // optional for transfers
  custom_category_name?: string; // custom income/expense source name when "অন্যান্য" is chosen
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string;
}

export type DebtType = 'LENT' | 'BORROWED'; // LENT: টাকা দিয়েছি (পাওনা), BORROWED: টাকা নিয়েছি (দেনা)

export interface DebtRecord extends BaseEntity {
  person_name: string;
  phone?: string;
  type: DebtType;
  initial_amount_poisha: number;
  account_id: string; // account money was disbursed from (LENT) or received into (BORROWED)
  due_date?: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'SETTLED';
  notes?: string;
  date: string; // YYYY-MM-DD
}

export interface DebtPaymentHistory extends BaseEntity {
  debt_id: string;
  amount_poisha: number;
  account_id: string; // account where repayment was received into (for LENT) or paid out of (for BORROWED)
  payment_date: string; // YYYY-MM-DD
  note?: string;
}

export interface FinancialSummary {
  totalLiquidBalancePoisha: number;
  monthlyIncomePoisha: number;
  monthlyExpensePoisha: number;
  monthlySavingsPoisha: number;
  totalReceivablesPoisha: number; // মোট পাওনা
  totalPayablesPoisha: number; // মোট দেনা
  trueNetWorthPoisha: number; // মোট নগদ স্থিতি + মোট পাওনা - মোট দেনা
  periodLabel?: string; // Optional e.g. "সেপ্টেম্বর ২০২৬" or "১২ সেপ - ১৫ সেপ"
}

export interface CategoryBudget {
  category_id: string;
  limit_poisha: number; // Monthly limit in poisha
  month?: string; // Optional: specific month e.g. "2026-09" or general recurring monthly budget
  created_at?: number;
  updated_at?: number;
  schema_version?: number;
  metadata?: Record<string, any>;
  extra_data?: Record<string, any>;
}

export interface SavingsGoal extends BaseEntity {
  title: string;
  target_amount_poisha: number;
  saved_amount_poisha: number;
  target_date?: string; // YYYY-MM-DD
  color: string;
  icon: string;
  note?: string;
}

export interface RecurringExpense extends BaseEntity {
  title: string;
  amount_poisha: number;
  account_id: string;
  category_id: string;
  day_of_month: number; // 1 - 31
  note?: string;
  is_active: boolean;
  last_processed_month?: string; // e.g. "2026-09"
}

/**
 * Database Schema Metadata and Versioning Types
 */
export interface FeatureArchiveRecord {
  feature_key: string;
  archived_at: number;
  reason: string;
  app_version: string;
  schema_version: number;
  data: any;
}

export interface SchemaMeta {
  schema_version: number;
  app_version: string;
  installed_at: number;
  last_migrated_at: number;
  applied_migrations: string[];
  archived_features?: Record<string, FeatureArchiveRecord>;
  [extraProp: string]: any;
}

export interface MigrationContext {
  getRawItem: (key: string) => string | null;
  setRawItem: (key: string, value: string) => void;
  removeRawItem: (key: string) => void;
  archiveFeature: (featureKey: string, reason: string, data: any) => void;
  getArchivedFeature: (featureKey: string) => FeatureArchiveRecord | undefined;
}

export interface MigrationStep {
  id: string;
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (context: MigrationContext) => void;
}

/**
 * Gochao v2.0 Extensions: Smart Reminders, Personalization & Backup Validation
 */
export type ReminderType = 'BILL' | 'DEBT' | 'RECURRING' | 'SAVINGS' | 'CUSTOM';
export type ReminderRepeat = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface SmartReminder extends BaseEntity {
  title: string;
  type: ReminderType;
  amount_poisha?: number;
  due_date: string; // YYYY-MM-DD
  due_time?: string; // HH:mm
  repeat: ReminderRepeat;
  is_completed: boolean;
  notes?: string;
  linked_entity_id?: string;
}

export interface DashboardCardConfig {
  showQuickSpendOverview: boolean;
  showCategoryBudgets: boolean;
  showSavingsGoals: boolean;
  showRecurringExpenses: boolean;
  showDebts: boolean;
  showSpendingInsights: boolean;
  showRecentTransactions: boolean;
}

export interface PersonalizationSettings {
  currencySymbol: string;
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'DD MMM YYYY';
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  autoLockTime: 'IMMEDIATE' | '1_MIN' | '5_MIN' | 'NEVER';
  dashboardCards: DashboardCardConfig;
}

export interface BackupValidationResult {
  isValid: boolean;
  errorMessage?: string;
  fileVersion?: string;
  schemaVersion?: number;
  counts: {
    accounts: number;
    transactions: number;
    categories: number;
    debts: number;
    debtPayments: number;
    budgets: number;
    savingsGoals: number;
    recurringExpenses: number;
    reminders: number;
  };
  integrityStatus: 'EXCELLENT' | 'WARNING' | 'CORRUPTED';
  integrityIssues: string[];
  duplicateCount: number;
  checksum: string;
  parsedData?: any;
}
