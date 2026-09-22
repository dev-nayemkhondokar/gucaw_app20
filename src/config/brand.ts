/**
 * Gochao Brand Configuration
 * Centralized branding tokens to ensure consistent identity across the application
 * and allow future branding updates without modifying user data or business logic.
 */
export const BRAND = {
  name: 'Gochao',
  banglaName: 'গুছাও',
  tagline: 'জীবনটা গুছিয়ে নিন।',
  description: 'জীবনটা গুছিয়ে নিন — ব্যক্তিগত ও আর্থিক জীবন সহজভাবে পরিচালনার আধুনিক অ্যান্ড্রয়েড অ্যাপ।',
  version: '2.4.0',
  colors: {
    primaryGreen: '#16A34A', // Primary Green (Green-600)
    darkGreen: '#15803D',    // Dark Green (Green-700)
    lightGreen: '#DCFCE7',   // Light Green (Green-100)
    background: '#F8FAFC',   // Slate-50 Background
    primaryText: '#0F172A',  // Slate-900 Primary Text
  },
} as const;
