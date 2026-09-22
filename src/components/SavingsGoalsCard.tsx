import React, { useState } from 'react';
import {
  Target,
  Plus,
  TrendingUp,
  Sparkles,
  X,
  CheckCircle2,
  Trash2,
  Calendar,
  Wallet,
} from 'lucide-react';
import { SavingsGoal } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { useLanguage } from '../contexts/LanguageContext';

interface SavingsGoalsCardProps {
  goals: SavingsGoal[];
  isPrivacyMode: boolean;
  onAddGoal: (goal: Omit<SavingsGoal, 'id' | 'created_at'>) => void;
  onUpdateGoalProgress: (goalId: string, addedPoisha: number) => void;
  onDeleteGoal: (goalId: string) => void;
}

const AVAILABLE_GOAL_ICONS = [
  'ShieldCheck',
  'Gift',
  'Home',
  'Car',
  'Smartphone',
  'Laptop',
  'GraduationCap',
  'Plane',
  'HeartPulse',
  'Sparkles',
  'TrendingUp',
  'Wallet',
  'Tag',
];

const PRESET_GOAL_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#EF4444', // Rose
];

export const SavingsGoalsCard: React.FC<SavingsGoalsCardProps> = ({
  goals,
  isPrivacyMode,
  onAddGoal,
  onUpdateGoalProgress,
  onDeleteGoal,
}) => {
  const { language, formatTaka, formatNumber } = useLanguage();

  // New Goal Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetTaka, setNewTargetTaka] = useState('');
  const [newSavedTaka, setNewSavedTaka] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newColor, setNewColor] = useState('#10B981');
  const [newIcon, setNewIcon] = useState('ShieldCheck');
  const [newNote, setNewNote] = useState('');

  // Deposit/Add Money to Goal Modal
  const [activeDepositGoal, setActiveDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmountTaka, setDepositAmountTaka] = useState('');

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    const target = parseFloat(newTargetTaka);
    if (!title || isNaN(target) || target <= 0) return;

    const saved = parseFloat(newSavedTaka) || 0;

    onAddGoal({
      title,
      target_amount_poisha: Math.round(target * 100),
      saved_amount_poisha: Math.round(Math.max(0, saved) * 100),
      target_date: newTargetDate || undefined,
      color: newColor,
      icon: newIcon,
      note: newNote.trim() || undefined,
    });

    setNewTitle('');
    setNewTargetTaka('');
    setNewSavedTaka('');
    setNewTargetDate('');
    setNewColor('#10B981');
    setNewIcon('ShieldCheck');
    setNewNote('');
    setIsAddModalOpen(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDepositGoal) return;
    const amount = parseFloat(depositAmountTaka);
    if (isNaN(amount) || amount <= 0) return;

    onUpdateGoalProgress(activeDepositGoal.id, Math.round(amount * 100));
    setDepositAmountTaka('');
    setActiveDepositGoal(null);
  };

  const renderAmount = (amountPoisha: number) => {
    if (isPrivacyMode) return '•••••• ৳';
    return formatTaka(amountPoisha);
  };

  const totalSavedPoisha = goals.reduce((acc, g) => acc + g.saved_amount_poisha, 0);
  const totalTargetPoisha = goals.reduce((acc, g) => acc + g.target_amount_poisha, 0);
  const overallPercentage =
    totalTargetPoisha > 0 ? Math.min(100, Math.round((totalSavedPoisha / totalTargetPoisha) * 100)) : 0;

  return (
    <div
      id="savings-goals-card"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Target className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {language === 'bn' ? 'টাকা জমানোর লক্ষ্য (সেভিংস গোল)' : 'Savings Goals'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {goals.length > 0
                ? (language === 'bn'
                    ? `মোট জমা ${renderAmount(totalSavedPoisha)} • লক্ষ্যপূরণ ${formatNumber(overallPercentage)}%`
                    : `Total saved ${renderAmount(totalSavedPoisha)} • Completed ${formatNumber(overallPercentage)}%`)
                : (language === 'bn'
                    ? 'ভবিষ্যতের জন্য টাকা জমানোর স্বপ্ন ও টার্গেট'
                    : 'Set targets and save for your future dreams')}
            </p>
          </div>
        </div>

        <button
          id="open-add-goal-modal-btn"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1 text-xs font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200/80 dark:border-teal-800/80 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {language === 'bn' ? 'নতুন লক্ষ্য' : 'New Goal'}
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {language === 'bn'
              ? 'এখনো কোনো সেভিংস গোল বা জমানোর লক্ষ্য তৈরি করা হয়নি।'
              : 'No savings goals created yet.'}
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {language === 'bn' ? 'প্রথম সেভিংস গোল সেট করুন' : 'Set Your First Savings Goal'}
          </button>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {goals.map((goal) => {
            const isCompleted = goal.saved_amount_poisha >= goal.target_amount_poisha;
            const percentage =
              goal.target_amount_poisha > 0
                ? Math.min(100, Math.round((goal.saved_amount_poisha / goal.target_amount_poisha) * 100))
                : 0;
            const remainingPoisha = Math.max(0, goal.target_amount_poisha - goal.saved_amount_poisha);

            return (
              <div
                key={goal.id}
                id={`savings-goal-item-${goal.id}`}
                className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-all space-y-2.5"
              >
                {/* Title & Top Stats */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${goal.color}20`,
                        color: goal.color,
                      }}
                    >
                      <CategoryIcon name={goal.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {goal.title}
                        </span>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> {language === 'bn' ? 'সম্পন্ন' : 'Completed'}
                          </span>
                        )}
                      </div>
                      {goal.note && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{goal.note}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Add Money & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id={`add-money-to-goal-${goal.id}`}
                      type="button"
                      onClick={() => setActiveDepositGoal(goal)}
                      title={language === 'bn' ? 'টাকা যোগ করুন' : 'Add funds to goal'}
                      className="px-2.5 py-1 text-xs font-bold text-teal-800 dark:text-teal-200 bg-teal-100/70 dark:bg-teal-950/80 hover:bg-teal-200/80 dark:hover:bg-teal-900 border border-teal-200/80 dark:border-teal-800 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {language === 'bn' ? 'টাকা যোগ' : 'Add Funds'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmMsg = language === 'bn'
                          ? `"${goal.title}" লক্ষ্যটি মুছে ফেলতে চান?`
                          : `Do you want to delete savings goal "${goal.title}"?`;
                        if (confirm(confirmMsg)) {
                          onDeleteGoal(goal.id);
                        }
                      }}
                      title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <AnimatedProgressBar
                    percentage={percentage}
                    color={isCompleted ? '#10B981' : goal.color}
                    heightClass="h-2.5"
                    bgClass="bg-gray-200/80 dark:bg-gray-700"
                    duration={0.4}
                  />

                  {/* Progress Footnote */}
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 font-medium">
                    <div>
                      {language === 'bn' ? 'জমা হয়েছে: ' : 'Saved: '}
                      <span className="font-extrabold text-gray-900 dark:text-gray-100">
                        {renderAmount(goal.saved_amount_poisha)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {' '}
                        / {renderAmount(goal.target_amount_poisha)}
                      </span>
                    </div>
                    <div className="font-bold text-xs" style={{ color: isCompleted ? '#10B981' : goal.color }}>
                      {formatNumber(percentage)}%
                    </div>
                  </div>
                </div>

                {/* Status / Target Date */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium pt-1 border-t border-gray-100 dark:border-gray-700">
                  {goal.target_date ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {language === 'bn' ? `টার্গেট: ${goal.target_date}` : `Target: ${goal.target_date}`}
                    </span>
                  ) : (
                    <span>{language === 'bn' ? 'মেয়াদহীন লক্ষ্য' : 'Ongoing goal'}</span>
                  )}
                  <span>
                    {isCompleted ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {language === 'bn' ? 'লক্ষ্য পূরণ হয়েছে! 🎉' : 'Goal completed! 🎉'}
                      </span>
                    ) : (
                      <>
                        {language === 'bn' ? 'বাকি আছে: ' : 'Remaining: '}
                        <span className="font-extrabold text-gray-900 dark:text-gray-100">{renderAmount(remainingPoisha)}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Savings Goal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                {language === 'bn' ? 'নতুন সেভিংস গোল বা লক্ষ্য তৈরি করুন' : 'Create New Savings Goal'}
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'লক্ষ্যের নাম *' : 'Goal Title *'}
                </label>
                <input
                  id="goal-title-input"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: নতুন ল্যাপটপ, বাইক কেনা, জরুরি ফান্ড' : 'e.g. New Laptop, Emergency Fund, Vacation'}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-medium"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'bn' ? 'টার্গেট টাকা (৳) *' : 'Target Amount (৳) *'}
                  </label>
                  <input
                    id="goal-target-amount-input"
                    type="number"
                    min="1"
                    step="any"
                    value={newTargetTaka}
                    onChange={(e) => setNewTargetTaka(e.target.value)}
                    placeholder="50,000"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'bn' ? 'শুরুর জমা (যদি থাকে)' : 'Initial Saved (if any)'}
                  </label>
                  <input
                    id="goal-initial-saved-input"
                    type="number"
                    min="0"
                    step="any"
                    value={newSavedTaka}
                    onChange={(e) => setNewSavedTaka(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'টার্গেট পূরণ করার তারিখ (ঐচ্ছিক)' : 'Target Completion Date (Optional)'}
                </label>
                <input
                  id="goal-target-date-input"
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-medium"
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'bn' ? 'আইকন বেছে নিন:' : 'Choose Icon:'}
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {AVAILABLE_GOAL_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewIcon(iconName)}
                      className={`p-2 rounded-xl border shrink-0 transition-all ${
                        newIcon === iconName
                          ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <CategoryIcon name={iconName} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'bn' ? 'রং বেছে নিন:' : 'Choose Color:'}
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {PRESET_GOAL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-full shrink-0 transition-transform ${
                        newColor === c
                          ? 'ring-2 ring-offset-2 ring-teal-500 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'সংক্ষিপ্ত নোট (ঐচ্ছিক)' : 'Short Note (Optional)'}
                </label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: প্রতি মাসে ২,০০০ টাকা করে জমাবো' : 'e.g. Save 2,000 taka every month'}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                >
                  {language === 'bn' ? 'বাদ দিন' : 'Cancel'}
                </button>
                <button
                  id="save-goal-submit-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {language === 'bn' ? 'লক্ষ্য সংরক্ষণ করুন' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deposit / Add Money to Existing Goal */}
      {activeDepositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                {language === 'bn' ? `টাকা জমান (${activeDepositGoal.title})` : `Add Savings (${activeDepositGoal.title})`}
              </div>
              <button
                type="button"
                onClick={() => setActiveDepositGoal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 rounded-xl">
                <p className="text-xs text-teal-900 dark:text-teal-200 font-medium">
                  {language === 'bn' ? 'বর্তমানে জমা আছে: ' : 'Currently saved: '}
                  <span className="font-bold">
                    {formatTaka(activeDepositGoal.saved_amount_poisha)}
                  </span>
                  {' '}• {language === 'bn' ? 'টার্গেট: ' : 'Target: '}
                  <span className="font-bold">
                    {formatTaka(activeDepositGoal.target_amount_poisha)}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'কত টাকা যোগ করতে চান? (৳) *' : 'Amount to add? (৳) *'}
                </label>
                <input
                  id="goal-deposit-amount-input"
                  type="number"
                  min="1"
                  step="any"
                  value={depositAmountTaka}
                  onChange={(e) => setDepositAmountTaka(e.target.value)}
                  placeholder="2,000"
                  className="w-full px-3.5 py-2.5 text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-bold"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveDepositGoal(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                >
                  {language === 'bn' ? 'বাদ দিন' : 'Cancel'}
                </button>
                <button
                  id="confirm-goal-deposit-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {language === 'bn' ? 'জমা যুক্ত করুন' : 'Add to Savings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
