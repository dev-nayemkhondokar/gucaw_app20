/**
 * Agentic AI Types & Interfaces
 * 
 * Supports three core permission tiers:
 * 1. Read: View authorized data
 * 2. Suggest: Provide recommendations without mutating data
 * 3. Action: Propose data changes that REQUIRE explicit user confirmation
 */

export interface AIPermissions {
  // 1. Finance Data
  financeData: boolean;    // Finance Data → Read (view accounts, transactions, debts, budgets)
  financeAction: boolean;  // Finance Data → Action (propose or record transactions)

  // 2. Notes
  notes: boolean;          // Notes → Read (view transaction notes and personal memos)
  notesAction: boolean;    // Notes → Action (propose or add notes)

  // 3. Contacts
  contacts: boolean;       // Contacts → Read (view names/phones of debt persons)
  contactsAction: boolean; // Contacts → Action (propose adding or modifying debtor/creditor entries)

  // 4. Calendar
  calendar: boolean;       // Calendar → Read (view due dates and scheduled recurring events)
  calendarAction: boolean; // Calendar → Action (propose due dates or recurring reminder schedules)
}

export const DEFAULT_AI_PERMISSIONS: AIPermissions = {
  financeData: true,    // Finance Data → Read: Enabled by default for seamless conversational assistance
  financeAction: true,  // Finance Data → Action: Enabled for transaction proposals (still requires user confirmation)
  notes: true,          // Notes → Read: Enabled for memo assistance
  notesAction: false,   // Notes → Action: Off by default
  contacts: false,      // Contacts → Read: Off by default for privacy
  contactsAction: false,// Contacts → Action: Off by default
  calendar: false,      // Calendar → Read: Off by default for privacy
  calendarAction: false,// Calendar → Action: Off by default
};

export type AgentActionTier = 'READ' | 'SUGGEST' | 'ACTION';

export interface ProposedTransactionAction {
  id: string;
  type: 'EXPENSE' | 'INCOME';
  amount_poisha: number;
  category_id: string;
  account_id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string;
  status: 'PROPOSED' | 'CONFIRMED' | 'REJECTED';
}

export interface FinancialAnalysisData {
  currentMonthExpensePoisha: number;
  lastMonthExpensePoisha: number;
  expenseDifferencePoisha: number;
  expenseDifferencePercent: number;
  topCategories: Array<{
    name: string;
    amountPoisha: number;
    percentage: number;
    color: string;
  }>;
  savingsRatePercent: number;
  recommendations: string[];
}

export interface ChatHistoryItem {
  sender: 'user' | 'assistant';
  text: string;
  timestamp?: number;
}

export interface AgentMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  actionTier: AgentActionTier;
  requiredPermission?: keyof AIPermissions;
  isPermissionDenied?: boolean;
  proposedAction?: ProposedTransactionAction;
  analysisData?: FinancialAnalysisData;
  suggestedQuestions?: string[];
  source?: 'gemini' | 'engine';
}

