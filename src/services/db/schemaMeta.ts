/**
 * Database Schema Metadata and Constants
 * Governs schema versions, application version compatibility, and table key definitions.
 */

import { SchemaMeta } from '../../types';

export const CURRENT_SCHEMA_VERSION = 3;
export const CURRENT_APP_VERSION = '2.0.0';

export const STORAGE_KEYS = {
  // Schema & System Metadata
  SCHEMA_META: 'plm_schema_meta_v1',
  FEATURE_ARCHIVE: 'plm_feature_archive_v1',
  PRE_MIGRATION_SNAPSHOT: 'plm_pre_migration_snapshot_v1',

  // Core Entity Tables
  ACCOUNTS: 'plm_accounts_v1',
  CATEGORIES: 'plm_categories_v1',
  TRANSACTIONS: 'plm_transactions_v1',
  DEBTS: 'plm_debts_v1',
  DEBT_PAYMENTS: 'plm_debt_payments_v1',
  BUDGETS: 'plm_budgets_v1',
  SAVINGS_GOALS: 'plm_savings_goals_v1',
  RECURRING_EXPENSES: 'plm_recurring_expenses_v1',
  REMINDERS: 'plm_reminders_v1',
  PERSONALIZATION: 'plm_personalization_v1',

  // Feature specific tables
  AI_PERMISSIONS: 'plm_ai_permissions_v1',
  AI_CHAT_HISTORY: 'plm_ai_chat_history_v1',
  ONBOARDING_COMPLETED: 'gochao_onboarding_completed_v1',
} as const;

export const DEFAULT_SCHEMA_META: SchemaMeta = {
  schema_version: CURRENT_SCHEMA_VERSION,
  app_version: CURRENT_APP_VERSION,
  installed_at: Date.now(),
  last_migrated_at: Date.now(),
  applied_migrations: ['v1_to_v2_lossless_schema_architecture', 'v2_to_v3_fresh_start_clear_demo_data'],
  archived_features: {},
};
