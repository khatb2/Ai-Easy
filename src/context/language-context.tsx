"use client";
import { createContext } from 'react';
import ar from '@/lib/locales/ar.json';
import en from '@/lib/locales/en.json';

export const translations = { ar, en };

export const LanguageContext = createContext<{
  language: 'ar' | 'en';
  setLanguage: (language: 'ar' | 'en') => void;
  t: typeof ar;
}>({
  language: 'en', // Default to 'en' for consistency
  setLanguage: () => {},
  t: en, // Default to English translations
});