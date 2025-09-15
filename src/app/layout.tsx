"use client";

import { useState, useMemo, useEffect } from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LanguageContext, translations } from '@/context/language-context';
import { fontSans, fontArabic } from '@/lib/fonts';
import { useBrowserExtensionHydrationFix } from '@/lib/hydration-utils';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [language, setLanguage] = useState<'ar' | 'en'>('en'); // Default to 'en' to avoid hydration mismatch

  // Handle browser extension hydration issues
  useBrowserExtensionHydrationFix();

  useEffect(() => {
    // Load language from localStorage or default to 'en'
    const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') as 'ar' | 'en' : 'en';
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const contextValue = useMemo(() => ({
    language,
    setLanguage: (newLanguage: 'ar' | 'en') => {
      setLanguage(newLanguage);
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', newLanguage);
      }
    },
    t: translations[language],
  }), [language]);
  
  // Use consistent defaults to prevent hydration mismatch
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const fontClass = language === 'ar' ? 'font-arabic' : 'font-sans';

  return (
    <html lang={language} dir={dir} className={fontClass}>
      <head>
        <title>{contextValue.t.meta.title}</title>
        <meta name="description" content={contextValue.t.meta.description} />
      </head>
      <body className={`${fontClass} antialiased`}>
        <LanguageContext.Provider value={contextValue}>
          {children}
        </LanguageContext.Provider>
        <Toaster />
      </body>
    </html>
  );
}