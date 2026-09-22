/**
 * Default Seed Data Tailored for Bangladesh Users
 */

import { Account, Category } from '../types';

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-cash',
    name: 'ক্যাশ টাকা (Wallet)',
    type: 'CASH',
    opening_balance_poisha: 0, // 0 ৳
    is_active: true,
    color: '#10B981', // Emerald green
    created_at: Date.now() - 100000,
  },
  {
    id: 'acc-bkash',
    name: 'বিকাশ (bKash)',
    type: 'BKASH',
    opening_balance_poisha: 0, // 0 ৳
    is_active: true,
    color: '#E2136E', // bKash Pink
    created_at: Date.now() - 90000,
  },
  {
    id: 'acc-nagad',
    name: 'নগদ (Nagad)',
    type: 'NAGAD',
    opening_balance_poisha: 0, // 0 ৳
    is_active: true,
    color: '#F7941D', // Nagad Orange
    created_at: Date.now() - 80000,
  },
  {
    id: 'acc-bank',
    name: 'ব্যাংক অ্যাকাউন্ট',
    type: 'BANK',
    opening_balance_poisha: 0, // 0 ৳
    is_active: true,
    color: '#1E40AF', // Blue
    created_at: Date.now() - 70000,
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Expenses (ব্যয়) - সব প্রচলিত ক্যাটাগরি
  {
    id: 'cat-food',
    name: 'খাবার ও নাস্তা',
    type: 'EXPENSE',
    icon: 'Utensils',
    color: '#F59E0B',
    is_system_default: true,
    created_at: Date.now() - 60000,
  },
  {
    id: 'cat-rent',
    name: 'বাসাভাড়া',
    type: 'EXPENSE',
    icon: 'Home',
    color: '#6366F1',
    is_system_default: true,
    created_at: Date.now() - 59000,
  },
  {
    id: 'cat-transport',
    name: 'যাতায়াত ও ভাড়া',
    type: 'EXPENSE',
    icon: 'Car',
    color: '#3B82F6',
    is_system_default: true,
    created_at: Date.now() - 58000,
  },
  {
    id: 'cat-bills',
    name: 'বিল ও ইউটিলিটি',
    type: 'EXPENSE',
    icon: 'Zap',
    color: '#EAB308',
    is_system_default: true,
    created_at: Date.now() - 57500,
  },
  {
    id: 'cat-shopping',
    name: 'পোশাক ও শপিং',
    type: 'EXPENSE',
    icon: 'ShoppingBag',
    color: '#EC4899',
    is_system_default: true,
    created_at: Date.now() - 57000,
  },
  {
    id: 'cat-health',
    name: 'চিকিৎসা ও ওষুধ',
    type: 'EXPENSE',
    icon: 'HeartPulse',
    color: '#EF4444',
    is_system_default: true,
    created_at: Date.now() - 56000,
  },
  {
    id: 'cat-education',
    name: 'শিক্ষা ও পড়াশোনা',
    type: 'EXPENSE',
    icon: 'GraduationCap',
    color: '#8B5CF6',
    is_system_default: true,
    created_at: Date.now() - 55500,
  },
  {
    id: 'cat-entertainment',
    name: 'বিনোদন ও ভ্রমণ',
    type: 'EXPENSE',
    icon: 'Film',
    color: '#06B6D4',
    is_system_default: true,
    created_at: Date.now() - 55000,
  },
  {
    id: 'cat-grocery',
    name: 'বাজার-সদাই',
    type: 'EXPENSE',
    icon: 'ShoppingCart',
    color: '#10B981',
    is_system_default: true,
    created_at: Date.now() - 54500,
  },
  {
    id: 'cat-mobile',
    name: 'মোবাইল রিচার্জ ও নেট',
    type: 'EXPENSE',
    icon: 'Smartphone',
    color: '#A855F7',
    is_system_default: true,
    created_at: Date.now() - 54000,
  },
  {
    id: 'cat-family',
    name: 'পরিবার ও উপহার',
    type: 'EXPENSE',
    icon: 'Users',
    color: '#14B8A6',
    is_system_default: true,
    created_at: Date.now() - 53000,
  },
  {
    id: 'cat-other',
    name: 'অন্যান্য খরচ',
    type: 'EXPENSE',
    icon: 'Tag',
    color: '#64748B',
    is_system_default: true,
    created_at: Date.now() - 52500,
  },

  // Incomes (আয়)
  {
    id: 'cat-salary',
    name: 'মাসিক বেতন',
    type: 'INCOME',
    icon: 'Banknote',
    color: '#10B981',
    is_system_default: true,
    created_at: Date.now() - 52000,
  },
  {
    id: 'cat-business',
    name: 'ব্যবসা ও লাভ',
    type: 'INCOME',
    icon: 'Briefcase',
    color: '#06B6D4',
    is_system_default: true,
    created_at: Date.now() - 51000,
  },
  {
    id: 'cat-freelance',
    name: 'ফ্রিল্যান্সিং / প্রজেক্ট',
    type: 'INCOME',
    icon: 'Laptop',
    color: '#8B5CF6',
    is_system_default: true,
    created_at: Date.now() - 50000,
  },
  {
    id: 'cat-investment',
    name: 'বিনিয়োগ / মুনাফা',
    type: 'INCOME',
    icon: 'TrendingUp',
    color: '#F59E0B',
    is_system_default: true,
    created_at: Date.now() - 49000,
  },
  {
    id: 'cat-gift-income',
    name: 'উপহার ও অনুদান',
    type: 'INCOME',
    icon: 'Gift',
    color: '#EC4899',
    is_system_default: true,
    created_at: Date.now() - 48000,
  },
  {
    id: 'cat-income-other',
    name: 'অন্যান্য',
    type: 'INCOME',
    icon: 'Tag',
    color: '#64748B',
    is_system_default: true,
    created_at: Date.now() - 47000,
  },
];

export const DEFAULT_BUDGETS: import('../types').CategoryBudget[] = [];

export const DEFAULT_SAVINGS_GOALS: import('../types').SavingsGoal[] = [];

export const DEFAULT_RECURRING_EXPENSES: import('../types').RecurringExpense[] = [];

export const DEFAULT_DEBTS: import('../types').DebtRecord[] = [];

export const DEFAULT_TRANSACTIONS: import('../types').Transaction[] = [];

