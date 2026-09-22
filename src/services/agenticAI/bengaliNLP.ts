/**
 * Bengali NLP Parser & Intent Classifier
 * 
 * Accurately extracts monetary amounts (Bangla + English digits, words),
 * categories, transaction types, accounts, dates, and dynamic query intents.
 */

import { Category, Account } from '../../types';
import { ProposedTransactionAction, ChatHistoryItem } from './types';


// Convert Bengali numerals to ASCII numerals
export function normalizeBengaliDigits(text: string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let result = text;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(bnDigits[i], 'g'), String(i));
  }
  return result;
}

export type UserLanguage = 'BANGLA' | 'BANGLISH' | 'ENGLISH';

/**
 * Detect user language:
 * - BANGLA: Contains native Bengali unicode characters
 * - BANGLISH: Bengali written with English/Latin letters (e.g. "amar income koto?")
 * - ENGLISH: English queries (e.g. "what is my income?")
 */
export function detectUserLanguage(text: string): UserLanguage {
  // If text contains any Bengali Unicode characters (\u0980-\u09FF)
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'BANGLA';
  }

  const lower = text.toLowerCase().trim();

  // Distinctive Banglish tokens & phrases
  const banglishRegex = /\b(amar|amr|apnar|apnr|tumar|tomar|tumi|apni|koto|kototuku|kotuk|khoroc|khoroch|khoros|khorche|khorce|hoise|hoiche|hoyse|hoyese|hoyeche|hoilo|hobe|ajke|aajke|aaj|aj|kalke|kal|gotokal|gotokalke|porshu|gotoporshu|mashe|mash|bochor|bochore|din|dine|tarikh|tarike|tarikhe|korlam|korsi|korchi|kora|korbo|koro|korben|baki|ase|ache|achhe|nai|nei|paona|pabo|dena|dite|dhar|rin|shonchoy|sonchoy|joma|dekhao|dekhan|bolo|bolen|shunao|pelam|paici|peyechi|dhukse|dhukeche|dilam|dici|diyechi|taka|takar|tk|poisa|poisha|shob|sob|shobgulo|shobgula|khabar|khabare|nasta|bajar|bazar|vara|bhara|ki|kee|keno|kivabe|kemne|kothay|obostha|hisab|hishab|lenden|len-den|bhalo|kharap|ay|aay|badget)\b/;

  if (banglishRegex.test(lower)) {
    return 'BANGLISH';
  }

  // Pure English signals
  const englishRegex = /\b(what|how|why|when|where|who|which|can|could|would|show|tell|give|list|display|is|are|the|this|that|in|on|at|for|from|to|with|of|current|total|expense|expenses|income|balance|budget|remaining|transactions|transaction|spend|spent|savings|save|debt|debts|status|summary|financial)\b/;

  if (englishRegex.test(lower)) {
    return 'ENGLISH';
  }

  // Default for romanized text is Banglish
  return 'BANGLISH';
}

// Bengali month names to month number (1-12)
export const BENGALI_MONTHS: Record<string, number> = {
  'জানুয়ারি': 1,
  'জানুয়ারি': 1,
  'january': 1,
  'ফেব্রুয়ারি': 2,
  'ফেব্রুয়ারি': 2,
  'february': 2,
  'মার্চ': 3,
  'march': 3,
  'এপ্রিল': 4,
  'april': 4,
  'মে': 5,
  'may': 5,
  'জুন': 6,
  'june': 6,
  'জুলাই': 7,
  'july': 7,
  'আগস্ট': 8,
  'august': 8,
  'সেপ্টেম্বর': 9,
  'september': 9,
  'অক্টোবর': 10,
  'october': 10,
  'নভেম্বর': 11,
  'november': 11,
  'ডিসেম্বর': 12,
  'december': 12,
};

// Parse monetary amount from user utterance (in Taka, returns Poisha)
export function extractAmountPoisha(rawText: string): number | null {
  const normalized = normalizeBengaliDigits(rawText.toLowerCase());

  // Check special words
  if (/দেড়শ|দেড়শ|দেড়শো|দেড়শো/.test(normalized)) {
    return 15000;
  }
  if (/আড়াইশ|আড়াইশো|আড়াইশ|আড়াইশো/.test(normalized)) {
    return 25000;
  }
  if (/সাড়ে তিনশ|সাড়ে তিনশো/.test(normalized)) {
    return 35000;
  }

  // Check pattern: "X হাজার" or "X k" or "X hajar"
  const thousandMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:হাজার|k|hajar|hazar)\b/);
  if (thousandMatch) {
    const val = parseFloat(thousandMatch[1]);
    if (!isNaN(val)) {
      return Math.round(val * 1000 * 100);
    }
  }

  // Check pattern: "X লাখ" or "X lakh"
  const lakhMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:লাখ|লক্ষ|lakh|lac)\b/);
  if (lakhMatch) {
    const val = parseFloat(lakhMatch[1]);
    if (!isNaN(val)) {
      return Math.round(val * 100000 * 100);
    }
  }

  // Check pattern: "200 taka", "৳150", "150 tk", "150/-", "150 bdt", "taka 200", "tk 200"
  const directMatch = normalized.match(/(?:৳|tk|taka|bdt|টাকা)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:টাকা|টাকার|tk|taka|bdt|\/-)/i);
  if (directMatch && directMatch[1]) {
    const cleaned = directMatch[1].replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 100);
    }
  }

  // Check prefix pattern: "tk 200", "taka 200", "৳200"
  const prefixMatch = normalized.match(/(?:৳|tk|taka|bdt)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (prefixMatch && prefixMatch[1]) {
    const cleaned = prefixMatch[1].replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 100);
    }
  }

  // Pattern with action verbs: "add 200", "save 500", "500 save", "200 expense", "expense 200"
  const actionMatch = normalized.match(/(?:add|save|expense|income|খরচ|আয়|জমা|সঞ্চয়)\s*(\d+(?:,\d+)*(?:\.\d+)?)|(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:save|expense|income|add|খরচ|আয়|জমা|সঞ্চয়)/i);
  if (actionMatch) {
    const numStr = actionMatch[1] || actionMatch[2];
    if (numStr) {
      const num = parseFloat(numStr.replace(/,/g, ''));
      if (!isNaN(num) && num > 0) {
        return Math.round(num * 100);
      }
    }
  }

  // General standalone number in financial utterance (avoiding standalone years 2024-2027)
  const standaloneMatch = normalized.match(/\b(\d{1,7}(?:\.\d+)?)\b/);
  if (standaloneMatch && standaloneMatch[1]) {
    const num = parseFloat(standaloneMatch[1]);
    if (!isNaN(num) && num > 0 && num !== 2025 && num !== 2026 && num !== 2027) {
      return Math.round(num * 100);
    }
  }

  return null;
}

export interface ExtractedDateFilter {
  type: 'SPECIFIC_DATE' | 'SPECIFIC_MONTH' | 'SPECIFIC_YEAR' | 'CURRENT_MONTH' | 'LAST_MONTH' | 'ALL_TIME';
  dateStr?: string; // YYYY-MM-DD
  monthStr?: string; // YYYY-MM
  yearStr?: string; // YYYY
  label: string;
}

// Extract date or time period from user prompt
export function extractDateFilter(rawText: string, currentRefDate: Date = new Date()): ExtractedDateFilter | null {
  const norm = normalizeBengaliDigits(rawText.toLowerCase());
  const currYear = currentRefDate.getFullYear();
  const currMonth = currentRefDate.getMonth() + 1; // 1-indexed
  const currDay = currentRefDate.getDate();

  // 1. ISO format e.g. "2026-09-15"
  const isoMatch = norm.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return {
      type: 'SPECIFIC_DATE',
      dateStr: `${y}-${m}-${d}`,
      label: `${toBengaliNumber(parseInt(d, 10))} ${getMonthBengaliName(parseInt(m, 10))} ${toBengaliNumber(y)}`,
    };
  }

  // 2. Relative: "আজ", "আজকে", "aj", "ajke", "aaj", "aajke", "today"
  if (/\b(আজ|আজকে|aj|ajke|aaj|aajke|today)\b/.test(norm)) {
    const dateStr = `${currYear}-${String(currMonth).padStart(2, '0')}-${String(currDay).padStart(2, '0')}`;
    return {
      type: 'SPECIFIC_DATE',
      dateStr,
      label: 'আজকের হিসাব',
    };
  }

  // 3. Relative: "গতকাল", "কালকে", "গতকালকে", "gotokal", "gotokalke", "kal", "kalke", "yesterday"
  if (/\b(গতকাল|গতকালকে|gotokal|gotokalke|kal|kalke|yesterday)\b/.test(norm)) {
    const yest = new Date(currentRefDate);
    yest.setDate(yest.getDate() - 1);
    const dateStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
    return {
      type: 'SPECIFIC_DATE',
      dateStr,
      label: 'গতকালের হিসাব',
    };
  }

  // 4. Relative: "গত পরশু", "পরশু", "gotoporshu", "porshu"
  if (/\b(গত\s*পরশু|পরশু|gotoporshu|porshu)\b/.test(norm)) {
    const dayBefore = new Date(currentRefDate);
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dateStr = `${dayBefore.getFullYear()}-${String(dayBefore.getMonth() + 1).padStart(2, '0')}-${String(dayBefore.getDate()).padStart(2, '0')}`;
    return {
      type: 'SPECIFIC_DATE',
      dateStr,
      label: 'গত পরশুর হিসাব',
    };
  }

  // 5. Specific day with month, e.g. "১৫ সেপ্টেম্বর", "15 September", "সেপ্টেম্বর ১৫"
  for (const [monthName, mNum] of Object.entries(BENGALI_MONTHS)) {
    const dayMonthRegex = new RegExp(`(\\d{1,2})\\s*(?:তারিখ|তারিখে|তারিকে|tarikh|tarike|tarikhe)?\\s*${monthName}|${monthName}\\s*(?:মাসের|masher)?\\s*(\\d{1,2})\\s*(?:তারিখ|তারিখে|তারিকে|tarikh|tarike|tarikhe)?`);
    const match = norm.match(dayMonthRegex);
    if (match) {
      const day = parseInt(match[1] || match[2], 10);
      if (day >= 1 && day <= 31) {
        const dateStr = `${currYear}-${String(mNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return {
          type: 'SPECIFIC_DATE',
          dateStr,
          label: `${day} ${monthName}`,
        };
      }
    }
  }

  // 6. "গত ১৫ তারিখে", "১৫ তারিখে", "15 tarike", "15 tarikhe", "15 tarikh", "15th"
  const specificDayMatch = norm.match(/(?:গত\s*|goto\s*)?(\d{1,2})\s*(?:তারিখ|তারিখে|তারিখের|তারিকে|তারিক|tarikh|tarike|tarikhe|শে|ই|রা|লা|th|st|nd|rd)?\b/);
  if (specificDayMatch && specificDayMatch[1]) {
    const day = parseInt(specificDayMatch[1], 10);
    const hasDateWord = /(?:তারিখ|তারিখে|তারিখের|তারিকে|তারিক|tarikh|tarike|tarikhe|শে|ই|রা|লা)/.test(norm) || /\b(গত|goto|last)\s*\d{1,2}\b/.test(norm);
    if (hasDateWord && day >= 1 && day <= 31) {
      let targetMonth = currMonth;
      let targetYear = currYear;
      if (norm.includes('গত মাসের') || norm.includes('goto masher') || norm.includes('last month') || ((norm.includes('গত') || norm.includes('goto')) && day > currDay)) {
        targetMonth = currMonth - 1;
        if (targetMonth < 1) {
          targetMonth = 12;
          targetYear -= 1;
        }
      }
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        type: 'SPECIFIC_DATE',
        dateStr,
        label: `${toBengaliNumber(day)} তারিখ`,
      };
    }
  }

  // 7. Specific month, e.g. "আগস্ট মাসে", "সেপ্টেম্বর মাসে", "september mashe"
  for (const [monthName, mNum] of Object.entries(BENGALI_MONTHS)) {
    if (norm.includes(monthName)) {
      const monthStr = `${currYear}-${String(mNum).padStart(2, '0')}`;
      return {
        type: 'SPECIFIC_MONTH',
        monthStr,
        label: `${monthName} মাস`,
      };
    }
  }

  // 8. "এই বছর", "চলতি বছর", "ei bochor", "this year", "২০২৬ সালে", "2026 এ"
  const yearMatch = norm.match(/(?:এই\s*বছর|চলতি\s*বছর|ei\s*bochor|this\s*year|\b(20[2-3]\d)\s*(?:সালে|সালের|sal|saale|এ)?\b)/);
  if (yearMatch) {
    const isExplicitYearWord = norm.includes('বছর') || norm.includes('bochor') || norm.includes('year') || /সালে|সালের|sal|saale/.test(norm);
    const hasMoneySuffix = /\b(20[2-3]\d)\s*(?:টাকা|tk|taka|bdt|\/-)/.test(norm);
    if ((isExplicitYearWord || yearMatch[1]) && !hasMoneySuffix) {
      const y = yearMatch[1] ? yearMatch[1] : String(currYear);
      return {
        type: 'SPECIFIC_YEAR',
        yearStr: y,
        label: `${toBengaliNumber(y)} সাল`,
      };
    }
  }

  // 9. "গত বছর", "আগের বছর", "goto bochor", "last year"
  if (/\b(গত\s*বছর|আগের\s*বছর|goto\s*bochor|last\s*year)\b/.test(norm)) {
    const y = String(currYear - 1);
    return {
      type: 'SPECIFIC_YEAR',
      yearStr: y,
      label: `${toBengaliNumber(y)} সাল`,
    };
  }

  // 10. "এই মাসে", "চলতি মাসে", "ei mashe", "e mashe", "ei mash", "this month", "current month", "মাসের হিসাব", "মাসিক হিসাব"
  if (/\b(এই\s*মাসে|এই\s*মাসের|চলতি\s*মাসে|চলতি\s*মাসের|এই\s*মাস|এ\s*মাসে|এ\s*মাসের|মাসের|মাসিক|ei\s*mashe|e\s*mashe|ei\s*mash|this\s*month|current\s*month|masher|monthly)\b/.test(norm)) {
    return {
      type: 'CURRENT_MONTH',
      monthStr: `${currYear}-${String(currMonth).padStart(2, '0')}`,
      label: 'চলতি মাস',
    };
  }

  // 11. "গত মাসে", "আগের মাসে", "goto mashe", "last month"
  if (/\b(গত\s*মাসে|গত\s*মাসের|গতমাসের|গতমাসে|আগের\s*মাসে|আগের\s*মাসের|আগের\s*মাস|গত\s*মাস|goto\s*mashe|goto\s*masher|last\s*month|previous\s*month)\b/.test(norm)) {
    const prevDate = new Date(currYear, currMonth - 2, 1);
    const monthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    return {
      type: 'LAST_MONTH',
      monthStr,
      label: 'গত মাস',
    };
  }

  return null;
}

// Helper to get month name in Bengali
function getMonthBengaliName(monthNum: number): string {
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  return months[monthNum - 1] || `${monthNum} নম্বর মাস`;
}

// Helper to convert to Bengali digits
function toBengaliNumber(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (w) => bnDigits[+w]);
}

// Find matching category from list or keywords (Bangla, Banglish, and English)
export function detectCategory(text: string, categories: Category[], isExpense: boolean = true): Category | undefined {
  const lower = text.toLowerCase();
  const available = categories.filter((c) => c.type === (isExpense ? 'EXPENSE' : 'INCOME'));

  // 1. Keyword map to known category concepts with full Banglish and English variations
  const keywordMap: Record<string, string[]> = {
    'cat-mobile': [
      'mobile recharge', 'mobile bill', 'recharge', 'flexiload', 'topup', 'data pack', 'mb', 'net pack', 'sim',
      'মোবাইল রিচার্জ', 'মোবাইল বিল', 'মোবাইলে', 'মোবাইল', 'রিচার্জ', 'টপআপ', 'ফ্লেক্সিলোড', 'এমবি', 'ডাটা প্যাক', 'সিম', 'নেট', 'ডাটা'
    ],
    'cat-bills': [
      'current bill', 'electricity bill', 'wifi bill', 'internet bill', 'water bill', 'pani bill', 'gas bill', 'utility bill', 'bill',
      'বিদ্যুৎ বিল', 'কারেন্ট বিল', 'বিদ্যুৎ', 'কারেন্ট', 'ওয়াইফাই বিল', 'ওয়াইফাই', 'ইন্টারনেট বিল', 'ইন্টারনেট', 'পানি বিল', 'গ্যাস বিল', 'ইউটিলিটি', 'বিল'
    ],
    'cat-food': [
      'food', 'khabar', 'khabare', 'nasta', 'lunch', 'dinner', 'breakfast', 'cha', 'coffee', 'tea', 'restaurant',
      'biryani', 'burger', 'snack', 'hotel', 'mudi', 'bajar', 'bazar', 'mach', 'mangsho', 'khabar khoroc',
      'খাবার', 'খাবারে', 'নাস্তা', 'লাঞ্চ', 'ডিনার', 'বিরিয়ানি', 'চা', 'কফি', 'রেস্টুরেন্ট', 'বার্গার', 'মিষ্টি', 'বাজার', 'ফল', 'কাঁচাবাজার', 'মুদি', 'চাল', 'ডাল', 'মাছ', 'মাংস', 'হোটেল'
    ],
    'cat-rent': [
      'rent', 'house rent', 'basha vara', 'basha bhara', 'vara', 'bhara', 'mess', 'flat', 'hostel',
      'বাসাভাড়া', 'ভাড়া', 'মেস', 'বাড়িভাড়া', 'ফ্ল্যাটভাড়া', 'রেন্ট', 'হোস্টেল'
    ],
    'cat-transport': [
      'transport', 'transportation', 'yatayat', 'jatayat', 'rickshaw', 'rickshaw vara', 'bus', 'bus vara', 'cng', 'uber',
      'pathao', 'fare', 'fuel', 'petrol', 'octane', 'gas', 'metro', 'metrorail', 'train', 'gari vara',
      'যাতায়াত', 'যাতায়াত', 'রিকশা', 'রিকশাভাড়া', 'বাস', 'বাসভাড়া', 'সিএনজি', 'উবার', 'পাঠাও', 'ভাড়া', 'তেল', 'পেট্রোল', 'গ্যাস', 'যাতায়াতে', 'মেট্রোরেল', 'ভ্যান', 'ট্রেন'
    ],
    'cat-shopping': [
      'shopping', 'cloth', 'clothes', 'dress', 'shirt', 'pant', 'shoes', 'shoe', 'bag', 'watch', 'kapor', 'poshak', 'juto', 'market', 'kenakata',
      'শপিং', 'কাপড়', 'পোশাক', 'জুতো', 'শার্ট', 'প্যান্ট', 'ব্যাগ', 'ঘড়ি', 'কেনাকাটা', 'মার্কেট'
    ],
    'cat-health': [
      'health', 'medical', 'medicine', 'doctor', 'hospital', 'pharmacy', 'prescription', 'test', 'oshudh', 'osud', 'chikitsa',
      'ওষুধ', 'ঔষধ', 'চিকিৎসা', 'ডাক্তার', 'ফার্মেসি', 'মেডিসিন', 'হাসপাতাল', 'প্রেসক্রিপশন', 'টেস্ট'
    ],
    'cat-education': [
      'education', 'tuition', 'tuition fee', 'school', 'college', 'varsity', 'book', 'books', 'course', 'porashona', 'shikkha', 'boi', 'khata',
      'পড়াশোনা', 'শিক্ষা', 'বই', 'খাতা', 'কলেজ', 'ভার্সিটি', 'টিউশন', 'টিউশন ফি', 'কোর্স', 'স্কুল'
    ],
    'cat-entertainment': [
      'entertainment', 'movie', 'cinema', 'tour', 'touring', 'game', 'gaming', 'picnic', 'binodon', 'ghumte',
      'বিনোদন', 'সিনেমা', 'মুভি', 'ট্যুর', 'ঘুরতে', 'নাটক', 'গেম', 'পিকনিক'
    ],
    'cat-grocery': [
      'grocery', 'bajar', 'bazar', 'sodai', 'kacha bajar', 'mudibajar',
      'বাজার-সদাই', 'বাজার', 'সদাই', 'গ্রোসারি', 'মুদিবাজার'
    ],
    'cat-family': [
      'family', 'gift', 'parents', 'ma', 'baba', 'brother', 'sister', 'poribar', 'upohar',
      'পরিবার', 'উপহার', 'গিফট', 'মা', 'বাবা', 'বোন', 'ভাই'
    ],
    'cat-salary': [
      'salary', 'beton', 'masik beton', 'sommani',
      'বেতন', 'স্যালারি', 'মাসিক বেতন', 'সম্মানী'
    ],
    'cat-business': [
      'business', 'sales', 'profit', 'bebsha', 'bikri', 'lav',
      'ব্যবসা', 'সেলস', 'বিক্রি', 'লাভ'
    ],
    'cat-freelance': [
      'freelance', 'freelancing', 'client', 'project', 'upwork', 'fiverr',
      'ফ্রিল্যান্সিং', 'ক্লায়েন্ট', 'প্রজেক্ট', 'আপওয়ার্ক', 'ফাইভার'
    ],
    'cat-gift-income': [
      'gift', 'bonus', 'eid bonus', 'upohar', 'bokshish',
      'উপহার', 'বকশিশ', 'বোনাস', 'ঈদ বকশিশ'
    ],
    'cat-savings': [
      'saving', 'savings', 'save', 'shonchoy', 'sonchoy', 'joma', 'fdr', 'dps',
      'সঞ্চয়', 'সঞ্চয়', 'সেভিংস', 'ডিপিএস'
    ],
  };

  // Check keyword matches with higher priority
  for (const [catId, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const found = available.find((c) => c.id === catId || (c.name && c.name.toLowerCase().includes(kw)));
        if (found) return found;
      }
    }
  }

  // 2. Direct exact or partial name matching across all categories
  for (const cat of available) {
    if (cat.name && lower.includes(cat.name.toLowerCase())) {
      return cat;
    }
  }

  // 3. Word-level partial match (length >= 3)
  for (const cat of available) {
    const words = (cat.name || '').toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
    for (const w of words) {
      if (lower.includes(w)) {
        return cat;
      }
    }
  }

  return undefined;
}

// Find matching account (Bangla, Banglish, and English)
export function detectAccount(text: string, accounts: Account[]): Account | undefined {
  const lower = text.toLowerCase();

  if (/বিকাশ|bkash|bikashe|bkash e|bkash theke/.test(lower)) {
    const acc = accounts.find((a) => a.type === 'BKASH' || (a.name && (a.name.toLowerCase().includes('বিকাশ') || a.name.toLowerCase().includes('bkash'))));
    if (acc) return acc;
  }
  if (/নগদ|nagad|nagade|nagad e|nagad theke/.test(lower)) {
    const acc = accounts.find((a) => a.type === 'NAGAD' || (a.name && (a.name.toLowerCase().includes('নগদ') || a.name.toLowerCase().includes('nagad'))));
    if (acc) return acc;
  }
  if (/রকেট|rocket|rockete/.test(lower)) {
    const acc = accounts.find((a) => a.type === 'ROCKET' || (a.name && (a.name.toLowerCase().includes('রকেট') || a.name.toLowerCase().includes('rocket'))));
    if (acc) return acc;
  }
  if (/ব্যাংক|bank|banke|bank theke|ব্র্যাক|ডাচ|সিটি|ইসলামী/.test(lower)) {
    const acc = accounts.find((a) => a.type === 'BANK' || (a.name && (a.name.toLowerCase().includes('ব্যাংক') || a.name.toLowerCase().includes('bank'))));
    if (acc) return acc;
  }
  if (/ক্যাশ|cash|cashe|cash theke|নগদ টাকা|হাতে থাকা টাকা|wallet|pocket/.test(lower)) {
    const acc = accounts.find((a) => a.type === 'CASH');
    if (acc) return acc;
  }

  // Match by exact account name
  for (const acc of accounts) {
    if (acc.name && lower.includes(acc.name.toLowerCase())) {
      return acc;
    }
  }

  return undefined;
}

// Extract transaction proposal from voice or text command (Bangla, Banglish, and English)
export function parseVoiceOrTextTransaction(
  input: string,
  categories: Category[],
  accounts: Account[]
): ProposedTransactionAction | null {
  const amountPoisha = extractAmountPoisha(input);
  if (!amountPoisha) return null;

  const lower = input.toLowerCase();

  // Determine Type: Expense vs Income vs Savings
  const isExplicitIncome = /পেয়েছি|আয়|ইনকাম|বেতন|ঢুকেছে|জমা হয়েছে|উপহার পেলাম|লাভ হলো|income|earn|salary|beton|dhukse|dhukeche|pelam|paici|peyechi|profit|gift/.test(lower);
  const isSavingsAction = /save|savings|shonchoy|sonchoy|সঞ্চয়|সঞ্চয়|জমা করলাম|জমা করেছি/.test(lower);
  const isExplicitExpense = /expense|khoroc|khoroch|khoros|cost|spent|spend|খরচ|ব্যয়|ব্যয়|দিলাম|দিয়েছি|ভাড়া দিলাম/.test(lower);

  let type: 'EXPENSE' | 'INCOME' = 'EXPENSE';
  if (isExplicitIncome && !isExplicitExpense) {
    type = 'INCOME';
  } else if (isSavingsAction && !isExplicitExpense) {
    // "500 taka save korlam" can be treated as Income allocation or Expense savings
    type = 'INCOME';
  }

  // Determine Category
  let category = detectCategory(input, categories, type === 'EXPENSE');
  if (isSavingsAction && !category) {
    category = categories.find((c) => c.name.includes('সঞ্চয়') || c.name.includes('সেভিংস') || c.id === 'cat-other');
  }

  const matchedAcc = detectAccount(input, accounts);
  const cashAcc = accounts.find((a) => a.type === 'CASH' && a.is_active) || accounts.find((a) => a.is_active) || accounts[0];
  const account = matchedAcc || cashAcc;

  // Determine Date: "আজ", "ajke", "আজকে", "yesterday", "gotokal", etc.
  const today = new Date();
  let txDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (/গতকাল|yesterday|gotokal|gotokalke|kal|kalke/.test(lower)) {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    txDate = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
  }

  // Determine Note
  let note = input.trim();
  if (/দুপুরে|dupure|lunch/.test(lower)) {
    note = 'দুপুরের খাবার খরচ (Lunch)';
  } else if (/সকালে|shokale|breakfast/.test(lower)) {
    note = 'সকালের নাস্তা (Breakfast)';
  } else if (/রাতে|raate|dinner/.test(lower)) {
    note = 'রাতের খাবার (Dinner)';
  } else if (isSavingsAction) {
    note = 'সঞ্চয় (Savings)';
  } else if (/rickshaw|রিকশা/.test(lower)) {
    note = 'রিকশা ভাড়া (Rickshaw fare)';
  } else if (/mobile|recharge|রিচার্জ/.test(lower)) {
    note = 'মোবাইল রিচার্জ (Mobile Recharge)';
  }

  const nowHours = String(today.getHours()).padStart(2, '0');
  const nowMins = String(today.getMinutes()).padStart(2, '0');

  return {
    id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    type,
    amount_poisha: amountPoisha,
    category_id: category?.id || (type === 'INCOME' ? 'cat-salary' : 'cat-food'),
    account_id: account?.id || 'acc-cash',
    date: txDate,
    time: `${nowHours}:${nowMins}`,
    note,
    status: 'PROPOSED',
  };
}

export type QueryIntent =
  | 'ACTION_CREATE_TRANSACTION'
  | 'INCOME_STATUS'
  | 'LAST_TRANSACTION'
  | 'SPECIFIC_DATE_EXPENSE'
  | 'SPECIFIC_CATEGORY_EXPENSE'
  | 'SPECIFIC_ACCOUNT_BALANCE'
  | 'ALL_ACCOUNTS_BALANCE'
  | 'COMPARATIVE_MONTHS'
  | 'BUDGET_LIMIT_STATUS'
  | 'DEBT_RECEIVABLES'
  | 'DEBT_PAYABLES'
  | 'SAVINGS_GOALS_STATUS'
  | 'CURRENT_MONTH_EXPENSE'
  | 'TOP_CATEGORY_EXPENSE'
  | 'FINANCIAL_SITUATION'
  | 'EXPENSE_REDUCTION_ADVICE'
  | 'PERMISSION_INFO'
  | 'OUT_OF_SCOPE'
  | 'GENERAL';

/**
 * Detects whether a query is outside the scope of Gochao's personal finance assistant.
 * The assistant should ONLY answer questions regarding user's finances, transactions,
 * accounts, balances, budgets, categories, savings, and debts.
 */
export function isOutOfScopeQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // 1. If query mentions any financial keywords, app features, or numbers in a transaction context, it is IN-SCOPE!
  const financialTokens =
    /\b(taka|tk|bdt|poisha|poisa|khoroc|khoroch|khoros|cost|expense|expenses|spend|spent|income|aay|ay|salary|beton|save|savings|shonchoy|sonchoy|budget|budgets|balance|balances|debt|debts|dena|paona|dhar|rin|baki|lenden|len-den|hisab|hishab|account|accounts|bikash|bkash|nagad|rocket|bank|cash|wallet|wallets|money|category|categories|loan|loans|receivable|payable|transfer|transaction|transactions|report|summary|liquid|recharge|bajar|bazar|vara|bhara|rent|bill)\b/i;

  const financialBengali =
    /টাকা|টাকার|পয়সা|খরচ|ব্যয়|ব্যয়|আয়|আয়|ইনকাম|বেতন|সঞ্চয়|সঞ্চয়|সেভিংস|বাজেট|ব্যালেন্স|দেনা|পাওনা|ধার|ঋণ|বাকি|লেনদেন|হিসাব|অ্যাকাউন্ট|বিকাশ|নগদ|রকেট|ব্যাংক|ক্যাশ|ওয়ালেট|খাবারে|খাবার|যাতায়াত|ভাড়া|বাজার|রিচার্জ|কেনাকাটা|বিল|অনুমতি|পারমিশন|অর্থ|আর্থিক|উদ্বৃত্ত|তহবিল|জমা|অর্থনৈতিক|সদাই|শপিং/;

  if (financialTokens.test(lower) || financialBengali.test(lower)) {
    return false;
  }

  // 2. Greetings, introduction, and capabilities questions are IN-SCOPE
  const greetingsAndAppInfo =
    /^(hi|hello|hey|salam|assalamu\s*alaikum|kemon\s*acho|kemon\s*achen|hy|halo|hola|হাই|হ্যালো|সালাম|আসসালামু\s*আলাইকুম|কেমন\s*আছো|কেমন\s*আছেন|নমস্কার)$/i.test(lower) ||
    /\b(who\s*are\s*you|what\s*can\s*you\s*do|help|tumi\s*ke|apni\s*ke|ki\s*korte\s*paro|কী\s*করতে\s*পারো|তুমি\s*কে|আপনি\s*কে|সহায়তা|সাহায্য|কীভাবে\s*ব্যবহার\s*করব)\b/i.test(lower);

  if (greetingsAndAppInfo) {
    return false;
  }

  // 3. Clear Out-of-Scope indicators:
  // Weather / Environment
  if (/\b(weather|temperature|forecast|rain|rainy|cloudy|sunny|storm)\b/i.test(lower) || /আবহাওয়া|তাপমাত্রা|বৃষ্টি|বৃষ্টির|গরম|ঠান্ডা|রোদ|ঝড়|বাতাস/.test(lower)) {
    return true;
  }
  // News / World / Politics / Geography / Trivia
  if (
    /\b(news|khobor|headline|breaking\s*news|president|prime\s*minister|capital\s*of|who\s*won|world\s*cup|football|cricket|score|election|politics)\b/i.test(lower) ||
    /খবর|সংবাদ|শিরোনাম|প্রধানমন্ত্রী|রাষ্ট্রপতি|রাজধানী|খেলা|বিশ্বকাপ|স্কোর|ক্রিকেট|ফুটবল|কে\s*জিতেছে|রাজনীতি|নির্বাচন|যুদ্ধ|দেশ|ভারত|আমেরিকা|যুক্তরাষ্ট্র|চীন|রাশিয়া/.test(lower)
  ) {
    return true;
  }
  // Food recipes / Cooking
  if (/\b(recipe|how\s*to\s*cook|how\s*to\s*make|ingredients|ranna|biryani)\b/i.test(lower) || /রান্না|রেসিপি|বানাতে\s*হয়|রান্না\s*করে|উপকরণ|বিরিয়ানি|মাংস\s*রান্না|চা\s*বানানো/.test(lower)) {
    return true;
  }
  // Tech / Coding / Homework / Writing essays
  if (
    /\b(python|javascript|java|c\+\+|react|html|css|write\s*a\s*code|write\s*a\s*poem|write\s*an\s*essay|solve\s*this|homework|translate)\b/i.test(lower) ||
    /কবিতা|প্রবন্ধ|রচনা|কোড|প্রোগ্রামিং|হোমওয়ার্ক|অংক\s*সমাধান|অনুবাদ\s*কর/.test(lower)
  ) {
    return true;
  }
  // Health / Medical advice
  if (/\b(medicine|doctor|headache|fever|symptoms|treatment|disease)\b/i.test(lower) || /ঔষধ|ওষুধ|ডাক্তার|মাথাব্যথা|জ্বর|চিকিৎসা|রোগ|লক্ষণ|ব্যথা/.test(lower)) {
    return true;
  }
  // Entertainment / Movies / Songs / Stories / Jokes
  if (/\b(movie|song|cinema|story|joke|jokes|tell\s*a\s*joke|gaan|natok)\b/i.test(lower) || /সিনেমা|গান|কৌতুক|নাটক|গল্প|জোকস|মজার\s*গল্প|মুভি/.test(lower)) {
    return true;
  }
  // Philosophy / Science / Trivia / General questions with no financial keywords
  if (
    /\b(meaning\s*of\s*life|philosophy|religion|god|universe|space|planet|earth|moon|sun|gravity)\b/i.test(lower) ||
    /মহাবিশ্ব|সূর্য|চাঁদ|পৃথিবী|ধর্ম|জীবনের\s*অর্থ|দর্শন|বিজ্ঞান/.test(lower)
  ) {
    return true;
  }
  // General questions starting with "who is", "where is", "why is", "how to" that lack any financial words
  if (/^(who\s*is|what\s*is\s*the|where\s*is|why\s*is|when\s*was|how\s*to)\b/i.test(lower)) {
    return true;
  }
  if (/^(কেমন\s*করে|কীভাবে|কেন|কোথায়\s*অবস্থিত|কখন\s*হয়েছিল|কার\s*নাম)\b/.test(lower)) {
    return true;
  }

  return false;
}

export function classifyIntent(text: string, categories: Category[] = [], accounts: Account[] = []): QueryIntent {
  const t = text.toLowerCase().trim();
  const norm = normalizeBengaliDigits(t);

  // 0. Check for explicit Out-of-Scope query
  if (isOutOfScopeQuery(text)) {
    return 'OUT_OF_SCOPE';
  }

  // 1. Last Transaction Query (e.g. "last transaction ta dekhao", "show last transaction", "শেষ লেনদেনটি দেখাও")
  if (/\b(last\s*trans|last\s*transaction|shesh\s*trans|shesh\s*transaction|latest\s*transaction|recent\s*transaction|শেষ\s*লেনদেন|সর্বশেষ\s*লেনদেন)\b/.test(t)) {
    return 'LAST_TRANSACTION';
  }

  // 2. Action Creation Intent (User creating or logging an expense/income/savings)
  // e.g. "ajke 200 taka expense add koro", "500 taka save korlam", "add 200 taka expense", "আজ দুপুরে ১৫০ টাকা খাবার খরচ করেছি"
  const hasAmount = extractAmountPoisha(t) !== null;
  const isQuestion = /\b(koto|kototuku|kotuk|how\s*much|what\s*is|what\s*are|কত|কেমন|কোন|কি|কী|কার\s*কাছে|কেমন|হিসাব\s*কী|কেমন)\b/.test(t);

  if (hasAmount && !isQuestion) {
    // Banglish & English action words: add, save, expense add, korlam, korsi, dilam, kinlam, pelam
    if (
      /\b(add\s*koro|add\s*korun|add\s*korlam|add\s*korsi|add|save\s*korlam|save\s*korsi|save\s*koro|save|expense\s*add|income\s*add|khoroc\s*add|khoroch\s*add|khoroc\s*korlam|khoroch\s*korlam|dilam|diyechi|dici|kinlam|pelam|paici|peyechi|joma\s*korlam|vara\s*dilam|bhara\s*dilam)\b/.test(t) ||
      /\b(expense|khoroc|khoroch|khoros)\b.*\b(add|koro|korlam|korsi)\b/.test(t) ||
      /\b(save|shonchoy|sonchoy|সঞ্চয়|সঞ্চয়)\b.*\b(korlam|korsi|koro)\b/.test(t) ||
      /খরচ করেছি|খরচ হয়েছে|খরচ করলাম|দিলাম|কিনলাম|পেয়েছি|জমা করেছি|ভাড়া দিলাম|যোগ করো|যুক্ত করো/.test(t) ||
      (/টাকা/.test(t) && /খরচ|ব্যয়|দিয়েছি|দিলাম|পেলাম|কিনলাম/.test(t))
    ) {
      return 'ACTION_CREATE_TRANSACTION';
    }
  }

  // 3. Income Status Query (e.g. "amar income koto?", "what is my income?", "আমার আয় কত?", "ei mashe koto aay hoise?")
  if (
    /\b(amar\s*income|amr\s*income|income\s*koto|amar\s*aay|amr\s*aay|aay\s*koto|ay\s*koto|what\s*is\s*my\s*income|how\s*much.*income|monthly\s*income)\b/.test(t) ||
    /আমার\s*আয়\s*কত|আয়\s*কত|মোট\s*আয়\s*কত|ইনকাম\s*কত|চলতি\s*মাসে.*আয়|এই\s*মাসে.*আয়|এই\s*মাসের\s*আয়|কত\s*টাকা\s*(ঢুকলো|এলো|পেলাম)|আয়ের\s*হিসাব/.test(t)
  ) {
    return 'INCOME_STATUS';
  }

  // 4. Budget & Limit Questions
  // e.g. "amar budget koto baki?", "how much budget is left?", "বাজেট কত বাকি?", "কোন ক্যাটাগরিতে বাজেট সীমা পার হয়ে গেছে?"
  if (
    /\b(budget\s*koto\s*baki|budget\s*baki|budget\s*left|remaining\s*budget|budget\s*limit|budget\s*status|how\s*much\s*budget)\b/.test(t) ||
    /বাজেট\s*(সীমা|লিমিট)?\s*(পার|অতিক্রম|শেষ|ক্রস|বেশি)|কোন\s*ক্যাটাগরিতে\s*বাজেট|বাজেটের\s*অবস্থা|বাজেটের\s*কি\s*অবস্থা|বাজেট\s*কত\s*বাকি|বাজেট\s*কী|বাজেট\s*কেমন/.test(t)
  ) {
    return 'BUDGET_LIMIT_STATUS';
  }

  // 5. Savings Goals Questions
  // e.g. "amar savings goal koto baki?", "আমার সেভিংস গোল কতদূর এগিয়েছে?", "সেভিংসের কি অবস্থা?"
  if (
    /\b(savings\s*goal|savings\s*koto|savings\s*target|shonchoy\s*goal)\b/.test(t) ||
    /সেভিংস\s*(গোল|লক্ষ্য)|সঞ্চয়\s*লক্ষ্য|সেভিংসের\s*(কি|কী)\s*অবস্থা|কতদূর\s*এগিয়েছে|গোল\s*কত\s*বাকি|সেভিংস\s*কত\s*হলো|সঞ্চয়\s*কত|টার্গেট\s*কত|কত\s*সেভ/.test(t)
  ) {
    return 'SAVINGS_GOALS_STATUS';
  }

  // 6. Comparative Questions
  // e.g. "গত তিন মাসে কোন মাসে সবচেয়ে বেশি খরচ হয়েছে?", "which month had highest expenses?", "goto tin mashe"
  if (
    /\b(compare\s*months|which\s*month.*most|goto\s*tin\s*mashe|goto\s*3\s*mashe)\b/.test(t) ||
    /গত\s*(তিন|৩|ছয়|৬|বারো|১২)\s*মাসে|কোন\s*মাসে\s*(সবচেয়ে\s*)?বেশি\s*(খরচ|ব্যয়|আয়)|মাসের\s*তুলনা|গত\s*মাসের\s*তুলনায়|আগের\s*মাসের\s*তুলনায়|মাসের\s*পার্থক্য/.test(t)
  ) {
    return 'COMPARATIVE_MONTHS';
  }

  // 7. Top Category in Current Month or "টাকা গেল কই"
  // e.g. "shobcheye beshi khoroc kothay?", "সবচেয়ে বেশি খরচ কোন খাতে?", "top expense", "টাকা গেল কই", "সবচেয়ে বেশি টাকা কোথায় গেছে"
  if (
    /\b(top\s*expense|top\s*category|shobcheye\s*beshi\s*khoroc|highest\s*expense|taka\s*gelo\s*koi|kothay\s*beshi\s*khoroc)\b/.test(t) ||
    /সবচেয়ে\s*বেশি\s*খরচ\s*কোন|কোন\s*খাতে\s*বেশি|টপ\s*খরচ|টপ\s*ক্যাটাগরি|কোন\s*ক্যাটাগরিতে\s*বেশি|টাকা\s*(গেল|গেছে)\s*কই|কোথায়\s*(সবচেয়ে\s*বেশি\s*)?টাকা\s*(গেল|গেছে)/.test(t)
  ) {
    return 'TOP_CATEGORY_EXPENSE';
  }

  // 8. Specific Category Expense Questions (e.g. "খাবারে কত খরচ?", "food e koto khoroc hoise?", "mobile recharge e koto?")
  const detectedCat = detectCategory(t, categories, true);
  if (detectedCat && (
    /\b(khoroc|khoroch|khoros|cost|spent|expense|koto|taka|hisab|list|gelo|gese)\b/.test(t) ||
    /কত|হিসাব|মোট|খরচ|ব্যয়|ব্যয়|টাকা|গেছে|গেল|খসল|দিয়েছি|দিলাম|তালিকা|লিস্ট/.test(t)
  )) {
    return 'SPECIFIC_CATEGORY_EXPENSE';
  }

  // 9. Specific Account Balance Questions
  // e.g. "বিকাশে এখন কত টাকা আছে?", "bikashe koto taka ache?", "bkash balance koto?", "nagade koto ache?"
  const detectedAcc = detectAccount(t, accounts);
  if (detectedAcc && (
    /\b(koto|balance|taka|ache|ase|katuk|how\s*much)\b/.test(t) ||
    /কত\s*(টাকা|ব্যালেন্স|জমা|আছে)|টাকা\s*আছে\s*কত|ব্যালেন্স\s*কত|কত\s*টাকা|টাকা\s*কত|টাকা\s*জমা/.test(t) ||
    /বিকাশ|নগদ|রকেট|ব্যাংক|ক্যাশ/.test(t)
  )) {
    return 'SPECIFIC_ACCOUNT_BALANCE';
  }

  // 10. All Accounts Balance Query
  // e.g. "সব অ্যাকাউন্টে কত টাকা আছে?", "shob account e koto taka ache?", "total balance koto?", "what is my total balance?"
  if (
    /\b(shob\s*account|sob\s*account|total\s*balance|all\s*accounts|total\s*taka|total\s*money|all\s*balance)\b/.test(t) ||
    /সব\s*অ্যাকাউন্টে|সবগুলো\s*অ্যাকাউন্টে|মোট\s*ব্যালেন্স|অ্যাকাউন্টগুলোতে\s*কত|মোট\s*টাকা\s*কত|হাতে\s*কত\s*টাকা|আমার\s*কত\s*টাকা\s*আছে/.test(t)
  ) {
    return 'ALL_ACCOUNTS_BALANCE';
  }

  // 11. Receivables: "কার কাছে কত টাকা পাওনা আছি?", "amar paona koto?", "kar kache taka pabo?", "who owes me money?"
  if (
    /\b(amar\s*paona|amr\s*paona|paona\s*koto|taka\s*pabo|who\s*owes\s*me|receivable)\b/.test(t) ||
    /কার\s*কাছে.*পাওনা|কত\s*টাকা\s*পাওনা|আমার\s*পাওনা\s*কত|কে\s*কে\s*টাকা\s*পাবে|টাকা\s*পাবো|পাওনা\s*টাকা|পাওনা\s*কত/.test(t)
  ) {
    return 'DEBT_RECEIVABLES';
  }

  // 12. Payables: "amar dena koto?", "kake taka dite hobe?", "how much debt do I owe?", "দেনা কত?"
  if (
    /\b(amar\s*dena|amr\s*dena|dena\s*koto|taka\s*dite\s*hobe|rin\s*koto|dhar\s*koto|how\s*much.*debt|payable)\b/.test(t) ||
    /কত\s*টাকা\s*দিতে\s*হবে|আমার\s*দেনা\s*কত|দেনা\s*কত|পরিশোধ\s*করতে\s*হবে|ঋণ\s*কত|কাউকে\s*টাকা\s*দেওয়া\s*লাগবে|ধার\s*কত/.test(t)
  ) {
    return 'DEBT_PAYABLES';
  }

  // 13. Specific Date / Day Expense Questions
  // e.g. "gotokal koto khoroc hoise?", "15 tarike koto khoroc hoise?", "আজকে কত খরচ?", "গতকাল কত খরচ করেছি?", "আজকে কত টাকা গেল"
  const dateFilter = extractDateFilter(t);
  if (dateFilter && (dateFilter.type === 'SPECIFIC_DATE' || dateFilter.type === 'SPECIFIC_MONTH' || dateFilter.type === 'SPECIFIC_YEAR' || dateFilter.type === 'LAST_MONTH')) {
    if (
      /\b(koto|khoroc|khoroch|khoros|cost|spent|expense|taka|hisab|gelo|gese)\b/.test(t) ||
      /কত|খরচ|ব্যয়|ব্যয়|আয়|আয়|টাকা|হিসাব|লেনদেন|হলো|গেছে|গেল|খসল|কেমন|ছিল|লিস্ট/.test(t) ||
      dateFilter.type === 'SPECIFIC_DATE' ||
      dateFilter.type === 'LAST_MONTH'
    ) {
      return 'SPECIFIC_DATE_EXPENSE';
    }
  }

  // 14. Current Month Expense / Flexible Monthly Spend Inquiries
  // e.g. "এই মাসে কত খরচ করেছি", "এই মাসের খরচ কত", "মাসের হিসাব বলো তো", "কত টাকা গেল এই মাসে",
  // "এই মাসে কেমন ব্যয় হলো", "মাসের খরচের হিসাব দাও", "চলতি মাসে কত গেল", "টাকা গেল কই এই মাসে"
  const hasSpendIndicator =
    /\b(khoroc|khoroch|khoros|expense|expenses|spend|spent|cost|gelo|gese|taka\s*gelo)\b/.test(t) ||
    /খরচ|ব্যয়|ব্যয়|গেল|গেছে|খসল|খরচের|গেসে|দিলাম|স্পেন্ড|কস্ট|কত\s*টাকা\s*গেল/.test(t);

  const hasMonthIndicator =
    /\b(ei\s*mashe|e\s*mashe|this\s*month|monthly|masher|current\s*month)\b/.test(t) ||
    /এই\s*মাসে|এই\s*মাসের|চলতি\s*মাসে|চলতি\s*মাসের|মাসের|মাসিক|এ\s*মাসে/.test(t);

  const isGeneralMonthlyReport =
    /মাসের\s*হিসাব|মাসিক\s*হিসাব|এই\s*মাসের\s*হিসাব|মাসের\s*খরচ|চলতি\s*মাসের\s*হিসাব|masher\s*hisab|monthly\s*expense/.test(t);

  if ((hasSpendIndicator && hasMonthIndicator) || isGeneralMonthlyReport || /মোট\s*খরচ\s*কত|এই\s*মাসের\s*মোট\s*খরচ|কত\s*টাকা\s*গেল\s*এই\s*মাসে/.test(t)) {
    return 'CURRENT_MONTH_EXPENSE';
  }

  // 15. Financial Situation Overview: "amar financial obostha kemon?", "overall summary"
  if (
    /\b(financial\s*situation|financial\s*status|amar\s*obostha|hishab\s*kemon)\b/.test(t) ||
    /financial\s*situation|আর্থিক\s*অবস্থা\s*কেমন|আর্থিক\s*অবস্থা|কেমন\s*চলছে\s*আমার\s*টাকা|সার্বিক\s*হিসাব|হিসাব\s*কেমন|সার্বিক\s*অবস্থা/.test(t)
  ) {
    return 'FINANCIAL_SITUATION';
  }

  // 16. Expense Reduction Advice & Analysis
  if (
    /\b(analyse|analyze|advice|kothay\s*kamano\s*jay|reduce\s*expense|tips)\b/.test(t) ||
    /analyse|analyze|কোথায়\s*কমানো\s*যায়|খরচ\s*কমানো|কমানো\s*যায়|পরামর্শ|সেভিং|সঞ্চয়\s*বৃদ্ধি|অ্যানালাইসিস|সুপারিশ/.test(t)
  ) {
    return 'EXPENSE_REDUCTION_ADVICE';
  }

  // 17. Permissions Info
  if (/\b(permission|permissions)\b/.test(t) || /পারমিশন|permission|অনুমতি|প্রাইভেসি/.test(t)) {
    return 'PERMISSION_INFO';
  }

  return 'GENERAL';
}

/**
 * Resolves conversational context across turns (e.g. remembering prior question topic
 * when user asks follow-up queries like "আর গত মাসে?", "আর আয়ের কী অবস্থা?", "আর খাবারে?", "আর বিকাশে?")
 */
export interface ContextualResolution {
  resolvedText: string;
  inferredIntent?: QueryIntent;
  dateFilterOverride?: ExtractedDateFilter;
  categoryOverride?: Category;
  accountOverride?: Account;
  isContinuation: boolean;
  contextTopic?: string;
}

export function resolveContextualQuery(
  rawInput: string,
  history: ChatHistoryItem[] = [],
  categories: Category[] = [],
  accounts: Account[] = []
): ContextualResolution {
  const t = rawInput.trim();
  const lower = t.toLowerCase();

  // If no history, cannot be a continuation
  if (!history || history.length === 0) {
    return {
      resolvedText: t,
      isContinuation: false,
    };
  }

  // Find the most recent user turn in history
  const lastUserMsg = [...history].reverse().find((m) => m.sender === 'user');
  if (!lastUserMsg) {
    return {
      resolvedText: t,
      isContinuation: false,
    };
  }

  // Detect prior topic & intent from last user interaction
  const prevIntent = classifyIntent(lastUserMsg.text, categories, accounts);
  let prevTopic: 'EXPENSE' | 'INCOME' | 'BALANCE' | 'BUDGET' | 'SAVINGS' | 'DEBT' | 'CATEGORY' = 'EXPENSE';

  if (prevIntent === 'INCOME_STATUS') prevTopic = 'INCOME';
  else if (prevIntent === 'ALL_ACCOUNTS_BALANCE' || prevIntent === 'SPECIFIC_ACCOUNT_BALANCE') prevTopic = 'BALANCE';
  else if (prevIntent === 'BUDGET_LIMIT_STATUS') prevTopic = 'BUDGET';
  else if (prevIntent === 'SAVINGS_GOALS_STATUS') prevTopic = 'SAVINGS';
  else if (prevIntent === 'DEBT_RECEIVABLES' || prevIntent === 'DEBT_PAYABLES') prevTopic = 'DEBT';
  else if (prevIntent === 'SPECIFIC_CATEGORY_EXPENSE' || prevIntent === 'TOP_CATEGORY_EXPENSE') prevTopic = 'CATEGORY';
  else prevTopic = 'EXPENSE';

  // Check if current input is a continuation / follow-up:
  const isElliptical =
    /^(আর|এবং|ও|what\s*about|and|how\s*about)\s+/i.test(t) ||
    /^(গত\s*মাসে|গত\s*মাসেরটা|গতমাসে|আগের\s*মাসে|last\s*month|আজকে|আজকেরটা|today|গতকাল|গতকালেরটা|yesterday)\s*\??$/i.test(t) ||
    /^(আর\s*গত\s*মাসে|আর\s*গত\s*মাসেরটা|আর\s*আগের\s*মাসে|আর\s*আজকে|আর\s*গতকাল)\s*\??$/i.test(t) ||
    /^(আর\s*আয়|আর\s*আয়ের|আর\s*ইনকাম|আর\s*খাবারে|আর\s*বিকাশে|আর\s*নগদে|আর\s*দেনা|আর\s*পাওনা|আর\s*বাজেট)\b/i.test(t) ||
    (t.length <= 25 && /\?$/.test(t) && !/\b(কে|কার|কিভাবে|কীভাবে|কোথায়|কখন)\b/.test(t));

  if (!isElliptical) {
    return {
      resolvedText: t,
      isContinuation: false,
    };
  }

  // 1. Time-shift follow-up: e.g. "আর গত মাসে?", "গত মাসে?", "আর গত মাসেরটা?", "আর আগের মাসে?"
  const dateFilter = extractDateFilter(t);
  if (dateFilter) {
    if (dateFilter.type === 'LAST_MONTH' || (dateFilter.type === 'SPECIFIC_MONTH' && /গত\s*মাস|last\s*month/.test(lower))) {
      if (prevTopic === 'INCOME') {
        return {
          resolvedText: `গত মাসে আমার মোট আয় কত ছিল?`,
          inferredIntent: 'INCOME_STATUS',
          dateFilterOverride: dateFilter,
          isContinuation: true,
          contextTopic: 'INCOME',
        };
      }
      return {
        resolvedText: `গত মাসে আমার মোট কত খরচ হয়েছিল?`,
        inferredIntent: 'SPECIFIC_DATE_EXPENSE',
        dateFilterOverride: dateFilter,
        isContinuation: true,
        contextTopic: 'EXPENSE',
      };
    }

    if (dateFilter.type === 'SPECIFIC_DATE' && (lower.includes('আজ') || lower.includes('today'))) {
      return {
        resolvedText: `আজকে আমার মোট কত খরচ হয়েছে?`,
        inferredIntent: 'SPECIFIC_DATE_EXPENSE',
        dateFilterOverride: dateFilter,
        isContinuation: true,
        contextTopic: 'EXPENSE',
      };
    }

    if (dateFilter.type === 'SPECIFIC_DATE' && (lower.includes('গতকাল') || lower.includes('yesterday'))) {
      return {
        resolvedText: `গতকাল আমার মোট কত খরচ হয়েছিল?`,
        inferredIntent: 'SPECIFIC_DATE_EXPENSE',
        dateFilterOverride: dateFilter,
        isContinuation: true,
        contextTopic: 'EXPENSE',
      };
    }
  }

  // 2. Topic-shift follow-up with inherited period (e.g. "আর আয়ের কী অবস্থা?", "আর আয়?", "ইনকাম কেমন?")
  if (/\b(aay|ay|income|আয়|আয়|ইনকাম|বেতন|রোজগার)\b/i.test(lower)) {
    return {
      resolvedText: `চলতি মাসে আমার মোট আয় কত?`,
      inferredIntent: 'INCOME_STATUS',
      isContinuation: true,
      contextTopic: 'INCOME',
    };
  }

  // 3. Category follow-up (e.g. "আর খাবারে?", "খাবারে কত?")
  const detectedCat = detectCategory(t, categories, true);
  if (detectedCat) {
    return {
      resolvedText: `চলতি মাসে ${detectedCat.name} খাতে মোট কত খরচ হয়েছে?`,
      inferredIntent: 'SPECIFIC_CATEGORY_EXPENSE',
      categoryOverride: detectedCat,
      isContinuation: true,
      contextTopic: 'CATEGORY',
    };
  }

  // 4. Account follow-up (e.g. "আর বিকাশে?", "নগদে কত?", "আর ব্যাংকে?")
  const detectedAcc = detectAccount(t, accounts);
  if (detectedAcc) {
    return {
      resolvedText: `${detectedAcc.name} অ্যাকাউন্টে এখন কত টাকা আছে?`,
      inferredIntent: 'SPECIFIC_ACCOUNT_BALANCE',
      accountOverride: detectedAcc,
      isContinuation: true,
      contextTopic: 'BALANCE',
    };
  }

  // 5. Debt follow-up (e.g. "আর দেনা?", "আর পাওনা?")
  if (/\b(dena|dhar|rin|দেনা|ধার|ঋণ)\b/i.test(lower)) {
    return {
      resolvedText: `আমার মোট দেনা কত?`,
      inferredIntent: 'DEBT_PAYABLES',
      isContinuation: true,
      contextTopic: 'DEBT',
    };
  }
  if (/\b(paona|pabo|পাওনা|পাবো)\b/i.test(lower)) {
    return {
      resolvedText: `আমার মোট পাওনা কত?`,
      inferredIntent: 'DEBT_RECEIVABLES',
      isContinuation: true,
      contextTopic: 'DEBT',
    };
  }

  // 6. Budget follow-up (e.g. "আর বাজেট?", "বাজেটের কি অবস্থা?")
  if (/\b(budget|বাজেট)\b/i.test(lower)) {
    return {
      resolvedText: `আমার বাজেট কত বাকি আছে?`,
      inferredIntent: 'BUDGET_LIMIT_STATUS',
      isContinuation: true,
      contextTopic: 'BUDGET',
    };
  }

  // 7. Savings follow-up (e.g. "আর সেভিংস?", "সঞ্চয় কত?")
  if (/\b(save|savings|shonchoy|sonchoy|সেভিংস|সঞ্চয়|সঞ্চয়)\b/i.test(lower)) {
    return {
      resolvedText: `আমার সেভিংস গোল কতদূর এগিয়েছে?`,
      inferredIntent: 'SAVINGS_GOALS_STATUS',
      isContinuation: true,
      contextTopic: 'SAVINGS',
    };
  }

  return {
    resolvedText: t,
    isContinuation: false,
  };
}

