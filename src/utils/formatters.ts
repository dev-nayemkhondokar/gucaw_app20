/**
 * Bangla Number and Currency Formatting Utilities
 * Standard: 1 Taka = 100 Poisha
 * Formats numbers into Bengali numerals with commas and Taka symbol (৳)
 */

/**
 * Bangla & English Number and Currency Formatting Utilities
 * Standard: 1 Taka = 100 Poisha
 * Formats numbers into Bengali or English numerals with commas and Taka symbol (৳)
 */

export type Language = 'bn' | 'en';

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'bn';
  const saved = localStorage.getItem('plm_language_mode');
  return saved === 'en' ? 'en' : 'bn';
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('plm_language_mode', lang);
  }
}

const BANGLA_DIGITS: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

/**
 * Converts English number/digits string to Bengali numerals
 */
export function toBanglaDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (w) => BANGLA_DIGITS[w] || w);
}

/**
 * Formats any number string/number with digits matching active language
 */
export function formatNumber(num: number | string, lang: Language = getStoredLanguage()): string {
  if (lang === 'bn') {
    return toBanglaDigits(num);
  }
  return String(num);
}

/**
 * Formats Poisha into Taka with proper comma placement
 * In Bangla mode: e.g. 1250000 Poisha -> ১২,৫০০ ৳
 * In English mode: e.g. 1250000 Poisha -> 12,500 ৳
 * Always preserves the currency ৳ (Taka) symbol and financial values
 */
export function formatTaka(
  poisha: number,
  showDecimalIfZero = false,
  lang: Language = getStoredLanguage()
): string {
  const numericPoisha = typeof poisha === 'number' && !isNaN(poisha) && isFinite(poisha) ? poisha : 0;
  const isNegative = numericPoisha < 0;
  const absPoisha = Math.abs(numericPoisha);
  const taka = Math.floor(absPoisha / 100);
  const remainderPoisha = absPoisha % 100;

  // Format integer part with Bangladeshi comma pattern (e.g., 12,34,567)
  const takaStr = taka.toString();
  let formattedInteger = '';

  if (takaStr.length <= 3) {
    formattedInteger = takaStr;
  } else {
    const lastThree = takaStr.substring(takaStr.length - 3);
    const otherNumbers = takaStr.substring(0, takaStr.length - 3);
    const groupedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedInteger = `${groupedOther},${lastThree}`;
  }

  let result = formattedInteger;
  if (remainderPoisha > 0 || showDecimalIfZero) {
    result += `.${remainderPoisha.toString().padStart(2, '0')}`;
  }

  const digitsResult = lang === 'bn' ? toBanglaDigits(result) : result;
  return `${isNegative ? '-' : ''}${digitsResult} ৳`;
}

/**
 * Parses user input string (e.g. "500", "১২৫০", "250.50") into integer Poisha
 */
export function parseInputToPoisha(input: string): number {
  if (!input) return 0;
  // Convert any Bengali digits to English digits
  const engStr = input
    .replace(/০/g, '0')
    .replace(/১/g, '1')
    .replace(/২/g, '2')
    .replace(/৩/g, '3')
    .replace(/৪/g, '4')
    .replace(/৫/g, '5')
    .replace(/৬/g, '6')
    .replace(/৭/g, '7')
    .replace(/৮/g, '8')
    .replace(/৯/g, '9')
    .replace(/,/g, '')
    .trim();

  const floatVal = parseFloat(engStr);
  if (isNaN(floatVal) || floatVal < 0) return 0;
  return Math.round(floatVal * 100);
}

/**
 * Returns formatted Date according to selected language
 * e.g. "১৫ সেপ্টেম্বর ২০২৬" in 'bn' or "15 September 2026" in 'en'
 */
export function formatDate(dateString: string, lang: Language = getStoredLanguage()): string {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return lang === 'bn' ? toBanglaDigits(dateString) : dateString;

    const monthNamesBn = [
      'জানুয়ারি',
      'ফেব্রুয়ারি',
      'মার্চ',
      'এপ্রিল',
      'মে',
      'জুন',
      'জুলাই',
      'আগস্ট',
      'সেপ্টেম্বর',
      'অক্টোবর',
      'নভেম্বর',
      'ডিসেম্বর',
    ];

    const monthNamesEn = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    if (lang === 'bn') {
      const bnDay = toBanglaDigits(day);
      const bnMonth = monthNamesBn[month - 1] || '';
      const bnYear = toBanglaDigits(year);
      return `${bnDay} ${bnMonth} ${bnYear}`;
    }

    const enMonth = monthNamesEn[month - 1] || '';
    return `${day} ${enMonth} ${year}`;
  } catch {
    return lang === 'bn' ? toBanglaDigits(dateString) : dateString;
  }
}

/**
 * Returns formatted Bengali Date: e.g. "১৫ সেপ্টেম্বর ২০২৬" (alias for backward compatibility)
 */
export function formatBanglaDate(dateString: string): string {
  return formatDate(dateString, 'bn');
}

/**
 * Formats current month/year: e.g. "সেপ্টেম্বর ২০২৬" in 'bn' or "September 2026" in 'en'
 */
export function formatMonthYear(yearMonthString: string, lang: Language = getStoredLanguage()): string {
  try {
    const [year, month] = yearMonthString.split('-').map(Number);
    const monthNamesBn = [
      'জানুয়ারি',
      'ফেব্রুয়ারি',
      'মার্চ',
      'এপ্রিল',
      'মে',
      'জুন',
      'জুলাই',
      'আগস্ট',
      'সেপ্টেম্বর',
      'অক্টোবর',
      'নভেম্বর',
      'ডিসেম্বর',
    ];
    const monthNamesEn = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    if (lang === 'bn') {
      return `${monthNamesBn[month - 1] || ''} ${toBanglaDigits(year)}`;
    }
    return `${monthNamesEn[month - 1] || ''} ${year}`;
  } catch {
    return yearMonthString;
  }
}

/**
 * Formats current month/year for header: e.g. "সেপ্টেম্বর ২০২৬" (alias for backward compatibility)
 */
export function getMonthYearBangla(yearMonthString: string): string {
  return formatMonthYear(yearMonthString, 'bn');
}
