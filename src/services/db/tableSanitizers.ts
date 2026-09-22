/**
 * Table Sanitizers & Forward/Backward Compatibility Adapters
 * Ensures that:
 * 1. Adding new fields in future versions does not strip or corrupt existing data.
 * 2. Missing fields receive safe, intelligent defaults.
 * 3. All extra/custom fields are preserved without data loss (lossless spreading).
 * 4. Numeric and monetary fields are strictly verified against NaN.
 */

import {
  Account,
  Category,
  Transaction,
  DebtRecord,
  DebtPaymentHistory,
  CategoryBudget,
  SavingsGoal,
  RecurringExpense,
} from '../../types';
import { CURRENT_SCHEMA_VERSION } from './schemaMeta';

/**
 * Coerces any raw input safely into an integer Poisha value.
 * Never returns NaN or Infinity.
 */
export function toSafePoisha(val: any, fallback = 0): number {
  if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
    return Math.round(val);
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return fallback;
}

export function sanitizeAccount(raw: any, index = 0): Account {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `acc-fallback-${Date.now()}-${index}`,
      name: 'অ্যাকাউন্ট',
      type: 'CASH',
      opening_balance_poisha: 0,
      is_active: true,
      color: '#10B981',
      created_at: Date.now(),
      schema_version: CURRENT_SCHEMA_VERSION,
    };
  }

  const rawOpening = raw.opening_balance_poisha ?? raw.balance ?? 0;

  return {
    ...raw, // Lossless: preserves any future or custom properties
    id: String(raw.id || `acc-${Date.now()}-${index}`),
    name: String(raw.name || 'অ্যাকাউন্ট').trim(),
    type: raw.type || 'CASH',
    opening_balance_poisha: toSafePoisha(rawOpening, 0),
    account_number_suffix: raw.account_number_suffix ? String(raw.account_number_suffix) : undefined,
    is_active: raw.is_active !== false,
    color: raw.color || '#10B981',
    created_at: Number(raw.created_at) || Date.now(),
    updated_at: raw.updated_at ? Number(raw.updated_at) : Date.now(),
    schema_version: raw.schema_version || CURRENT_SCHEMA_VERSION,
  };
}

export function sanitizeCategory(raw: any, index = 0): Category {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `cat-fallback-${Date.now()}-${index}`,
      name: 'সাধারণ',
      type: 'EXPENSE',
      icon: 'Tag',
      color: '#6B7280',
      is_system_default: false,
      created_at: Date.now(),
      schema_version: CURRENT_SCHEMA_VERSION,
    };
  }

  return {
    ...raw, // Lossless preservation
    id: String(raw.id || `cat-${Date.now()}-${index}`),
    name: String(raw.name || 'ক্যাটাগরি').trim(),
    type: raw.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    icon: raw.icon || 'Tag',
    color: raw.color || '#6B7280',
    is_system_default: Boolean(raw.is_system_default),
    created_at: Number(raw.created_at) || Date.now(),
    updated_at: raw.updated_at ? Number(raw.updated_at) : Date.now(),
    schema_version: raw.schema_version || CURRENT_SCHEMA_VERSION,
  };
}

export function sanitizeTransaction(raw: any, index = 0): Transaction {
  if (!raw || typeof raw !== 'object') {
    const today = new Date().toISOString().split('T')[0];
    return {
      id: `tx-fallback-${Date.now()}-${index}`,
      type: 'EXPENSE',
      amount_poisha: 0,
      account_id: 'acc-cash',
      transfer_fee_poisha: 0,
      date: today,
      time: '12:00',
      created_at: Date.now(),
      schema_version: CURRENT_SCHEMA_VERSION,
    };
  }

  const rawAmount = raw.amount_poisha ?? raw.amount ?? 0;
  const rawFee = raw.transfer_fee_poisha ?? raw.fee ?? 0;
  const rawAccId = String(raw.account_id || '').trim();

  return {
    ...raw, // Lossless preservation
    id: String(raw.id || `tx-${Date.now()}-${index}`),
    type: raw.type === 'INCOME' || raw.type === 'TRANSFER' ? raw.type : 'EXPENSE',
    amount_poisha: Math.max(0, toSafePoisha(rawAmount, 0)),
    account_id: rawAccId && rawAccId !== 'default' ? rawAccId : 'acc-cash',
    to_account_id: raw.to_account_id ? String(raw.to_account_id) : undefined,
    transfer_fee_poisha: Math.max(0, toSafePoisha(rawFee, 0)),
    category_id: raw.category_id ? String(raw.category_id) : undefined,
    custom_category_name: raw.custom_category_name ? String(raw.custom_category_name).trim() : undefined,
    date: String(raw.date || new Date().toISOString().split('T')[0]),
    time: String(raw.time || '12:00'),
    note: raw.note !== undefined ? String(raw.note) : raw.notes !== undefined ? String(raw.notes) : undefined,
    created_at: Number(raw.created_at) || Date.now(),
    updated_at: raw.updated_at ? Number(raw.updated_at) : Date.now(),
    schema_version: raw.schema_version || CURRENT_SCHEMA_VERSION,
  };
}

export function sanitizeDebtRecord(raw: any, index = 0): DebtRecord {
  if (!raw || typeof raw !== 'object') {
    const today = new Date().toISOString().split('T')[0];
    return {
      id: `debt-fallback-${Date.now()}-${index}`,
      person_name: 'অজ্ঞাত',
      type: 'LENT',
      initial_amount_poisha: 0,
      account_id: 'acc-cash',
      status: 'ACTIVE',
      date: today,
      created_at: Date.now(),
      schema_version: CURRENT_SCHEMA_VERSION,
    };
  }

  const rawAmount = raw.initial_amount_poisha ?? raw.amount_poisha ?? raw.amount ?? 0;
  const phone = raw.phone || raw.person_phone;
  const notes = raw.notes !== undefined ? raw.notes : raw.note;
  const rawAccId = String(raw.account_id || '').trim();

  return {
    ...raw, // Lossless preservation
    id: String(raw.id || `debt-${Date.now()}-${index}`),
    person_name: String(raw.person_name || 'ব্যক্তি').trim(),
    phone: phone ? String(phone).trim() : undefined,
    type: raw.type === 'BORROWED' ? 'BORROWED' : 'LENT',
    initial_amount_poisha: Math.max(0, toSafePoisha(rawAmount, 0)),
    account_id: rawAccId && rawAccId !== 'default' ? rawAccId : 'acc-cash',
    due_date: raw.due_date ? String(raw.due_date) : undefined,
    status: raw.status === 'SETTLED' ? 'SETTLED' : 'ACTIVE',
    notes: notes !== undefined ? String(notes).trim() : undefined,
    date: String(raw.date || new Date().toISOString().split('T')[0]),
    created_at: Number(raw.created_at) || Date.now(),
    updated_at: raw.updated_at ? Number(raw.updated_at) : Date.now(),
    schema_version: raw.schema_version || CURRENT_SCHEMA_VERSION,
  };
}

export function sanitizeDebtPayment(raw: any, index = 0): DebtPaymentHistory {
  if (!raw || typeof raw !== 'object') {
    const today = new Date().toISOString().split('T')[0];
    return {
      id: `pay-fallback-${Date.now()}-${index}`,
      debt_id: '',
      amount_poisha: 0,
      account_id: 'acc-cash',
      payment_date: today,
      created_at: Date.now(),
      schema_version: CURRENT_SCHEMA_VERSION,
    };
  }

  const rawAmount = raw.amount_poisha ?? raw.amount ?? 0;
  const rawAccId = String(raw.account_id || '').trim();

  return {
    ...raw, // Lossless preservation
    id: String(raw.id || `pay-${Date.now()}-${index}`),
    debt_id: String(raw.debt_id || ''),
    amount_poisha: Math.max(0, toSafePoisha(rawAmount, 0)),
    account_id: rawAccId && rawAccId !== 'default' ? rawAccId : 'acc-cash',
    payment_date: String(raw.payment_date || new Date().toISOString().split('T')[0]),
    note: raw.note !== undefined ? String(raw.note).trim() : raw.notes !== undefined ? String(raw.notes).trim() : undefined,
    created_at: Number(raw.created_at) || Date.now(),
    updated_at: raw.updated_at ? Number(raw.updated_at) : Date.now(),
    schema_version: raw.schema_version || CURRENT_SCHEMA_VERSION,
  };
}

export function sanitizeBudget(raw: any): CategoryBudget {
  if (!raw || typeof raw !== 'object') {
    return {
      category_id: 'default',
      limit_poisha: 0,
      schema_version: CURRENT_SCHEMA_VERSION,
    };
  }

  const rawLimit = raw.limit_poisha ?? raw.limit ?? 0;

  return {
    ...raw, // Lossless preservation
    category_id: String(raw.category_id || ''),
    limit_poisha: Math.max(0, toSafePoisha(rawLimit, 0)),
    month: raw.month ? String(raw.month) : undefined,
    created_at: Number(raw.created_at) || Date.now(),
    updated_at: raw.updated_at ? Number(raw.updated_at) : Date.now(),
    schema_version: raw.schema_version || CURRENT_SCHEMA_VERSION,
  };
}

export function sanitizeSavingsGoal(raw: any, index = 0): SavingsGoal {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `goal-fallback-${Date.now()}-${index}`,
      title: 'নতুন লক্ষ্য',
      target_amount_poisha: 0,
      saved_amount_poisha: 0,
      color: '#0D9488',
      icon: 'Target',
      created_at: Date.now(),
      schema_version: CURRENT_SCHEMA_VERSION,
    };
  }

  const rawTarget = raw.target_amount_poisha ?? raw.target ?? 0;
  const rawSaved = raw.saved_amount_poisha ?? raw.saved ?? 0;

  return {
    ...raw, // Lossless preservation
    id: String(raw.id || `goal-${Date.now()}-${index}`),
    title: String(raw.title || 'লক্ষ্য').trim(),
    target_amount_poisha: Math.max(0, toSafePoisha(rawTarget, 0)),
    saved_amount_poisha: Math.max(0, toSafePoisha(rawSaved, 0)),
    target_date: raw.target_date ? String(raw.target_date) : undefined,
    color: raw.color || '#0D9488',
    icon: raw.icon || 'Target',
    note: raw.note ? String(raw.note) : undefined,
    created_at: Number(raw.created_at) || Date.now(),
    updated_at: raw.updated_at ? Number(raw.updated_at) : Date.now(),
    schema_version: raw.schema_version || CURRENT_SCHEMA_VERSION,
  };
}

export function sanitizeRecurringExpense(raw: any, index = 0): RecurringExpense {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `recurring-fallback-${Date.now()}-${index}`,
      title: 'নিয়মিত খরচ',
      amount_poisha: 0,
      account_id: 'default',
      category_id: 'default',
      day_of_month: 1,
      is_active: true,
      created_at: Date.now(),
      schema_version: CURRENT_SCHEMA_VERSION,
    };
  }

  const rawAmount = raw.amount_poisha ?? raw.amount ?? 0;
  const day = parseInt(String(raw.day_of_month), 10);

  return {
    ...raw, // Lossless preservation
    id: String(raw.id || `recurring-${Date.now()}-${index}`),
    title: String(raw.title || 'খরচ').trim(),
    amount_poisha: Math.max(0, toSafePoisha(rawAmount, 0)),
    account_id: String(raw.account_id || ''),
    category_id: String(raw.category_id || ''),
    day_of_month: !isNaN(day) && day >= 1 && day <= 31 ? day : 1,
    note: raw.note ? String(raw.note) : undefined,
    is_active: raw.is_active !== false,
    last_processed_month: raw.last_processed_month ? String(raw.last_processed_month) : undefined,
    created_at: Number(raw.created_at) || Date.now(),
    updated_at: raw.updated_at ? Number(raw.updated_at) : Date.now(),
    schema_version: raw.schema_version || CURRENT_SCHEMA_VERSION,
  };
}
