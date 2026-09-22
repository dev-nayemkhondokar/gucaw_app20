import { BackupValidationResult, Transaction } from '../types';

export function validateBackupPayload(
  rawContent: string,
  existingTransactions: Transaction[] = []
): BackupValidationResult {
  const defaultResult: BackupValidationResult = {
    isValid: false,
    errorMessage: undefined,
    fileVersion: undefined,
    schemaVersion: undefined,
    counts: {
      accounts: 0,
      transactions: 0,
      categories: 0,
      debts: 0,
      debtPayments: 0,
      budgets: 0,
      savingsGoals: 0,
      recurringExpenses: 0,
      reminders: 0,
    },
    integrityStatus: 'CORRUPTED',
    integrityIssues: [],
    duplicateCount: 0,
    checksum: '',
    parsedData: null,
  };

  if (!rawContent || typeof rawContent !== 'string') {
    return {
      ...defaultResult,
      errorMessage: 'ফাইলটি খালি বা পড়া সম্ভব হয়নি (File is empty).',
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err: any) {
    return {
      ...defaultResult,
      errorMessage: 'ফাইলটি সঠিক JSON ফরম্যাটে নেই (Invalid JSON syntax).',
      integrityIssues: ['JSON Parse Error: ' + err.message],
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ...defaultResult,
      errorMessage: 'ব্যাকআপ ফাইলের গঠন সঠিক নয় (Invalid root structure).',
    };
  }

  // Handle root or nested data
  const data = parsed.data || parsed;
  const issues: string[] = [];

  // Check essential collections
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const debts = Array.isArray(data.debts) ? data.debts : [];
  const debtPayments = Array.isArray(data.debt_payments) ? data.debt_payments : [];
  const budgets = Array.isArray(data.budgets) ? data.budgets : [];
  const savingsGoals = Array.isArray(data.savings_goals) ? data.savings_goals : [];
  const recurringExpenses = Array.isArray(data.recurring_expenses) ? data.recurring_expenses : [];
  const reminders = Array.isArray(data.reminders) ? data.reminders : [];

  if (accounts.length === 0 && transactions.length === 0) {
    return {
      ...defaultResult,
      errorMessage: 'ব্যাকআপ ফাইলে কোনো অ্যাকাউন্ট বা লেনদেনের তথ্য পাওয়া যায়নি।',
      integrityIssues: ['Empty collections: accounts and transactions both missing or empty.'],
    };
  }

  // Check integrity of transactions
  let invalidTxAmountCount = 0;
  let invalidDateCount = 0;
  for (const tx of transactions) {
    if (typeof tx.amount_poisha !== 'number' || isNaN(tx.amount_poisha) || tx.amount_poisha < 0) {
      invalidTxAmountCount++;
    }
    if (!tx.date || typeof tx.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
      invalidDateCount++;
    }
  }

  if (invalidTxAmountCount > 0) {
    issues.push(`${invalidTxAmountCount}টি লেনদেনে টাকার পরিমাণ সঠিক নয়।`);
  }
  if (invalidDateCount > 0) {
    issues.push(`${invalidDateCount}টি লেনদেনের তারিখ ফরম্যাট সঠিক নয়।`);
  }

  // Duplicate Check against existing transactions
  const existingSigSet = new Set<string>();
  existingTransactions.forEach((tx) => {
    const sig = `${tx.date}_${tx.type}_${tx.amount_poisha}_${tx.account_id}_${tx.note || ''}`;
    existingSigSet.add(sig);
    if (tx.id) existingSigSet.add(`id_${tx.id}`);
  });

  let duplicateCount = 0;
  for (const tx of transactions) {
    const sig = `${tx.date}_${tx.type}_${tx.amount_poisha}_${tx.account_id}_${tx.note || ''}`;
    if (existingSigSet.has(sig) || (tx.id && existingSigSet.has(`id_${tx.id}`))) {
      duplicateCount++;
    }
  }

  // Generate lightweight checksum string based on transaction signatures
  let hashVal = 0;
  for (let i = 0; i < rawContent.length; i++) {
    hashVal = (hashVal << 5) - hashVal + rawContent.charCodeAt(i);
    hashVal |= 0;
  }
  const checksum = Math.abs(hashVal).toString(16).toUpperCase();

  const integrityStatus: BackupValidationResult['integrityStatus'] =
    issues.length === 0 ? 'EXCELLENT' : issues.length < 5 ? 'WARNING' : 'CORRUPTED';

  return {
    isValid: true,
    fileVersion: parsed.app_version || '1.0.0',
    schemaVersion: parsed.schema_version || 1,
    counts: {
      accounts: accounts.length,
      transactions: transactions.length,
      categories: categories.length,
      debts: debts.length,
      debtPayments: debtPayments.length,
      budgets: budgets.length,
      savingsGoals: savingsGoals.length,
      recurringExpenses: recurringExpenses.length,
      reminders: reminders.length,
    },
    integrityStatus,
    integrityIssues: issues,
    duplicateCount,
    checksum,
    parsedData: data,
  };
}
