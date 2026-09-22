import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  Trash2,
  RefreshCw,
} from 'lucide-react';
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
  TransactionType,
} from '../types';
import { storageService } from '../services/storageService';
import {
  AIPermissions,
  AgentMessage,
  ProposedTransactionAction,
} from '../services/agenticAI/types';
import { processAgentQuery, queryAIAssistant } from '../services/agenticAI/agenticEngine';
import { GochaoAIIcon, GochaoAIAssistantBadge } from './GochaoLogo';
import { useLanguage } from '../contexts/LanguageContext';

interface AIAssistantViewProps {
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
  selectedMonth: string;
  onAddTransaction: (data: {
    type: TransactionType;
    amount_poisha: number;
    account_id: string;
    to_account_id?: string;
    transfer_fee_poisha: number;
    category_id?: string;
    date: string;
    time: string;
    note?: string;
  }) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
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
  onAddTransaction,
}) => {
  const { language, formatTaka, formatNumber, getCategoryName, getAccountName } = useLanguage();

  // 1. AI Permissions State (Default strictly OFF)
  const [permissions, setPermissions] = useState<AIPermissions>(() =>
    storageService.getAIPermissions()
  );
  const [showPermissionsPanel, setShowPermissionsPanel] = useState<boolean>(false);

  // 2. Chat Messages State
  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    const saved = storageService.getAIChatHistory();
    if (saved && saved.length > 0) return saved;

    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text:
          language === 'bn'
            ? 'আসসালামু আলাইকুম! আমি আপনার গোছাও পার্সোনাল এআই সহকারী।\n\nআপনি বাংলা, বাংলিশ (Bangla in English letters) কিংবা ইংরেজি—যেভাবেই লিখুন না কেন আমি স্বাচ্ছন্দ্যে বুঝতে পারি। আপনার হিসাবের তথ্য জানতে প্রশ্ন করতে পারেন অথবা মুখে বলে বা লিখে সরাসরি লেনদেন রেকর্ড করার প্রস্তাব পেতে পারেন।\n\nনিচের যেকোনো প্রশ্নে চাপ দিন বা নিজের ভাষায় লিখুন:'
            : 'Hello! I am your Gochao Personal AI Assistant.\n\nYou can talk or write in English, Bangla, or Banglish. Ask any questions about your finances, budgets, and accounts, or speak to record income and expenses directly.\n\nTap any suggested question below or type your own:',
        timestamp: Date.now(),
        actionTier: 'READ',
        suggestedQuestions:
          language === 'bn'
            ? [
                'amar income koto?',
                'ei mashe koto khoroc hoise?',
                'amar budget koto baki?',
                'ajke 200 taka expense add koro',
                '500 taka save korlam',
                'last transaction ta dekhao',
                'বিকাশে এখন কত টাকা আছে?',
                'আমার financial situation কেমন?',
              ]
            : [
                'What is my total income?',
                'How much did I spend this month?',
                'What is my remaining budget?',
                'Add 200 taka expense for food',
                'Saved 500 taka in bKash',
                'Show recent transactions',
                'How much balance in bKash?',
                'Analyze my financial situation',
              ],
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 3. Voice Input (SpeechRecognition) State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // 4. Action Editing Modal State
  const [editingAction, setEditingAction] = useState<{
    messageId: string;
    action: ProposedTransactionAction;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isListening]);

  // Persist permissions changes
  const handleTogglePermission = (key: keyof AIPermissions) => {
    const updated = { ...permissions, [key]: !permissions[key] };
    setPermissions(updated);
    storageService.saveAIPermissions(updated);
  };

  // Persist messages changes
  useEffect(() => {
    storageService.saveAIChatHistory(messages);
  }, [messages]);

  // Voice Input Handler using Web Speech API
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setVoiceError(null);
    setVoiceTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        'আপনার ব্রাউজারে সরাসরি ভয়েস রিকগনিশন সমর্থিত নয়। আপনি নিচে টাইপ করতে পারেন অথবা ক্রোম বা অ্যান্ড্রয়েড ব্রাউজার ব্যবহার করুন।'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD'; // Bengali (Bangladesh)
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);

        // If finalized, submit to agent
        if (event.results[0].isFinal) {
          handleSendMessage(transcript);
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceError('মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজার সেটিংসে গিয়ে মাইক্রোফোন অন করুন।');
        } else if (event.error !== 'no-speech') {
          setVoiceError(`ভয়েস রিকগনিশন ত্রুটি: ${event.error}। অনুগ্রহ করে আবার চেষ্টা করুন বা টাইপ করুন।`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition', err);
      setVoiceError('মাইক্রোফোন চালু করা যায়নি। অনুগ্রহ করে টাইপ করে প্রশ্ন বা কমান্ড লিখুন।');
      setIsListening(false);
    }
  };

  // Handle Query Submission
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text) return;

    // Add user message
    const userMsg: AgentMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
      actionTier: 'READ',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setVoiceTranscript('');
    setIsProcessing(true);

    const historySnapshot = [...messages, userMsg].map((m) => ({
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
    }));

    try {
      const reply = await queryAIAssistant(text, {
        permissions,
        transactions,
        categories,
        accounts,
        debts,
        debtPayments,
        budgets,
        savingsGoals,
        recurringExpenses,
        accountBalances,
        summary,
        selectedMonth,
        chatHistory: historySnapshot,
      });

      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      console.error('Error querying AI assistant:', err);
      const fallbackReply = processAgentQuery(text, {
        permissions,
        transactions,
        categories,
        accounts,
        debts,
        debtPayments,
        budgets,
        savingsGoals,
        recurringExpenses,
        accountBalances,
        summary,
        selectedMonth,
        chatHistory: historySnapshot,
      });
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and Execute an Action Proposal
  const handleConfirmAction = (messageId: string, action: ProposedTransactionAction) => {
    // 1. Call onAddTransaction to update app state and persistence
    onAddTransaction({
      type: action.type,
      amount_poisha: action.amount_poisha,
      account_id: action.account_id,
      category_id: action.category_id,
      transfer_fee_poisha: 0,
      date: action.date,
      time: action.time,
      note: action.note,
    });

    // 2. Update message status to CONFIRMED
    const updatedMessages = messages.map((msg) => {
      if (msg.id === messageId && msg.proposedAction) {
        return {
          ...msg,
          proposedAction: {
            ...msg.proposedAction,
            status: 'CONFIRMED' as const,
          },
        };
      }
      return msg;
    });

    // 3. Add confirmation acknowledgement message
    const cat = categories.find((c) => c.id === action.category_id);
    const acc = accounts.find((a) => a.id === action.account_id);
    const catName = cat ? getCategoryName(cat.name) : (language === 'bn' ? 'সাধারণ' : 'General');
    const accName = acc ? getAccountName(acc.name) : (language === 'bn' ? 'ক্যাশ' : 'Cash');
    const ackMsg: AgentMessage = {
      id: `ack-${Date.now()}`,
      sender: 'assistant',
      text:
        language === 'bn'
          ? `✅ লেনদেন সফলভাবে যুক্ত করা হয়েছে!\n\n• পরিমাণ: ${formatTaka(action.amount_poisha)}\n• ক্যাটাগরি: ${catName}\n• অ্যাকাউন্ট: ${accName}\n• তারিখ: ${action.date}\n\nআপনার মোট ব্যালেন্স ও রিপোর্ট স্বয়ংক্রিয়ভাবে আপডেট হয়ে গেছে।`
          : `✅ Transaction added successfully!\n\n• Amount: ${formatTaka(action.amount_poisha)}\n• Category: ${catName}\n• Account: ${accName}\n• Date: ${action.date}\n\nYour total balance and reports have been automatically updated.`,
      timestamp: Date.now(),
      actionTier: 'ACTION',
      suggestedQuestions:
        language === 'bn'
          ? [
              'এই মাসে আমার মোট খরচ কত?',
              'সবচেয়ে বেশি খরচ কোন category-তে?',
              'আমার financial situation কেমন?',
            ]
          : [
              'How much did I spend this month?',
              'Which category has the highest expense?',
              'Analyze my financial situation',
            ],
    };

    setMessages([...updatedMessages, ackMsg]);
  };

  // Reject an Action Proposal
  const handleRejectAction = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.proposedAction) {
          return {
            ...msg,
            proposedAction: {
              ...msg.proposedAction,
              status: 'REJECTED' as const,
            },
          };
        }
        return msg;
      })
    );
  };

  // Save changes from Edit Action Modal
  const handleSaveEditedAction = () => {
    if (!editingAction) return;

    const { messageId, action } = editingAction;
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            proposedAction: { ...action },
          };
        }
        return msg;
      })
    );

    setEditingAction(null);
  };

  // Clear Chat History
  const handleClearChat = () => {
    const defaultWelcome: AgentMessage = {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text:
        language === 'bn'
          ? 'চ্যাট হিস্ট্রি মুছে ফেলা হয়েছে। আপনি নতুন কোনো প্রশ্ন করতে পারেন বা কথা বলে হিসাব যুক্ত করতে পারেন।'
          : 'Chat history cleared. You can ask any new question or speak to record financial entries.',
      timestamp: Date.now(),
      actionTier: 'READ',
      suggestedQuestions:
        language === 'bn'
          ? [
              'এই মাসে আমার মোট খরচ কত?',
              'সবচেয়ে বেশি খরচ কোন category-তে?',
              'আমার financial situation কেমন?',
            ]
          : [
              'How much did I spend this month?',
              'Which category has the highest expense?',
              'Analyze my financial situation',
            ],
    };
    setMessages([defaultWelcome]);
    storageService.saveAIChatHistory([defaultWelcome]);
  };

  const activePermissionsCount = Object.values(permissions).filter(Boolean).length;

  const getPermissionLabel = (key: keyof AIPermissions): string => {
    const map: Record<keyof AIPermissions, string> = {
      financeData: 'Finance Data → Read',
      financeAction: 'Finance Data → Action',
      notes: 'Notes → Read',
      notesAction: 'Notes → Action',
      contacts: 'Contacts → Read',
      contactsAction: 'Contacts → Action',
      calendar: 'Calendar → Read',
      calendarAction: 'Calendar → Action',
    };
    return map[key] || key;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-145px)] max-w-lg mx-auto bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs relative">
      {/* 1. Header & AI Permission Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          {/* Distinctive Gochao AI Assistant Icon */}
          <div className="w-8.5 h-8.5 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-2xs shrink-0">
            <GochaoAIIcon className="w-4.5 h-4.5 text-white" color="#FFFFFF" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
              {language === 'bn' ? 'AI সহকারী' : 'AI Assistant'}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60">
                Agentic AI
              </span>
            </h2>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
              {language === 'bn' ? 'আপনার টাকার হিসাব, আমি বুঝি' : 'I understand your money'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Permission Drawer Toggle Button */}
          <button
            id="ai-permission-toggle-btn"
            onClick={() => setShowPermissionsPanel(!showPermissionsPanel)}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer ${
              activePermissionsCount > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            }`}
            title={language === 'bn' ? 'ডেটা এক্সেস পারমিশন সেটিংস' : 'Data access permission settings'}
          >
            {activePermissionsCount > 0 ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span>
              {language === 'bn'
                ? `অনুমতি: ${formatNumber(activePermissionsCount)}/৮`
                : `Permissions: ${activePermissionsCount}/8`}
            </span>
            {showPermissionsPanel ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {/* Clear Chat Button */}
          <button
            onClick={handleClearChat}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={language === 'bn' ? 'চ্যাট হিস্ট্রি পরিষ্কার করুন' : 'Clear chat history'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Collapsible Data Permissions Panel (All 8 permissions clearly visible & controllable) */}
      {showPermissionsPanel && (
        <div
          id="ai-permissions-panel"
          className="bg-emerald-50/70 dark:bg-slate-900/95 border-b border-emerald-100 dark:border-slate-800 px-3.5 py-3 text-xs max-h-[380px] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-emerald-200/60 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              {language === 'bn'
                ? `AI পারমিশন নিয়ন্ত্রণ (মোট ${formatNumber(8)}টি অপশন)`
                : 'AI Permissions Control (8 options total)'}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {language === 'bn'
                ? `অনুমতি: ${formatNumber(activePermissionsCount)}/৮`
                : `Permissions: ${activePermissionsCount}/8`}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2.5 leading-relaxed">
            {language === 'bn'
              ? 'আপনার ব্যক্তিগত তথ্যের সর্বোচ্চ সুরক্ষার জন্য আপনার সুস্পষ্ট অনুমতি ছাড়া AI কোনো ডেটা পড়ে না বা পরিবর্তন করে না। প্রতিটি অপশন আলাদাভাবে নিয়ন্ত্রণ করুন:'
              : 'For your maximum privacy and data security, AI never reads or modifies your data without your explicit permission. Control each option independently:'}
          </p>

          <div className="space-y-2.5">
            {/* Group 1: Finance Data */}
            <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-2">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {language === 'bn' ? 'Finance Data (আর্থিক হিসাব)' : 'Finance Data (Financial Records)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Finance Data -> Read */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                        Finance Data → Read
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-semibold shrink-0">
                        Read
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'লেনদেন, ব্যালেন্স ও বাজেট দেখার অনুমতি'
                        : 'Permission to view transactions, balances, and budgets'}
                    </p>
                  </div>
                  <button
                    id="toggle-perm-finance-read"
                    type="button"
                    onClick={() => handleTogglePermission('financeData')}
                    aria-label="Finance Data Read permission toggle"
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      permissions.financeData ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                        permissions.financeData ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Finance Data -> Action */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                        Finance Data → Action
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-semibold shrink-0">
                        Action
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'নতুন লেনদেন প্রস্তাব ও রেকর্ড করার অনুমতি'
                        : 'Permission to propose and record transactions'}
                    </p>
                  </div>
                  <button
                    id="toggle-perm-finance-action"
                    type="button"
                    onClick={() => handleTogglePermission('financeAction')}
                    aria-label="Finance Data Action permission toggle"
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      permissions.financeAction ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                        permissions.financeAction ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Group 2: Notes */}
            <div className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-2">
                <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {language === 'bn' ? 'Notes (নোট ও মেমো)' : 'Notes (Notes & Memos)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Notes -> Read */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                        Notes → Read
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-semibold shrink-0">
                        Read
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'লেনদেনের নোট ও ব্যক্তিগত মেমো পড়ার অনুমতি'
                        : 'Permission to read transaction notes and memos'}
                    </p>
                  </div>
                  <button
                    id="toggle-perm-notes-read"
                    type="button"
                    onClick={() => handleTogglePermission('notes')}
                    aria-label="Notes Read permission toggle"
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      permissions.notes ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                        permissions.notes ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Notes -> Action */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                        Notes → Action
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-semibold shrink-0">
                        Action
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'লেনদেনের সাথে নোট লেখা বা পরিবর্তনের অনুমতি'
                        : 'Permission to write or edit notes on transactions'}
                    </p>
                  </div>
                  <button
                    id="toggle-perm-notes-action"
                    type="button"
                    onClick={() => handleTogglePermission('notesAction')}
                    aria-label="Notes Action permission toggle"
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      permissions.notesAction ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                        permissions.notesAction ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Group 3: Contacts */}
            <div className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {language === 'bn' ? 'Contacts (যোগাযোগ ও ব্যক্তি)' : 'Contacts (People & Debtors)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Contacts -> Read */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                        Contacts → Read
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-semibold shrink-0">
                        Read
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'দেনা-পাওনাদারদের নাম ও হিসাব দেখার অনুমতি'
                        : 'Permission to view debt records and contacts'}
                    </p>
                  </div>
                  <button
                    id="toggle-perm-contacts-read"
                    type="button"
                    onClick={() => handleTogglePermission('contacts')}
                    aria-label="Contacts Read permission toggle"
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      permissions.contacts ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                        permissions.contacts ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Contacts -> Action */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                        Contacts → Action
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-semibold shrink-0">
                        Action
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'নতুন ব্যক্তি বা দেনার রেকর্ড তৈরির প্রস্তাব'
                        : 'Permission to propose new contacts and debt records'}
                    </p>
                  </div>
                  <button
                    id="toggle-perm-contacts-action"
                    type="button"
                    onClick={() => handleTogglePermission('contactsAction')}
                    aria-label="Contacts Action permission toggle"
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      permissions.contactsAction ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                        permissions.contactsAction ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Group 4: Calendar */}
            <div className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-2">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {language === 'bn' ? 'Calendar (ক্যালেন্ডার ও তারিখ)' : 'Calendar (Dates & Schedules)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Calendar -> Read */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                        Calendar → Read
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-semibold shrink-0">
                        Read
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'বিল ও কিস্তির নির্ধারিত তারিখ দেখার অনুমতি'
                        : 'Permission to view due dates for bills and installments'}
                    </p>
                  </div>
                  <button
                    id="toggle-perm-calendar-read"
                    type="button"
                    onClick={() => handleTogglePermission('calendar')}
                    aria-label="Calendar Read permission toggle"
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      permissions.calendar ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                        permissions.calendar ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Calendar -> Action */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                        Calendar → Action
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-semibold shrink-0">
                        Action
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'নতুন রিমাইন্ডার ও কিস্তির শিডিউল নির্ধারণের প্রস্তাব'
                        : 'Permission to propose reminders and installment schedules'}
                    </p>
                  </div>
                  <button
                    id="toggle-perm-calendar-action"
                    type="button"
                    onClick={() => handleTogglePermission('calendarAction')}
                    aria-label="Calendar Action permission toggle"
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      permissions.calendarAction ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                        permissions.calendarAction ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Messages Chat Feed */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-tr-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-xs'
                }`}
              >
                {/* Agent Action Tier Badge */}
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {msg.actionTier === 'READ' && (
                      <span className="flex items-center gap-1 text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/70 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/60">
                        <span>👁️</span> {language === 'bn' ? 'তথ্য নিরীক্ষণ (Read)' : 'Insight & Analysis (Read)'}
                      </span>
                    )}
                    {msg.actionTier === 'SUGGEST' && (
                      <span className="flex items-center gap-1 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                        <Lightbulb className="w-3.5 h-3.5" /> {language === 'bn' ? 'বিশ্লেষণ ও পরামর্শ (Suggest)' : 'Suggestion & Advice (Suggest)'}
                      </span>
                    )}
                    {msg.actionTier === 'ACTION' && (
                      <span className="flex items-center gap-1 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/60">
                        <span>⚡</span> {language === 'bn' ? 'লেনদেন প্রস্তাব (Action Proposal)' : 'Action Proposal'}
                      </span>
                    )}
                  </div>
                )}

                {/* Message Text with preserved line breaks */}
                <div className="whitespace-pre-line text-xs font-medium leading-relaxed">{msg.text}</div>

                {/* If Permission is Denied: Provide 1-Click Enable Button */}
                {msg.isPermissionDenied && msg.requiredPermission && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleTogglePermission(msg.requiredPermission!)}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {language === 'bn'
                        ? `অনুমতি দিন (${getPermissionLabel(msg.requiredPermission)})`
                        : `Grant Permission (${getPermissionLabel(msg.requiredPermission)})`}
                    </button>
                  </div>
                )}

                {/* If Action Proposed: Interactive Confirmation Card */}
                {msg.proposedAction && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {language === 'bn' ? 'নিশ্চিতকরণ প্রয়োজন' : 'Confirmation Required'}
                      </span>
                      {msg.proposedAction.status === 'PROPOSED' && (
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-bold">
                          {language === 'bn' ? 'অপেক্ষমান' : 'Pending'}
                        </span>
                      )}
                      {msg.proposedAction.status === 'CONFIRMED' && (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {language === 'bn' ? 'সংরক্ষিত' : 'Saved'}
                        </span>
                      )}
                      {msg.proposedAction.status === 'REJECTED' && (
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> {language === 'bn' ? 'বাতিল' : 'Rejected'}
                        </span>
                      )}
                    </div>

                    {/* Preview Table */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 mb-3">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs block font-medium">
                          {language === 'bn' ? 'পরিমাণ' : 'Amount'}
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {formatTaka(msg.proposedAction.amount_poisha)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs block font-medium">
                          {language === 'bn' ? 'ধরন' : 'Type'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {msg.proposedAction.type === 'EXPENSE'
                            ? (language === 'bn' ? 'ব্যয় (Expense)' : 'Expense')
                            : (language === 'bn' ? 'আয় (Income)' : 'Income')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs block font-medium">
                          {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {(() => {
                            const foundCat = categories.find((c) => c.id === msg.proposedAction!.category_id);
                            return foundCat ? getCategoryName(foundCat.name) : (language === 'bn' ? 'সাধারণ' : 'General');
                          })()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs block font-medium">
                          {language === 'bn' ? 'অ্যাকাউন্ট' : 'Account'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {(() => {
                            const foundAcc = accounts.find((a) => a.id === msg.proposedAction!.account_id);
                            return foundAcc ? getAccountName(foundAcc.name) : (language === 'bn' ? 'ক্যাশ' : 'Cash');
                          })()}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 dark:text-slate-400 text-xs block font-medium">
                          {language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time'}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {msg.proposedAction.date} ({msg.proposedAction.time})
                        </span>
                      </div>
                      {msg.proposedAction.note && (
                        <div className="col-span-2">
                          <span className="text-slate-500 dark:text-slate-400 text-xs block font-medium">
                            {language === 'bn' ? 'নোট' : 'Note'}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {msg.proposedAction.note}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Execution Buttons */}
                    {msg.proposedAction.status === 'PROPOSED' ? (
                      <div className="flex items-center gap-2">
                        <button
                          id="confirm-action-btn"
                          onClick={() => handleConfirmAction(msg.id, msg.proposedAction!)}
                          className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm'}
                        </button>
                        <button
                          id="edit-action-btn"
                          onClick={() =>
                            setEditingAction({
                              messageId: msg.id,
                              action: { ...msg.proposedAction! },
                            })
                          }
                          className="py-1.5 px-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-[0.98] text-slate-700 dark:text-slate-200 font-semibold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                          title={language === 'bn' ? 'তথ্য সম্পাদনা করুন' : 'Edit details'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                        </button>
                        <button
                          id="reject-action-btn"
                          onClick={() => handleRejectAction(msg.id)}
                          className="py-1.5 px-2.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 active:scale-[0.98] text-rose-600 dark:text-rose-400 font-semibold rounded-xl flex items-center gap-1 transition-all border border-rose-200 dark:border-rose-900 cursor-pointer"
                          title={language === 'bn' ? 'বাতিল করুন' : 'Reject'}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {language === 'bn' ? 'বাতিল' : 'Reject'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-slate-500 dark:text-slate-400 italic">
                        {msg.proposedAction.status === 'CONFIRMED'
                          ? (language === 'bn'
                              ? '✓ ব্যবহারকারীর অনুমোদনে এই লেনদেনটি সেভ করা হয়েছে।'
                              : '✓ This transaction was saved with your approval.')
                          : (language === 'bn'
                              ? '✗ ব্যবহারকারী কর্তৃক এই প্রস্তাবটি বাতিল করা হয়েছে।'
                              : '✗ This proposed action was cancelled by user.')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Suggested Questions Chips below latest assistant message */}
              {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-1 max-w-[95%]">
                  {msg.suggestedQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => handleSendMessage(q)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors shadow-2xs cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 p-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>{language === 'bn' ? 'বিশ্লেষণ করছি...' : 'Analyzing...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Listening Bar Indicator */}
      {isListening && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span className="font-semibold">
              {language === 'bn' ? 'শুনছি... ' : 'Listening... '}
              {voiceTranscript
                ? `"${voiceTranscript}"`
                : language === 'bn'
                ? 'বলুন (যেমন: "আজ দুপুরে ১৫০ টাকা খরচ করেছি খাবারে")'
                : 'Speak now (e.g. "Spent 150 taka on food today")'}
            </span>
          </div>
          <button
            onClick={toggleVoiceInput}
            className="text-[11px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg transition-colors font-medium cursor-pointer"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Stop'}
          </button>
        </div>
      )}

      {/* Voice Error Notice */}
      {voiceError && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-3 py-1.5 text-[11px] flex items-center justify-between">
          <span className="truncate">{voiceError}</span>
          <button
            onClick={() => setVoiceError(null)}
            className="text-amber-900 dark:text-amber-200 hover:font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. Bottom Input Bar */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Input Button */}
          <button
            type="button"
            id="voice-input-btn"
            onClick={toggleVoiceInput}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30 animate-bounce'
                : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
            title={
              isListening
                ? language === 'bn'
                  ? 'রেকর্ডিং বন্ধ করুন'
                  : 'Stop recording'
                : language === 'bn'
                ? 'মুখে বলুন (Voice Input)'
                : 'Voice Input'
            }
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Text Input Field */}
          <input
            id="ai-chat-input"
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              language === 'bn'
                ? "বাংলা, Banglish বা ইংরেজিতে লিখুন (যেমন: 'amar income koto?', '200 tk expense')..."
                : "Type in English, Bangla, or Banglish (e.g. 'total expense this month', '200 tk for food')..."
            }
            className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
          />

          {/* Send Button */}
          <button
            type="submit"
            id="ai-send-btn"
            disabled={!inputQuery.trim() || isProcessing}
            className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 5. Action Edit Modal (User can edit proposal before confirming) */}
      {editingAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                {language === 'bn' ? 'লেনদেন বিবরণ সম্পাদনা' : 'Edit Transaction Proposal'}
              </h3>
              <button
                onClick={() => setEditingAction(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Type Switcher */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {language === 'bn' ? 'ধরন' : 'Type'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditingAction({
                      ...editingAction,
                      action: { ...editingAction.action, type: 'EXPENSE' },
                    })
                  }
                  className={`py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    editingAction.action.type === 'EXPENSE'
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {language === 'bn' ? 'ব্যয় (Expense)' : 'Expense'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingAction({
                      ...editingAction,
                      action: { ...editingAction.action, type: 'INCOME' },
                    })
                  }
                  className={`py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    editingAction.action.type === 'INCOME'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {language === 'bn' ? 'আয় (Income)' : 'Income'}
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {language === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}
              </label>
              <input
                type="number"
                value={editingAction.action.amount_poisha / 100}
                onChange={(e) =>
                  setEditingAction({
                    ...editingAction,
                    action: {
                      ...editingAction.action,
                      amount_poisha: Math.round((parseFloat(e.target.value) || 0) * 100),
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
              </label>
              <select
                value={editingAction.action.category_id}
                onChange={(e) =>
                  setEditingAction({
                    ...editingAction,
                    action: { ...editingAction.action, category_id: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
              >
                {categories
                  .filter((c) => c.type === editingAction.action.type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {getCategoryName(c.name)}
                    </option>
                  ))}
              </select>
            </div>

            {/* Account */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {language === 'bn' ? 'অ্যাকাউন্ট' : 'Account'}
              </label>
              <select
                value={editingAction.action.account_id}
                onChange={(e) =>
                  setEditingAction({
                    ...editingAction,
                    action: { ...editingAction.action, account_id: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
              >
                {accounts
                  .filter((a) => a.is_active)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {getAccountName(a.name)}
                    </option>
                  ))}
              </select>
            </div>

            {/* Note */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {language === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note (optional)'}
              </label>
              <input
                type="text"
                value={editingAction.action.note || ''}
                onChange={(e) =>
                  setEditingAction({
                    ...editingAction,
                    action: { ...editingAction.action, note: e.target.value },
                  })
                }
                placeholder={language === 'bn' ? 'বিবরণ লিখুন' : 'Enter description'}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleSaveEditedAction}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
              >
                {language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingAction(null)}
                className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
